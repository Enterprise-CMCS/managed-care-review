# Contract and Rates Refactor: Historical Relationships in Tables

## Overview
This is a big one. From the beginning of this project our application data model has been built around the health plan package, in which rates always belonged to a single package and could not be shared between them without duplication. We are shifting now towards a data model built on health plan contracts and health plan rates as distinct entities. See [ADR 023](../architectural-decision-records/023-seperate-contract-rates-tables-postgres.md). This document outlines our approach to storing contract and rates as separate entities with historical relationships.

## Constraints
- Need rates to be able to be associated to many contracts (rates across submissions)
- Need to be able to query rate data alone (rates only dashboard)
- Need to be able to store partial form data (save as draft)
- Need to be able to view old submission data as it was submitted. Nothing gets deleted once submitted. (change history)
- Need to be able to take form data that was previously submitted and enter in back into a new form to be edited (unlock and resubmit)
- Need to be able to validate form has all required fields for the current form on submit

## Key Terminology
- **Package** - this refers to a health plan submission made by a state, including all form fields, all the documents,  and any additional high level metadata. A package always has a contract. It may have rates. This term may become outdated as we move to referring to the health plan data as either contracts or rates more frequently. 
- **Contract** - this refers to the contract documents, supporting documents, and the form fields related to the health plan contract, including the set of yes no questions CMS asks to ensure contracts are the expected shape. 
- **Rate** - this refers to the rate documents, supporting documents, and the form fields related to the health plan rates including the actuarial information.
- **Revision** - this is a point in time snapshot of either contract or rate. There may be only one revision (if a submission is submitted once) or multiple as a contract or rate is edited and updated.


## Background
Our migration from dynamodb to postgres encoded the concept of a standalone “package” into our application by using protobuf and sending that directly to the web app. Crucially, the package enforced a hierarchy between contracts and rates. In that paradigm, rate info was always parented to a single contract. As we've tested our implementation recently it's become clear that this embedding doesn't work correctly for all of the wild world of MC submissions. Some 6% of the time rates are submitted that apply to multiple contracts, and it's important to CMCS that they be able to review those rates in one place, having questions and approvals associated with that singular rate, no matter how many contracts it applies to. Our package model is a deal breaker for delivering feature like the Rates Dashboard and Rates Across Submissions. 

We need to break out Rates into their own tables that can be joined to different packages allowing us to navigate our database by contract or by rate. Since we're breaking up the protobuf representation of packages, we are also taking this opportunity to rethink how we are representing rate and contract data across the whole application, rather than perpetuate a system we have grown not to like by creating a separate Rate protobuf schema. 

While the basic table structure supporting separate contracts and rates came together straightforwardly, there's a lot more options under consideration for the data format for the contract and rate data. I've broken them up into two documents. The remainder of this doc will discuss the contract/rate revisions table structure, a forthcoming technical design document will discuss the form data format. 

## Contract and Rate Revisions tables

Just as we have maintained a list of package revisions up until now, this migration will entail the creation of a rates revision table. Every time a rate's info is updated, we will create a new entry in the rate revisions table with the new version of the data. This way a history of all past versions of the rate is maintained as a list of revisions. 

The trick is in tracking the history of the relationships between contract revisions and rate revisions. Since we only want to add a new entry to a revision table when the underlying form data changes, that means we need to track the relationships outside of those revision tables, and we need to be able to track a changing set of relationships between otherwise unchanged revisions over time. 

The plan is to have a join table between ContractRevisionTable and RateRevisionTable that in addition to the expected `contract_revision_id` and `rate_revision_id` fields will have fields `valid_after`, `valid_before` timestamps and an `isRemoval` boolean. Whenever the relationships between different contracts and rates are changed, we will add new entries to this join table to record the current state. With those dates recorded, it will be possible to scan the join table for a given revision and construct a history of its relationships to other revisions. By including an entry in the join table indicating when a relationship is removed, it makes it straightforward to include that action as an entry in the history as well.

[The db diagram, for reference.](/docs/technical-design/database-diagram.md#contract--rates-db)


### Draft Revisions

Before submission, state users will fill out a draft revision. Draft revisions are easily identifiable as having no submitInfo associated with them. Draft revisions do not exist in the join table, they track which Rates or Contracts they are associated with using the draftRates or draftContracts relationship. We only add to the revision join table when a revision is submitted, recording the relationships for posterity. The separate table means that if your draft contract is created being tied to a rate that is re-submitted, then our draft doesn't have an outdated link to the old revision. We can always pull the most recent submitted revision when talking about the draft.


### The Database Functions

The contract and rate life cycles are implemented in our postgres package. There are four functions each for Contracts and Rates for manipulating them. For brevity I'm laying out the contract related functions but the same exact ones exist for rates as well. 

```
insertDraftContract
updateDraftContract
submitContract
unlockContract
```

Plus a function for inspecting them:

```
findContractWithHistory
```

The life cycle functions are used as follows:

1. A new contract or rate submission is created with `insertDraftContract`
2. The draft contract is updated with `updateDraftContract`, allowing you to associate your draft contract with other rates as well as filling in the form data.
3. `submitContract` will find all the most recent submitted rates it is associated with and record them in the join table with the newly submitted contract.
4. `unlockContract` will create a new draft revision for that contract, with all the data and associations from the most recent submission on it. This can then be updated again and re-submitted. 

findContractWithHistory returns a list of all of the submitted revisions for the given contract. Revisions in that history can either come from submitting an update for this contract or for an update to any of the associated revisions, as described below. 

An unsubmitted or unlocked contract is considered a draft. The findDraftContract function will return just that single draft revision with all the data entered so far in it. This is the revision that is updated with updateDraftContract, and when the contract is submitted that revision becomes the most recent revision in the history of this contract and its related rates. 

Calling findContractWithHistory on an unlocked contract will return all submitted revisions and omit the draft one. 

One gotcha here is that it is an error to submit a contract revision that is associated with a rate revision that has not been submitted yet. We don't want any links to unsubmitted revisions in our join table so there wouldn't be anything to do that made sense in that case. If you're submitting a new contract + rate together, one needs to be submitted alone first then the second submitted with the association. 


## Example

### Insert, submit, unlock, re-submit

Given Contracts A, B, and C, and Rates 1, 2, and 3, and revisions A.0, A.1, B.0, B.1, 1.0, 2.3, etc. 

```
contract rev, rate rev, valid after, valid before, isRemoval
A.0, 1.0, 2020-01-01, null, false       
A.0, 2.0, 2020-01-01, null, false        // this block is the initial state we enter. 
B.0, 1.0, 2020-01-01, null, false       
C.0, 2.0, 2020-01-01, null, false 
```      

then, we insert and submit a new rate, associated with A and B

```
A.0, 3.0, 2020-01-02, null, false
B.0, 3.0, 2020-01-02, null, false
```

now if we unlock, update A, and resumit, creating a new revision, we add a new set of A relationships

```
A.1, 1.0, 2020-01-03, null, false
A.1, 2.0, 2020-01-03, null, false
A.1, 3.0, 2020-01-03, null, false
```
...and invalidate the old ones (these update previous rows) leading us to this table:

```
A.0, 1.0, 2020-01-01, 2020-01-03, false
A.0, 2.0, 2020-01-01, 2020-01-03, false
B.0, 1.0, 2020-01-01, null, false       
C.0, 2.0, 2020-01-01, null, false 
A.0, 3.0, 2020-01-02, 2020-01-03, false
B.0, 3.0, 2020-01-02, null, false
A.1, 1.0, 2020-01-03, null, false
A.1, 2.0, 2020-01-03, null, false
A.1, 3.0, 2020-01-03, null, false
```

### Version history
Now, it's not super straightforward, but this is enough information to construct a sensible history. 

For instance, we can try and determine the history for rate 1.0, by selecting all rows that have 1.0 as the rate revision, grouping by the valid_after timestamp. 

```
A.0, 1.0, 2020-01-01, 2020-01-03
B.0, 1.0, 2020-01-01, null       
A.1, 1.0, 2020-01-03, null
```
This is a toy example but you can see how you could construct a history like this:

```
2020-01-01: 
    1.0 -> A.0
    1.0 -> B.0
2020-01-03:
    1.0 -> A.1
    1.0 -> B.0
```

This join table strategy allows us to maintain a fully versioned history of revisions to contracts, rate, and the associations between them. 

Continuing the above example, let’s say we resubmit contract B and remove the link to rate 1. 

We’ll have new entries for the rates, including the one removed:

```
B.1, 1.0, 2020-01-04, 2020-01-04, true
B.1, 3.0, 2020-01-04, null, false
```
And we’ll update the old relations to be invalid

```
B.0, 1.0, 2020-01-01, 2020-01-04, false
B.0, 3.0, 2020-01-02, 2020-01-04, false
```

This will give us a new entry in our rate 1 history, and we can attribute it to the correct submission because we have the isRemoved bit:
```
2020-01-01: – initial submit of rate 1
    1.0 -> A.0
    1.0 -> B.0
2020-01-03: – contract A resubmitted
    1.0 -> A.1
    1.0 -> B.0
2020-01-04: – contract B resubmitted
    1.0 -> A.1
```

## Migration plan summary

Existing `HealthPlanPackage` submissions will be converted into Contract and Rates in the db. Since we will be working on the migration work behind a feature flag, we can write a migrator that runs repeatedly, taking the old protobuf encoded FormData and moving that data into our new `Contract[Revision]` and `Rate[Revision]` tables. This way we can test and refine our migration before we actually switch over to using the new data. 

After the migration is complete and we switch the API to using the new tables, we will delete the old HealthPlanPackage tables completely and rely on the new Contract and Rate tables going forward. 

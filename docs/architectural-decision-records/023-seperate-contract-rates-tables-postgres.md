---
title: Store health plan data in separate Contract and Rates postgres tables

---
## ADR 0023 — Store health plan data in separate Contract and Rates postgres tables

- Status: Decided (scheduled for implementation)
- Date: 5/23/2023

This ADR overrides our previous decision from [ADR 008](./008-form-data-serialization.md) to store health plan data as a single binary. We had previously assumed that health plan data was primarily handled as a package and that fields were unlikely to be queried directly.

## Decision Drivers
- An individual rate certification can be shared across multiple contracts. CMS wants ways to identify those shared rates to avoid repetitive reviews. This means rates cross the package boundary assumed by our previous data model. 
- There are CMS users who additionally need the ability to query and review standalone rates data, regardless if they are shared or not. 
- Features with relational rates data include Rates Across Submissions, Q&A for Rates. 
- Features with rates queried and handled independently of the contract include Rates Dashboard, rates reporting, rate-only submissions.

## Constraints
- Out of scope: the full database diagram for our new tables or technical discussion of the migration. This is a high-level ADR focused on how we approach health plan data in the application.

## Considered Options

### Option 1 No change to database storage. Continue handling health plan data as binary

This entails continuing our current workarounds in business logic to emulate relational and shared data above the layer of the database. There will be features we cannot adequately deliver that are currently on the roadmap.

### Option 2 Store health plan packages as JSON.

This entails a single field database migration where we switch the health plan storage format from protobuf to JSON (which can be queried in Postgres)
### Option 3 Move health plan data out of a single table and into contract and rates tables

This entails rewriting the postgres database tables for health plan package related data and performing a significant migration.

## Chosen Solution: Move health plan data out of a single table and into contract and rates tables
### Pros and Cons of the Alternatives
​
#### Option 1 No change 
​
- `+` No change to data storage
- `±` Simplicity of mental model at first blush - we get to continue thinking of health plan data as a single standalone "package"
- `-` Continued scope creep around features with relational rates data.
  `-` Continued scope creep around features that seem to presume rates are easy to handle independently. 
- `-` Shape of the data in the database does not reflect how it is used. The form data is stored in a single postgres field (as a binary) even though eng team now knows we have significant relational data related to subsets of this data.
- `-` Eng team continues to emulate relationships between contracts and rates stored as a binary without the guarantees of postgres columns/tables 

#### Option 2 Store health plan packages as JSON.

- `+` Simple change to data storage that would also unlock ability to query rates independently 
- `+` We can query rates independently in postgres and deliver features like rates dashboard and rates reporting
- `±` Simplicity of mental model at first blush - we get to continue thinking of health plan data as a single standalone "package"
- `-` Does not solve how to we create, edit, delete relationships between individual rates and other resources in the db (e.g. relationships between rates and contracts or between rates and questions still difficult to manage)
- `-` Shape of the data in the database does not reflect how it is used. The form data is stored in a single postgres field (as JSON) even though eng team now knows we have significant relational data related to subsets of this data.

#### Option 3 Move health plan data out of a single table and into contract and rates tables

- `+` For CMS users that deal primarily with rate certifications we have a clear path to surface that data and allow rates to be edited independently and across packages
- `+` We unlock true rates across submissions features and make it easier to surface and identify duplicate rates.
- `+` The shape of the data in the database reflects more closely how it is used.
- `±` We rethink our mental model for the application and start to interrogate the relationship between the package, the contract, and the rate cert.
 lean on postgres approach fully 
- `-` We have to rewrite how health plan data is handled in database and rewrite postgres handlers
- `-` We invest significant eng time in a migration

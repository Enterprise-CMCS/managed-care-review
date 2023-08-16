---
title: Calculating contract and Rate Change History
---

## Calculating contract and Rate Change History

## Overview
Change history is a feature of MC-Review where we track changes to the submission data over time and display this content to users. This document details how the change history is calculated for contract and rate data and which database fields are used.

[ADD IMAGE]
## Contraints
- MC-Review must track actions on contract or a rate (submit, unlock, resubmit) alongside the full form data present at that that momment in the database. This data is used for CMS reporting and audit purposes. It is considered part of the system of system.
- From a product requirement standpoint, MC-Review does not need to track changes on drafts (each edit a state makes to a draft data directly updates the original resource).

## Implementation
### A full copy of the submission data at a given point in time is called a revision
The change history audit log is a list of revisions sorted by data. This is currently stored in the `revisions` field on the Contract and Rate tables.

A new revision is created each time a version of the form is submitted by states to CMS.
### There is important metadata associated with a revision to track user actions
The `unlockInfo` and `submitInfo` associated with that revision is important metadata. Specifically, revisions that have unlocked have unlock info data. If they do not have unlock info data, we can assume 1. that revision is the latest submitted version 2. that revision is the first submission associated with that contrac tor rate.


TODO
- [ ] add discussion `find*WithHistory`
- [ ] add discussion of `validAfter` and `validUntil`
- [ ] add discussion `draftRevision`

## Related documentation
- [Contract and Rates Refactor Relationships](./contract-rate-refactor-relationships.md).
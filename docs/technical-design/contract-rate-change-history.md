---
title: Calculating contract and Rate Change History
---

## Calculating contract and Rate Change History

## Overview

This document is a companion to [Contract and Rates Refactor Relationships](./contract-rate-refactor-relationships.md). This documents goes into detail about how the change history is calculated since the refactor and what fields have change history related information.

As a reminder, change history is a feature of MC-Review where we track changes to the submission data over time.

## Contraints
- We must track actions on contract or a rate (submit, unlock, resubmit) alongside the full form data present at that that momment in the database. This data is used for CMS reporting and audit purposes. It is considered part of the system of system.
- From a product requirement standpoint, we not track changes on drafts (each edit to a draft directly updates the original resource).

## Implementation
Change history is stored in the `revisions` field on the Contract and Rate tables.

The `revisions` field is an array of submitted versions associated with that resource. For example, for contracts, a new rvision is added each time that contract is resubmitted.

The `unlockInfo` and `submitInfo` associated with that revision is important metadata. Specifically, revisions that have unlocked have unlock info data. If they do not have unlock info data, we can assume 1. that revision is the latest submitted version 2. that revision is the first submission associated with that contrac tor rate.


TODO
- [ ] add discussion `find*WithHistory`
- [ ] add discussion of `validAfter` and `validUntil`
- [ ] add discussion `draftRevision`
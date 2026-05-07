# Reverse Unlock

Reference for the internal reverse-unlock model in `services/app-api/`.

## Purpose

Reverse unlock exists to restore a contract or rate package from `UNLOCKED` back to its prior submitted state without losing internal audit history of the unlock that was reversed.

In the current design:

- reverse unlock is stored on revisions through `reverseUnlockInfo`
- reversed unlocked revisions remain in the database
- reversed unlocked revisions are historical only
- current state is determined by the latest non-reversed revision

This is intentionally not modeled as a new `packageSubmission` or a new review action.

## Core Rules

### Active draft

An active draft revision is:

- `unlockInfo != null`
- `submitInfo == null`
- `reverseUnlockInfo == null`

### Reversed unlocked revision

A reversed unlocked revision is:

- `unlockInfo != null`
- `submitInfo == null`
- `reverseUnlockInfo != null`

These revisions remain in revision history for internal audit, but must not:

- become `draftRevision`
- determine current contract or rate status
- be treated as editable drafts

### Current state after reverse unlock

Reverse unlock restores submitted state by changing which revision is treated as current.

It does not:

- create a new submission event
- add a `packageSubmission`
- append a new revision row just to represent the reversal

After reverse unlock, state should fall back to the latest non-reversed revision:

- `SUBMITTED` if the prior current revision was the initial submit
- `RESUBMITTED` if the prior current revision had both `submitInfo` and `unlockInfo`

## Child Rates And Linked Rates

Reverse unlock must handle both child rates and linked rates correctly.

### Child rates

Child rate unlocked revisions created by the same unlock event should be reversed together with the contract.

The shared unlock event is identified through the same `unlockInfoID`.

### Linked rates

Linked rates are different:

- they may appear in the unlocked contract working set
- they are not necessarily unlocked by that contract

So reverse unlock must also clear `DraftRateJoinTable` rows for the contract so linked rates do not remain in the unlocked draft working set after the contract is restored.

## Parser / Query Expectations

Any code path that means “current revision” or “editable draft” must ignore reversed unlocked revisions.

Important expectations:

- active draft lookups must require `reverseUnlockInfoID: null`
- current-state helpers must not treat reversed unlocked revisions as current
- parsers must keep reversed unlocked revisions out of `draftRevision`
- `packageSubmissions` must remain unchanged by reverse unlock

## File Map

Primary implementation areas:

- `src/postgres/contractAndRates/reverseUnlockContract.ts`
- `src/postgres/contractAndRates/unlockContract.ts`
- `src/postgres/contractAndRates/unlockRate.ts`
- `src/postgres/contractAndRates/parseContractWithHistory.ts`
- `src/postgres/contractAndRates/parseRateWithHistory.ts`
- `src/postgres/contractAndRates/prismaSharedContractRateHelpers.ts`

Important downstream flows:

- `submitContract.ts`
- `submitRate.ts`
- `submitContractAndOrRates.ts`
- `updateDraftContract.ts`
- `updateDraftContractRates.ts`
- `updateDraftRate.ts`
- `withdrawContract.ts`
- `withdrawRate.ts`
- `undoWithdrawContract.ts`
- `undoWithdrawRate.ts`
- `reassignParentContract.ts`

## Things Easy To Get Wrong

- treating `submitInfo == null` as enough to mean “active draft”
- letting reversed unlocked revisions determine current status
- leaving linked rates in `DraftRateJoinTable` after reverse unlock
- creating a fake reverse-unlock `packageSubmission`
- assuming reverse unlock is a review-status action instead of a revision-history concern

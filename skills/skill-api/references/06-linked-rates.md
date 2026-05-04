# Linked rates (parent vs linked relationship) and parent reassignment

A rate has exactly **one parent contract** at any given time but can be **linked to many other contracts**. Parent vs. linked is not a flag — it's a derived property computed from the rate's submission history. The same `DraftRateJoinTable` and `SubmissionPackageJoinTable` rows describe both relationships; they don't distinguish parent from linked at the join level.

For storage details on the join tables, see `01-storage-schema.md`. For how `getParentContractID` works, see `08-derived-state.md`. For submit/unlock state transitions referenced here, see `05-submit-unlock-resubmit.md`. For withdraw, see `07-withdraw.md`.

## Definition

- **Parent contract** = the contract whose latest submission of the rate was the most recent direct submission. Only the parent can edit the rate's form data. A rate's `parentContractID` is computed at parse time, never stored on the rate.
- **Linked contract** = any other contract that has a join entry to the rate. A linked contract can include the rate in its submission package, but it cannot edit the rate's content.
- Multiple contracts can link to the same rate; exactly one of them is the parent at a given moment.

## How `parentContractID` is computed (`getParentContractID` in `prismaSharedContractRateHelpers.ts`)

Walks the rate's revisions newest → oldest:

1. If no revision has been submitted yet → return `DRAFT_PARENT_PLACEHOLDER` (`'DRAFT_PARENT_REPLACE_ME'`). The outer parser patches this from `draftContracts[0].id` (or `draftContracts[0].contractID` on the without-form).
2. Find the latest revision whose `submitInfo.submittedContracts[0]` exists. The contract behind that ID is the parent. (`submittedContracts` is the FK back to `UpdateInfoTable.submittedContracts` — i.e. revisions whose submitInfo is this event. The first entry is the contract whose revision was directly stamped at that submit.)
3. If no related submission exists at all → return a hardcoded `'00000000-1111-2222-3333-444444444444'` placeholder for "unmigrated rate." Legacy escape hatch.

This means **parentage is the contract whose submission most recently caused this rate's revision to be stamped**. A withdrawn rate retains its pre-withdrawal parent because its latest submitted revision still has the original `submittedContracts[0]`.

## How linking is established (resolver level)

Linking is one of three operations in the `updateDraftContractRates` discriminated union (`type: 'LINK'`, has `rateID`, no `formData`). The resolver validates:

- **Link target must exist** (`findRateWithHistory` succeeds).
- **Link target's `consolidatedStatus` must NOT be DRAFT or WITHDRAWN.** Eligible: SUBMITTED, RESUBMITTED, UNLOCKED, APPROVED, UNDER_REVIEW, NOT_SUBJECT_TO_REVIEW. (DRAFT excluded because a never-submitted rate has no parent yet — it can only exist as a child of one contract. WITHDRAWN excluded for business reasons.)
- **If already in `knownRateIDs`** (already linked to this contract): re-emits the link in `rateUpdates.link` to allow position reordering. No DB change beyond the join-table replace in postgres step 5.
- **If not** (new link target): pushes to `rateUpdates.link` to create a new `DraftRateJoinTable` row.

The companion enforcement: `UPDATE` requires `rateToUpdate.parentContractID === contract.id`. **A non-parent contract can LINK but never UPDATE.** This is the rule that makes parentage exclusive.

## How linking is recorded in the DB

Linking is identical to child-attachment at the join-table level — same `DraftRateJoinTable` and `SubmissionPackageJoinTable` rows. The difference is purely in the rate's own submission history:

- **Child rate**: has a revision stamped by this contract's submission (`submitInfo.submittedContracts[0].contractID === thisContract.id`). On unlock with the parent, the rate also gets unlocked.
- **Linked rate**: has a revision stamped by *some other* contract's submission. This contract's join row points at the rate, but the rate's revision predates this submission. On unlock with this contract, the linked rate is **not** unlocked.

Per submission, the rate appears in `SubmissionPackageJoinTable` with `(contractRevisionID, rateRevisionID, ratePosition)` regardless of whether it was a child or linked at that point. The rate's revision ID stays the same across submissions where it's linked but not edited — that's how the snapshot says "this submission included rate X at revision Y."

## Behavior at submit (with linked rates)

In `submitContractInsideTransaction` walking `currentContract.draftRates`:
- `rate.parentContractID === contractID && rate.draftRevision` → `unsubmittedChildRevs[]` (gets stamped).
- Other rates → must already have a submitted revision; collected in `linkedRateRevs[]` (only used for assertion — error if missing).

Only child rate IDs go into `submitContractAndOrRates` for stamping. Linked rates appear in phase 4 via the `DraftRateJoinTable.findMany({ contractID })` walk — every join row produces a link in `linksToCreate[]`, and any rate whose latest submitted revision wasn't just stamped (i.e. linked rates) is pushed to `submissionRelatedRateRevs`. The linked rate's existing revision ID becomes the `rateRevisionID` in the new `SubmissionPackageJoinTable` rows.

The new `UpdateInfoTable` event then `relatedRates.connect`s those linked rate revisions. So from the linked rate's perspective, its revision now has another `relatedSubmissions` entry — that's how the rate's `packageSubmissions` history grows when a linked contract submits.

## Behavior at unlock (with linked rates)

In `unlockContractInsideTransaction`'s child-rate filter (step 3 of the unlock walkthrough): a rate is unlocked alongside the contract iff **its latest submitted revision's `submittedContracts[0].contractID === contractID`**. Linked rates fail this check because their latest submitted revision was stamped by a *different* contract. So:

- **Children get a new unlocked revision** (and become editable from this contract).
- **Linked rates' revisions are not touched.** They keep their existing status (SUBMITTED / RESUBMITTED / etc.).
- **Both get a `DraftRateJoinTable` row** for the unlocked contract, derived from the last submission's package. The contract sees them all as `draftRates`; the parser distinguishes by examining each rate's own status and parentage.

A consequence: from a linked contract's perspective, you cannot trigger an edit of a linked rate. To edit a linked rate's form data you must go through that rate's parent contract (unlock the parent, then edit via the parent's `updateDraftContractRates`).

## Behavior at withdraw rate (`withdrawRate.ts`)

Withdrawing a rate has to detach it from every contract it's currently submitted/linked to and resubmit each of those contracts without the rate. The postgres flow:

1. Collect all `contractIDs` the rate is linked to: union of (a) every contract in any of the rate's `relatedSubmissions[].submittedContracts`, plus (b) every contract in current `DraftRateJoinTable` rows.
2. For each contract:
   - If APPROVED → throw error (cannot withdraw a rate from an approved contract).
   - If SUBMITTED/RESUBMITTED/WITHDRAWN → unlock the contract first (creates a new draft revision via `unlockContractInsideTransaction`). Mark the contract for inclusion in `withdrawnFromContracts` (drives the `WithdrawnRatesJoinTable` rows on the rate).
   - If UNLOCKED with a prior submission that included the rate → also mark for `withdrawnFromContracts`.
3. Remove the rate from the contract's `draftRates` set, then call `updateDraftContractRatesInsideTransaction` to:
   - `update` any remaining child rates (re-emit form data + position).
   - `link` any remaining linked rates (re-emit position).
   - The withdrawn rate is implicitly removed by being absent from the new join set.
4. If the contract was originally locked → resubmit it via `submitContractInsideTransaction`. This generates a new `UpdateInfoTable` event whose package no longer includes the withdrawn rate. The rate's prior submission has the rate; the new one doesn't — encoded as cause `RATE_UNLINK` from both perspectives.
5. After all contracts are processed, resubmit the rate independently (via `submitRateInsideTransaction`) so the rate's own history records the withdraw.
6. Append a `RateActionTable` row (`actionType: 'WITHDRAW'`) and create `WithdrawnRatesJoinTable` rows linking the rate to each contract it was withdrawn from.

End state: rate's `consolidatedStatus = WITHDRAWN`, no contract has the rate in its draft set, every previously-linked contract has been resubmitted to a package without the rate, and the rate's `withdrawnFromContracts` field on the domain model lists every contract this severed it from.

## Parent reassignment (`reassignParentContract.ts` and `getNewParentContract`)

When a parent contract is withdrawn or otherwise becomes invalid, a rate that's still linked to other contracts may need a new parent. Two pieces:

### `getNewParentContract` — the picker

In `prismaSharedContractRateHelpers.ts`. Walks the rate's last submission package's contract list and picks a new parent by status preference (excluding the current parent and any WITHDRAWN contracts):

1. SUBMITTED / RESUBMITTED → preferred (break immediately).
2. UNLOCKED → second choice.
3. APPROVED → last resort.

Returns `{ contractID, status }` or undefined if no candidate exists. Called from withdraw flows.

### `reassignParentContractInTransaction` — the executor

Given a new parent contract, the rate IDs to reassign, the new parent's status, and ID/programs:

1. **If new parent is UNLOCKED** → just read its current draft state.
2. **Otherwise** (SUBMITTED / APPROVED) → unlock the new parent (creating a draft revision) so a submit can run on it.
3. Build `ratesToSubmit` = (existing children of the new parent) ∪ (the rates being reassigned). Existing linked rates that aren't being reassigned are excluded — they stay as links and aren't re-stamped.
4. Call `submitContractAndOrRates(tx, newParentID, ratesToSubmit, ...)`. Each rate in `ratesToSubmit` gets its draft revision stamped with the new submit event, including the rates being reassigned. **The reassigned rate's latest submitted revision now has `submittedContracts[0] = newParentID` — which is what `getParentContractID` will return as the new parent.**
5. **If original status was UNLOCKED** → re-unlock the new parent to put it back in UNLOCKED state. Uses `manualCreatedAt: now + 50ms` to ensure the post-reassignment unlock revision sorts after the rate revisions for reliable history ordering.

Mechanism summary: parent reassignment is just a submission of the new parent contract that includes the rate. Because submit stamps each included rate's draft revision with the contract's submit info, and because the rate must already have been unlocked (for it to have a draft revision to stamp), the rate effectively gets re-parented by being submitted under a new contract. The previous parent contract no longer holds the latest submission of the rate.

## Quick reference — parent-only operations vs. any-contract operations

| Operation | Who can do it | Why |
|---|---|---|
| Edit rate form data (`UPDATE` in `updateDraftContractRates`) | Parent only | `parentContractID === contract.id` enforced |
| Add a rate as a child (`CREATE`) | Any contract; that contract becomes the new rate's parent on first submit | Net-new rate |
| Link to an existing rate (`LINK`) | Any contract (target must not be DRAFT or WITHDRAWN) | Linking is a join-table-only operation |
| Unlink (`UNLINK`/`DELETE`) | The contract being edited | Removes its own join row only |
| Unlock the rate (drag along with contract unlock) | The parent contract's unlock | `submittedContracts[0].contractID === contractID` filter |
| Standalone unlock the rate (`unlockRate` resolver) | CMS, but only via the parent contract — the resolver fetches `rate.parentContractID` and validates the parent's status (not WITHDRAWN/APPROVED) | Linked rates aren't separately unlockable; they unlock via their parent |
| Withdraw the rate | CMS; affects every contract the rate is linked to (must not be APPROVED) | `withdrawRate` walks all linked contracts |
| Reassign parent | CMS via `reassignParentContract`, typically as part of withdraw-parent flow | Simulates a submit by the new parent |

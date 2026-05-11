# Withdraw contract (and contrasts with withdraw rate)

Withdraw contract is the most orchestration-heavy of the contract mutations. It marks a contract as `WITHDRAWN` while handling its child rates differently depending on whether they have somewhere else to go: child rates with a viable alternate parent are **reassigned** (they survive on another contract), and child rates without one are **withdrawn alongside** the contract. Linked rates are untouched. The mechanism reuses `unlockContract`, `submitContractAndOrRates`, and `reassignParentContractInTransaction` rather than introducing new low-level operations.

For the underlying operations this composes, see `05-submit-unlock-resubmit.md` and `06-linked-rates.md` (which also covers `withdrawRate.ts`).

## Resolver (`services/app-api/src/resolvers/contract/withdrawContract.ts`)

1. **OAuth `canOauthWrite`** + **CMS-only** (`hasCMSPermissions`).
2. **Fetch contract** via `findContractWithHistory`.
3. **Status guard**: `consolidatedStatus` ∈ {`SUBMITTED`, `RESUBMITTED`, `NOT_SUBJECT_TO_REVIEW`}. Stricter than withdraw-rate (which also allows `UNLOCKED`). Excluded: DRAFT, UNLOCKED, APPROVED, WITHDRAWN, UNDER_REVIEW (UNDER_REVIEW is a reviewStatus that consolidates to its underlying status — a SUBMITTED+UNDER_REVIEW contract reads as `consolidatedStatus = SUBMITTED` and is allowed; UNDER_REVIEW only gates if it's the consolidated value, which happens when status is DRAFT/UNLOCKED — both already excluded).
4. **Call `store.withdrawContract({ contract, updatedByID, updatedReason })`**.
5. **Post-side-effects**: contract zips, rate zips, find state analysts, send `sendWithdrawnSubmissionCMSEmail` + `sendWithdrawnSubmissionStateEmail` with `ratesForDisplay` (the list of rates withdrawn alongside).

## Postgres (`services/app-api/src/postgres/contractAndRates/withdrawContract.ts`)

`withdrawContract` opens a `client.$transaction` (timeout 30000ms — longer than default because this can fan out to many sub-operations). All work happens in `withdrawContractInsideTransaction`.

### Step 1 — Categorize child rates

`latestSubmission = contract.packageSubmissions[0]`; iterate the latest submission's `rateRevisions` and fetch each rate (with latest review action + revisions including `relatedSubmissions`+`submittedContracts`). For each rate, three buckets:

- **Skip** if already withdrawn (`reviewStatusActions[0]?.actionType === 'WITHDRAW'`) — already in the desired final state.
- **Skip** if `getParentContractID(rate.revisions) !== contract.id` — this is a **linked rate**. Linked rates stay attached to their parent contract; withdrawing this contract doesn't touch them. (Their join row to this contract will disappear naturally via the unlock+resubmit step below removing them from the package.)
- **Reassign** if `getNewParentContract(rate.revisions)` returns a candidate. Push to a per-contract hashmap `reassignParentContracts[newParentContractID]` so multiple rates to the same new parent share one reassignment call. The picker prefers SUBMITTED/RESUBMITTED → UNLOCKED → APPROVED (excluding the current parent and any WITHDRAWN candidates).
- **Withdraw alongside** if no viable new parent exists. Push to `ratesToWithdraw[]`. Sanity check: the rate's latest revision must have `submitInfo` (else throw — child rate is unsubmitted, should be impossible because we already filtered to rates from the latest submission).

### Step 2 — Unlock the contract

`unlockContractInsideTransaction(tx, { contractID, unlockedByUserID: updatedByID, unlockReason: 'Withdraw submission. ${updatedReason}' })`. Per the unlock walkthrough this:

- Creates a new `UpdateInfoTable` event row.
- Inserts a new `ContractRevisionTable` row with `unlockInfoID` set, `submitInfoID: null`, copying form data and child collections from the latest submitted revision.
- For every child rate (`getParentContractID === contractID`), inserts a new `RateRevisionTable` row sharing the same unlock event.
- Recreates `DraftRateJoinTable` rows from the last submission's package — child rates AND linked rates both get rows.

After step 2, the contract is in UNLOCKED state with draft revisions on every child rate, ready to be re-stamped by either reassignment or the resubmit-then-withdraw flow.

### Step 3 — Reassign child rates that have viable new parents

For each `(newParentID, { rates, contractStatus })` entry in `reassignParentContracts`:

```
await reassignParentContractInTransaction(tx, {
    contractID: newParentID,
    rates: [{ rateID, rateName }, ...],
    contractStatus: <new parent's current status>,
    updatedByID,
    statePrograms,
})
```

Per the reassignment walkthrough (`06-linked-rates.md`): this unlocks the new parent (if locked), resubmits it including the reassigned rates so each rate's draft revision (the one created in step 2) gets stamped with the new parent's submit event. After this call, those rates' `submittedContracts[0].contractID === newParentID` — so subsequent calls to `getParentContractID` return the new parent. The reassigned rate is no longer a child of the contract being withdrawn.

If the new parent was originally UNLOCKED, it is re-unlocked at the end of `reassignParentContractInTransaction` (with `manualCreatedAt: now + 50ms` for ordering), restoring its prior state with the new rate as a child.

### Step 4 — Resubmit this contract with rates-to-withdraw

```
submitContractAndOrRates(
    tx,
    contract.id,
    ratesToWithdraw.map(r => r.id),
    updatedByID,
    `CMS withdrew the submission from review. ${updatedReason}`,
)
```

This stamps the contract's unlock-created revision (now has both `unlockInfo` and `submitInfo` → status RESUBMITTED) AND stamps each `ratesToWithdraw` rate's unlock-created revision. The new `SubmissionPackageJoinTable` snapshot includes the contract revision linked to each non-reassigned rate's revision. **Rates that were reassigned in step 3 are NOT in `ratesToWithdraw` and are no longer in the contract's `DraftRateJoinTable` after their reassignment, so they don't appear in this snapshot.**

The package diff (4-pass algorithm in `submitContractAndOrRates`) automatically encodes the difference between the previous submission and this one — reassigned rates appear as `RATE_UNLINK` causes from this contract's perspective; from the rate's perspective the reassignment shows up in its history as a `RATE_LINK` to the new parent.

### Step 5 — Append `WITHDRAW` actions

- Single `tx.contractTable.update` adds a `reviewStatusActions.create({ updatedByID, updatedReason, actionType: 'WITHDRAW' })` to this contract.
- Loop `ratesToWithdraw`: for each, `tx.rateActionTable.create({ updatedByID (via updatedBy.connect), actionType: 'WITHDRAW', rate.connect: { id } })` and append `{ id, rateCertificationName }` to `ratesForDisplay` (used by emails).

After this step the consolidated statuses flip:
- **Contract** `consolidatedStatus`: `getContractReviewStatus` reads the latest action (`WITHDRAW`) → `WITHDRAWN` reviewStatus. Per `getConsolidatedContractStatus`, `WITHDRAWN` reviewStatus wins → `consolidatedStatus = WITHDRAWN`. The underlying `status` is still `RESUBMITTED` (latest revision has both submit and unlock info), but it's masked.
- **Each withdrawn rate** `consolidatedStatus`: `getRateReviewStatus` reads `WITHDRAW` → `WITHDRAWN` reviewStatus. Per `getConsolidatedRateStatus`, `WITHDRAWN` wins → `consolidatedStatus = WITHDRAWN`. Underlying `status` still `RESUBMITTED`.
- **Reassigned rates**: status is whatever the new parent put them in (typically `SUBMITTED`/`RESUBMITTED` depending on the new parent's flow). They are not withdrawn.
- **Linked rates** that were skipped in step 1: status unchanged.

### Step 6 — Validate and return

`findContractWithHistory(tx, contract.id)`; assert `consolidatedStatus === 'WITHDRAWN'` (else throw). Return `{ withdrawnContract, ratesForDisplay }` to the resolver.

## Why this shape

- Withdraw contract reuses unlock + resubmit because the existing pattern already creates the right revision rows and event rows. Adding `WITHDRAW` to `ContractActionTable` is the single bit of new state — the consolidated-status helper does the rest.
- Reassignment is the survival path for a child rate that's still useful elsewhere. Without it, withdrawing a contract would orphan rates that other contracts still reference.
- The hashmap `reassignParentContracts[contractID]` exists so multiple rates being moved to the same new parent are handled in one reassignment call (one unlock+resubmit cycle on that new parent), not N.
- `ratesToWithdraw` includes only child rates with no alternate parent, so the resubmit's submit-rate-revision stamping aligns 1:1 with the rates getting `WITHDRAW` actions in step 5.

## Contrasts with withdraw rate

| | Withdraw rate (`withdrawRate.ts`) | Withdraw contract (`withdrawContract.ts`) |
|---|---|---|
| Status precondition | Rate ∈ {SUBMITTED, RESUBMITTED, UNLOCKED}; parent contract ∈ {SUBMITTED, RESUBMITTED, WITHDRAWN} | Contract ∈ {SUBMITTED, RESUBMITTED, NOT_SUBJECT_TO_REVIEW} |
| Affects N other entities? | Walks every contract the rate touches (parent + linked + draft). Unlocks + resubmits each. | Walks child rates only. Linked rates untouched. |
| Reassignment? | No | Yes — child rates with viable alternate parent get reassigned via `reassignParentContractInTransaction` |
| Final action row | `RateActionTable` `WITHDRAW` on the rate | `ContractActionTable` `WITHDRAW` on the contract + `RateActionTable` `WITHDRAW` on each unreassigned child rate |
| Revision shape after | New unlock+resubmit revisions on every contract that linked the rate | New unlock+resubmit revision on this contract + on every withdrawn child rate; reassigned rates have new revisions stamped under their new parent |
| `WithdrawnRatesJoinTable` populated? | Yes — one row per contract this rate was severed from | No — withdraw contract uses the action table, not the join table |
| Cause in `packageSubmissions` from each affected entity's perspective | `RATE_UNLINK` from contracts that now lose the rate | `RATE_UNLINK` from this contract for reassigned rates (they're gone from this contract's package); `RATE_LINK` from new parent's perspective for reassigned rates |

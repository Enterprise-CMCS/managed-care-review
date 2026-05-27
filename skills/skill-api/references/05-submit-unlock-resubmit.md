# Submit, unlock, and resubmit

The three core state-flip operations. They share important machinery — submit and resubmit are literally the same code path; unlock is the inverse direction with a critically different DB shape.

For draft-only mutations (insert, update form data, reconcile rates), see `04-insert-and-update.md`. For withdraw, see `07-withdraw.md`. For status derivation, see `08-derived-state.md`. For linked-rate behavior across these operations, see `06-linked-rates.md`.

---

## Submitting a contract (with or without rates)

Submission flips revisions from draft → submitted by attaching a single `UpdateInfoTable` event to the latest contract revision and any unsubmitted child rate revisions, then materializing the full contract↔rate connection set as `SubmissionPackageJoinTable` rows pointing at that event. It is also the first time a contract or rate's revision becomes immutable — every prior write was in-place on the draft revision.

### Resolver layer (`services/app-api/src/resolvers/contract/submitContract.ts`)

1. **OAuth `canWrite`** — write grant required.
2. **State user only**, and the user's `stateCode` must match the contract's. CMS users cannot submit.
3. **Fetch contract** via `findContractWithHistory`.
4. **`validateStatusAndUpdateInfo`**:
   - `DRAFT` (initial submission) → `updateInfo.updatedReason = 'Initial submission'` (default already set).
   - `UNLOCKED` (resubmission) → `submittedReason` is **required**; it becomes `updatedReason`. Missing reason → `userInputError('Resubmission requires a reason')`.
   - `SUBMITTED` / `RESUBMITTED` → reject with `INVALID_PACKAGE_STATUS`.
   - This means submission is only valid from DRAFT or UNLOCKED.
5. **Programmer-error guard**: `contractWithHistory.draftRevision` must exist (covered by status check, but explicit).
6. **CHIP-only sanitization** (`isCHIPOnly(contract)`): wipes provisions not in `generateApplicableProvisionsList(contract)` and filters `federalAuthorities` to `federalAuthorityKeysForCHIP`. **In-memory mutation** of `contractWithHistory.draftRevision.formData`. The codebase comment notes this is done at submit (not on every update) so users can still flip submission types pre-submit without losing data.
7. **Filter linked rates out for parse**: `draftRatesWithoutLinkedRates = draftRates.filter(r => r.draftRevision?.formData)` — only rates with their own draft revision (i.e. child rates being submitted along with the contract). Linked rates are submitted+immutable so their draftRevision is empty. They get added back after parse.
8. **Validation parse**: `parseContract` (or `parseEQROContract`) over the contract + child draft rates. Returns Error → `userInputError`. Then `parsedContract.draftRates = contractWithHistory.draftRates` (linked rates restored).
9. **CONTRACT_ONLY pruning**: if `submissionType === 'CONTRACT_ONLY'` but `draftRates.length > 0`, walk every draft rate. Child rate (`revisions.length === 0`) → push to `delete`. Linked rate → push to `unlink`. Call `store.updateDraftContractRates`. (Sanity check: never-submitted rate must be parented to *this* contract; otherwise hard error.)
10. **CONTRACT_AND_RATES validation** (only when `submissionType === 'CONTRACT_AND_RATES'`):
    - Must have at least one rate.
    - No rate may be `WITHDRAWN`.
    - **DSNP=false reconciliation**: if `dsnpContract === false`, walk `draftRates`; for child rates clear `formData.rateMedicaidPopulations = []`; for linked rates re-emit a `link` entry; call `store.updateDraftContractRates`. (Linked rates are passed through unchanged but re-asserted in the link list.) Position is `idx + 1` from the iteration.
11. **Persist final form data**: `store.updateDraftContractWithRates(...)` writes the (possibly CHIP-pruned) form data back to the draft revision before submission. *Why this exists*: step 6 mutates form data in memory but doesn't write it. This is the actual write. The doc arrays are projected to the schema-required subset (`name`, `s3URL`, `sha256`, `s3BucketName`, `s3Key`) — `dateAdded`, `downloadURL`, etc. are stripped.
12. **`store.submitContract({ contractID, submittedByUserID, submittedReason, chipSubmissionAutomationFlag })`** — the postgres call (described below). The flag is `featureFlags['chip-submission-automation']`.
13. **Post-submit side-effects** (best-effort, log-and-continue if these error):
    - `documentZip.createContractZips(submitContractResult, span)` and `createRateZips(...)`.
    - `findStateAssignedUsers(stateCode)` for state analyst recipients.
    - `contractSubmitters(submitContractResult)` for submitter recipients.
    - `findStatePrograms(stateCode)` (this one IS thrown on error).
    - Email dispatch: 4 paths combining `{ SUBMITTED | RESUBMITTED }` × `{ EQRO | non-EQRO }`. Email failure throws `EMAIL_ERROR`.

Returns `{ contract: submitContractResult }`.

### Postgres outer (`services/app-api/src/postgres/contractAndRates/submitContract.ts`)

`submitContract(client, args)` → opens a `client.$transaction` and:

1. **`submitContractInsideTransaction(tx, args)`**:
   - `findContractWithHistory(tx, contractID)` for current state.
   - Guard: `draftRevision && draftRates` must both be present.
   - `tx.contractRevisionTable.findFirst({ where: { contractID, submitInfoID: null } })` — the actual draft revision row. NotFoundError if missing.
   - **Walk `draftRates`**, separating into:
     - **Child draft revs** (`rate.parentContractID === contractID && rate.draftRevision` exists) → `unsubmittedChildRevs[]`. These get submitted alongside the contract.
     - **Child without draft revision** (shouldn't happen post-reverse-unlock-of-rates, logged) → fall back to latest submitted rev or error.
     - **Linked (non-child) rates** → must already have a submitted revision (`rate.revisions[0]`); error otherwise. Just goes into `linkedRateRevs[]` for reference (not actually used by the call).
   - **Call `submitContractAndOrRates(tx, contractID, unsubmittedChildRevs.map(r => r.rateID), submittedByUserID, submittedReason)`** — does all the actual mutation.
   - Re-fetch via `findContractWithHistory(tx, contractID)`.

2. **EQRO review determination** (only if `result.contractSubmissionType === 'EQRO'`):
   `eqroContractReviewDeterminationAction(tx, result)` — runs `eqroValidationAndReviewDetermination` on the latest submission's contract revision form data; inserts a `ContractActionTable` row with `actionType: UNDER_REVIEW` or `NOT_SUBJECT_TO_REVIEW` (no `updatedByID`). Re-fetch.

3. **HEALTH_PLAN review determination** (only if flag `chip-submission-automation` and `contractSubmissionType === 'HEALTH_PLAN'`):
   `healthPlanContractReviewDeterminationAction(tx, result)` — runs `healthPlanReviewDetermination`; inserts `ContractActionTable` row similarly. Re-fetch.

The two review-determination functions both require status ∈ {SUBMITTED, RESUBMITTED} and reviewStatus ∉ {APPROVED, WITHDRAWN}, otherwise error.

Errors from the inner function are thrown to roll back the transaction and caught at the outer wrapper, which `parseErrorToError`s and returns.

### Postgres core (`submitContractAndOrRates.ts`)

The mutation engine. All edits are inside the parent transaction. Signature: `(tx, contractID | undefined, rateIDs[], submittedByUserID, submittedReason) => undefined | Error`. Designed so it can submit a contract alone, rates alone, or both — though the codebase only invokes it with a contract + its child rate IDs.

#### Phase 1 — Create the `UpdateInfoTable` event

`tx.updateInfoTable.create({ data: { updatedAt: now, updatedByID, updatedReason } })`. This single row will be referenced by every revision and join row touched in this transaction.

#### Phase 2 — Stamp the contract revision (if `contractID`)

- Find all revisions for the contract (orderBy createdAt desc), take latest. Error if it already has `submitInfo` ("attempted to submit contract with no draft revision").
- Walk **previous revisions in ascending order** to build `prevDocs: { [sha256]: Date }` — the earliest known `dateAdded` per document hash. Falls back to `submitInfo.updatedAt` of the previous rev if the doc itself has no `dateAdded`.
- `tx.contractRevisionTable.update` on the latest:
  - `submitInfoID: submitInfo.id`
  - `contractDocuments.updateMany` to set `dateAdded = prevDocs[sha256] ?? currentDateTime` per doc.
  - Same for `supportingDocuments`.

The doc-history walk preserves "first-submitted-on" semantics across resubmissions: a re-uploaded identical document keeps its original `dateAdded`.

#### Phase 3 — Stamp the rate revisions

- Fetch all draft rate revisions for `rateIDs` where `submitInfo: null`. Count must equal `rateIDs.length`; otherwise error ("Not all rates to submit had draft revisions").
- Fetch previously-submitted revisions for the same `rateIDs` (with `revisionOverrides` for admin-set `dateAdded`). For each, build `prevRateDocs: { [`${rateID}-${sha256}`]: Date }` — keyed by `(rateID, sha256)` so the same hash on different rates stays separate. Per doc, prefer override `dateAdded` → doc's own `dateAdded` → `submitInfo.updatedAt`. If multiple prior revs have the same hash, **the earliest wins** (revisions are in ascending order, but overrides may push earlier).
- For each draft rate revision: `tx.rateRevisionTable.update` with `submitInfoID: submitInfo.id` plus `dateAdded` updates on `rateDocuments` and `supportingDocuments`, falling back to `currentDateTime` if no prior submission.

#### Phase 4 — Compute the related set and links

Maintains three buffers:
- `submissionRelatedContractRevs[]` — contract revisions touched but not newly submitted by this event.
- `submissionRelatedRateRevs[]` — rate revisions touched but not newly submitted.
- `linksToCreate[]` — `(contractRevID, rateRevID, ratePosition)` triples to materialize as `SubmissionPackageJoinTable` rows.

The algorithm walks four passes:

**4a. Submitted contract → its draft rates.** Read `DraftRateJoinTable.findMany({ contractID })`, including each rate's latest *submitted* revision. For every join row:
- Latest submitted rate rev must exist (error otherwise).
- If rate's latest submitted revision was NOT just stamped with this submitInfo → push to `submissionRelatedRateRevs` (it's a linked rate).
- Always push a link `(submittedContractRev.id, rateRev.id, ratePosition)`.

Then look up the contract's most recent prior `UpdateInfoTable` event (via `relatedContracts.some({ contractID })`) and walk its `submissionPackages`. Any rate that was linked then but is NOT in the current draft set → push that disconnected rate's revision to `submissionRelatedRateRevs` (so the next package snapshot can record what got unlinked).

**4b. Submitted rates → their draft contracts.** Read `DraftRateJoinTable.findMany({ rateID in rateIDs })`, including each contract's latest submitted revision and each rate's latest submitted revision. For every join:
- Skip if the contract has never been submitted (`draftContract.revisions[0]` undefined).
- Track `currentSubmittedRateConnections[rateID].push(contractID)` so phase 4c can detect disconnections.
- If the contract's latest submitted rev wasn't just stamped → push to `submissionRelatedContractRevs` (dedupe).
- Push a link `(contractRevID, rateRevID, ratePosition)` if not already there.

**4c. Each newly-submitted rate's prior connections.** For each newly-stamped rate rev: find its latest prior `UpdateInfoTable` event (via `relatedRates.some({ rateID })`); for any contract that was linked then but is NOT in `currentSubmittedRateConnections[rateID]` → push to `submissionRelatedContractRevs` (a now-disconnected contract).

**4d. Forward links from related entities.**
- For each rate in `submissionRelatedRateRevs`: find its latest prior submission; copy every link from that snapshot **except** ones pointing at the contract being submitted now. (Programmer-error if the rate has no prior submission.)
- For each contract in `submissionRelatedContractRevs`: find its latest prior submission; copy every link from that snapshot **except** ones pointing at any rate being submitted now.

The forwarding pass is what makes a rate's package snapshot stay coherent on the *other* contracts it's linked to: when contract A submits and rate X is linked to both A and B, this submission's package needs links A↔X (new) AND B↔X (forwarded) so B's package history at this point in time still shows X attached.

#### Phase 5 — Write the related-set and links

- Compute `allContractRevisionIDsRelatedToThisSubmission` = related contracts + (newly submitted contract rev if any).
- Compute `allRateRevisionIDsRelatedToThisSubmission` = newly submitted rate revs + related rate revs.
- Dedupe `linksToCreate` by `(contractRevID:rateRevID)`.
- Single `tx.updateInfoTable.update`:
  - `relatedContracts.connect: [...]` (M:N back-link to revisions)
  - `relatedRates.connect: [...]`
  - `submissionPackages.create: uniqueLinks.map(...)` — creates `SubmissionPackageJoinTable` rows.

After this write the snapshot is durable. `packageSubmissions` projections (per-perspective) read these rows back via `revision.relatedSubmis(s)ions → submissionPackages`.

#### Phase 6 — Clean up `DraftRateJoinTable`

Goal: remove draft-rate join rows that no longer represent a draft state. A join row should exist iff at least one side is still a draft.

- Read all `DraftRateJoinTable` rows touching the submitted `contractID` or any `rateID` in this submission. Include each side's latest revision.
- For each: if both `latestContractRev.submitInfoID !== null` AND `latestRateRev.submitInfoID !== null` → remove (`tx.draftRateJoinTable.delete` by composite PK `contractID_rateID`).
- Otherwise leave (e.g. linking to a rate whose contract is still draft elsewhere).

This is what flips a contract from "has draft rates" to "fully submitted" in subsequent reads.

### What changes for status / packageSubmissions afterward

- The newly-submitted contract revision now has `submitInfo` set:
  - DRAFT → SUBMITTED.
  - UNLOCKED (had `unlockInfo`) → RESUBMITTED (now has both).
- Same for each newly-submitted child rate revision.
- Linked rates are unchanged on the rate side; they appear in this submission's package snapshot via `submissionRelatedRateRevs` + forwarded links.
- A rate's package history grows: existing linked contracts get a new `packageSubmissions` entry (cause `RATE_LINK` if newly attached, `RATE_SUBMISSION` if its own rev was stamped, `RATE_UNLINK` if previously linked but absent here, `CONTRACT_SUBMISSION` for the contract-side cause). The `*WithCause` derivation lives in the resolver, not here — see `08-derived-state.md`.
- `DraftRateJoinTable` is pruned for the now-fully-submitted pairs but retained for any cross-link still touching a draft.

### What is NOT touched by submit

- `ContractTable` / `RateTable` parents (no identity columns change).
- Other contract revisions (only the latest draft is stamped).
- `WithdrawnRatesJoinTable` (separate withdraw flow).
- `ContractActionTable` / `RateActionTable` — these get appended only by the EQRO/HEALTH_PLAN review-determination functions in the outer `submitContract.ts`, *after* `submitContractAndOrRates` returns.
- Form data — already written by the resolver via `updateDraftContractWithRates` before this call. Submit only changes `submitInfoID` and document `dateAdded`.

---

## Unlocking a contract (and its child rates)

Unlock is the inverse direction of submit, but with a critically different DB shape: instead of stamping the existing draft revision (as submit does), unlock **creates a brand-new revision row** as an unlocked copy of the latest submitted revision. The submitted revision stays untouched, preserving history. The newly-inserted revision has `unlockInfo` set and `submitInfoID` null, which the parser reads as status `UNLOCKED`.

### Resolver layer (`services/app-api/src/resolvers/contract/unlockContract.ts`)

1. **OAuth `canOauthWrite`** — write grant required.
2. **CMS-only** (`hasCMSPermissions(user)`). State users **cannot** unlock — symmetric with submit, which is state-only.
3. **Fetch contract** via `findContractWithHistory`. NotFoundError → `userInputError`.
4. **Status guard**: resolver-level allowlist on `consolidatedStatus`.
   - Allowed: `SUBMITTED`, `RESUBMITTED`, `NOT_SUBJECT_TO_REVIEW`.
   - Rejected: `DRAFT`, `UNLOCKED`, `APPROVED`, `WITHDRAWN`.
   - Why `NOT_SUBJECT_TO_REVIEW` is allowed: it is a review-status overlay on a still-submitted package, not a draft/unlocked state. The package still has no `draftRevision`.
   - This rule intentionally lives in the resolver. The store does **not** re-check review/consolidated status; it only enforces revision-shape invariants after the row lock is acquired.
5. **`store.unlockContract({ contractID, unlockReason: unlockedReason, unlockedByUserID })`** — the postgres call (described below).
6. **Post-unlock side-effects**:
   - `findStateAssignedUsers(stateCode)` for state analyst recipients (best-effort; logs and continues).
   - `contractSubmitters(unlockContractResult)` for submitter recipients.
   - `findStatePrograms(stateCode)` (thrown on error).
   - **Two emails** dispatched: `sendUnlockContractCMSEmail` and `sendUnlockContractStateEmail`. Email failure → `EMAIL_ERROR`.

   `updateInfo` for emails is reconstructed in-resolver (`updatedAt: new Date()`, `updatedBy: user`, `updatedReason: unlockedReason`). The resolver comment notes `updatedAt` is "technically not right" — the actual unlock event's timestamp lives on the `UpdateInfoTable` row created in postgres, but the emailer only receives this resolver-built copy.

Returns `{ contract: unlockContractResult }`.

### Postgres outer (`services/app-api/src/postgres/contractAndRates/unlockContract.ts`)

`unlockContract(client, args)` → opens a `client.$transaction`, calls `unlockContractInsideTransaction(tx, args)`, throws on Error to roll back. Args: `{ contractID, unlockedByUserID, unlockReason, manualCreatedAt? }` — `manualCreatedAt` is for callers running multiple unlock-flavored prisma ops in one transaction needing sequential timestamps.

### `unlockContractInsideTransaction` algorithm

#### Step 1 — Create the unlock event

`tx.updateInfoTable.create({ data: { updatedAt: manualCreatedAt ?? now, updatedByID, updatedReason } })`. **This single event row is shared between the contract and every child rate** unlocked in this call — that's what makes them "unlocked together" in a way the parser can later detect.

#### Step 2 — Find latest contract revision

`tx.contractRevisionTable.findFirst({ where: { contractID }, orderBy: { createdAt: 'desc' } })` with includes:
- `contractDocuments`, `supportingDocuments`, `stateContacts` (each orderBy `position` asc) — needed for copy-paste into the new revision.
- `relatedSubmisions` (typo, contract-side relation) take 1 orderBy `updatedAt` desc → `submissionPackages` with `rateRevision`, ordered by `ratePosition`. This is the most recent submission's package snapshot, which determines which rates were attached as of last submission.

Guards:
- NotFoundError if no current revision.
- Programming error if `currentRev.submitInfoID` is null (already unlocked, because the latest active revision is not currently submitted).

Important distinction: the store-level guard is narrower than the resolver-level rule. The resolver decides whether a contract **should be allowed** to unlock based on domain status (`consolidatedStatus`). The store only verifies that the latest active revision is still a submitted revision that can be copied into a new unlocked draft. That means store callers still cannot unlock an already-unlocked contract, even though the resolver may allow `NOT_SUBJECT_TO_REVIEW` as an eligible submitted state.

#### Step 3 — Identify child rates to unlock alongside

A rate is unlocked together with the contract iff **both**:
- It currently appears in the latest submission's package for this contract revision (`currentRev.relatedSubmisions[0].submissionPackages` filtered to `contractRevisionID === currentRev.id`).
- Its **latest submitted revision's** `submitInfo.submittedContracts[0].contractID === contractID`. This filters out rates that were submitted with this contract historically but have since been **reassigned** (i.e. submitted under another contract during a withdraw + new-parent flow) or **withdrawn from this contract**.

The query for candidate rates is broad — `rateTable` where any revision's `submitInfo.submittedContracts` includes this contractID — then narrowed by the two conditions above. Each candidate's `revisions` is `take: 2` (with `submitInfo.submittedContracts` and `unlockInfo`) since "only two revision states are possible: mutually unlocked or submitted."

Result: `childRateIDs[]` — rates that are the contract's responsibility to unlock.

#### Step 4 — Unlock each child rate

For each rate in `childRateIDs`: call `unlockRateInDB(tx, childRateID, unlockInfo.id)`. **All child rates share the same `unlockInfo.id`** as the contract — the reason this is one transaction with one event row.

Current product invariant: rates are not unlocked independently. They are submitted as part of a contract, and they are unlocked when their associated contract is unlocked. Treat `unlockRateInDB` here as the rate-side engine used by contract unlock, not evidence that the standalone `unlockRate` resolver must have feature parity with `unlockContract`.

Detail: `unlockRateInDB` (`unlockRate.ts`) creates a new `RateRevisionTable` row that:
- Connects to `unlockInfo: { id: unlockInfoID }` (the contract's unlock event).
- Copies all rate form-data fields, documents, supporting documents, certifying + additional actuary contacts (each via `create` with new UUIDs — old IDs not preserved).
- **`dateAdded` is NOT copied** on the new doc rows. They start without it; the next submit will rebuild it via the `prevRateDocs` walk in `submitContractAndOrRates`.
- Re-connects the deprecated `contractsWithSharedRateRevision` M:N (still maintained even though deprecated).
- Then writes `DraftRateJoinTable` rows from the rate's last submission package's contract revisions (`skipDuplicates: true`). Comment notes this is mainly for the inactive standalone `unlockRate` path — under a contract unlock, the contract's step 7 also writes the same join rows.

Guards inside `unlockRateInDB`: programming error if no current revision found, or if its `submitInfoID` is already null (already unlocked).

#### Step 5 — Compute `relatedRateIDs` for the new draft join

From `currentRev.relatedSubmisions[0].submissionPackages` filtered to entries where `contractRevisionID === currentRev.id` — i.e. the rates that were attached at last submission time. These all become draft rates on the unlocked contract (regardless of whether they are children, linked, or shared).

Note: this set is a superset of `childRateIDs` (children are in here too) but treats them all uniformly for the join — the join table doesn't distinguish parentage.

#### Step 6 — Create the new contract revision (the heart of the unlock)

`tx.contractRevisionTable.create` with:
- `createdAt: manualCreatedAt ?? now`
- `contract.connect: { id: contractID }`
- `unlockInfo.connect: { id: unlockInfo.id }` — this revision was created BY this unlock event.
- `submitInfoID` left unset → status `UNLOCKED` (per `getContractRateStatus` table: unlockInfo set + submitInfo null).
- **Every form-data column copied verbatim** from `currentRev`: `populationCovered`, `programIDs`, `riskBasedContract`, `submissionType`, `submissionDescription`, `contractType`, `dsnpContract`, `contractExecutionStatus`, `contractDateStart`, `contractDateEnd`, `managedCareEntities`, `federalAuthorities`, `inLieuServicesAndSettings`, all `modified*` columns, `statutoryRegulatoryAttestation` + description, plus EQRO fields (`eqroNewContractor`, `eqroProvisionMcoNewOptionalActivity`, `eqroProvisionNewMcoEqrRelatedActivities`, `eqroProvisionChipEqrRelatedActivities`, `eqroProvisionMcoEqrOrRelatedActivities`).
- `contractDocuments`, `supportingDocuments`, `stateContacts` use **`create:` with new UUIDs** copied from current rev (`position`, `name`, `s3URL`, `sha256`, `s3BucketName`, `s3Key` for docs; `position`, `name`, `email`, `titleRole` for contacts). **Document/contact row IDs are NOT preserved across unlock.**
- **`dateAdded` is NOT copied** on the new doc rows — same as the rate side. Re-stamped at next submit.
- `mccrsID` is on the parent `ContractTable`, not the revision, so it isn't part of this copy and is unaffected.

This new revision row is what becomes the contract's `draftRevision` after `findContractWithHistory` re-runs and the parser splits draft from submitted by `submitInfo` presence.

#### Step 7 — Re-establish `DraftRateJoinTable`

```
tx.draftRateJoinTable.createMany({
  data: relatedRateIDs.map((id, idx) => ({ contractID, rateID: id, ratePosition: idx + 1 })),
  skipDuplicates: true,
})
```

`skipDuplicates: true` because `unlockRateInDB` (step 4) already inserted some of these rows from its own perspective. Sequential 1-indexed `ratePosition` derived from the iteration order of `relatedRateIDs` (which preserves the original `ratePosition` ordering from the last submission's snapshot).

#### Step 8 — Re-fetch and finalize

`findContractWithHistory(tx, contractID)` re-reads everything through the parse pipeline. Guards: `draftRevision` and `draftRates` must both exist on the result. Returns the contract spread with `status: 'UNLOCKED'` overridden — this works because the resolver-side type is `UnlockedContractType` (status narrowed to `DRAFT|UNLOCKED`).

### `unlockRate` (inactive standalone-rate path)

`unlockRate(client, args)` is the standalone entry point from the earlier standalone rate submission design. In the current product, rates submit and unlock through their associated contract, so this path is not expected to maintain parity with `unlockContract`. It:
- Accepts either `rateID` or `rateRevisionID` (the latter is a legacy hack noted in code: "this is a hack that should not outlive protobuf"). Resolves `rateRevisionID → rateID` if needed.
- Creates its own `UpdateInfoTable` event row (no shared event in this path — only the rate moves).
- Calls `unlockRateInDB(tx, rateID, unlockInfo.id)`.
- Returns `findRateWithHistory(tx, rateID)`.

Caveat: child-rate unlocks happen via `unlockContractInsideTransaction` so the rate and its parent contract share the unlock event. Independent rate unlock is standalone-rate scaffold; only use it as a parity target if standalone rate submissions are revived.

### Key contrasts with submit

| | Submit | Unlock |
|---|---|---|
| Caller role | State user (state-matched) | CMS user |
| Status precondition | DRAFT or UNLOCKED (`draftRevision` exists) | NOT DRAFT/UNLOCKED (`draftRevision` absent) and not APPROVED |
| Effect on existing draft revision | In-place stamp (`submitInfoID = X`) | n/a (no draft revision exists going in) |
| New revision row created? | No | Yes, copy of latest submitted rev |
| Document/contact row IDs preserved? | Yes (in-place update) | No (new UUIDs in `create`) |
| Doc `dateAdded` handling | Re-stamped from history walk | Left blank, re-stamped at next submit |
| Rates affected | Each child rate's draft rev gets stamped + `SubmissionPackageJoinTable` rebuilt | Each child rate gets a NEW unlocked rev row + `DraftRateJoinTable` rebuilt |
| Event row shared with rates? | Yes (one `UpdateInfoTable` for contract+rates) | Yes (one `UpdateInfoTable` for contract+rates) |
| `SubmissionPackageJoinTable` written? | Yes (snapshot) | No |
| `DraftRateJoinTable` written? | Pruned for fully-submitted pairs | Recreated from last submission's package |
| Review determination side-effect | EQRO/HEALTH_PLAN inserts `ContractActionTable` | None |

### What this implies for status (after unlock)

- Before: latest revision had `submitInfo` set (SUBMITTED, RESUBMITTED, or some review-status state derived from a submitted rev).
- After: a NEW revision is the latest, with `unlockInfo` set + `submitInfoID` null → status `UNLOCKED`.
- `consolidatedStatus`: per `getConsolidatedContractStatus`, `UNLOCKED` beats `NOT_SUBJECT_TO_REVIEW`; otherwise reviewStatus wins if not `UNDER_REVIEW`. So an unlocked contract that previously had `NOT_SUBJECT_TO_REVIEW` shows as `UNLOCKED`, but one that's `APPROVED` or `WITHDRAWN`... can't reach this point because the resolver gates on `APPROVED` and the rates side gates on `WITHDRAWN`-ish via the child-rate filter.
- Each child rate similarly gets a new revision with `unlockInfo` set, status `UNLOCKED`. Linked (non-child) rates already attached at last submission time appear in the new `DraftRateJoinTable` but their own revisions are NOT touched (their status is unchanged — they remain submitted/whatever).

### What is NOT touched by unlock

- Existing submitted revisions (immutable; preserves history).
- `ContractTable` / `RateTable` parent rows.
- `ContractActionTable` / `RateActionTable` (no review-status events).
- `WithdrawnRatesJoinTable`.
- `ContractOverrides` / `RateOverrides`.
- `SubmissionPackageJoinTable` from prior submissions (read but not modified).
- Linked (non-child) rates' revisions — only their join entries get refreshed.

---

## Resubmitting (submit on an unlocked contract)

Resubmission uses the **same code path** as initial submission — there is no separate `resubmitContract` resolver or store function. The differences come from the data state at submit time and a few status-aware branches in the resolver. After resubmit, the revision row is the same one that was created at unlock; only its `submitInfoID` flips from null to set. Combined with the existing `unlockInfoID`, this produces status `RESUBMITTED`.

### Pre-state from unlock

Going into a resubmit, the contract has:
- A revision row created at unlock time with `unlockInfoID` set and `submitInfoID: null`. This is what the parser surfaces as `draftRevision`. Form data is whatever the state user edited during the unlocked period (in-place edits via `updateDraftContract` / `updateDraftContractRates`).
- Documents and state contacts on the revision: a mix of (a) carried-over rows that unlock copied from the prior submitted revision (with new UUIDs and **`dateAdded: null`**) and (b) net-new rows from `updateDraftContract` (also `dateAdded: null` because `formatDocsForPrisma` strips the field).
- `DraftRateJoinTable` rows reconstructed at unlock from the last submission's package, plus any user edits from `updateDraftContractRates` (added/removed/created/linked rates).
- Each child rate that was unlocked alongside has its own new revision row with `unlockInfoID` set, `submitInfoID: null`. Those rates' draft revisions also have docs without `dateAdded`.

### Resolver behavior on UNLOCKED status

(`services/app-api/src/resolvers/contract/submitContract.ts`)

`validateStatusAndUpdateInfo` runs the UNLOCKED branch:
- `submittedReason` is **required** (caller must supply via `input.submittedReason`); missing → `userInputError('Resubmission requires a reason')`.
- The provided `submittedReason` overwrites the default `updateInfo.updatedReason = 'Initial submission'`. This `updateInfo` object is passed to email helpers later; the actual `UpdateInfoTable` row in postgres is created from `submittedReason` directly.

Everything else in the resolver runs identically to initial submit:
- CHIP-only sanitization (in-memory wipe of non-CHIP provisions and authorities).
- Linked-rate filter for parse, then `parseContract` / `parseEQROContract`.
- CONTRACT_ONLY pruning if user changed `submissionType` to `CONTRACT_ONLY` during unlock.
- CONTRACT_AND_RATES validation + DSNP=false reconciliation (clearing `rateMedicaidPopulations` on child rates).
- `updateDraftContractWithRates` to write final form data.
- `store.submitContract({ chipSubmissionAutomationFlag })` — the postgres call.

The post-submit branching is status-aware. `submitContractResult.status` is now `RESUBMITTED` (since the same revision now has both `unlockInfo` and `submitInfo`), so the resolver dispatches to `sendResubmittedCMSEmail` / `sendResubmittedStateEmail` (or the EQRO variants), not the new-contract emails.

### Postgres core behavior on resubmit

The same algorithm in `submitContractAndOrRates.ts` runs unchanged. What's different is the input state at each phase:

**Phase 2 (stamp contract revision)**: the latest revision is the unlock-created one (`submitInfoID: null`). Same `tx.contractRevisionTable.update` sets `submitInfoID = newSubmitInfo.id`. **`unlockInfoID` is NOT in the update data block, so it stays on the row.** Result: the row now has both — status flips UNLOCKED → RESUBMITTED.

The `prevDocs` walk (compute earliest `dateAdded` per sha256 from previous revisions) is what restores the date history that unlock dropped. Because unlock leaves `dateAdded: null` on the new doc rows, but the previous *submitted* revision still has its own doc rows with their original `dateAdded`s. The walk finds those and writes them back onto the resubmitting revision's rows. Net effect: a doc that was carried through unlock unchanged keeps its original "first submitted on" date; a doc the state user added/replaced during the unlocked period gets `currentDateTime`.

**Phase 3 (stamp rate revisions)**: the same applies per-rate. The unlocked rate revisions get stamped with `submitInfoID`; their `unlockInfoID` is preserved. `prevRateDocs` walks prior rate submissions (with `revisionOverrides`) to refill `dateAdded`.

**Phase 4 (compute related set and links)**: this is where the diff against the previous submission is calculated automatically:
- 4a's `tx.draftRateJoinTable.findMany({ contractID })` returns the post-unlock-and-edits set of rates. This is the new intended package shape.
- 4a's `prevRelatedSubmission` query (`relatedContracts.some({ contractID })` ordered desc) returns the **immediately prior submission** — for resubmit, that's the submission that was unlocked. The diff between that snapshot's `submissionPackages` and the current `DraftRateJoinTable` set surfaces exactly the user's adds/removes during the unlocked period:
  - A rate that was attached then and is gone now → pushed to `submissionRelatedRateRevs` (its prior rev gets a forwarded link in this submission's package, encoding the unlink).
  - A rate that's attached now and was attached then → no marking (it's just continuing as-is, no diff entry needed).
  - A net-new rate added during unlock → just a new link, no prior-submission reference.
- The `*WithCause` enumeration in `packageSubmissions` derivation later reads these forwarded entries as `RATE_LINK` / `RATE_UNLINK` causes, and the contract's own newly-stamped revision as a `CONTRACT_SUBMISSION` cause for both contract and rate perspectives.

**Phase 5 (write event)**: same single `tx.updateInfoTable.update` writing `relatedContracts.connect`, `relatedRates.connect`, `submissionPackages.create`. The new `UpdateInfoTable` row references the same revision rows that already had `unlockInfo` set, so a single revision now connects to two events (its `unlockInfo` and its `submitInfo`).

**Phase 6 (clean `DraftRateJoinTable`)**: both sides of every join now have `submitInfoID` set, so all the join rows touching this contract or these rates get deleted. The contract is fully out of draft state.

### Status snapshot of one revision over time (resubmit cycle)

Walking a single contract revision row through one full unlock-resubmit cycle:

| Stage | `unlockInfoID` | `submitInfoID` | Derived status |
|---|---|---|---|
| Created at initial submit | null | event A | SUBMITTED |
| Unlocked (NEW row created) | event B | null | UNLOCKED |
| Edited during unlock | event B | null | UNLOCKED (form data changes in place) |
| Resubmitted | event B | event C | RESUBMITTED |
| Unlocked again (ANOTHER new row) | event D | null | UNLOCKED |

Every unlock inserts a row; every submit/resubmit stamps the latest row in place. So `revisions[]` length grows by one per unlock, not per submit.

### Reading material the resubmit produces

After resubmit, both contract and rate sides will see a new `packageSubmissions` entry corresponding to event C:
- Contract perspective: `submitInfo: C`, `contractRevision: <the resubmitted revision>`, `rateRevisions: <attached rates' latest submitted revs at C>`, plus `submittedRevisions` flattened.
- Rate perspective (per attached rate): mirror.
- The cause field (resolved in the resolver) disambiguates whether each side was directly touched or pulled in via a related event — see `08-derived-state.md`.

### Summary of resubmit-specific behavior

- Same code path as initial submit; status branch is just the resolver's `validateStatusAndUpdateInfo` and the email dispatch.
- The unlock-created revision row is reused (in-place stamp), not replaced.
- `unlockInfoID` is preserved alongside the new `submitInfoID` — that's literally what makes status RESUBMITTED.
- Doc `dateAdded` restoration from prior submissions via the `prevDocs` / `prevRateDocs` walks is what recovers the date history that unlock dropped. Net-new docs added during the unlocked period get `currentDateTime`.
- The package diff (added/removed rates during unlock) is encoded automatically through phase 4's `submissionRelatedRateRevs` + forwarded links, with no resubmit-specific code.
- Email path: `Resubmitted*` variants instead of new-contract variants.

## See also

- `docs/architectural-decision-records/017-application-observability.md` + `docs/technical-design/monitoring.md` — observability for the heaviest transactions in the API; submit/unlock/resubmit are common targets

# Creating drafts and updating draft form data

This reference covers the mutations that operate on draft contracts and rates *without* changing their submission status:
- `insertDraftContract`, `insertDraftRate` — create new drafts.
- `updateDraftContract` — edit form data on a draft contract revision.
- `updateDraftContractRates` — reconcile rates on a draft contract.

Submit/unlock/withdraw are covered in `05-submit-unlock-resubmit.md` and `07-withdraw.md`.

## `insertDraftContract` (`insertContract.ts`)

Creates a new `ContractTable` with a single nested `ContractRevisionTable` (the initial draft). All in one Prisma `$transaction`:

1. Atomically increment `State.latestStateSubmissionNumber` for the given `stateCode` and use the returned value as the new contract's `stateNumber`. This makes per-state submission numbering sequential and globally unique.
2. `tx.contractTable.create` with one nested revision under `revisions: { create: { ... } }`. The revision has the form fields directly. **`submitInfoID` and `unlockInfoID` are NOT set** — by `getContractRateStatus`, this lands as status `DRAFT`.
3. Documents (`contractDocuments`, `supportingDocuments`) and `stateContacts` are created with `position: idx` derived from their array index, preserving caller-supplied order.
4. Re-fetch with `includeFullContract` and run through `parseContractWithHistory` so the caller gets the same `ContractType` shape as `findContractWithHistory`.

Required input args (`InsertContractArgsType`): `contractSubmissionType`, `stateCode`, `programIDs`, `submissionType`, `submissionDescription`, `contractType`. Everything else is `Partial<ContractFormDataType>` and optional.

Some `ContractFormDataType` / schema fields are **not pulled from args** at insert and are silently dropped if passed: `mccrsID`, `dsnpContract`, `statutoryRegulatoryAttestation`, `statutoryRegulatoryAttestationDescription`, and all EQRO-only fields (`eqroNewContractor`, `eqroProvision*`). These come in via update / EQRO-specific paths.

No rates are created here — this is contract-only. Rates are added subsequently via `insertDraftRate` or `updateDraftContractRates`.

## `insertDraftRate` (`insertRate.ts`)

Creates a new `RateTable` with one nested `RateRevisionTable` AND one nested `DraftRateJoinTable` row linking to a required parent draft contract. Same transaction pattern:

1. Atomically increment `State.latestStateRateCertNumber` (separate counter from contract numbering) and use the returned value as the rate's `stateNumber`.
2. Look up the parent draft contract by `draftContractID` (required arg). Throws if not found.
3. Compute `nextRatePosition = contract.draftRates.length + 1` (1-indexed; appends at the end of the parent contract's draft rates).
4. `tx.rateTable.create` with:
   - `draftContracts: { create: { contractID: draftContractID, ratePosition } }` — creates the join row.
   - `revisions: { create: { ... } }` — creates the initial revision with no `submitInfo` / `unlockInfo`, so status is `DRAFT`.
5. Documents (`rateDocuments`, `supportingDocuments`) and actuary contacts (`certifyingActuaryContacts`, `addtlActuaryContacts`) get `position: idx`.
6. Re-fetch with `includeFullRate`, parse via `parseRateWithHistory`, return.

Required arg shape is `InsertRateArgsType = RateFormEditableType & { stateCode }` plus the separate `draftContractID` parameter — every rate is created against a parent contract.

A draft rate's `parentContractID` resolves via the `DRAFT_PARENT_PLACEHOLDER` workaround (see `08-derived-state.md`): the rate has no submitted revision yet, so the parser returns the placeholder and the outer parse step patches it from `draftContracts[0].id` — which exists because the join row was created in step 4.

## Symmetries / asymmetries between contract and rate insert

| | Contract insert | Rate insert |
|---|---|---|
| State counter | `latestStateSubmissionNumber` | `latestStateRateCertNumber` |
| Parent requirement | none | must reference an existing draft contract |
| Join table created | none | `DraftRateJoinTable` with `ratePosition = existing.length + 1` |
| Initial status | `DRAFT` (latest revision has no submit/unlock info) | `DRAFT` (same) |
| Document/contact ordering | array index → `position` | array index → `position` |
| Re-fetch + parse | `includeFullContract` → `parseContractWithHistory` | `includeFullRate` → `parseRateWithHistory` |
| EQRO handling | EQRO-specific fields silently dropped at insert | n/a |

## `updateDraftContract` (`updateDraftContract.ts`)

`updateDraftContract` (and its inner `updateDraftContractInsideTransaction`) edit the form data on the **existing draft revision in place**. No new revision row is created. The flow:

1. Wrap in `client.$transaction`.
2. Find the draft revision: `tx.contractRevisionTable.findFirst({ where: { contractID, submitInfoID: null } })`. The parser invariant guarantees at most one such revision per contract (submitted ones have `submitInfoID` set). Returns `NotFoundError` if none — i.e. you can't update a contract that has no draft revision (a fully-SUBMITTED contract with no pending unlock has no draft revision; it must be unlocked first to get one).
3. `tx.contractRevisionTable.update({ where: { id: currentContractRev.id }, data: { ...prismaUpdateContractFormDataFromDomain(formData) } })` — overwrite the form fields on that row.
4. Re-fetch with `findContractWithHistory(tx, contractID)` and return the parsed `ContractType`.

`prismaUpdateContractFormDataFromDomain` (in `prismaContractRateAdaptors.ts`) writes **every** form field on the revision — it is effectively a full replace, not a sparse merge.

### `nullify` / `emptify` semantics (in `prismaDomainAdaptors.ts`)

Prisma treats `undefined` in an `update.data` block as "leave this column alone." The codebase wants `undefined` from the domain layer to instead mean "clear this field". So:

- `nullify(field)`: `undefined → null`, otherwise pass through. Used for nullable scalars and enums.
- `emptify(field)`: `undefined → []`, otherwise pass through. Used for array columns (`programIDs`, `managedCareEntities`, `federalAuthorities`).

Implication: passing a partial form data object to `updateDraftContract` will **null out** any field omitted. Callers must send the full intended state of every field, not just the changed ones. The "Update" naming is misleading at the row level — semantically it's a replace.

### Child collections are delete-and-recreate

For `contractDocuments`, `supportingDocuments`, and `stateContacts`, the adapter uses:

```
{ deleteMany: {}, create: <new rows from formData> }
```

Every update wipes the entire collection and re-inserts. New rows get fresh UUIDs; ordering comes from `position: idx` (`formatDocsForPrisma` / `formatOrderedListForPrisma`). **Document and contact row IDs are not stable across updates** — any external reference to a specific document or contact row will break after the next update. Document files in S3 are referenced by `s3Key` not by row ID, so the file content survives, but DB-level FKs to a document row would not.

`formatDocsForPrisma` additionally strips `dateAdded` and `downloadURL` before writing — those fields don't belong on the DB row (`dateAdded` is set elsewhere; `downloadURL` is computed at read time).

### What is NOT touched by `updateDraftContract`

- `ContractTable` parent (`mccrsID`, `contractSubmissionType`, etc. — separate update paths)
- `submitInfoID` / `unlockInfoID` on the revision (status-flipping operations live elsewhere)
- Other revisions besides the draft
- `DraftRateJoinTable` (rates have separate update paths)
- `WithdrawnRatesJoinTable`, `ContractActionTable`, `ContractOverrides`

### What this implies for status

Because the operation only touches form-data columns on the existing draft revision, status is unchanged:
- DRAFT contract → still DRAFT after update
- UNLOCKED contract → still UNLOCKED after update (the unlocked draft revision is the one being edited)

## `updateDraftContractRates` — the way to mutate rates

Rates are **not** updated directly. The mutation `updateDraftContractRates` takes the **full intended set of rates** for a contract and reconciles it against the contract's current draft rates, producing five categorized actions: create, update, link, unlink, delete. A child rate's content can only be edited from its parent contract.

### Resolver layer (`services/app-api/src/resolvers/contract/updateDraftContractRates.ts`)

The GraphQL mutation handler. Its job is validation, authorization, and diffing the requested set against existing state to produce the action lists for the postgres layer.

#### Input shape — three operation types

GraphQL doesn't fully express the discriminated input, so the resolver parses with a Zod `discriminatedUnion('type', ...)`:

| `type` | `rateID` | `formData` | meaning |
|---|---|---|---|
| `CREATE` | undefined | required | new rate; ID assigned by DB |
| `UPDATE` | required | required | edit form data on an existing rate child of this contract |
| `LINK` | required | undefined | attach an existing already-submitted rate to this contract |

The mutation receives `{ contractID, updatedRates: <discriminated array>, lastSeenUpdatedAt }` and the resolver expects the array to represent the **full final state** of the contract's rates after the mutation, in order.

#### Pre-Zod document validation

For CREATE/UPDATE entries, walks `formData.rateDocuments` and `formData.supportingDocuments` through `parseAndValidateDocuments` (validates name, s3URL, sha256). Replaces those fields with validated versions before the discriminated-union parse.

#### Authorization & gating (in order)

1. **OAuth `canWrite`** — write grant required.
2. **Fetch contract** via `store.findContractWithHistory(contractID)`.
3. **Fetch state programs** — needed for `generateRateCertificationName`.
4. **Caller must be a state user from the contract's `stateCode`.** CMS users (and any non-state role) are forbidden. This mutation is exclusively for state users editing their own state's drafts.
5. **`contract.consolidatedStatus` must be DRAFT or UNLOCKED**, AND `contract.draftRevision` must exist. Otherwise `userInputError`.
6. **Optimistic concurrency**: `contract.draftRevision.updatedAt.getTime() === lastSeenUpdatedAt.getTime()`. Otherwise `userInputError` ("Concurrent update error… please refresh").

#### Diffing / categorization (the core logic)

Inputs: parsed `updatedRates[]` (full intended state, in order) + `contract.draftRates[]` (current join-table state).

Output: `rateUpdates = { create: [], update: [], link: [], unlink: [], delete: [] }`.

The walk:

- Tracks `thisPosition` (1-indexed, increments per entry).
- Tracks `knownRateIDs` = IDs of `contract.draftRates`. Items get spliced out as they're matched. Anything left over at the end is being removed.

Per-entry rules:

- **CREATE** → call `generateRateCertificationName(formData, stateCode, statePrograms)`, set as `rateCertificationName`, push `{ formData, ratePosition: thisPosition }` to `rateUpdates.create`.
- **UPDATE** → must be in `knownRateIDs` (already linked); splice. Must be in editable status (`DRAFT` or `UNLOCKED`). Must satisfy `rateToUpdate.parentContractID === contract.id` — **only the parent contract may edit a rate's form data.** Then regenerate name and push to `rateUpdates.update` with `{ rateID, formData, ratePosition }`.
- **LINK** → if already in `knownRateIDs`: splice and push to `link` with possibly-updated position (re-ordering). Otherwise it's a new link target: fetch the rate via `findRateWithHistory`; the rate's `consolidatedStatus` must NOT be `DRAFT` or `WITHDRAWN` (link target must be live — submitted/resubmitted/under-review/approved/not-subject-to-review). Push to `rateUpdates.link`.

After the walk, anything still in `knownRateIDs` was not in the new list:

- If the leftover rate's `status === 'DRAFT'` → push to `rateUpdates.delete` (unsubmitted, ephemeral, hard-delete safe).
- Otherwise → push to `rateUpdates.unlink` (rate row stays; just detach the join).

#### Business rules surfaced

- **Only state users** of the contract's state can mutate rates this way.
- **Editable contract** (DRAFT or UNLOCKED) with a `draftRevision` is required.
- **Optimistic concurrency** via `lastSeenUpdatedAt`.
- **UPDATE is parent-only**: a rate's form data is only mutable from its parent contract. Other contracts can link to a rate but never edit its content.
- **LINK targets**: existing live rates only — DRAFT and WITHDRAWN excluded.
- **Removed-draft rates are deleted**; **removed-submitted rates are unlinked**. This preserves history for anything that was ever submitted.

### Postgres layer (`services/app-api/src/postgres/contractAndRates/updateDraftContractRates.ts`)

Pure DB orchestration in a single `$transaction`. The function `updateDraftContractRatesInsideTransaction` runs the five action types in this order:

1. **Lookup**: `tx.contractTable.findUnique` with revisions limited to the latest one. NotFoundError if missing. Programmer-error if no draft revision.

2. **Read state counter**: `tx.state.findUnique` to read `latestStateRateCertNumber` for naming new rates. *Note: the State row is **read but not written**. Compare to `insertDraftRate`, which atomically increments the counter via `tx.state.update`. So the state row's `latestStateRateCertNumber` is not advanced by this path — verify this is intentional before relying on the counter being in sync with actual rate `stateNumber`s assigned through this mutation.*

3. **CREATE phase**: for each `create` entry, locally increment `nextRateNumber` (starting from `latestStateRateCertNumber + 1`), build rate-table data via `prismaRateCreateFormDataFromDomain(formData)`, `tx.rateTable.create` with one nested revision (no submit/unlock info → DRAFT). Captures `{ rateID, ratePosition }`.
   - Notably, the new rate is created **without** the `draftContracts: { create }` clause that `insertDraftRate` uses. The rate has no draft-contract join row at this point — the join gets established below in step 5.

4. **DELETE phase**: hard-delete the rate revisions (`tx.rateRevisionTable.deleteMany` by `rateID in delete[]`) then the rates themselves (`tx.rateTable.deleteMany`). Safe because these are DRAFT rates with no submission history.

5. **Replace `DraftRateJoinTable`** for this contract:
   ```
   tx.contractTable.update({ where, data: { draftRates: { deleteMany: {}, create: links } } })
   ```
   Where `links` = (newly created) ∪ (updated rates with current positions) ∪ (linked rates). **Unlinks happen implicitly here** — any join row not in `links` is wiped by `deleteMany: {}`.
   - Before the write, validates that the union of positions forms a contiguous 1..N. Errors out otherwise. Position gaps from removed rates are pre-closed by the resolver assigning sequential positions during the walk.

6. **UPDATE phase**: for each `update`, find the rate's current draft revision (`rateRevisionTable.findFirst` with `submitInfoID: null`); error if none (rate is not editable). Then `tx.rateRevisionTable.update` with `prismaUpdateRateFormDataFromDomain(formData)`. Same **in-place edit + full-replace** semantics as `updateDraftContract`: `nullify`/`emptify` clear omitted fields; child collections (documents, actuary contacts) are delete-and-recreate.

7. **UNLINK phase**: the loop here just looks up each rateID's latest revision to confirm it exists; **it performs no writes** (comment: "This does nothing, just checks that the rates all exist"). The actual unlink already happened in step 5 via the join-table replace.

8. Re-fetch with `findContractWithHistory(tx, contractID)` and return.

### What this implies for status

- **Contract status unchanged.** The contract's draft revision's `submitInfo`/`unlockInfo` aren't touched.
- **Created rates** start as DRAFT (their initial revision has neither submit nor unlock info).
- **Updated rates** keep whatever status they were in (in-place edit on the draft revision; submit/unlock info untouched).
- **Linked rates** keep their existing status — link is a join-table operation only.
- **Deleted rates** disappear entirely (only DRAFT rates are eligible).
- **Unlinked rates** keep all their data and history; they just lose the join row from this contract. If they're a child of *another* contract or are a standalone submitted rate, they continue to exist independently.

### What is NOT touched by `updateDraftContractRates`

- The contract's `ContractRevisionTable` row (no form-data update — that's `updateDraftContract`).
- `submitInfoID` / `unlockInfoID` on any contract revision.
- `WithdrawnRatesJoinTable`, `ContractActionTable`, `ContractOverrides`.
- `State.latestStateRateCertNumber` (read but not written — see note in step 2).

## See also

- `docs/technical-design/creating-and-testing-endpoints.md` — end-to-end checklist for a new resolver/mutation
- `docs/technical-design/dependency-injection-pattern.md` — how the `Store` is wired into the resolver layer that calls these

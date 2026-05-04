# Storage layer (Postgres / Prisma)

Schema file: `services/app-api/prisma/schema.prisma`

This reference is the storage view. For the domain types built on top of these tables, read `02-domain-types.md`. For how the storage shape is read into the domain shape, read `03-parse-pipeline.md`.

## Two-tier pattern: parent + revision

- **`ContractTable`** / **`RateTable`** hold *identity* only (`id`, `stateCode`, `stateNumber`, `mccrsID`, etc.). No form data lives here. They're stable anchor points.
- **`ContractRevisionTable`** / **`RateRevisionTable`** hold all the form-data fields per revision (description, programIDs, dates, contract/rate type, modified-* flags, EQRO fields on contract; rateType, populations, certifying actuaries, program IDs, etc. on rate). Each revision belongs to one parent. Revisions are immutable once submitted.

## Each revision points at two `UpdateInfoTable` rows

- `submitInfoID` (nullable FK to `UpdateInfoTable`) — the submit event that finalized this revision.
- `unlockInfoID` (nullable FK to `UpdateInfoTable`) — the unlock event that created this revision (only set if this revision was created by unlocking a prior submitted revision).

The `(submitInfo, unlockInfo)` pair on the *latest* revision is what the parser reads to derive `status` (`DRAFT` / `SUBMITTED` / `UNLOCKED` / `RESUBMITTED`) — see `08-derived-state.md`.

## `UpdateInfoTable` — one row per submit *or* unlock event

Fields: `updatedAt`, `updatedByID`, `updatedReason`. Six relations to revisions:

- `submittedContracts` / `submittedRates` — revisions where this row is `submitInfo`.
- `unlockedContracts` / `unlockedRates` — revisions where this row is `unlockInfo`.
- `relatedContracts` / `relatedRates` — implicit M:N capturing every revision tied to the event (broader than the specific submit/unlock target — used to surface revisions that were touched but not directly submitted/unlocked, such as linked rates whose package history needs to record this event).

Plus `submissionPackages` 1:N to `SubmissionPackageJoinTable`.

A single `UpdateInfoTable` row is shared between a contract and every rate touched in the same transaction — that's how submit and unlock keep their effects coherent across multiple revisions.

## `SubmissionPackageJoinTable` — snapshot of contract↔rate linkage at submit time

Three-way PK `(submissionID, contractRevisionID, rateRevisionID)` plus `ratePosition`. Joins one `UpdateInfoTable` event to specific contract-revision/rate-revision pairs with ordering.

This is how the historical shape of a package is reconstructed independent of current draft state. To reconstruct "what was attached to this contract at submission N," walk the `UpdateInfoTable` row's `submissionPackages` and filter by `contractRevisionID`.

## Draft-time state lives off-revision (joins parent tables)

- **`DraftRateJoinTable`** `(contractID, rateID, ratePosition)` — working set of rates on a contract that's currently in draft (never-submitted *or* just-unlocked). Joins parents, not revisions. At submit time these get translated into `SubmissionPackageJoinTable` rows pointing at specific revisions.
- **`WithdrawnRatesJoinTable`** `(contractID, rateID, createdAt)` — rates independently withdrawn from a contract.

## Other tables

- **`ContractActionTable` / `RateActionTable`** — review-status events on the parent. Independent of submit/unlock. Action enums:
  - Contract: `UNDER_REVIEW | MARK_AS_APPROVED | WITHDRAW | NOT_SUBJECT_TO_REVIEW`
  - Rate: `UNDER_REVIEW | WITHDRAW`
- **`ContractOverrides`** (parent-level) and **`RateOverrides`** (parent-level) → optional 1:1 **`RateRevisionOverrides`** (revision-level) → 1:N **`RateDocumentOverride`** / **`RateSupportingDocumentOverride`**. Admin metadata overrides like `initiallySubmittedAt` and per-revision document `dateAdded`.
- **Documents on revisions**: `ContractDocument`, `ContractSupportingDocument`, `RateDocument`, `RateSupportingDocument` — each carries S3 fields, `sha256`, `position`, `dateAdded`. `DocumentZipPackage` links to either contract revision or rate revision.
- **Questions on parents**: `ContractQuestion` / `RateQuestion` with their documents and responses.
- **`StateContact`** on `ContractRevisionTable`. **`ActuaryContact`** on `RateRevisionTable` (two roles: `CertifyingActuaryOnRateRevision`, `AddtlActuaryOnRateRevision`).

## Deprecated tables/relations (do not include in new feature designs)

- **`SharedRateRevisions`** M:N between `ContractTable.sharedRateRevisions` ↔ `RateRevisionTable.contractsWithSharedRateRevision`. Not marked deprecated in the schema source — confirmed deprecated by user 2026-05-04. Do not include in queries, explanations, or new feature designs unless explicitly asked.
- **`HealthPlanPackageTable` / `HealthPlanRevisionTable`** (proto-based legacy). Marked `deprecated Boolean @default(true)` in schema.

## Schema asymmetry to know about

- `ContractRevisionTable.relatedSubmisions` (typo, one `s`) vs `RateRevisionTable.relatedSubmissions` (correct). Both are valid relation names in the current schema; code uses each side's spelling. Do not "fix" the typo unless coordinated with a migration.

## Per-state numbering counters on the `State` row

- `latestStateSubmissionNumber` — atomically incremented for each new contract.
- `latestStateRateCertNumber` — atomically incremented for each new rate via `insertDraftRate`. Note: `updateDraftContractRates` reads this counter when creating new rates but does NOT atomically increment it — see `04-insert-and-update.md` for why.

## See also

- `docs/architectural-decision-records/023-seperate-contract-rates-tables-postgres.md` — the ADR that established this two-tier schema
- `docs/technical-design/database-diagram.md` — visual reference for the same schema
- `docs/technical-design/howto-migrations.md` — Prisma migration workflow when changing this schema

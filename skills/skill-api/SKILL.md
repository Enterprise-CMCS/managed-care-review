---
name: skill-api
description: Skill to create new features in the API that has context on our data model and business logic.
---

# MC-Review API skill

Reference for any agent building or modifying contract/rate features in the `services/app-api/` portion of the `managed-care-review` codebase. The supporting files in `references/` describe what the data layer actually does — including the non-obvious dynamics that aren't visible from reading any single file.

## When to read these references

Read the relevant reference files when the task involves:
- Building or modifying a contract/rate feature (any new mutation, status transition, history view, etc.)
- Building or modifying question/response store or resolver behavior in `services/app-api/src/postgres/questionResponse/` or `services/app-api/src/resolvers/questionResponse/`
- Reasoning about why a status, package snapshot, or relationship looks the way it does
- Touching the `services/app-api/src/postgres/contractAndRates/`, `services/app-api/src/postgres/questionResponse/`, `services/app-api/src/postgres/prismaHelpers.ts`, `services/app-api/src/domain-models/contractAndRates/`, or `services/app-api/src/resolvers/{contract,rate,questionResponse}/` directories
- Following code that interacts with `ContractTable`, `RateTable`, `ContractQuestion`, `RateQuestion`, `UpdateInfoTable`, `SubmissionPackageJoinTable`, or `DraftRateJoinTable`

If the task only involves UI/frontend without touching the data layer, you probably don't need these references.

## Reference map — pick by task

| If the task touches… | Read |
|---|---|
| Anything contract/rate-shaped (start here) | `references/01-storage-schema.md` + `references/02-domain-types.md` |
| Reading data via `findContractWithHistory` / `findRateWithHistory`; building a new query path; understanding `packageSubmissions` shape | `references/03-parse-pipeline.md` |
| Creating a new draft contract or rate; editing form data on a draft; reconciling rates on a draft | `references/04-insert-and-update.md` |
| Submit, unlock, or resubmit (any state-flip operation) | `references/05-submit-unlock-resubmit.md` |
| Adding or changing `questionResponse` store/resolver logic; reasoning about lock-vs-stale-state behavior on `ContractQuestion` / `RateQuestion` | Read this `SKILL.md` for the row-lock rules, then inspect `services/app-api/src/postgres/questionResponse/` directly because there is no dedicated reference file yet |
| Anything involving rates that span multiple contracts (linking, parent reassignment, withdraw rate fallout) | `references/06-linked-rates.md` |
| Withdraw contract specifically | `references/07-withdraw.md` |
| Working out what status a contract or rate ends up in; computing parent contract; resolving cause on `packageSubmissions`; recursion in domain types | `references/08-derived-state.md` |
| Undo unlock, reversed revisions, active-draft rules, linked-rate cleanup | `references/09-undo-unlock.md` |
| Revision overrides, flatten/merge behavior, document overrides, unlock expectations | `references/10-revision-overrides.md` |

For broad multi-area features (e.g. a new "undo unlock contract" mutation): read `01`, `02`, `05`, and `08` first; pull in `06` and `07` if rates cross contract boundaries.

## Cheat sheet — facts to keep in mind

- **Two-tier pattern**: parent table (identity) + revision table (form data). Form data lives only on revisions; parents are stable anchors.
- **Submit stamps an existing draft revision in place. Unlock CREATES a new revision row.** Both flip status by setting `submitInfoID` / `unlockInfoID` on a row.
- **Status is never stored.** It's derived in the parser from the latest revision's `submitInfo`/`unlockInfo` pair, plus the latest `*ActionTable` row, plus a few special-case rules.
- **Parent contract is never stored.** It's derived per rate as "the contract whose latest submission stamped this rate's latest submitted revision."
- **One `UpdateInfoTable` event row per submit-or-unlock; shared across the contract and every child rate touched in that transaction.** This is what lets the parser later detect "these were submitted/unlocked together."
- **`SubmissionPackageJoinTable`** is the immutable snapshot of contract↔rate at submit time, joining specific contract revision + specific rate revision + position. **`DraftRateJoinTable`** is the working set on a contract that's currently in draft, joining parent tables only.
- **Form-data writes via `updateDraftContract` are full replaces, not merges.** Omitted fields are nulled (`nullify`) or emptied (`emptify`). Child collections (documents, contacts) are delete-and-recreate, so row IDs are not stable across updates.
- **Resolver-called store function writes to `ContractTable`, `RateTable`, `ContractQuestion`, or `RateQuestion` should default to `runTransactionWithRowLock`.** Use `services/app-api/src/postgres/prismaHelpers.ts` and pass the table + row id so concurrent writes to the same record serialize before the store performs additional reads or writes.
- **After acquiring a row lock, re-check write preconditions inside the transaction.** Resolver-time validation can be stale by the time the lock is acquired; the store should validate current state again before applying writes.
- **Question-response writes follow the same rule as contract/rate state changes.** If a resolver-called store function writes a `ContractQuestion` or `RateQuestion` row or appends related responses based on current question state, default to `runTransactionWithRowLock` and validate deleted/current status after the lock is acquired.
- **Undo unlock is revision history, not a new submission event.** Read `09-undo-unlock.md` if you touch `undoUnlockInfo`, active-draft logic, or linked-rate cleanup.
- **Overrides are sparse metadata patches on submitted revisions.** Read `10-revision-overrides.md` if you touch revision overrides, document overrides, or unlock behavior for overridden revisions.
- **Deprecated — do not include in new designs:**
  - `ContractTable.sharedRateRevisions` / `RateRevisionTable.contractsWithSharedRateRevision` (the `SharedRateRevisions` M:N) — not marked deprecated in the schema source, but confirmed deprecated 2026-05-04.
  - `HealthPlanPackageTable` / `HealthPlanRevisionTable` (proto legacy) — marked `deprecated Boolean @default(true)`.
- **A `Without...` Zod schema** (e.g. `contractWithoutDraftRatesSchema`) is the one-level recursion break. It exists so a contract can embed rates and a rate can embed contracts without infinite recursion. The include shape mirrors this with `includeContractWithoutDraftRates` / `includeRateWithoutDraftContracts`.
- **`DRAFT_PARENT_PLACEHOLDER`** (`'DRAFT_PARENT_REPLACE_ME'`): a never-submitted rate has no real parent, so the parser returns this placeholder; the outer parser patches it from `draftContracts[0].id`.
- **Schema typo to know about**: `ContractRevisionTable.relatedSubmisions` (one `s`) vs `RateRevisionTable.relatedSubmissions` (correct). Both are valid relation names; code uses each side's spelling.

## Authorization patterns at a glance

| Mutation | Who can do it | Source of rule |
|---|---|---|
| `insertDraftContract` / `insertDraftRate` / `updateDraftContract` / `updateDraftContractRates` | State user matching the contract's `stateCode` | Resolver |
| `submitContract` (initial submit + resubmit) | State user matching the contract's `stateCode` | Resolver |
| `unlockContract` / `unlockRate` | CMS user (`hasCMSPermissions`) | Resolver |
| `withdrawContract` / `withdrawRate` | CMS user | Resolver |
| Edit a rate's form data via `UPDATE` | Only the rate's parent contract | Postgres + resolver enforce `parentContractID === contract.id` |
| Link to a rate via `LINK` | Any contract (target must not be DRAFT or WITHDRAWN) | Resolver |

OAuth `canWrite` (or `canOauthWrite`) is required on every write. State-vs-CMS checks are layered on top.

## Key file map

| Concern | Path |
|---|---|
| Schema | `services/app-api/prisma/schema.prisma` |
| Domain model index | `services/app-api/src/domain-models/contractAndRates/index.ts` |
| Base Zod shapes | `services/app-api/src/domain-models/contractAndRates/baseContractRateTypes.ts` |
| Full Zod shapes | `contractTypes.ts`, `rateTypes.ts` (same dir) |
| `packageSubmissions` schemas | `packageSubmissions.ts` (same dir) |
| Revision schemas | `revisionTypes.ts` (same dir) |
| Status schemas | `statusType.ts` (same dir) |
| `UpdateInfoType` | `updateInfoType.ts` (same dir) |
| Find entry points | `services/app-api/src/postgres/contractAndRates/findContractWithHistory.ts`, `findRateWithHistory.ts` |
| Full include shapes | `prismaFullContractRateHelpers.ts` (same dir) |
| Without-draft includes | `prismaSubmittedContractHelpers.ts`, `prismaSubmittedRateHelpers.ts` |
| Parsers | `parseContractWithHistory.ts`, `parseRateWithHistory.ts` |
| Status helpers, parent-id, formData converters | `prismaSharedContractRateHelpers.ts` |
| Insert (create new) | `insertContract.ts`, `insertRate.ts` |
| Update draft form data | `updateDraftContract.ts`, `updateDraftRate.ts`, `updateDraftContractRates.ts`, `updateDraftContractWithRates.ts` |
| Domain↔Prisma form-data adaptors | `prismaContractRateAdaptors.ts` |
| `nullify` / `emptify` helpers | `services/app-api/src/postgres/prismaDomainAdaptors.ts` |
| Submit resolver | `services/app-api/src/resolvers/contract/submitContract.ts` |
| Submit postgres outer | `services/app-api/src/postgres/contractAndRates/submitContract.ts` |
| Submit core engine | `submitContractAndOrRates.ts` (same dir) |
| Unlock resolver | `services/app-api/src/resolvers/contract/unlockContract.ts` |
| Unlock postgres (contract) | `services/app-api/src/postgres/contractAndRates/unlockContract.ts` |
| Unlock postgres (rate engine) | `unlockRate.ts` (same dir) |
| Standalone unlock rate resolver | `services/app-api/src/resolvers/rate/unlockRate.ts` |
| Withdraw rate resolver | `services/app-api/src/resolvers/rate/withdrawRate.ts` |
| Withdraw rate postgres | `services/app-api/src/postgres/contractAndRates/withdrawRate.ts` |
| Withdraw contract resolver | `services/app-api/src/resolvers/contract/withdrawContract.ts` |
| Withdraw contract postgres | `services/app-api/src/postgres/contractAndRates/withdrawContract.ts` |
| Parent reassignment | `reassignParentContract.ts` (same dir) |
| Parent picker / new-parent selection | `getNewParentContract` in `prismaSharedContractRateHelpers.ts` |
| Cause derivation (`*WithCause`) | `services/app-api/src/resolvers/contract/contractResolver.ts`, `services/app-api/src/resolvers/rate/rateResolver.ts` |
| Other status mutations | sibling files in same dir (`approveContract.ts`, `reverseApproveContract.ts`, `undoWithdrawContract.ts`, etc.) |

## Related codebase docs

The repo's `docs/` directory has broader architecture and conventions docs that complement this skill. Most relevant for API work:

### Architecture and conventions
- `docs/architectural-decision-records/023-seperate-contract-rates-tables-postgres.md` — the ADR that established the two-tier contract/rate schema this skill describes
- `docs/technical-design/graphql-resovler-design.md` — resolver layer conventions (error formatting, structure, audit trails)
- `docs/technical-design/dependency-injection-pattern.md` — how the `Store` is injected into resolvers
- `docs/architectural-decision-records/011-typescript-error-handling.md` + `012-custom-error-types.md` — the result/error pattern used throughout the postgres helpers

### Adding a feature
- `docs/technical-design/creating-and-testing-endpoints.md` — end-to-end checklist for a new resolver
- `docs/technical-design/error-handling.md` — `errorUtils.ts`, `GraphQLError` codes, common error shapes
- `docs/technical-design/testing-approach.md` — integration vs. unit testing conventions
- `docs/technical-design/howto-migrations.md` — Prisma migration workflow

### Naming
- `docs/technical-design/contract-rate-types-naming.md` — contract/rate type naming (heads-up: file truncates mid-section in the current repo state)
- `docs/technical-design/naming-conventions.md` — broader naming guide

### Adjacent topics
- Auth: `docs/architectural-decision-records/026-oauth-machine-to-machine-authentication.md`, `docs/technical-design/oauth.md`, `docs/technical-design/api-jwt-security.md`, `docs/technical-design/third_party_api_access.md`
- Feature flags: `docs/architectural-decision-records/016-launchdarkly-server-side-flags.md`, `docs/technical-design/launch-darkly-implementation.md`, `docs/technical-design/launch-darkly-testing-approach.md` (heads-up: Jest references are stale; project uses Vitest)
- File upload: `docs/technical-design/file-upload.md`
- Observability: `docs/architectural-decision-records/017-application-observability.md`, `docs/technical-design/monitoring.md`
- Stack overview: `docs/Technologies.md` (heads-up: may say React 18; project is on React 19 as of 2026-05)
- Local dev: `docs/Configuration.md`, `docs/technical-design/howto-access-deployment-database.md`, `docs/technical-design/howto-update-state-programs.md`
- Schema reference: `docs/technical-design/database-diagram.md`

### Historical / superseded — cite for context only
- ADRs 004, 008, 009, 018 — early proto-based `HealthPlanPackage` design, since superseded by the contract/rate tables this skill describes
- ADR 002 — unmarked but superseded by ADR 031
- ADR 024 — labeled "Proposed" though the work is in production
- ADR 025 — references the Serverless framework; the project has migrated to CDK

## How to apply this skill

1. **Start at the schema** (reference 01) to confirm what's actually stored vs derived. Most "states" are derived in the parse layer.
2. **Read the parser** (reference 03) to understand how the change will surface in the domain output. A status change usually means flipping `submitInfo`/`unlockInfo` on the latest revision, adding a new revision, or appending an action row.
3. **Trace the relevant mutation** (references 04–07) end-to-end. The resolver does authorization, validation, and formatting; the postgres layer does the actual DB work — they often have important guards in different places.
4. **If the resolver calls a store function that writes a row in `ContractTable`, `RateTable`, `ContractQuestion`, or `RateQuestion`, default to `runTransactionWithRowLock`.** Only skip it when last-write-wins behavior is intentional and acceptable for that path.
5. **Check `packageSubmissions` and cause impact** (reference 08) if the change involves an `UpdateInfoTable` event. The change may append entries to the package history from both contract and rate perspectives.
6. **Don't include `sharedRateRevisions`** in any new design — deprecated.
7. **Watch for `DRAFT_PARENT_PLACEHOLDER`** if the change involves draft rates without a submitted parent yet — the placeholder needs the outer parser to patch.
8. **Verify file paths and code shapes against the current state of the repo** before depending on specifics. This reference was synthesized at a point in time; it can drift.
9. **Never hand-write Prisma migrations.** If a schema change needs a migration, generate it with the Prisma CLI and review the generated SQL rather than manually creating `migration.sql` files.
10. **Sandbox limitation for Prisma CLI.** In the Codex sandbox, Prisma CLI commands that need database access may fail because the sandbox cannot connect to local Postgres (for example `localhost:5432`). If a task requires `prisma migrate`, `prisma db push`, `prisma migrate reset`, or similar DB-connected Prisma commands, the human user should run them in their own shell and provide the results back for review.
11. **Migration transaction wrapper.** When reviewing or adjusting generated Prisma migration SQL in this repo, make sure the migration statements are wrapped in an explicit `BEGIN;` / `COMMIT;` transaction block.
12. **Never assume this skill is up-to-date.** Scan the relevant code areas during work and check if the skill is out of date with the codebase.
13. **Prompt to update skill.** If the skill is out of date with the codebase, prompt the human user on if they want to update the skill.

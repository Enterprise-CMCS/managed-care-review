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
| Contract/rate data overrides, override mutations, parser merge behavior, adding new overridable fields | `references/10-revision-overrides.md` + `docs/technical-design/contract-and-rate-data-override.md` |

For broad multi-area features (e.g. a new "undo unlock contract" mutation): read `01`, `02`, `05`, and `08` first; pull in `06` and `07` if rates cross contract boundaries.

## Cheat sheet — facts to keep in mind

- **Two-tier pattern**: parent table (identity) + revision table (form data). Form data lives only on revisions; parents are stable anchors.
- **Submit stamps an existing draft revision in place. Unlock CREATES a new revision row.** Both flip status by setting `submitInfoID` / `unlockInfoID` on a row.
- **Status is never stored.** It's derived in the parser from the latest revision's `submitInfo`/`unlockInfo` pair, plus the latest `*ActionTable` row, plus a few special-case rules.
- **There are two different kinds of GraphQL resolvers in this codebase.**
  - **Top-level Query/Mutation resolvers** are operation entrypoints such as `submitContract`, `unlockContract`, `fetchRate`, `createContractQuestion`. These handle auth, user-input validation, orchestration, store writes/reads, and error formatting for client-initiated operations.
  - **Schema object-field resolvers** are the per-type resolver objects registered under keys like `Rate`, `Contract`, `RateRevision`, `ContractQuestion`, `GenericDocument`, `DocumentZipPackage` in `services/app-api/src/resolvers/configureResolvers.ts`. These run when GraphQL resolves selected fields on already-fetched objects. They usually compute derived fields (`webURL`, `state`, `initiallySubmittedAt`, `packageSubmissions`, `downloadURL`, `round`) or do secondary lookups, but they are not top-level workflow entrypoints.
  - Treat these categories differently when changing behavior: operation resolvers are where business-action eligibility, authorization, and mutation orchestration usually belong; object-field resolvers are where type hydration/derivation logic belongs.
- **Parent contract is never stored.** It's derived per rate as "the contract whose latest submission stamped this rate's latest submitted revision."
- **One `UpdateInfoTable` event row per submit-or-unlock; shared across the contract and every child rate touched in that transaction.** This is what lets the parser later detect "these were submitted/unlocked together."
- **`SubmissionPackageJoinTable`** is the immutable snapshot of contract↔rate at submit time, joining specific contract revision + specific rate revision + position. **`DraftRateJoinTable`** is the working set on a contract that's currently in draft, joining parent tables only.
- **Form-data writes via `updateDraftContract` are full replaces, not merges.** Omitted fields are nulled (`nullify`) or emptied (`emptify`). Child collections (documents, contacts) are delete-and-recreate, so row IDs are not stable across updates.
- **Resolver-called store function writes to `ContractTable`, `RateTable`, `ContractQuestion`, or `RateQuestion` should default to `runTransactionWithRowLock`.** Use `services/app-api/src/postgres/prismaHelpers.ts` and pass the table + row id so concurrent writes to the same record serialize before the store performs additional reads or writes.
- **After acquiring a row lock, re-check write preconditions inside the transaction.** Resolver-time validation can be stale by the time the lock is acquired; the store should validate current state again before applying writes.
- **Question-response writes follow the same rule as contract/rate state changes.** If a resolver-called store function writes a `ContractQuestion` or `RateQuestion` row or appends related responses based on current question state, default to `runTransactionWithRowLock` and validate deleted/current status after the lock is acquired.
- **Undo unlock is revision history, not a new submission event.** Read `09-undo-unlock.md` if you touch `undoUnlockInfo`, active-draft logic, or linked-rate cleanup.
- **Contract/rate data overrides are append-only correction events on submitted data.** Read `10-revision-overrides.md` and `docs/technical-design/contract-and-rate-data-override.md` before touching override mutations, override tables, parser merge behavior, document override lookup, or unlock/submit behavior for overridden data.
- **Override operation columns carry intent; value columns carry payload.** Do not infer override behavior from null/undefined values. `OVERRIDE` applies payload, `CLEAR_OVERRIDE` clears scalar field override state, and nullable op columns mean no instruction.
- **Override reads apply in the postgres-to-domain parser.** Most effective contract/rate data should be merged in parse helpers, not ad hoc in GraphQL object-field resolvers. Some parent-level fields may still need field resolver handling when the response shape does not use full parser output.
- **Document overrides are array-item operations, not full array replacement.** Use `documentSha256` as the sparse merge key, use `documentID` to disambiguate duplicate base docs, and remember override-added documents expose the override row id as `GenericDocument.id`.
- **Deprecated — do not include in new designs:**
  - `ContractTable.sharedRateRevisions` / `RateRevisionTable.contractsWithSharedRateRevision` (the `SharedRateRevisions` M:N) — not marked deprecated in the schema source, but confirmed deprecated 2026-05-04.
  - `HealthPlanPackageTable` / `HealthPlanRevisionTable` (proto legacy) — marked `deprecated Boolean @default(true)`.
- **A `Without...` Zod schema** (e.g. `contractWithoutDraftRatesSchema`) is the one-level recursion break. It exists so a contract can embed rates and a rate can embed contracts without infinite recursion. The include shape mirrors this with `includeContractWithoutDraftRates` / `includeRateWithoutDraftContracts`.
- **`DRAFT_PARENT_PLACEHOLDER`** (`'DRAFT_PARENT_REPLACE_ME'`): a never-submitted rate has no real parent, so the parser returns this placeholder; the outer parser patches it from `draftContracts[0].id`.
- **Schema typo to know about**: `ContractRevisionTable.relatedSubmisions` (one `s`) vs `RateRevisionTable.relatedSubmissions` (correct). Both are valid relation names; code uses each side's spelling.

## Submission history and freshness

Use this model when changing `lastActionDate`, `submissionHistoryHelpers`, `fetchSubmissionHistory`, submit/unlock/withdraw flows, override flows, or Q&A writes.

**Core rule**: `lastActionDate` should move when submitted-visible data changes for CMS users, or when a visible review, Q&A, or status action happens. Draft-only form edits should not move CMS-facing freshness unless the action itself is visible, such as an unlock.

For contracts, submitted-visible data means the latest submitted contract package: contract form data plus submitted rate data attached to that package. For rates, submitted-visible data means the latest submitted rate revision plus submitted contract relationship changes, rate overrides, rate Q&A, and rate review/status actions.

Write `lastActionDate` at the lowest-level store/transaction function that writes the user-visible action row or submission event to the database. Do not rely on a resolver or broad orchestration wrapper to recalculate it later. Examples: submit freshness belongs in `submitContractAndOrRates`, review freshness belongs where the review action row is appended, override freshness belongs where the override row is created, and Q&A freshness belongs where the question/response/action row is created.

When one workflow writes multiple actions in one transaction, ordering matters: intermediate submit/unlock writes may happen first, but the final visible action should overwrite `lastActionDate`. For example, withdraw and undo-withdraw flows can submit/unlock first, then write a review/status action that becomes the stored freshness date.

### Contract freshness

Contract `lastActionDate` should update for:
- Direct contract submit/resubmit.
- Contract unlock.
- Contract review actions such as `UNDER_REVIEW`, `NOT_SUBJECT_TO_REVIEW`, `MARK_AS_APPROVED`, `WITHDRAW`, reverse approve, and undo-withdraw restored review actions.
- Contract data overrides.
- Contract Q&A create/response/delete/restore actions.
- Already-linked rate data updates when the rate's parent contract resubmits the rate.
- Linked or child rate overrides while the rate is attached in submitted package history.
- Linked or child rate Q&A while the rate is attached in submitted package history.
- Rate withdraw/undo-withdraw when it changes the contract's submitted package or review state.

Contract `lastActionDate` should not update for:
- Draft-only form edits.
- Draft-only rate links/unlinks.
- Rate actions before the rate was attached to the contract in submitted history.
- Rate actions after the rate was removed from the contract's submitted package.
- Rate link/unlink as a separate contract event, because a submitted link/unlink is represented by the contract's own submit/resubmit history.

### Rate freshness

Rate `lastActionDate` should update for:
- Rate submission through parent contract submit/resubmit.
- Rate unlock through parent contract unlock.
- Rate review/status actions such as `UNDER_REVIEW`, `WITHDRAW`, undo-withdraw restored actions, and future rate review actions if added.
- Rate data overrides.
- Rate Q&A create/response/delete/restore actions.
- Rate link/unlink through contract submit/resubmit, because that changes the rate's submitted contract relationships even if the rate revision itself did not change.
- Withdraw contract when child rates are withdrawn.
- Withdraw rate and undo-withdraw rate.

Rate `lastActionDate` should not update for:
- A linked contract resubmitting without changing this rate relationship or rate data.
- Draft-only rate links/unlinks that have not been submitted.

### History builders

`buildContractSubmissionHistory` returns contract-level submitted history:
- Includes `CONTRACT_SUBMISSION`, `UNLOCK`, `LINKED_RATE_UPDATE`, contract `OVERRIDE`, and contract review actions.
- Skips `RATE_LINK` and `RATE_UNLINK` by design. From the contract perspective, submitted link/unlink changes are captured by the contract's own submit/resubmit. Separate link/unlink entries would duplicate contract submission history and are brittle for draft-only relationship changes.

`buildRateSubmissionHistory` returns rate-level submitted history:
- Includes `RATE_SUBMISSION`, `UNLOCK`, `RATE_LINK`, `RATE_UNLINK`, rate `OVERRIDE`, and rate review actions.
- Skips already-related contract submissions that do not change rate data or the submitted contract relationship for that rate.

`buildQuestionResponseHistory` returns scoped Q&A actions:
- Contract scope uses `CONTRACT_QUESTION`, `CONTRACT_QUESTION_RESPONSE`, and contract question/response delete/restore action types.
- Rate scope uses `RATE_QUESTION`, `RATE_QUESTION_RESPONSE`, and rate question/response delete/restore action types.
- Cascade delete events should be skipped; the direct parent question/response action is the user-visible event.

`buildCompleteHistory` merges already-built histories and sorts newest-first. If two actions have the same JS millisecond, `actionTypeSortRank` breaks ties so later lifecycle actions such as overrides or review/status actions sort above submit, and submit sorts above unlock. Keep this tie-breaker in mind when adding action types that can share a DB transaction timestamp.

History builders are best-effort readers over parsed domain data. They should not block fetching a contract/rate because history shape is imperfect; for example, ambiguous missing previous package data is logged/skipped rather than throwing.

### Full submission history query

`fetchSubmissionHistory` is the heavier explicit history query. The resolver should stay thin: check OAuth/read permissions, fetch the contract enough to enforce state/CMS/Admin access, then call `findSubmissionHistoryByContractID` for the assembled history and map the result to GraphQL. Keep the expensive history assembly in the store layer so resolver tests exercise the same data-building path other callers can reuse.

`findSubmissionHistoryByContractID` merges contract submission history, contract Q&A history, and selected rate-owned history filtered to windows where the rate was attached to the contract in submitted package history. This windowing matters because a linked rate can be linked, delinked, and relinked; rate actions only belong in contract history when CMS users could see that rate through the contract's latest submitted package.

For contract history, derive attached-rate windows from the contract's own `packageSubmissions`, not from rate-wide package history. The contract package timeline is the source of truth for when a given rate was submitted as part of that contract. Rate package history can include parent submits and other linked contracts that are not relationship changes for this contract.

Do not merge `buildRateSubmissionHistory` wholesale into contract `fetchSubmissionHistory`. Contract history should include attached-window-filtered rate overrides and rate Q&A because those can change CMS-visible submitted data without a contract submit. It should not include raw rate `RATE_SUBMISSION`, `RATE_LINK`, `RATE_UNLINK`, `UNLOCK`, or rate review/status entries from the rate builder; those are either represented by the contract package timeline or are not contract-scoped enough for this view.

Important edge cases:
- If Contract B links to Rate R owned by Contract A, and Contract A resubmits Rate R while B already has R in submitted history, then B's submitted-visible rate data changed. B history should get `LINKED_RATE_UPDATE`, and B `lastActionDate` should update to that parent submit timestamp.
- If Contract B is unlocked when Rate R is overridden, the override can still affect B's submitted-visible data because CMS users see the latest submitted package, not B's draft. The linked rate override should move B `lastActionDate` and appear in explicit submission history while R is attached.

### Related contract freshness helpers

`updateRelatedContractsLastActionDateByRateID` resolves contracts from the rate's latest submitted package snapshot. It is appropriate for rate-visible changes that happen outside a contract submit, such as rate overrides and rate Q&A. It intentionally ignores draft-only links and previously removed links. It throws if no currently related submitted contracts exist, so callers should only use it when at least one related contract is expected.

`submitContractAndOrRates` also updates related contracts when a submitted rate was already attached to those contracts in their previous submitted package. This keeps `lastActionDate` aligned with the `LINKED_RATE_UPDATE` history entry. Group these writes with contract freshness writes; rate freshness writes are separate and should only update rates whose own rate history changed.

### Display and indexing

`lastActionDate` is the stored CMS/Admin freshness date. CMS/Admin users do not see draft-only edits, so `lastUpdatedForDisplay` uses `lastActionDate` when present and falls back to `updatedAt`. State users can see draft changes, so display/index formatting considers the latest of `lastActionDate` and `draftRevision.updatedAt`.

`indexContracts` should use the stored `lastActionDate` for CMS/Admin filtering/sorting when the `use-stored-contract-action-dates` flag is on rather than recalculating full history for every indexed contract. The legacy flag-off `updatedWithin` path uses calculated display freshness and is incomplete compared with `lastActionDate`; keep compatibility fixes minimal and avoid treating it as canonical submission history.

### Implementation checklist for new actions

When adding a new action, status transition, override path, Q&A path, submit-like workflow, or relationship change, explicitly answer these questions in code review:

1. **Is this action visible to CMS users?**
   - If it changes submitted-visible contract/rate data, review/status state, Q&A, or override state, it probably belongs in history and should move `lastActionDate`.
   - If it is draft-only form data or draft-only relationship state, it generally should not move CMS-facing `lastActionDate`.

2. **Which record's freshness moves?**
   - Contract action/data changes move `ContractTable.lastActionDate`.
   - Rate action/data changes move `RateTable.lastActionDate`.
   - Rate-visible changes can also move related contract `lastActionDate` when the rate is attached to those contracts in submitted package history.
   - Contract relationship changes can move rate `lastActionDate` when the submitted relationship for the rate changes.

3. **Where should the write happen?**
   - Write `lastActionDate` in the lowest-level store/transaction function that writes the action row or submission event.
   - Use the DB-created action timestamp (`createdAt` / `updatedAt`) instead of creating a separate timestamp when possible.
   - If the same workflow writes several actions, make the final visible action write last so it becomes the stored freshness date.

4. **Which history builder should emit the action?**
   - Contract-only submitted-visible actions belong in `buildContractSubmissionHistory`.
   - Rate-only submitted-visible actions belong in `buildRateSubmissionHistory`.
   - Q&A actions belong in `buildQuestionResponseHistory`.
   - Cross-rate contract history that is too expensive or relationship-window dependent belongs in `fetchSubmissionHistory`, not in a lightweight field resolver.

5. **Does `fetchSubmissionHistory` need relationship-window filtering?**
   - If the action comes from a rate but is shown in contract history, include it only during windows where the rate was attached to the contract in submitted package history.
   - For contract history, only rate overrides and rate Q&A are currently merged from rate-owned history; do not add raw rate submit/link/unlink/unlock/review entries without revisiting the contract-scoped semantics.
   - Do not include rate actions before a link, during a delink gap, after unlink/withdraw removal, or from draft-only links.

6. **Do GraphQL enums/types need updates?**
   - New history action types must be added to the app GraphQL schema and generated types.
   - Keep action names specific enough to distinguish contract-scoped and rate-scoped history when both can appear in a combined history response.

7. **What tests prove freshness and history stay aligned?**
   - Add resolver or store tests that assert the affected table's `lastActionDate` equals the timestamp of the newest relevant history entry.
   - Include negative tests for actions that should not appear or should not move freshness, especially draft-only changes and out-of-window linked rate actions.
   - For long workflows, add checkpoint assertions after high-risk intermediate actions, not only at the end.
   - Prefer creating real submissions/actions through existing resolver helpers over hand-crafting domain history data when testing end-to-end behavior.

8. **Does indexing/display behavior still hold?**
   - If a new action should affect CMS/Admin freshness, confirm stored `lastActionDate` is enough for `indexContracts` and `lastUpdatedForDisplay`.
   - If state users can see draft-side effects, confirm display code still considers draft revision updates separately from stored CMS freshness.

## Authorization patterns at a glance

| Mutation | Who can do it | Source of rule |
|---|---|---|
| `insertDraftContract` / `insertDraftRate` / `updateDraftContract` / `updateDraftContractRates` | State user matching the contract's `stateCode` | Resolver |
| `submitContract` (initial submit + resubmit) | State user matching the contract's `stateCode` | Resolver |
| `unlockContract` | CMS user (`hasCMSPermissions`) | Resolver |
| `unlockRate` | CMS user (`hasCMSPermissions`), inactive standalone-rate path | Resolver |
| `withdrawContract` / `withdrawRate` | CMS user | Resolver |
| `overrideContractData` / `overrideRateData` | Admin user only | Resolver + store status checks |
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
| Submission history domain types | `services/app-api/src/domain-models/contractAndRates/submissionHistoryTypes.ts` |
| Find entry points | `services/app-api/src/postgres/contractAndRates/findContractWithHistory.ts`, `findRateWithHistory.ts` |
| Full include shapes | `prismaFullContractRateHelpers.ts` (same dir) |
| Without-draft includes | `prismaSubmittedContractHelpers.ts`, `prismaSubmittedRateHelpers.ts` |
| Parsers | `parseContractWithHistory.ts`, `parseRateWithHistory.ts` |
| Override write paths | `services/app-api/src/resolvers/contract/overrideContractData.ts`, `services/app-api/src/resolvers/rate/overrideRateData.ts`, `services/app-api/src/postgres/contractAndRates/overrideContractData.ts`, `services/app-api/src/postgres/contractAndRates/overrideRateData.ts` |
| Override merge and validation helpers | `services/app-api/src/postgres/prismaOverrideMergeHelpers.ts` |
| Status helpers, parent-id, formData converters | `prismaSharedContractRateHelpers.ts` |
| Insert (create new) | `insertContract.ts`, `insertRate.ts` |
| Update draft form data | `updateDraftContract.ts`, `updateDraftRate.ts`, `updateDraftContractRates.ts`, `updateDraftContractWithRates.ts` |
| Domain↔Prisma form-data adaptors | `prismaContractRateAdaptors.ts` |
| `nullify` / `emptify` helpers | `services/app-api/src/postgres/prismaDomainAdaptors.ts` |
| Submit resolver | `services/app-api/src/resolvers/contract/submitContract.ts` |
| Submit postgres outer | `services/app-api/src/postgres/contractAndRates/submitContract.ts` |
| Submit core engine | `submitContractAndOrRates.ts` (same dir) |
| Submission history builders | `services/app-api/src/postgres/submissionHistoryHelpers.ts` |
| Full submission history store reader | `services/app-api/src/postgres/contractAndRates/findSubmissionHistoryByContractID.ts` |
| Full submission history resolver | `services/app-api/src/resolvers/contract/fetchSubmissionHistory.ts` |
| lastActionDate helpers | `services/app-api/src/postgres/updateLastActionDateHelpers.ts` |
| Resolver registration map (top-level + object-field resolvers) | `services/app-api/src/resolvers/configureResolvers.ts` |
| Unlock resolver | `services/app-api/src/resolvers/contract/unlockContract.ts` |
| Unlock postgres (contract) | `services/app-api/src/postgres/contractAndRates/unlockContract.ts` |
| Unlock postgres (rate engine) | `unlockRate.ts` (same dir) |
| Standalone unlock rate resolver | `services/app-api/src/resolvers/rate/unlockRate.ts` (standalone-rate scaffold; not expected to match `unlockContract` parity while rates submit with contracts only) |
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
- `docs/technical-design/contract-and-rate-data-override.md` — canonical design for contract/rate override storage, operation semantics, read-time merge behavior, write validation, document overrides, and submission lifecycle behavior
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
3. **Decide whether the work belongs in an operation resolver or an object-field resolver.** Check `services/app-api/src/resolvers/configureResolvers.ts` first if you're unsure which kind you're looking at.
   - Query/Mutation resolver: operation boundary, auth, mutation orchestration, user-facing error shaping.
   - Object-field resolver: per-type field hydration/derivation after the parent object already exists.
4. **Trace the relevant mutation** (references 04–07) end-to-end if the task is an operation change. The resolver does authorization, validation, and formatting; the postgres layer does the actual DB work — they often have important guards in different places.
5. **If the resolver calls a store function that writes a row in `ContractTable`, `RateTable`, `ContractQuestion`, or `RateQuestion`, default to `runTransactionWithRowLock`.** Only skip it when last-write-wins behavior is intentional and acceptable for that path.
6. **Check `packageSubmissions` and cause impact** (reference 08) if the change involves an `UpdateInfoTable` event. The change may append entries to the package history from both contract and rate perspectives.
7. **Apply the submission history and freshness checklist** if the change writes a new action, status transition, override, Q&A action, submit-like event, or contract/rate relationship change. Decide whether the action is CMS-visible, update `lastActionDate` at the lowest-level DB write, update the relevant history builder/query, and add tests proving newest history aligns with stored freshness.
8. **Don't include `sharedRateRevisions`** in any new design — deprecated.
9. **Watch for `DRAFT_PARENT_PLACEHOLDER`** if the change involves draft rates without a submitted parent yet — the placeholder needs the outer parser to patch.
10. **Verify file paths and code shapes against the current state of the repo** before depending on specifics. This reference was synthesized at a point in time; it can drift.
11. **Never hand-write Prisma migrations.** If a schema change needs a migration, generate it with the Prisma CLI and review the generated SQL rather than manually creating `migration.sql` files.
12. **Sandbox limitation for Prisma CLI.** In the Codex sandbox, Prisma CLI commands that need database access may fail because the sandbox cannot connect to local Postgres (for example `localhost:5432`). If a task requires `prisma migrate`, `prisma db push`, `prisma migrate reset`, or similar DB-connected Prisma commands, the human user should run them in their own shell and provide the results back for review.
13. **Migration transaction wrapper.** When reviewing or adjusting generated Prisma migration SQL in this repo, make sure the migration statements are wrapped in an explicit `BEGIN;` / `COMMIT;` transaction block.
14. **Never assume this skill is up-to-date.** Scan the relevant code areas during work and check if the skill is out of date with the codebase.
15. **Prompt to update skill.** If the skill is out of date with the codebase, prompt the human user on if they want to update the skill.

# Prisma → Domain parse pipeline

Directory: `services/app-api/src/postgres/contractAndRates/`

The pipeline that turns raw Prisma rows (the storage shape from `01-storage-schema.md`) into the domain types (from `02-domain-types.md`). Status, parent-contract, and `packageSubmissions` projections all happen here.

## Entry points

- `findContractWithHistory.ts` — Prisma `contractTable.findUnique` with `include: includeFullContract`, then `parseContractWithHistory`. Returns `ContractType | NotFoundError | Error`.
- `findRateWithHistory.ts` — mirror, with `includeFullRate` and `parseRateWithHistory`. Returns `RateType | NotFoundError | Error`.

Both are thin wrappers; the work is in the include shape and the parser.

## The `include` shape (`prismaFullContractRateHelpers.ts`)

```
includeFullContract = includeContractWithoutDraftRates + draftRates + withdrawnRates
                                                          ↳ each rate uses includeRateWithoutDraftContracts (no draftContracts)
includeFullRate     = includeRateWithoutDraftContracts + draftContracts + withdrawnFromContracts
                                                          ↳ each contract uses includeContractWithoutDraftRates (no draftRates)
```

The "Without" layer breaks the type loop one level deep — see "Recursion handling" in `02-domain-types.md`.

The base `includeContractWithoutDraftRates` (`prismaSubmittedContractHelpers.ts`) pulls:
- `revisions` (orderBy `createdAt` asc) → form data + `relatedSubmisions` (typo, contract side) → each submission's `submittedContracts`, `submittedRates`, `updatedBy`, `submissionPackages` (orderBy `ratePosition` asc) with `rateRevision`+formData
- `reviewStatusActions` (orderBy `updatedAt` asc) + `updatedBy`
- `contractOverrides` + `updatedBy`

The base `includeRateWithoutDraftContracts` (`prismaSubmittedRateHelpers.ts`) is symmetric:
- `revisions` (orderBy `createdAt` asc) → form data + `submitInfo.submittedContracts` (for parent-contract resolution) + `relatedSubmissions` (correct spelling, rate side) with full submission graph including `submissionPackages` joining both sides
- `reviewStatusActions`
- `rateOverrides` with optional nested `revisionOverride` (selecting `rateDocuments` + `supportingDocuments`)

## Parser (`parseContractWithHistory.ts`, `parseRateWithHistory.ts`)

`parseContractWithHistory(contract, useZod=true)`:
1. Calls `contractWithHistoryToDomainModel`.
2. If `useZod`, runs `contractSchema.safeParse` and returns the validated data or the Zod error. Skipped (e.g.) by index queries that just need the shape.

`contractWithHistoryToDomainModel`:
1. Calls `contractWithHistoryToDomainModelWithoutRates` (the meat).
2. If status is `SUBMITTED` or `RESUBMITTED`: returns with `withdrawnRates` only.
3. Otherwise: also maps `draftRates` and patches up `parentContractID` placeholders on each draft rate (see "DRAFT_PARENT_PLACEHOLDER" in `08-derived-state.md`).

### `contractWithHistoryToDomainModelWithoutRates` — the core algorithm

1. **Split revisions into draft + submitted.** Walk `contract.revisions`. A revision with no `submitInfo` is the draft revision. Programming-error assertion: at most one. Everything else → `submittedRevisions[]`.

2. **Map review status actions** to domain shape, push to local list.

3. **Build packageSubmissions.** For every revision, for every entry in `revision.relatedSubmisions` (each entry = one `UpdateInfoTable` event the revision was part of), produce one package entry:
   - `submitInfo` ← the event row
   - `submittedRevisions` ← flatten `submission.submittedContracts` + `submission.submittedRates`, both mapped to domain
   - `contractRevision` ← THIS revision (per-perspective: the contract calling the parser is "I")
   - `rateRevisions` ← filter `submission.submissionPackages` to those with `contractRevisionID === revision.id`, sort by `ratePosition`, map embedded `rateRevision` to domain

   The rate-side parser does the mirror: filters `submissionPackages` by `rateRevisionID === revision.id`, sorts by the contract revision's `createdAt`, returns `contractRevisions`.

4. **Compute three statuses** via `getContractRateStatus`, `getContractReviewStatus`, `getConsolidatedContractStatus`. See `08-derived-state.md` for the rules.

5. **Reverse arrays.** `revisions`, `packageSubmissions`, `reviewStatusActions` are built ascending then `.reverse()`d → consumer gets newest-first.

The rate-side parser (`rateWithoutDraftContractsToDomainModel`) is structurally identical with mirrored field names. It additionally calls `getParentContractID` (see `08-derived-state.md`).

## Stripped parsers

`parseStrippedContractWithHistory` / `parseStrippedRateWithHistory` produce `StrippedContractType` / `StrippedRateType`:

- No `packageSubmissions`, no `revisions[]` — just `latestSubmittedRevision` (single).
- Stripped formData (UI-list-view subset only).
- `initiallySubmittedAt` = latest override's `initiallySubmittedAt` if present, else the *oldest* submitted revision's `submitInfo.updatedAt`.

Used for index/list queries.

## See also

- `docs/technical-design/graphql-resovler-design.md` — resolver layer conventions for the surface that consumes these parsers
- `docs/architectural-decision-records/011-typescript-error-handling.md` + `012-custom-error-types.md` — the result/error pattern the postgres helpers and parsers return

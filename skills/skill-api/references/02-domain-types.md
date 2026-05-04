# Domain types (Zod)

Directory: `services/app-api/src/domain-models/contractAndRates/`

This reference covers the Zod-defined domain shapes. For the storage schema underneath them, see `01-storage-schema.md`. For how Prisma data gets parsed into these types, see `03-parse-pipeline.md`.

## Base shapes (`baseContractRateTypes.ts`)

`contractWithoutDraftRatesSchema` and `rateWithoutDraftContractsSchema` are the symmetric base objects. The "without …" naming breaks circular references when one side embeds the other. Each has:

- identity (`id`, `createdAt`, `updatedAt`, `stateCode`, `stateNumber`, etc.)
- three computed status flavors: `status`, `reviewStatus`, `consolidatedStatus`
- `reviewStatusActions[]` — the action history
- `draftRevision?` — currently-editable revision (when status is `DRAFT` or `UNLOCKED`)
- `revisions[]` — submitted revisions, reverse-chronological per the comment
- **`packageSubmissions[]`** — the snapshot history (key item)
- `questions?`
- `contractOverrides[]` / `rateOverrides[]`
- rate side adds `parentContractID`

## Full schemas (`contractTypes.ts`, `rateTypes.ts`)

- `contractSchema` extends base with `withdrawnRates?` and `draftRates?` (each as `rateWithoutDraftContractsSchema`)
- `rateSchema` extends base with `withdrawnFromContracts?` and `draftContracts?`

## Specialized variants

- **`UnlockedContractType`** (`contractTypes.ts`) — `status` narrowed to `DRAFT|UNLOCKED`, `draftRevision` and `draftRates` non-optional.
- **`DraftContractType`** — `status: 'DRAFT'`, `draftRevision` required, `revisions.min(1)` (slight tension with the "all submitted" comment — confirm meaning before depending on it).
- **`submittableContractSchema` / `submittableEQROContractSchema`** — validation-only schemas requiring the draft's `formData` to pass `submittableContractFormDataSchema` and draft rates' formData to pass `submittableRateFormDataSchema`. "Submittable" = a draft whose form data is complete enough to submit.
- **`StrippedContractType` / `StrippedRateType`** — lightweight index projections: `latestSubmittedRevision` (single, required) replaces both `revisions[]` and `packageSubmissions[]`. Used for list views / index queries.
- **EQRO** variants — separate schemas for `EQRO` submission type contracts (no rates side).

## `packageSubmissions` — per-perspective snapshot of submission history

Defined in `packageSubmissions.ts`. Domain projection of `UpdateInfoTable` + `SubmissionPackageJoinTable`, reshaped so each side sees the package from its own viewpoint.

**Contract perspective** (`contractPackageSubmissionSchema`):
```
{
  submitInfo,                       // the UpdateInfoTable event
  submittedRevisions,               // every revision touched by this event (contract + rate, flattened)
  contractRevision,                 // THIS contract's revision at submission time
  rateRevisions[],                  // rates attached at submission time, in ratePosition order
}
```

**Rate perspective** (`ratePackageSubmissionSchema`) — mirror:
```
{
  submitInfo,
  submittedRevisions,
  rateRevision,                     // THIS rate's revision
  contractRevisions[],              // contracts attached at submission time
}
```

The same DB join rows project into different shapes depending on which entity is loading them.

**`...WithCauseType`** variants add `cause: 'CONTRACT_SUBMISSION' | 'RATE_SUBMISSION' | 'RATE_UNLINK' | 'RATE_LINK'`. So a contract's `packageSubmissions` list isn't only events where the contract itself was submitted — it also records events where an attached rate was submitted/linked/unlinked. The list answers *"what events have ever modified the shape of my package?"*, not just *"when was I submitted?"*.

Cause derivation lives in the resolver layer (`contractResolver.ts`, `rateResolver.ts`), not in the parser — see `08-derived-state.md`.

## Revisions (`revisionTypes.ts`)

Each revision has `submitInfo?` and `unlockInfo?` (both `updateInfoSchema`: `updatedAt`, `updatedBy`, `updatedReason`).

- `contractRevisionSchema` embeds a small `contract` projection (`id`, `stateCode`, `stateNumber`, `contractSubmissionType`).
- `rateRevisionSchema` carries `rateID` instead.
- Both hold full `formData`. Stripped variants use stripped formData.

## Statuses (`statusType.ts`)

Computed in the parse layer, never stored. Schemas:

| Schema | Values |
|---|---|
| `statusSchema` | `SUBMITTED \| DRAFT \| UNLOCKED \| RESUBMITTED` |
| `contractReviewStatusSchema` | `UNDER_REVIEW \| APPROVED \| WITHDRAWN \| NOT_SUBJECT_TO_REVIEW` |
| `rateReviewStatusSchema` | `UNDER_REVIEW \| WITHDRAWN` |
| `consolidatedContractStatusSchema` | union of the two above |
| `consolidatedRateStatusSchema` | `statusSchema` ∪ `WITHDRAWN` |
| `unlockedContractStatusSchema` | `DRAFT \| UNLOCKED` |

For how each status is derived, see `08-derived-state.md`.

## Recursion handling

- One-level "Without" pattern in both includes and Zod schemas (`contractWithoutDraftRatesSchema`, `rateWithoutDraftContractsSchema`). Embedded rates inside a contract use the without form, and vice versa.
- `withdrawnRates` / `withdrawnFromContracts` use the without form.
- `draftRates` / `draftContracts` use the without form.
- The `DRAFT_PARENT_PLACEHOLDER` workaround (`'DRAFT_PARENT_REPLACE_ME'`) is the only piece that can't be solved by the type-level break — it requires runtime patching at the outer parse level. Detail: see `08-derived-state.md`.

## See also

- `docs/technical-design/contract-rate-types-naming.md` — naming conventions for contract/rate types (heads-up: file truncates mid-section in the current repo state)
- `docs/technical-design/naming-conventions.md` — broader naming guide

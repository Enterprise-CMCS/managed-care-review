# Derived state — status, parent contract, cause, recursion

Status, parent contract, and the `*WithCause` enum on `packageSubmissions` are **never stored** in the database. They are computed at parse time (status, parent contract) or at resolver time (cause). This reference describes the rules.

For the schemas these helpers operate on, see `01-storage-schema.md` (storage) and `02-domain-types.md` (domain). For where the helpers are called, see `03-parse-pipeline.md`.

## Status derivation (`prismaSharedContractRateHelpers.ts`)

### `getContractRateStatus` — used for both contracts AND rates

Looks at the **latest revision only** (sorted by `createdAt` desc):

| `submitInfo` | `unlockInfo` | → status |
|---|---|---|
| set | set | `RESUBMITTED` |
| — | set | `UNLOCKED` |
| set | — | `SUBMITTED` |
| — | — | `DRAFT` |

Implications:

- An unlocked-but-not-yet-resubmitted draft revision sits with `unlockInfo` set + `submitInfo` null → status `UNLOCKED`. After resubmit, the same row gets `submitInfo` filled → status flips to `RESUBMITTED`.
- The draft revision split in the parser (revisions with no `submitInfo` route out of `revisions[]` into `draftRevision`) is consistent with this: an `UNLOCKED` contract's "latest revision" is actually `draftRevision`, not the head of `revisions[]`.

### `getContractReviewStatus`

Reads the latest `ContractActionTable` row by `updatedAt` desc:

- `NOT_SUBJECT_TO_REVIEW` action → `NOT_SUBJECT_TO_REVIEW`
- `MARK_AS_APPROVED` → `APPROVED`
- `WITHDRAW` → `WITHDRAWN`
- Otherwise (or no actions) → `UNDER_REVIEW`

### `getRateReviewStatus`

Only `WITHDRAW` is meaningful → `WITHDRAWN`. Everything else → `UNDER_REVIEW`.

### `getConsolidatedContractStatus`

- If `reviewStatus !== UNDER_REVIEW`: reviewStatus wins.
- Single exception: `UNLOCKED` status beats `NOT_SUBJECT_TO_REVIEW` reviewStatus (UNLOCKED takes priority).
- If reviewStatus is `UNDER_REVIEW`: status wins.

### `getConsolidatedRateStatus`

Simpler: `WITHDRAWN` reviewStatus wins, otherwise status wins.

## Parent-contract resolution for rates (`getParentContractID`)

Walks rate revisions newest → oldest:

- **Submitted rate**: find the latest revision whose `submitInfo.submittedContracts[0]` exists; use that `contractID`. Designed so a withdrawn rate retains its pre-withdrawal parent.
- **Never-submitted rate (draft)**: returns the literal placeholder `'DRAFT_PARENT_REPLACE_ME'` (constant: `DRAFT_PARENT_PLACEHOLDER`).
- **No related submission at all** (legacy migration corner case): returns hardcoded `'00000000-1111-2222-3333-444444444444'`.

The `DRAFT_PARENT_PLACEHOLDER` gets patched at the outer level (`rateWithHistoryToDomainModel` or contract-side `contractWithHistoryToDomainModel` for embedded draft rates) by reading the single available draft contract: `draftContracts[0].id`.

This asymmetry exists because the parser doing the rate-without-draft-contracts shape can't see the draft contract from inside — the recursion break removes that data.

For the deeper context on parent vs linked, including how this is used during submit/unlock/withdraw, see `06-linked-rates.md`.

## Cause derivation in `packageSubmissions` (`*WithCause` enums)

Lives in the resolver layer (`services/app-api/src/resolvers/contract/contractResolver.ts`, `services/app-api/src/resolvers/rate/rateResolver.ts`), NOT the parser. Per submission entry, it disambiguates *why* this entry exists in the rate's or contract's history.

**Contract perspective** (`contractResolver.packageSubmissions`):

- Default: `CONTRACT_SUBMISSION` (this contract's own revision was newly stamped).
- If this contract's revision is NOT in `submittedRevisions` → look at the rates in the entry:
  - No rate from `submittedRevisions` matches → `RATE_UNLINK` (a previously-linked rate is gone in this event).
  - A matched rate IS in the previous package's rates → `RATE_SUBMISSION` (linked rate was independently resubmitted via its parent).
  - A matched rate is NEW (not in previous package) → `RATE_LINK` (a new link was added by another contract's submission).

**Rate perspective** (`rateResolver.packageSubmissions`): mirror.

- Default: `RATE_SUBMISSION`.
- Rate's revision is NOT in `submittedRevisions` → look at the contracts in the entry:
  - No contract match → `RATE_UNLINK`.
  - Matched contract was linked before → `CONTRACT_SUBMISSION`.
  - Matched contract is NEW → `RATE_LINK`.

This is how a linked rate's history tells the user "this entry exists because contract X submitted with me attached" vs "this entry exists because I was newly linked to contract X."

## Recursion handling

The contract↔rate relationship is mutually recursive — a contract can have rates, and a rate can have contracts. Both the include shape and the Zod schemas have to break this loop somewhere. They use the same one-level "Without" pattern:

- **Zod schemas**: `contractWithoutDraftRatesSchema` and `rateWithoutDraftContractsSchema` are the symmetric base objects. Embedded rates inside a contract use the without form, and vice versa.
- **Includes**: `includeContractWithoutDraftRates` and `includeRateWithoutDraftContracts`. The full forms (`includeFullContract`, `includeFullRate`) compose these by adding the other side's draft/withdrawn arrays.
- `withdrawnRates` / `withdrawnFromContracts` use the without form.
- `draftRates` / `draftContracts` use the without form.

The `DRAFT_PARENT_PLACEHOLDER` workaround (above) is the only piece that can't be solved by the type-level break — it requires runtime patching at the outer parse level. This is because the parser doing the without-draft-contracts shape can't see the draft contract from inside (the recursion break removed that data); only the outer parser knows enough to fill it in.

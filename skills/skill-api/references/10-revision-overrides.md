# Contract and Rate Data Overrides

Reference for contract/rate override behavior in `services/app-api/`.

For the higher-level design, read
`docs/technical-design/contract-and-rate-data-override.md`.

## Purpose

Overrides are an append-only correction layer on submitted contract and rate
data. They let admin users correct selected submitted fields without rewriting
the original submitted revision rows.

The API returns effective contract and rate data by merging stored base data with
applicable override rows during postgres-to-domain parsing. The original
submitted revision history remains available, and the override rows remain
available as audit history.

This mechanism is not a replacement for unlock/resubmit. Unlock still creates a
new draft revision from effective submitted data, and submit/resubmit still
stamps revision lifecycle state.

## Core Rules

- Override history is append-only. Do not update or delete old override rows to
  change effective data; append a newer override event.
- Operation columns carry intent. Value columns carry payload.
- Nullable operation columns mean no instruction.
- Do not infer intent from `null` or `undefined` value columns.
- `OVERRIDE` applies the value column.
- `CLEAR_OVERRIDE` clears the effective scalar-field override and falls back to
  the submitted base value.
- Invalid operation/value pairs should be rejected before writing when possible.
- Invalid persisted override rows encountered during read/merge should be logged
  and ignored, preserving the prior effective value or base value.
- Override writes to the database are serialized with row locks so override
  events for the same contract or rate cannot be inserted out of order.
- Contract override writes lock the parent contract row. Rate override writes
  lock the parent rate row. The override tables are appended inside that
  row-locked transaction.
- Merge override rows in `createdAt ASC` order. Later rows can supersede earlier
  rows through explicit operations. Do not invent a secondary ordering rule
  without changing the implementation and tests.

## Data Shape

Override rows live at the same level as the data they modify.

- Parent metadata fields live on `ContractOverrides` and `RateOverrides`.
- Revision form-data fields live on `ContractRevisionOverrides` and
  `RateRevisionOverrides`.
- Document item overrides live on `ContractDocumentOverride`,
  `ContractSupportingDocumentOverride`, `RateDocumentOverride`, and
  `RateSupportingDocumentOverride`.

Each parent override row is one audit event. It records who made the correction,
the reason, and the sparse payload for that event.

The override model is intentionally partial. It should include only fields that
are currently overridable. When a new field becomes overridable, mirror that
field in the matching override table and add the paired operation column.

New override mutations target the latest submitted revision for the contract or
rate. They do not accept an arbitrary historical revision id.

## Current Supported Fields

Parent-level overrides:

- `ContractOverrides.initiallySubmittedAt`
- `RateOverrides.initiallySubmittedAt`

Revision-level overrides:

- `ContractRevisionOverrides.contractType`

Document item overrides:

- `dateAdded` on contract documents, contract supporting documents, rate
  documents, and rate supporting documents
- document row operations for `ADD`, `OVERRIDE`, and `DELETE`

## Read Path

The main override application path is the postgres-to-domain parser.

- Contract parse functions apply contract overrides while converting persisted
  contract data into the contract domain model.
- Rate parse functions apply rate overrides while converting persisted rate data
  into the rate domain model.
- Contract responses that include linked rate data should parse linked rates
  through the same override merge rules.
- Rate responses that include linked contract data should parse linked contracts
  through the same override merge rules.

Some parent-level values are still resolved at the GraphQL field resolver level
when the response shape does not use full parser output. Use shared resolver
helpers for these cases rather than duplicating merge logic.

Stripped index responses should stay slim. They may apply relevant scalar or
revision overrides for fields they return, but they should not include full
override history arrays unless the API schema explicitly exposes those fields.

## Write Path

Override mutations are admin-only in the current implementation and require the
normal API write permission path.

Contract overrides are allowed when consolidated status is:

- `SUBMITTED`
- `RESUBMITTED`
- `APPROVED`

Rate overrides are allowed when consolidated status is:

- `SUBMITTED`
- `RESUBMITTED`

Resolvers should perform auth and load the current contract/rate so the API can
return user-facing errors. Store functions should re-check current persisted
state inside the row-locked write transaction before creating override rows.

Validation is split:

- Resolver: auth, write permission, user-facing error mapping.
- Zod/store input validation: operation/value combinations and local payload
  shape.
- Store context validation: current status, target existence, duplicate
  document target ambiguity, and override-added document normalization.

GraphQL input types may remain looser than the store/domain types because
GraphQL cannot express nullability rules that depend on sibling operation
fields.

Empty document override arrays are treated the same as omitted arrays: no
document instructions are written.

## Document Overrides

Document arrays are sparse-merged item collections. A newer document override
array does not replace the previous effective document array.

Every document override row requires `documentSha256`. It is the common sparse
merge identifier for base documents and override-added documents, but it is not a
uniqueness guarantee. Base data can contain duplicate `sha256` values, so
`documentID` disambiguates `OVERRIDE` and `DELETE` when multiple effective
documents match the same `documentSha256`.

Document row operation rules:

- `ADD` must carry full document payload: `name`, `sha256`, and `s3URL`, with
  optional `s3BucketName` and `s3Key`.
- `ADD` must not carry `documentID`.
- `ADD` is invalid when `documentSha256` does not match payload `sha256`.
- `ADD` does not require `dateAdded`. If `dateAddedOp = OVERRIDE` is supplied,
  the `dateAdded` payload must be a concrete date. Without that field-level
  override, the override-added document's effective `dateAdded` is `null`.
- `OVERRIDE` and `DELETE` must target an active base document or active
  override-added document.
- `OVERRIDE` currently supports `dateAdded` field-level overrides only.
- `DELETE` hides either a base document or override-added document from the
  effective view.

Only one document override row is allowed per `documentSha256` in a single
override event for a given document kind. If two active base documents share the
same `sha256` and both need changes, write separate override events and use
`documentID` in each event to disambiguate the target.

For submitted contract and rate documents, `dateAdded` is not nullable in the
override domain. `dateAddedOp = OVERRIDE` requires a concrete date. To remove a
prior `dateAdded` override, use `dateAddedOp = CLEAR_OVERRIDE` with no
`dateAdded` payload.

### Override-Added Document IDs

Override-added documents must behave like base documents for clients. Clients
need a `GenericDocument.id` so they can download the file through existing
document APIs.

- Base document `GenericDocument.id` is the base document table row id.
- Override-added document `GenericDocument.id` is the document override row id
  from the `ADD` row.
- The stored `documentID` column on a document override row is only a relation
  to an existing base document. For override-added documents it remains `NULL`.

If a client sends a later `OVERRIDE` or `DELETE` for an override-added document
using the client-facing override row id as `documentID`, normalize that
`documentID` to `NULL` before writing, but only when it matches the effective
document identified by `documentSha256`. Reject the input if `documentID` and
`documentSha256` identify different effective documents.

Document lookup is separate from effective form-data merge. `findDocumentById`
first looks in base document tables, then falls back to override-added document
rows with `documentOp = ADD`. `findAllDocuments` can include override-added docs
for lookup/audit workflows, but it is not an effective merge view and should not
patch or remove base document rows.

## Submission Lifecycle Behavior

Unlock creates a new draft revision from effective submitted data.

On unlock:

- revision scalar overrides that should become draft base data are materialized
  into the draft value. Today this includes `contractType`.
- parent-level override history, such as `initiallySubmittedAt`, is not copied
  into draft revision form data
- active override-added documents become normal draft document rows
- documents hidden by `DELETE` are not copied into the draft
- field overrides on existing documents, such as `dateAdded`, are not copied
  into draft document rows
- override rows remain attached to the prior submitted revision for history and
  audit

Submit and resubmit preserve document `dateAdded` from previous effective
submitted data. Previous submitted revisions apply document overrides before
tracing first-seen or earliest `dateAdded`. Existing draft documents keep the
earliest effective `dateAdded` from previous submissions. Newly submitted
documents fall back to the current submit timestamp.

Document zip packages are not regenerated by override writes in the current
implementation.

- Metadata-only overrides, such as `dateAdded`, do not change zip contents.
- Document `ADD` and `DELETE` can make an existing zip package stale because the
  merged effective document set differs from stored zip contents.
- Effective form-data reads can show the merged document set while existing zip
  package downloads still reflect the previously generated stored zip.
- The stale-zip window is accepted for now and resolves when lifecycle events
  regenerate zips, such as unlock plus resubmit or explicit zip regeneration.
- If override resolvers later regenerate zips for document `ADD` or `DELETE`,
  keep that orchestration outside the postgres merge helpers.

## Adding A New Scalar Override Field

Use this checklist when adding a new parent-level or revision-level scalar
override field.

1. Decide the owner level.
   - Parent metadata fields belong on `ContractOverrides` or `RateOverrides`.
   - Revision form-data fields belong on `ContractRevisionOverrides` or
     `RateRevisionOverrides`.

2. Update Prisma schema.
   - Add the nullable value column.
   - Add a matching nullable `ScalarFieldOverrideOperation` column named
     `<fieldName>Op`.
   - Generate the Prisma migration with the Prisma CLI and review the SQL.
   - Wrap migration SQL in `BEGIN;` / `COMMIT;` if the generated migration does
     not already do so.

3. Update domain and GraphQL types.
   - Add the field and op field to the override domain schema in
     `services/app-api/src/domain-models/contractAndRates/contractRateOverrideTypes.ts`.
   - Add GraphQL input/output fields if the API should accept or expose this
     override data.
   - Regenerate GraphQL and Prisma generated types.

4. Add write validation in the store function.
   - For contract fields, update
     `services/app-api/src/postgres/contractAndRates/overrideContractData.ts`.
   - For rate fields, update
     `services/app-api/src/postgres/contractAndRates/overrideRateData.ts`.
   - Use `validateScalarOverrideInput`.
   - Pass a Zod `valueSchema` that owns the field's type and nullability.
   - Keep resolver inputs loose if needed, but validate the op/value pair before
     writing.

5. Write the new columns.
   - Add the field and op field to the `contractOverrides.create` or
     `rateOverrides.create` payload, or to the nested revision override create
     payload.
   - Empty/omitted fields should result in no instruction, not a synthetic
     clear.

6. Apply the field in merge helpers.
   - Update Prisma include/query shapes so the new value and op columns are
     loaded anywhere the merge runs. Check full history includes, stripped
     includes, and linked contract/rate parse paths.
   - Parent-level fields usually use `mergeScalarFieldOverrides` in
     `parseContractWithHistory.ts` or `parseRateWithHistory.ts`.
   - Contract revision fields should be added to the scalar state in
     `prismaOverrideMergeHelpers.ts`:
     `MergedContractScalarFieldOverrides`,
     `ContractScalarFieldOverrideRow`, and `mergeContractRevisionOverrides`.
   - Stripped contract revision fields should also be added to
     `mergeStrippedContractRevisionOverrides` if stripped reads return the field.
   - If rate revision scalar fields are added in the future, extend
     `mergeRateRevisionOverrides` with the same scalar-field pattern.

7. Ensure parser output uses the effective value.
   - Full contract/rate reads should get the effective value from parser merge
     output.
   - Linked contract/rate parse paths should use the same parser path so linked
     data has the same effective override behavior.
   - If a stripped or object-field resolver shape does not use the full parser
     output, add a shared resolver helper instead of duplicating merge logic.

8. Update lifecycle behavior if needed.
   - If the field should become draft base data on unlock, update unlock logic to
     materialize the effective value.
   - If the field affects submit/resubmit derived metadata, update
     `submitContractAndOrRates.ts` accordingly.

9. Add focused tests.
   - Store validation for valid `OVERRIDE`, valid `CLEAR_OVERRIDE`, invalid
     value without op, invalid `CLEAR_OVERRIDE` with value, and invalid
     non-nullability.
   - Parser merge tests for multiple override events and clear behavior.
   - Resolver tests for admin success, forbidden users, invalid input, and
     not-found/invalid-status mapping.
   - Linked contract/rate read tests when the field can appear through linked
     data.
   - Unlock/submit lifecycle tests if the field participates in those flows.

## Adding A New Document Override Field

Document override fields are scalar field overrides inside item-level document
operations. Add them only when that document metadata field should be
overridable independently of the document payload.

1. Add nullable value and `<fieldName>Op` columns to all relevant document
   override tables.
2. Update document override input/domain types in the store and domain model.
3. Extend `DocumentOverrideValueSchemas` and document validation in
   `prismaOverrideMergeHelpers.ts`.
4. Decide nullability. Use a Zod schema that matches the field's allowed
   override payload. Submitted document `dateAdded` is the current example of a
   non-null override payload.
5. Extend the document scalar application logic in
   `prismaOverrideMergeHelpers.ts` so `OVERRIDE` and `CLEAR_OVERRIDE` affect the
   effective document item.
6. Confirm `ADD`, `OVERRIDE`, and `DELETE` payload rules still reject unsupported
   or conflicting fields.
7. Add tests for base documents and override-added documents. Include duplicate
   `sha256` disambiguation when the field can target existing documents.

Do not turn document arrays into full replacements. They are item-level sparse
merge collections.

## Key Code Paths

Primary write paths:

- `services/app-api/src/resolvers/contract/overrideContractData.ts`
- `services/app-api/src/resolvers/rate/overrideRateData.ts`
- `services/app-api/src/postgres/contractAndRates/overrideContractData.ts`
- `services/app-api/src/postgres/contractAndRates/overrideRateData.ts`

Primary merge and validation helpers:

- `services/app-api/src/postgres/prismaOverrideMergeHelpers.ts`

Primary read paths:

- `services/app-api/src/postgres/contractAndRates/parseContractWithHistory.ts`
- `services/app-api/src/postgres/contractAndRates/parseRateWithHistory.ts`
- `services/app-api/src/resolvers/shared/overrideHelpers.ts`
- `services/app-api/src/resolvers/contract/contractResolver.ts`
- `services/app-api/src/resolvers/rate/rateResolver.ts`

Lifecycle paths:

- `services/app-api/src/postgres/contractAndRates/unlockContract.ts`
- `services/app-api/src/postgres/contractAndRates/unlockRate.ts`
- `services/app-api/src/postgres/contractAndRates/submitContractAndOrRates.ts`

Document lookup paths:

- `services/app-api/src/postgres/document/findDocumentById.ts`
- `services/app-api/src/postgres/document/findAllDocuments.ts`

## Things Easy To Get Wrong

- treating overrides as full replacement objects instead of sparse events
- inferring intent from nullable value columns instead of operation columns
- forgetting to add both value and operation columns
- adding write validation but not parser merge behavior
- applying overrides only in GraphQL resolvers instead of the parser
- forgetting stripped/index response shapes that do not use full parser output
- dropping override effects during unlock
- copying document `dateAdded` field overrides into draft base rows during unlock
- assuming document arrays are replaced wholesale by newer override arrays
- assuming `documentSha256` is unique across base documents
- persisting an override-added document's client-facing id into `documentID`
- assuming `DocumentZipPackage` reflects document `ADD`/`DELETE` override effects

# Contract and Rate Data Override

## Background

Contract and rate data is stored as submitted revision history. After a contract
or rate is submitted, the submitted revision should remain unchanged so the
system can preserve the original state-submitted package and its history.

There are cases where an admin user needs to correct or override submitted data
without changing the original submitted rows. The contract and rate data override
feature stores those corrections as append-only override events. The API then
returns effective contract and rate data by merging the original submitted data
with the applicable override rows during parsing.

This design keeps three things true at the same time:

- original submitted revision data remains available
- override history remains available for audit and display
- clients can continue to read contract-shaped and rate-shaped data without
  understanding the override table layout

## Data Model

Overrides are stored at the same level as the data they modify.

- Parent metadata fields live on `ContractOverrides` and `RateOverrides`.
- Revision form-data fields live on `ContractRevisionOverrides` and
  `RateRevisionOverrides`.
- Document item overrides live on `ContractDocumentOverride`,
  `ContractSupportingDocumentOverride`, `RateDocumentOverride`, and
  `RateSupportingDocumentOverride`.

Each parent override row is one audit event. It records who made the override,
the reason, and the sparse override payload for that event. Override rows are not
updated or deleted to change effective data. A later override event is appended
instead.

The override model is not a complete 1:1 copy of contract and rate data today.
It only includes the fields we currently need to override. As additional fields
become overridable, the override tables should mirror those fields from the
contract and rate model so write validation and read-time merging stay simple.

### Operation Columns

Override rows do not infer intent from nullable value columns. Operation columns
carry intent. Value columns carry payload.

For scalar fields, every overridable field uses this pair:

```prisma
fieldName   FieldType?
fieldNameOp ScalarFieldOverrideOperation?
```

The scalar operation enum is:

```prisma
enum ScalarFieldOverrideOperation {
  OVERRIDE
  CLEAR_OVERRIDE
}
```

`OVERRIDE` applies the value column. `CLEAR_OVERRIDE` clears prior override
effects for that field and falls back to the base submitted value. A nullable op
column means no instruction.

For array item rows, such as document override rows, the item operation enum is:

```prisma
enum ArrayFieldOverrideOperation {
  OVERRIDE
  ADD
  DELETE
}
```

`OVERRIDE` patches field-level metadata on one item. `ADD` introduces an
override-added item. `DELETE` hides an item from the effective view without
deleting stored rows.

There is intentionally no `NO_CHANGE` enum value and no `UPDATE` document op.
No instruction is represented by a nullable operation column. Corrections are
made by appending another `OVERRIDE` event.

## Override Rules

Omitted fields mean no instruction. Explicit `NULL` can be a valid payload only
when the underlying field is nullable and the operation is `OVERRIDE`.

Within a single override event:

- each scalar field can have at most one operation
- each document kind can contain at most one row for a given `documentSha256`
- document row uniqueness is scoped to one document kind at a time
- order inside a document override array has no business meaning
- sequential operations for the same field or document item require separate
  override events

Invalid operation/value combinations are rejected before writing when possible.
If invalid persisted rows are encountered during read/merge, the parser logs the
invalid row and ignores that instruction so the prior effective value or base
value remains in use.

Examples of invalid operation/value combinations:

- an op column is `NULL` while the value column is non-null
- `CLEAR_OVERRIDE` carries a non-null value
- `OVERRIDE` carries `NULL` for a non-nullable field
- `dateAddedOp = OVERRIDE` omits `dateAdded`
- `documentOp = DELETE` carries add payload or scalar field operations
- `documentOp = ADD` omits required document payload fields
- `documentOp = OVERRIDE` carries document payload fields that are not currently
  field-overridable

## Override Application

Overrides are applied by merging append-only override history onto base data.
Clearing or deleting in the effective view appends a newer row. It does not
delete old rows.

Override writes to the database are serialized with row locks so two override
events for the same contract or rate cannot be inserted out of order.

Merge rows in `createdAt ASC` order. This applies to:

- parent-level metadata on `ContractOverrides`
- parent-level metadata on `RateOverrides`
- revision-level form data on `ContractRevisionOverrides`
- revision-level form data on `RateRevisionOverrides`
- document item rows on document override tables

Later events can supersede earlier events through explicit operations.

### Scalar Field Merge

`initiallySubmittedAt` is a parent-level timestamp override. It is merged at the
parent override level and falls back to the system-calculated first submit date
when no effective override exists.

Scalar field merge applies one field at a time. `OVERRIDE` sets the effective
value for that field. `CLEAR_OVERRIDE` removes the effective override for that
field and returns to the base submitted value.

### Document Merge

Document arrays are sparse-merged item collections. A newer document override
array does not replace the previous effective document array.

Document merge maintains an effective document set within each document kind.
Contract documents, contract supporting documents, rate documents, and rate
supporting documents are separate namespaces.

Every document override row requires `documentSha256`. The `documentSha256` value
is the common sparse-merge identifier for base documents and override-added
documents. It is not a uniqueness guarantee. Base data can contain duplicate
`sha256` values, so `documentID` is used to disambiguate `OVERRIDE` and `DELETE`
operations when multiple effective documents match the same `documentSha256`.

Document override rows follow these rules:

- `ADD` must carry full document payload: `name`, `sha256`, and `s3URL`, with
  optional `s3BucketName` and `s3Key`
- `ADD` must not carry `documentID`
- `ADD` is invalid when `documentSha256` does not match payload `sha256`
- `OVERRIDE` and `DELETE` must target an active base document or an active
  override-added document
- `OVERRIDE` currently supports `dateAdded` field-level overrides only
- `DELETE` hides either a base document or override-added document from the
  effective view

For submitted contract and rate documents, `dateAdded` is not nullable in the
override domain. `dateAddedOp = OVERRIDE` requires a concrete date. To remove a
prior `dateAdded` override, use `dateAddedOp = CLEAR_OVERRIDE` with no
`dateAdded` payload.

### Override-Added Document IDs

Override-added documents must behave like base documents for clients. Clients
need a `GenericDocument.id` so they can download the file through the existing
document APIs.

For base documents, `GenericDocument.id` remains the base document table row ID.
For override-added documents, `GenericDocument.id` is the document override row
ID from the `ADD` row.

The stored `documentID` column on document override rows is only a relation to an
existing base document. For override-added documents it remains `NULL`.

If a client sends a later `OVERRIDE` or `DELETE` for an override-added document
using the client-facing override row ID as `documentID`, the store accepts it
only when it matches the effective document identified by `documentSha256`. The
store then normalizes `documentID` to `NULL` before writing. If `documentID` and
`documentSha256` identify different effective documents, the input is rejected.

## Read Path

The read path returns effective contract and rate data. Override application
happens in the postgres-to-domain parsing functions, not in the GraphQL object
resolvers for every nested field.

- Contract parse functions apply contract override rows while converting
  persisted contract data into the contract domain model.
- Rate parse functions apply rate override rows while converting persisted rate
  data into the rate domain model.
- Contract responses that include linked rate data parse linked rates through
  the same override merge rules.
- Rate responses that include linked contract data parse linked contracts
  through the same override merge rules.
- Full history responses can include `contractOverrides` or `rateOverrides` as
  append-only audit data.

Some parent-level values are still resolved at the GraphQL field resolver level
when that response shape does not use the full parser output. Those resolvers
apply the same effective override behavior for the fields they expose, such as
contract `initiallySubmittedAt`.

Stripped index responses stay slim. They apply relevant scalar/revision
overrides for fields they return, such as `initiallySubmittedAt` and
`contractType`, but they do not include full override history arrays unless the
API explicitly adds those fields.

Document lookup is separate from effective form-data merge. `findDocumentById`
first looks in the base document tables. If no base document is found, it looks
for an override-added document row with `documentOp = ADD`. `findAllDocuments`
includes override-added documents as downloadable records for lookup and audit
workflows, but it does not replace, patch, or remove base document rows.

## Write Path

Override mutations are admin-only in the current implementation and require the
normal API write permission path.

Contract overrides are allowed when the contract consolidated status is:

- `SUBMITTED`
- `RESUBMITTED`
- `APPROVED`

Rate overrides are allowed when the rate consolidated status is:

- `SUBMITTED`
- `RESUBMITTED`

Resolvers perform authorization and load the current contract or rate so the API
can return user-facing `NOT_FOUND` and invalid-status errors. Store functions
then re-check the current persisted state inside a row-locked write transaction
before creating the override event.

Input validation is split between payload validation and context validation.

- Zod validates operation/value combinations and local payload shape.
- Store validation checks current status, target existence, duplicate
  `documentSha256` ambiguity, and override-added document normalization.
- GraphQL input types may remain looser because GraphQL cannot express
  nullability rules that depend on sibling operation fields.

Empty document override arrays are treated the same as omitted arrays: no
document instructions are written.

## Submission Lifecycle Behavior

Unlock creates a new draft revision from effective submitted data.

On unlock:

- revision scalar overrides that should become draft base data are materialized
  into the draft value
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
  merged effective document set differs from the stored zip contents.
- That stale-zip window is accepted for now and resolves when lifecycle events
  regenerate zips, such as unlock plus resubmit or explicit zip regeneration.
- If override resolvers later regenerate zips for document `ADD` or `DELETE`,
  that should be resolver/service orchestration, not a postgres merge rule.

## Related Documentation

- [GraphQL Resolver design](graphql-resovler-design.md)
- [Creating and testing endpoints](creating-and-testing-endpoints.md)
- [Error handling](error-handling.md)
- [How to run migrations](howto-migrations.md)

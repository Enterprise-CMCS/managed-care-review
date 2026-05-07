# Revision Overrides

Reference for revision override behavior in `services/app-api/`.

## Purpose

Overrides are a metadata correction layer on top of submitted revisions.

Revisions remain the source of truth for lifecycle history. Overrides exist so metadata corrections can be recorded without rewriting old revision rows directly.

This mechanism is not a replacement for unlock and resubmit.

## Current / Intended Model

The intended model is:

- only the latest submitted revision can receive a new override
- a revision can have multiple overrides over time
- each override is a sparse patch
- API reads flatten all overrides on that revision into one effective revision view
- when that submitted revision is unlocked, the flattened effective override result is merged into the new unlocked revision

## Sparse Patch Rules

Overrides should only replace fields where an override value exists.

Rules:

- start from base revision data
- merge overrides in order
- non-null override values replace base revision values
- `null` means “no override for this field”
- newer overrides win if multiple overrides touch the same field

## Revision-Level And Document-Level Overrides

Overrides can apply at more than one level.

### Revision-level

Examples:

- `initiallySubmittedAt`
- future revision metadata fields as the framework expands

### Document-level

Examples:

- `dateAdded`

Document-level override behavior follows the same merge model:

- start with the base document metadata on the revision
- apply non-null override values

## Multiple Overrides On One Revision

Multiple overrides may exist on the same submitted revision so metadata corrections can be appended over time.

The API should not treat these as competing full objects. Instead, it should flatten them into one effective view for the targeted revision.

Conceptually:

- revision history remains unchanged
- override history remains append-only
- clients receive the effective flattened result

## Unlock Behavior

When a submitted revision with overrides is unlocked, the new unlocked revision should be created from the effective merged view of that submitted revision.

That means:

- submitted revision base data
- plus flattened override data
- becomes the new unlocked revision data

At that point, the unlocked draft should behave like ordinary revision data. The override effect should not disappear during unlock.

## Current Gap

Today, the code does not fully implement this model for rate revision overrides.

Current behavior:

- submitted rate revisions can have revision-specific overrides
- those overrides can affect the submitted API view
- unlock copies base revision data into a new unlocked revision
- unlock does not merge the flattened override result into that new unlocked revision

So the unlocked draft can lose corrected metadata that the submitted revision was showing.

## Contract vs Rate Overrides

Today the models are asymmetric:

- contracts have `ContractOverrides` on `ContractTable`
- rates have `RateOverrides` on `RateTable`
- rates also have revision-specific `RateRevisionOverrides`

Long-term, contract and rate revisions should support the same revision-specific override model.

## File Map

Primary code paths:

- `src/postgres/contractAndRates/overrideRateData.ts`
- `src/postgres/contractAndRates/prismaSharedContractRateHelpers.ts`
- `src/postgres/contractAndRates/parseRateWithHistory.ts`
- `src/postgres/contractAndRates/parseContractWithHistory.ts`
- `src/postgres/contractAndRates/submitContractAndOrRates.ts`
- `src/postgres/contractAndRates/unlockRate.ts`
- `src/postgres/contractAndRates/unlockContract.ts`
- `src/resolvers/contract/contractResolver.ts`

## Things Easy To Get Wrong

- treating overrides as full replacement objects instead of sparse patches
- assuming only one override can exist on a revision
- forgetting document-level overrides
- dropping override effects during unlock
- reapplying override logic only on resubmit instead of preserving effective draft data

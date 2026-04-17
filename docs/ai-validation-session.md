# AI Validation Session

## Current Ticket

The next implementation ticket is `AIFA-022 Minimal test corpus`.

## Completed

- AIFA-001 ✔ Create AI service workspace
- AIFA-002 ✔ Add watch-based dev script
- AIFA-003 ✔ Create local-ready S3 helper
- AIFA-004 ✔ Add PDF-only parser using `pdf-parse`
- AIFA-005 ✔ Add deterministic chunking utility
- AIFA-006 ✔ Persist `chunks.json` to LocalStack S3 and read it back
- AIFA-007 ✔ Add `EmbeddingProvider` seam and local Xenova embedding implementation
- AIFA-008 ✔ Add `VectorStore` seam and brute-force cosine similarity retrieval
- AIFA-009 ✔ Add OP-RAG ordering for retrieved chunks
- AIFA-009A ✔ Add production-like PDF extraction fallback with local OCR
- AIFA-010 ✔ Add date-focused validation prompt builder
- AIFA-011 ✔ Add local Ollama validation client and raw-response capture
- AIFA-011A ✔ Normalize and parse validation LLM output
- AIFA-012 ✔ Add dedicated validation Lambda handler and CDK wiring
- AIFA-013 ✔ Add versioned status artifact writing
- AIFA-014 ✔ Add deterministic artifactVersion and formSnapshotHash computation
- AIFA-015 ✔ Persist validation results as a local artifact
- AIFA-016 ✔ Add GraphQL trigger resolver for the validation Lambda
- AIFA-017 ✔ Add GraphQL polling resolver for validation status/results
- AIFA-018 ✔ Add review-page validation status UI and local-dev bootstrap follow-up
- AIFA-019 ✔ Display validation findings on the Review page
- AIFA-019A ✔ Wire triggerValidation into Review flow
- AIFA-019B ✔ Add local trigger path for `./dev local`
- AIFA-020A ✔ Execute full validation pipeline from `validationHandler`
- AIFA-020B ✔ Display validation citations and evidence details
- AIFA-020C ✔ Trustworthy start/end validation flow

## Current State

The local PoC now works end to end from the actual form flow.

- `ReviewSubmit` triggers validation for the current draft revision instead of only polling passively.
- `validationStatus` returns staged status plus stored findings/results for the current `artifactVersion`.
- locally triggered validation now runs through the AI worker from the real app flow.
- the worker reads uploaded PDFs, parses text, chunks text, retrieves evidence, validates against form values, and persists `status.json`, `chunks.json`, and `validation-result.json`.
- the Review page renders findings and citations instead of only showing a status banner.

## Recent Changes

### Local execution boundary

- local app-api execution no longer depends on importing the AI worker directly into the running GraphQL process
- instead, local validation runs through a dedicated `ai-form-augmentation` execution path
- this kept the deployed Lambda path intact while making `./dev local` actually usable

### Local server build stability

- the local app-api build was updated so native AI dependencies do not break the local server bundle
- this fixed the `onnxruntime-node` and `sharp` `.node` loader failures that were crashing local API startup
- result: local login and form navigation can proceed while the AI worker still uses the native dependencies it needs

### Validation document key handling

- local validation was failing because the worker was trying to read a normalized key that did not match the pre-existing uploaded-object location
- app-api now derives the effective validation document key from the stored draft document data without changing the existing S3 contract
- this fixed the local `S3 object not found` failure without rewriting the upload infrastructure

### Artifact version consistency

- trigger and polling behavior now line up more cleanly around the current draft revision state
- earlier local runs showed stale or confusing transitions because different paths were effectively reasoning about different inputs
- the current direction keeps `artifactVersion` authoritative and uses it to surface stale results explicitly

### Validation quality path

- a narrow deterministic date-validation step now exists for obvious start/end date extraction cases
- this is intentionally small and focused on the PoC fields
- the local LLM is still used for cases that are ambiguous or not captured cleanly by deterministic extraction

## What Is Working

- local bootstrap with `./dev local`
- local login and form navigation after the app-api build fix
- PDF parsing, including the OCR fallback path for weak text extraction
- chunk artifact persistence in LocalStack
- local embeddings and brute-force retrieval
- local validation execution from the product flow
- findings display on Review & Submit
- citation display on Review & Submit
- stale-result handling based on `artifactVersion`

## What Is Still Weak

- result quality is not yet measured against a fixed corpus
- retrieval is still not strong enough field-by-field for consistent start/end date trustworthiness
- local status stages are still broader than they should be for fast debugging
- local Ollama quality is still a confound when judging whether a failure is retrieval, prompting, or model reasoning
- Review-page wording can still be clearer for match, mismatch, and not-enough-evidence cases

## Current PoC Direction

The PoC has been rewritten around the narrower, more realistic goal:

- local-first
- PDFs only
- `contractStartDate` and `contractEndDate` only
- advisory Review-page results
- trustworthy evidence display
- small evaluation corpus for repeatable quality checks

The main change in direction is that the PoC is no longer framed as "general document validation infrastructure." It is now framed as a trustworthy start/end date validation slice that can be shown locally and then expanded later.

## Important Design Decisions

- Keep the PoC local-first.
- Keep the field scope narrow: start date and end date only.
- Keep brute-force retrieval for the PoC.
- Keep the `EmbeddingProvider` and `VectorStore` seams so later provider changes remain contained.
- Do not change pre-existing S3 upload behavior unless there is no other viable option.
- Treat `artifactVersion` as the source of truth for stale-versus-current results.
- Keep the Review-page experience advisory and non-blocking.
- Do not claim Bedrock readiness or Lambda packaging readiness just because the current seams are in place.
- Do not treat local-model quality as final quality.

## Next Tickets

### AIFA-022 Minimal test corpus

Build the fixed set of local PDF fixtures and expected outcomes needed to evaluate quality instead of relying on anecdotal runs.

### AIFA-023 Validation evaluation harness

Run the corpus repeatedly and record where deterministic logic and local LLM behavior are helping or failing.

### AIFA-020D Review-page wording refinement

Polish the user-facing wording once the result quality is stable enough to present.

## Suggested Next Step

- Implement `AIFA-022` with 5 to 10 fixed PDF fixtures and expected start/end outcomes.
- Keep the corpus focused on match, mismatch, ambiguous, and not-enough-evidence cases.
- Use the same corpus as the basis for the later evaluation harness.

## Source of Truth Docs

- `docs/ai-validation-poc-brief.md`
- `docs/technical-design/ai-validation-poc-plan.md`
- `docs/technical-design/aifa-sprint-plan.csv`

## Useful Files

- `services/app-api/src/resolvers/validation/triggerValidation.ts`
- `services/app-api/src/resolvers/validation/fetchValidationStatus.ts`
- `services/app-api/src/resolvers/validation/validationDocumentKeys.ts`
- `services/app-api/esbuild-local.config.ts`
- `services/ai-form-augmentation/src/handlers/validationHandler.ts`
- `services/ai-form-augmentation/src/validation-output/deterministicDateValidation.ts`
- `services/ai-form-augmentation/src/runValidation.ts`
- `services/app-web/src/pages/StateSubmission/HealthPlanSubmission/ReviewSubmit/ReviewSubmit.tsx`

## Notes

- The rewritten PoC plan lives in `docs/technical-design/ai-validation-poc-plan.md`.
- The broader `rag-llm-document-validation.md` document is still useful as long-term architecture context, but it should not be treated as the current PoC scope.
- Timeout handling remains intentionally deferred while validation quality is still the larger credibility risk.

# AI Validation Session

## Current Ticket

The next implementation ticket is `AIFA-023 Validation evaluation harness`.

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
- AIFA-022 ✔ Minimal test corpus
- AIFA-029 ✔ Field-label and retrieval coverage hardening

## Current State

The local PoC now works end to end from the actual form flow and has a reusable evaluation corpus.

- `ReviewSubmit` triggers validation for the current draft revision instead of only polling passively.
- `validationStatus` returns staged status plus stored findings/results for the current `artifactVersion`.
- locally triggered validation runs through the AI worker from the real app flow.
- the worker reads uploaded PDFs, parses text, chunks text, retrieves evidence, validates against form values, and persists `status.json`, `chunks.json`, and `validation-result.json`.
- the Review page renders findings and citations in a single expandable validation banner.
- the repo now includes a fixed corpus of local PDF scenarios for start/end-date evaluation and demo use.

## Recent Changes

### Validation flow hardening

- local app-api execution no longer depends on importing the AI worker directly into the GraphQL process
- local validation runs through a dedicated `ai-form-augmentation` execution path
- trigger and polling behavior now line up around current document keys plus current form date values
- stale results are surfaced when dates change, not just when document sets change

### Validation result quality and evidence fidelity

- deterministic validation now handles obvious labeled start/end-date extraction and date-format normalization
- the local LLM remains the fallback path for unresolved cases
- citation metadata now carries page context through the pipeline so the UI no longer depends on placeholder page text
- local fallback behavior is more resilient when the LLM returns extra or non-matching results

### Corpus and planning

- a reusable local PDF corpus now exists for match, mismatch, not-enough-evidence, and competing-date scenarios
- the corpus includes a preferred demo subset plus additional document variants
- the sprint plan now includes a follow-on hardening ticket focused on field-label and retrieval coverage

## What Is Working

- local bootstrap with `./dev local`
- local login and form navigation through the real form flow
- PDF parsing, including the OCR fallback path for weak text extraction
- chunk artifact persistence in LocalStack
- local embeddings and brute-force retrieval
- local validation execution from the product flow
- deterministic plus LLM fallback validation for start/end dates
- findings and citation display on Review & Submit
- stale-result handling based on current artifact inputs and form values
- reusable corpus fixtures for repeatable manual and harness-driven evaluation

## What Is Still Weak

- corpus quality is now documented, but not yet measured by an automated harness
- retrieval is still narrower than it should be across different contract families and label variants
- local Ollama quality is still a confound when judging whether a miss is retrieval, prompting, or model reasoning
- the Review-page wording can still be improved once the measured result quality is stable
- OCR-heavy fixtures are present, but not yet exercised in a repeatable evaluation loop

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
- Measure behavior against the fixed corpus before broadening coverage changes.

## Next Tickets

### AIFA-023 Validation evaluation harness

Run the corpus repeatedly and record where deterministic logic and local LLM behavior are helping or failing.

### AIFA-029 Field-label and retrieval coverage hardening

Use corpus evidence to harden alias coverage, retrieval inputs, and document-family handling for start/end date validation.

### AIFA-020D Review-page wording refinement

Polish the user-facing wording once the result quality is stable enough to present.

## Suggested Next Step

- Implement `AIFA-023` so the corpus can be run repeatably against the real worker path.
- Record expected versus actual outcomes, plus whether deterministic validation or LLM fallback produced the result.
- Use that evidence to decide whether `AIFA-029` should focus first on aliases, retrieval terms, or document-family overrides.

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
- `services/ai-form-augmentation/src/evaluation/dateValidationCorpus.ts`
- `services/ai-form-augmentation/src/runValidation.ts`
- `services/app-web/src/pages/StateSubmission/HealthPlanSubmission/ReviewSubmit/ReviewSubmit.tsx`

## Notes

- The rewritten PoC plan lives in `docs/technical-design/ai-validation-poc-plan.md`.
- The broader `rag-llm-document-validation.md` document is still useful as long-term architecture context, but it should not be treated as the current PoC scope.
- Timeout handling remains intentionally deferred while validation quality measurement is still the larger credibility risk.
- The session file should now be treated as post-`AIFA-022` and post-`AIFA-029`; the next meaningful implementation checkpoint is the evaluation harness.

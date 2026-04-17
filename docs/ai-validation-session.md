# AI Validation Session

## Current Ticket

The next implementation ticket is `AIFA-020D Review-page wording refinement`.

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
- AIFA-023 ✔ Validation evaluation harness
- AIFA-029 ✔ Field-label and retrieval coverage hardening
- AIFA-030 ✔ LLM output robustness and malformed-response handling
- AIFA-031 ✔ Reduce malformed LLM output rate

## Current State

The local PoC now works end to end from the actual form flow, has a reusable evaluation corpus, and can run that corpus through a repeatable evaluation harness.

- `ReviewSubmit` triggers validation for the current draft revision instead of only polling passively.
- `validationStatus` returns staged status plus stored findings/results for the current `artifactVersion`.
- locally triggered validation runs through the AI worker from the real app flow.
- the worker reads uploaded PDFs, parses text, chunks text, retrieves evidence, validates against form values, and persists `status.json`, `chunks.json`, and `validation-result.json`.
- the Review page renders findings and citations in a single expandable validation banner.
- the repo now includes a fixed corpus of local PDF scenarios for start/end-date evaluation and demo use.
- the AI workspace now includes an evaluation runner that executes corpus scenarios through the real worker path and summarizes expected versus actual outcomes.

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

### Evaluation harness

- the corpus can now be executed through the real validation handler instead of an ad hoc manual walkthrough
- the harness compares expected outcomes, message fragments, citation orders, and decision source against stored validation results
- the output is designed to make deterministic wins, LLM fallbacks, and false positives/negatives visible enough to guide the next quality change

### Coverage hardening

- field-label coverage now includes real document-family variants such as contract start date and contract expiration labels seen in the corpus
- deterministic extraction now stops at the next known label boundary instead of bleeding into adjacent fields
- competing labeled values now resolve to deterministic `not-enough-evidence` instead of being left entirely to the LLM
- malformed LLM JSON now degrades to the existing `not-enough-evidence` path instead of breaking the run

### Malformed-output observability

- stored validation artifacts now preserve optional LLM diagnostics for malformed JSON, invalid result shape, and missing or duplicate field results
- corpus evaluation output now counts malformed LLM responses separately from ordinary validation outcomes
- runtime behavior remains safely non-blocking: malformed LLM output still degrades to `not-enough-evidence`

### Malformed-output reduction

- the single-field date-validation prompt now explicitly requires exactly one result for the requested field
- parser recovery now accepts the narrow case where the model returns one valid result object without the surrounding array
- evaluation bootstrap now checks LocalStack reachability once and prepares the artifact bucket before the corpus run

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
- repeatable harness-driven evaluation of corpus scenarios through the worker path
- improved deterministic handling for competing start/end-date labels in real amendment fixtures

## What Is Still Weak

- corpus quality can now be measured repeatedly, but results still need to be run and interpreted in a normal local environment
- retrieval is still narrower than it should be across different contract families and label variants
- local Ollama quality is still a confound when judging whether a miss is retrieval, prompting, or model reasoning
- the Review-page wording can still be improved once the measured result quality is stable
- OCR-heavy fixtures are present, but not yet exercised in a repeatable evaluation loop
- the AHF term-clause fixture still shows a real ambiguity gap around mixed term language and competing end dates
- evaluation currently reports malformed-output frequency, but does not yet enforce a pass/fail threshold for that rate
- corpus evaluation now depends on reachable LocalStack S3 plus the repo `nvm` runtime, so local environment drift can still block verification before the worker runs

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

### AIFA-029 Field-label and retrieval coverage hardening

Use corpus evidence to harden alias coverage, retrieval inputs, and document-family handling for start/end date validation.

### AIFA-020D Review-page wording refinement

Polish the user-facing wording once the result quality is stable enough to present.

### AIFA-024 Bedrock follow-up for production-like evaluation

Prepare the path for evaluating the same validation flow against production-like Bedrock models.

## Suggested Next Step

- Refine Review-page wording around match, mismatch, and not-enough-evidence outcomes.
- Keep the UI advisory and evidence-first; do not change validation backend behavior.
- Preserve the current citations and staged status flow while tightening the copy.

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
- `services/ai-form-augmentation/src/evaluation/dateValidationEvaluation.ts`
- `services/ai-form-augmentation/src/validationFields.ts`
- `services/ai-form-augmentation/src/runValidation.ts`
- `services/app-web/src/pages/StateSubmission/HealthPlanSubmission/ReviewSubmit/ReviewSubmit.tsx`

## Notes

- The rewritten PoC plan lives in `docs/technical-design/ai-validation-poc-plan.md`.
- The broader `rag-llm-document-validation.md` document is still useful as long-term architecture context, but it should not be treated as the current PoC scope.
- Timeout handling remains intentionally deferred while validation quality measurement is still the larger credibility risk.
- Local corpus evaluation now has storage bootstrap, but it still requires reachable LocalStack S3 and the repo `nvm` runtime to verify end to end.

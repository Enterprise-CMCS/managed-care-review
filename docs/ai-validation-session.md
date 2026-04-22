# AI Validation Session

## Current Ticket

The next implementation ticket is `AIFA-042 Add bounded document indexing concurrency`.

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
- AIFA-020D ✔ Review-page wording refinement
- AIFA-020 ✔ Timeout handling
- AIFA-036 ✔ Trigger background validation from Contract Details continue
- AIFA-026 ✔ Add LaunchDarkly feature flag for validation UI
- AIFA-022 ✔ Minimal test corpus
- AIFA-023 ✔ Validation evaluation harness
- AIFA-029 ✔ Field-label and retrieval coverage hardening
- AIFA-030 ✔ LLM output robustness and malformed-response handling
- AIFA-031 ✔ Reduce malformed LLM output rate
- AIFA-032 ✔ Mismatch message specificity hardening
- AIFA-033 ✔ Clause-precedence resolution hardening
- AIFA-034 ✔ Clause-evidence retrieval and fallback hardening
- AIFA-035 ✔ Deterministic-to-LLM clause-resolution fallback hardening
- AIFA-021 ✔ Cache validation results
- AIFA-024 ✔ Bedrock follow-up for production-like evaluation
- AIFA-027 ✔ Add cleanup and lifecycle rules for pipeline artifacts
- AIFA-028 ✔ Incremental parsing and selective re-indexing
- AIFA-037 ✔ Add S3 lifecycle rule safety net for AI validation artifacts
- AIFA-038 ✔ Confirm document metadata and PDF eligibility rules
- AIFA-039 ✔ Add prod-shaped large-submission evaluation fixture
- AIFA-040 ✔ Filter unsupported validation documents before worker execution
- AIFA-041 ✔ Add document-level failure isolation and processing diagnostics

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
- completed validation artifacts can now be reused when both `artifactVersion` and form snapshot inputs still match the current draft

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
- the evaluation path can now opt into a Bedrock-backed validation model without changing the default local Ollama flow
- evaluation output now records which LLM provider ran the corpus

### Coverage hardening

- field-label coverage now includes real document-family variants such as contract start date and contract expiration labels seen in the corpus
- deterministic extraction now stops at the next known label boundary instead of bleeding into adjacent fields
- competing labeled values now resolve to deterministic `not-enough-evidence` instead of being left entirely to the LLM
- malformed LLM JSON now degrades to the existing `not-enough-evidence` path instead of breaking the run
- mismatch findings now preserve field-specific full-date wording when cited evidence supports it
- competing-date findings now name conflicting dates instead of falling back to a vague ambiguity message
- clause-precedence handling now prefers stronger operative amendment language over weaker summary-style dates when one unique strongest reading remains
- retrieval now expands narrowly toward clause-heavy amendment/superseding text when initial hits are dominated by competing summary dates
- stored result artifacts now include optional retrieval diagnostics so evaluation can separate clause-recall misses from resolver misses
- clause-only operative term text can now resolve start/end dates deterministically when one unique reading exists
- OCR-concatenated clause end dates now stay on the conservative ambiguity path instead of being over-resolved to a single end date

### Malformed-output observability

- stored validation artifacts now preserve optional LLM diagnostics for malformed JSON, invalid result shape, and missing or duplicate field results
- corpus evaluation output now counts malformed LLM responses separately from ordinary validation outcomes
- runtime behavior remains safely non-blocking: malformed LLM output still degrades to `not-enough-evidence`

### Malformed-output reduction

- the single-field date-validation prompt now explicitly requires exactly one result for the requested field
- parser recovery now accepts the narrow case where the model returns one valid result object without the surrounding array
- evaluation bootstrap now checks LocalStack reachability once and prepares the artifact bucket before the corpus run

### Review-page wording refinement

- the Review page now uses calmer, more product-facing copy for pending, in-progress, complete, stale, and unavailable validation states
- finding labels now read as advisory review results instead of backend-oriented validation jargon
- evidence labels now better describe what the cited document references represent on the page

### Validation rollout control

- the AI validation experience is now behind a client-side LaunchDarkly flag
- the same flag gates both the Review-page validation UI and the earlier Contract Details background trigger path
- with the flag off, the submission flow stays unchanged and validation queries/triggers do not run from the frontend

### Artifact cleanup

- the scheduled cleanup handler now deletes expired `rag-indexes/` artifacts from the AI validation artifact bucket
- retention is currently 30 days for `chunks.json`, `status.json`, and `validation-result.json`, which matches the current draft-cleanup safety-net expectation
- cleanup is prefix-scoped so the current artifact layout and stale/current cache behavior stay unchanged for active drafts

### Incremental indexing

- unchanged documents can now reuse per-document chunk and embedding artifacts instead of always reparsing and re-embedding the full set
- the worker still rebuilds the current form-level `chunks.json` snapshot from the active document set so retrieval behavior stays unchanged
- `chunks.json` now records the current document set so later runs can classify unchanged, added, and removed files

### Lifecycle safety net

- the CDK app-api stack now applies a prefix-scoped S3 lifecycle rule for `rag-indexes/` in the dedicated AI validation artifact bucket
- the lifecycle window matches the current 30-day cleanup setting and expires noncurrent versions too when bucket versioning is enabled
- scheduled cleanup remains the primary cleanup path; lifecycle is now a storage-level backstop

### Large-submission planning

- a prod-shaped submission with roughly 165 attached contract documents exposed a new hardening concern that is more urgent than FAISS evaluation
- the sprint plan now includes a large-submission hardening phase before FAISS, starting with document metadata and PDF eligibility discovery
- the phase is intentionally reliability-first: filter unsupported inputs, isolate per-document failures, bound concurrency, keep OCR conservative, improve retrieval recall, and add safe work-selection diagnostics before changing behavior
- `AIFA-049` was split into staged work-selection tickets so scoring can be diagnostic-only first, gated second, and promoted only after evaluation
- trigger-time contract document metadata is now documented; content type, size, ETag, and S3 version ID are not currently available on the draft document shape
- the PDF eligibility rule is metadata-only and advisory; `artifactVersion` still hashes all persisted contract document keys until filtering is implemented deliberately
- a synthetic 165-document large-submission evaluation scenario now exists without committing production documents
- large-submission evaluation is opt-in and reports document counts, phase timings, outcomes, and approximate artifact sizes
- unsupported and corrupt documents are still simulated diagnostics until filtering and document-level failure isolation are implemented
- app-api now filters clearly unsupported validation documents before invoking the PDF-only worker
- skipped validation documents are logged with counts and metadata-based skip reasons

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
- scheduled cleanup of expired AI validation artifacts by `rag-indexes/` prefix
- selective document-level chunk and embedding reuse for unchanged files
- prefix-scoped S3 lifecycle expiration for AI validation artifacts
- opt-in prod-shaped large-submission fixture for measuring later hardening work
- mixed PDF and non-PDF submissions can start validation with only eligible PDF candidates sent to the worker

## What Is Still Weak

- corpus quality can now be measured repeatedly, but results still need to be run and interpreted in a normal local environment
- retrieval is still narrower than it should be across different contract families and label variants
- local Ollama quality is still a confound when judging whether a miss is retrieval, prompting, or model reasoning
- OCR-heavy fixtures are present, but not yet exercised in a repeatable evaluation loop
- clause-precedence handling is still heuristic and depends on retrieval surfacing clause text plus the clause matching one of the supported deterministic cues
- clause-evidence expansion is still heuristic and may add some nearby clause noise while trying to rescue summary-heavy retrieval results
- LLM conflict wording now improves cited ambiguity cases, but it still depends on the cited chunk set surfacing the relevant competing dates
- the Bedrock evaluation path is in place, but live verification still depends on valid AWS credentials, regional model access, and a real model ID
- evaluation currently reports malformed-output frequency, but does not yet enforce a pass/fail threshold for that rate
- corpus evaluation now depends on reachable LocalStack S3 plus the repo `nvm` runtime, so local environment drift can still block verification before the worker runs
- document-level reuse currently keys off document name plus S3 bucket/key identity, so any future upload flow that overwrites content in place without changing those inputs would need a stronger content fingerprint
- the lifecycle safety net currently assumes `ai-form-augmentation-artifacts` stays dedicated to AI validation storage because the custom-resource call owns that bucket's lifecycle configuration
- prod-shaped submissions can include 100+ attached documents; the current worker still needs hardening for unsupported files, per-document failures, bounded concurrency, partial coverage, and safe work selection
- large-submission unsupported and corrupt inputs are simulated in the fixture; real filtering and per-document failure isolation remain pending
- skipped-document diagnostics are currently trigger logs, not persisted status/result artifacts
- renamed non-PDF files that pass `.pdf` metadata eligibility can still fail the whole worker run until document-level failure isolation is added
- FAISS is not the next bottleneck to evaluate until realistic large-submission measurements separate vector search time from parsing, OCR, embedding, and retrieval-quality issues

## Follow-On Tickets

### AIFA-039 through AIFA-049C Large-submission hardening

Harden the pipeline for high-document-count submissions by adding a prod-shaped fixture, unsupported-file filtering, document-level failure isolation, bounded concurrency, OCR safety valves, broader retrieval, diagnostic-only work-selection scoring, gated work selection with fallback, partial-coverage UI, and promotion only after evaluation.

### AIFA-025 Evaluate FAISS implementation behind VectorStore

Evaluate whether FAISS is worth introducing only after large-submission hardening provides realistic chunk counts, retrieval timings, and work-selection behavior.

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

### AIFA-042 Add bounded document indexing concurrency

Bound per-document fetch, parse, chunk, and embed work so large submissions do not fan out unbounded indexing load.

## Suggested Next Step

- Add a small concurrency cap around per-document indexing work.
- Keep document diagnostics and failure isolation behavior unchanged.
- Re-run the large-submission fixture to measure indexing timings under the cap.

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
- Review & Submit now stops polling after a bounded timeout window and falls back to non-blocking messaging instead of polling indefinitely.
- The large-submission fixture is opt-in via `AI_VALIDATION_INCLUDE_LARGE_SUBMISSION=true`; normal evaluation remains small.
- Parsed text is not a separate artifact yet, so large-run artifact-size output reports parsed text as unavailable until AIFA-046.
- AIFA-040 keeps `artifactVersion` tied to all persisted contract document keys so unsupported attachment changes still invalidate prior validation artifacts.
- AIFA-041 now persists skipped, failed, and processed document diagnostics on terminal status and result artifacts.
- `services/app-api` `test:once` still uses Vitest flags that are rejected by the current Vitest CLI, so direct `vitest run` invocation is currently needed for focused resolver checks.
- Local corpus evaluation now has storage bootstrap, but it still requires reachable LocalStack S3 and the repo `nvm` runtime to verify end to end.
- Frontend test verification is currently blocked by a repo-level `vitest`/`jsdom` `ERR_REQUIRE_ESM` failure in `html-encoding-sniffer`, so timeout behavior still needs normal test-run confirmation once that environment issue is resolved.
- Clause-resolution hardening now passes the current 8-scenario corpus, but OCR-heavy term text still depends on narrow heuristics rather than a broader parsing layer.
- Cache reuse now depends on `complete` status plus matching `artifactVersion` and form snapshot hash; partial or failed artifacts still force a fresh run.
- Incremental document reuse now depends on per-document identity derived from document name plus S3 bucket/key, while the form-level `artifactVersion` contract remains the source of truth for current results.
- AI validation artifacts currently retain for 30 days before scheduled cleanup deletes old `rag-indexes/` objects; this retention is intended as an operational safety net for abandoned or deleted drafts, not a long-lived archive.
- The lifecycle safety net is now managed by CDK through an S3 API custom resource because the dedicated artifact bucket is referenced by fixed name rather than modeled as a first-class CDK `Bucket` in this stack.
- Contract Details is now treated as the preferred point to start background validation because it is the first place in the current workflow where both scoped date fields and supporting documents are usually present.
- The early trigger now depends on a second `validationStatus` read after the draft save, so future trigger-path changes need to stay aligned with the current stale/current artifact contract.
- The validation rollout is currently frontend-only, so LaunchDarkly dashboard setup and any future backend trigger paths need to stay aligned with the client-side flag behavior.
- The sprint plan now treats large-submission hardening as the next phase before FAISS. `AIFA-025` depends on the large-submission fixture, retrieval-breadth work, content-fingerprint work, and promoted work-selection evaluation.
- Work selection must remain conservative: low-priority documents are deferred, not hard-excluded; fallback must run whenever first-pass evidence is weak, ambiguous, partial, uncited, or contradicted by diagnostics.
- PDF eligibility metadata is advisory only; renamed non-PDF files can still pass candidate checks and must be handled by later document-level failure isolation.

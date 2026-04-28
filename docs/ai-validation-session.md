# AI Validation Session

## Current Ticket

The next implementation ticket is `AIFA-054 Clarify multi-document evidence messaging on Review page`.

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
- AIFA-042 ✔ Add bounded document indexing concurrency
- AIFA-043 ✔ Add large-batch OCR safety valve
- AIFA-044 ✔ Increase retrieval breadth with document-diversity guardrails
- AIFA-049A ✔ Add diagnostic-only work-selection scoring
- AIFA-045 ✔ Evaluate document prioritization and two-pass retrieval
- AIFA-049B ✔ Implement gated first-pass selection with conservative fallback
- AIFA-048 ✔ Surface partial validation coverage conservatively
- AIFA-049C ✔ Validate and promote work selection after evaluation
- AIFA-050 ✔ Apply work-selection promotion decision to runtime default
- AIFA-051 ✔ Persist indexing-phase progress during long validation runs
- AIFA-046 ✔ Split parsed-text artifacts from embedding artifacts
- AIFA-052 ✔ Add LLM-assisted first-pass reranking for large low-yield documents
- AIFA-053 ✔ Stop fallback expansion once both date fields are sufficiently evidenced
- AIFA-055 ✔ Fix stale in-progress banner after completed validation
- AIFA-057 ✔ Add fast revalidation path for form-only edits
- AIFA-058 ✔ Reduce first-pass latency for large submissions

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
- the current local 165-file run still spends a long time inside document indexing on the default `all-doc` path, so end-to-end completion time remains poor for large submissions
- `status.json` currently stays at `parsing` until all selected documents finish indexing, which makes active progress hard to distinguish from a stalled run during long local tests

## Follow-On Tickets

### AIFA-050 Apply work-selection promotion decision to runtime default

Use the `AIFA-049C` promotion decision to choose the runtime work-selection default explicitly while preserving a safe escape hatch.

- Make runtime default selection explicit rather than implicitly staying on `all-doc`.
- Allow promoted `gated-first-pass` default only when the evaluated decision supports it.
- Preserve an explicit `all-doc` override for local debugging and safety.
- Keep conservative fallback behavior unchanged.

### AIFA-051 Persist indexing-phase progress during long validation runs

Improve long-run progress visibility without changing validation semantics.

- Update `status.json` during document indexing rather than only at phase boundaries.
- Persist enough bounded progress to distinguish forward movement from a stalled run.
- Keep Review & Submit advisory and non-blocking.
- Avoid changing validation results, work selection, or fallback behavior.

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

### AIFA-046 Split parsed-text artifacts from embedding artifacts

Persist reusable parsed-text artifacts separately so OCR and parse work do not need to be repeated just to rebuild chunks or embeddings.

## Suggested Next Step

- Clarify how multi-document evidence should be described on the Review page without changing validation outcomes.
- Keep wording aligned with the current conservative evidence model and citations already returned by the worker.
- Leave performance measurement and runtime optimization follow-ups to `AIFA-060`.

## Follow-on UX Tickets

- `AIFA-054 Clarify multi-document evidence messaging on Review page`

## Follow-on Performance Tickets

- `AIFA-060 Persist AI validation phase timing diagnostics in artifacts`

## Follow-on Maintenance Ticket

- `AIFA-059 Clean up reuse compatibility checks and add artifact-backed rerun regression coverage`

## Recommended Upcoming Order

1. `AIFA-054 Clarify multi-document evidence messaging on Review page`
2. `AIFA-056 Clarify AI validation rollout and local-default configuration`
3. `AIFA-060 Persist AI validation phase timing diagnostics in artifacts`

## Follow-on Config Ticket

- `AIFA-056 Clarify AI validation rollout and local-default configuration`

### AIFA-052 Add LLM-assisted first-pass reranking for large low-yield documents

Add a cheap LLM-assisted reranking step ahead of first-pass indexing so very large low-yield contract PDFs can be deprioritized without being permanently excluded.

- Use existing heuristic scoring as the baseline and add an advisory LLM reranking signal on top of it.
- Require a small extracted sample from the first 1-2 pages as part of the reranking input, along with filename and basic document size/page-count metadata.
- Keep the LLM output ranking-only: documents may be deferred from first pass, but must remain eligible for conservative fallback.
- Bias against giant generic `Text Final` / `Rates Text` style documents when the sampled text looks structurally unrelated to contract date validation.
- Keep the feature behind an explicit config gate until the large-submission fixture and corpus show equal-or-more-conservative behavior.

### AIFA-053 Stop fallback expansion once both date fields are sufficiently evidenced

Prevent broad fallback from continuing to index expensive deferred documents once `contractStartDate` and `contractEndDate` already have strong enough cited evidence from first pass.

- Inspect the field-level sufficiency and fallback-trigger logic against real first-pass evidence such as `AAH 23-30212 A03 213A Final.pdf`.
- Stop deferred-document expansion only when both date fields are clearly evidenced, cited, non-conflicting, and not partial.
- Preserve current conservative fallback behavior whenever evidence is weak, partial, ambiguous, uncited, or contradicted.
- Keep this scoped to expansion control and validation-stage sufficiency; do not re-open first-pass reranking or hard-exclude any document from later processing.

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
- Review & Submit now shows a non-blocking timeout warning but continues polling until backend status reaches a terminal state.
- The large-submission fixture is opt-in via `AI_VALIDATION_INCLUDE_LARGE_SUBMISSION=true`; normal evaluation remains small.
- Parsed text is not a separate artifact yet, so large-run artifact-size output reports parsed text as unavailable until AIFA-046.
- AIFA-040 keeps `artifactVersion` tied to all persisted contract document keys so unsupported attachment changes still invalidate prior validation artifacts.
- AIFA-041 now persists skipped, failed, and processed document diagnostics on terminal status and result artifacts.
- AIFA-042 records indexing concurrency and wall-clock indexing duration through evaluation diagnostics, but not yet as persisted product artifacts.
- The default concurrency cap is intentionally conservative for local runs and may need tuning after OCR safety limits are in place.
- AIFA-043 records OCR attempted/skipped/capped diagnostics, but cached document-reuse artifacts still do not preserve historical OCR disposition.
- OCR-capped weak PDFs now stay off the indexed evidence path entirely; richer product-facing partial-coverage handling remains for AIFA-048.
- AIFA-044 broadens retrieval with document-diversity guardrails, but the candidate and per-document limits are still heuristic tuning constants.
- Retrieval diagnostics are richer now, but evaluation output still does not surface every new retrieval metric explicitly.
- AIFA-049A adds diagnostic-only work-selection scoring, but fully reused cached validation results do not yet backfill scoring diagnostics.
- The current first-pass bucket is a heuristic cutoff intended for evaluation, not a promoted runtime strategy.
- AIFA-045 now recommends full fallback conservatively, but the simulated first-pass rule is still heuristic and narrower than the broader AIFA-049A scoring bucket.
- The AIFA-045 field-strategy analysis only covers fields with stored final results; failed-before-result runs still fall back to scenario-level diagnostics only.
- AIFA-049B now keeps gated and all-doc runs distinct in cache and artifacts, but a `gated-first-pass` request can still reuse a prior `gated-fallback` result.
- AIFA-048 now surfaces conservative partial-coverage status on Review & Submit using persisted diagnostics without changing validation execution.
- `coverageSummary.skippedDocuments` includes unsupported pre-worker skips as well as deferred/OCR-capped worker skips; user-facing partial messaging should continue relying on `isPartial` and `unprocessedDocuments`.
- AIFA-049C now compares `all-doc` and `gated-first-pass` evaluation runs on separate artifact keys and records a promotion recommendation without changing runtime defaults.
- AIFA-050 now makes `gated-first-pass` the explicit runtime default while preserving `AI_VALIDATION_WORK_SELECTION_MODE=all-doc` as the escape hatch.
- AIFA-051 now writes bounded indexing progress to `status.json` during long parsing runs without changing validation outcomes or stage semantics.
- Promotion remains environment-sensitive: end-to-end validation of the decision still depends on reachable LocalStack evaluation storage and the large-submission fixture run.
- The current promotion comparison treats only `match`/`mismatch` to `not-enough-evidence` as a conservative downgrade; broader message/citation parity is still a separate judgment.
- The runtime override is currently config/env-based rather than surfaced through GraphQL or UI controls, so local debugging and future rollout work need to stay aligned with that single control path.
- `indexingProgress.totalDocuments` is currently scoped to the active indexing pass, so a later gated-fallback pass may report against a larger total instead of retroactively rewriting first-pass progress.
- A 165-file local test run continued indexing documents after the Review-page timeout warning appeared, which confirms the worker can keep progressing while the UI remains non-blocking.
- The same 165-file run also showed that persisted status is too coarse during indexing: document artifacts advanced in LocalStack while `status.json` remained frozen at `parsing` from the initial worker write.
- A later 165-file rerun confirmed parsed-text reuse is working, but the first-pass set is still dominated by several 630+ page `A03 Text Final` contracts whose sampled content appears unrelated to date validation and whose downstream chunk/embed cost remains high.
- The next work-selection improvement should not rely on filename heuristics alone; it should require a cheap first 1-2 page text sample so the LLM can deprioritize giant low-yield documents more intelligently while leaving fallback behavior unchanged.
- AIFA-046 now persists reusable parsed text separately from indexed-document artifacts, so unchanged successful documents can rebuild chunks and embeddings without rerunning parse/OCR work.
- Parsed-text reuse still depends on the current document identity contract of document name plus S3 bucket/key; stronger overwrite safety remains for AIFA-047.
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
- A newer 165-document run showed `AIFA-052` is now pulling `AAH 23-30212 A03 213A Final.pdf` into first pass and keeping giant `Text Final` / `Rates Text` bodies out, but the run still broadened into `gated-fallback` afterward.
- That means the next bottleneck is no longer first-pass selection quality alone; it is fallback expansion continuing even after strong amendment-style evidence is already present for the date fields.
- A later `AIFA-053` run completed in `gated-first-pass` without broad fallback, which validates the field-aware sufficiency fix, but it also exposed two product follow-ons:
- the Review-page copy should explain that one shown citation can represent a conclusion corroborated by multiple reviewed documents
- `AIFA-055` fixed the stale `still in progress` banner path: completed backend runs now reconcile in the UI without a hard refresh
- `hasStrongResolvedFieldEvidenceForFallback()` was sufficient for the successful large-submission run, but it is still a pragmatic proxy rather than a richer evidence model and should remain a watched risk rather than a new ticket for now
- local large-submission behavior is still partly controlled by explicit env configuration such as `AI_VALIDATION_ENABLE_LLM_FIRST_PASS_RERANKING`, so rollout/default expectations should be documented and made deliberate
- artifact inspection for contract `4f1599ce-8cbf-4ea8-a76d-931c9bf0b0f6` showed the banner fix is working and the run completed cleanly in `gated-first-pass`, but total completion time was still longer than ideal
- that same artifact set showed partial reuse on rerun after form edits: some first-pass documents were served from `stage: cache`, while others still re-entered fresh `embed` work
- so we now need two separate speed follow-ons:
- one for fast revalidation when form values change but the document set is unchanged
- one for reducing first-pass execution cost even when selection and fallback behavior are already correct
- `AIFA-057` is now complete: form-only reruns recompute final results correctly and real LocalStack artifacts show previously repeated OCR-capped first-pass docs can short-circuit to cached skipped diagnostics instead of re-entering parse
- one remaining performance uncertainty after `AIFA-057` is that a small number of first-pass documents can still miss cache and re-enter `embed` on same-artifact reruns, which should be measured under `AIFA-058` without reopening validation semantics
- fresh `AIFA-058` artifact comparison now shows a much shorter lower-bound worker-active window on a new large-submission run: contract `e1550d95-f770-48d9-b982-7e50bd4c1268` wrote its first per-document artifact at `2026-04-27T23:10:41Z` and completed at `2026-04-27T23:14:49Z` (~248s), while contract `6731eb91-080c-4b3b-b428-4ed28f301177` wrote its first per-document artifact at `2026-04-28T00:19:19Z` and completed at `2026-04-28T00:19:23Z` (~4s)
- that fresh run also shows the new bounded first-pass behavior working on real artifacts: only three PDFs reached `stage: embed`, five hit `ocr-capped-large-batch`, and the late first-pass tail (`CHG`, `CHP-IV`, `GCHP`, `HN`) was cut off with `reason: sufficient-first-pass-evidence` instead of continuing into more expensive work
- follow-up fresh runs on the same large document set stayed in the same lower-bound runtime band after the later execution-priority ordering tweak: contract `76c740d8-9dc3-4959-83a3-61560da19eb7` also completed in ~4s with `3 embed / 5 ocr-capped / 4 sufficient-first-pass-evidence`, while contracts `f29e305f-c152-4ea0-bc59-8ec1d4ac1bc8` and `0dd5084a-3dfc-4acb-ab53-bb080dd81454` both completed in ~4s with `4 embed / 4 ocr-capped / 4 sufficient-first-pass-evidence`
- those later runs changed which first-pass PDFs were processed (`IEHP` entered `embed` while one OCR-capped parse dropped out), but did not show a measurable wall-clock improvement beyond the earlier bounded first-pass stop; treat the execution-priority tweak as safe so far but still unproven for latency reduction
- a follow-on ticket is now needed for persisted phase timing diagnostics (`AIFA-060`) so future optimization work can target real `fetch/parse/ocr/chunk/embed/retrieval/validation` costs instead of relying on LocalStack object timestamps; keep that measurement work separate from `AIFA-058` so the proven first-pass latency win can close on its own scope
- the `AIFA-057` closeout left two low-priority maintenance follow-ons captured under `AIFA-059`: duplicated reuse-compatibility checks in the worker path and regression coverage that is still more helper-level than artifact-backed

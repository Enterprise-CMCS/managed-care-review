# AI Validation Session

## Current Ticket
AIFA-018 is complete. The review page now polls and displays non-blocking AI validation status while local development also boots with the validation config introduced by the earlier API tickets.

## Completed
- AIFA-001 ✔️ Create AI service workspace
- AIFA-002 ✔️ Add watch-based dev script
- AIFA-003 ✔️ Create local-ready S3 helper
- AIFA-004 ✔️ Add PDF-only parser using `pdf-parse`
- AIFA-005 ✔️ Add deterministic chunking utility
- AIFA-006 ✔️ Persist `chunks.json` to LocalStack S3 and read it back
- AIFA-007 ✔️ Add `EmbeddingProvider` seam and local Xenova embedding implementation
- AIFA-008 ✔️ Add `VectorStore` seam and brute-force cosine similarity retrieval
- AIFA-009 ✔️ Add OP-RAG ordering for retrieved chunks
- AIFA-009A ✔️ Add production-like PDF extraction fallback with local OCR
- AIFA-010 ✔️ Add date-focused validation prompt builder
- AIFA-011 ✔️ Add local Ollama validation client and raw-response capture
- AIFA-011A ✔️ Normalize and parse validation LLM output
- AIFA-012 ✔️ Add dedicated validation Lambda handler and CDK wiring
- AIFA-013 ✔️ Add versioned status artifact writing
- AIFA-015 ✔️ Persist validation results as a local artifact
- AIFA-014 ✔️ Add deterministic artifactVersion and formSnapshotHash computation
- AIFA-016 ✔️ Add GraphQL trigger resolver for the validation Lambda
- AIFA-017 ✔️ Add GraphQL polling resolver for validation status/results
- AIFA-018 ✔️ Add review-page validation status UI and local-dev bootstrap follow-up

## Current Progress
- AI workspace lives in `services/ai-form-augmentation`
- Workspace exports are organized by area:
  - `s3`
  - `parsing`
  - `chunking`
  - `artifacts`
  - `embeddings`
  - `vector-store`
  - `retrieval`
- Local verification script is currently `services/ai-form-augmentation/src/dev.ts`
- Representative local PDF fixture is:
  - `services/ai-form-augmentation/fixtures/pdf/medicaid-managed-care-contract-and-rate-submission-cover-sheet.pdf`
- Production-like PDF fixture under evaluation:
  - `services/ai-form-augmentation/fixtures/pdf/scan-07-65712-a26-213a-final.pdf`
- Local artifact flow is working end to end:
  - parse PDF
  - chunk text
  - build `chunks.json`
  - write to LocalStack bucket
  - read back from LocalStack
- Local embedding flow is working end to end:
  - read chunk text
  - embed sample chunks with `Xenova/all-MiniLM-L6-v2`
  - verify consistent vector length (`384`)
- Local retrieval flow is working end to end:
  - add chunk embeddings to an in-memory vector store
  - embed a query string
  - search top-k results using brute-force cosine similarity
  - inspect ranked matches and scores
- Local OP-RAG flow is working end to end:
  - take top-k similarity results
  - reorder them into original source order
  - inspect the difference between raw similarity ranking and prompt-ready ordering
- Local prompt-building flow is working end to end:
  - shape date-focused form fields
  - shape retrieved chunk context
  - build a narrow citation-aware validation prompt
- Local LLM flow is working end to end:
  - send the real prompt to Ollama
  - receive a raw response from a local model
  - inspect real output behavior before adding JSON normalization/parsing
- Local validation-output flow is working end to end:
  - normalize raw model output
  - extract and parse the JSON payload
  - validate the result shape with runtime guards
  - produce typed validation results without manual cleanup
- Validation worker boundary is now in place:
  - dedicated handler exists in the AI workspace
  - dedicated Lambda resource exists in CDK
  - local MVP can keep progressing without waiting on full AWS synth context
- GraphQL trigger/polling boundary is now in place:
  - `triggerValidation` invokes the validation Lambda asynchronously from `app-api`
  - `validationStatus` reads `status.json` and `validation-result.json` from the AI artifact bucket
  - both resolvers compute the current `artifactVersion` from the draft revision's persisted contract document keys
  - stale artifact/version mismatches are surfaced explicitly instead of being silently trusted
- Review page validation visibility is now in place:
  - `ReviewSubmit` polls `validationStatus` on an interval without blocking the submission review flow
  - UI state mapping is centralized in a small helper so page logic stays narrow
  - the review page surfaces pending, in-progress, complete, stale, and unavailable states with calm non-blocking messaging
  - focused UI tests cover the main polling states
- Local bootstrap now matches the new validation config requirements:
  - `./dev local` seeds local defaults for `VALIDATION_FUNCTION_NAME` and `AI_VALIDATION_ARTIFACT_BUCKET` before `apollo_gql` initializes
  - LocalStack bucket bootstrap now includes `ai-form-augmentation-artifacts` so review-page polling can read validation artifacts locally
- Local status tracking is now working:
  - `status.json` is written through the existing S3 helper
  - the status artifact includes `stage`, `artifactVersion`, `updatedAt`, and `error`
  - local verification currently writes `validating` and then `complete`
- Local validation-result storage is now working:
  - `validation-result.json` is written through the existing S3 helper
  - the stored result includes `artifactVersion`, `formSnapshotHash`, and parsed validation results
  - local verification reads the stored result back successfully
- Local artifact versioning is now working:
  - `artifactVersion` is computed from normalized document keys
  - `formSnapshotHash` is computed from normalized form field/value pairs
  - form-only changes change `formSnapshotHash` without changing `artifactVersion`
- Production-like PDF parsing fallback is now working:
  - `pdf-parse` remains the default path for normal PDFs
  - weak extraction falls back to a local OCR path
  - the SCAN fixture now surfaces key date fields such as `START DATE`, `January 1, 2008`, and `Amendment effective date: January 1, 2021`

## Verified Local Setup
- LocalStack S3 endpoint in use: `http://127.0.0.1:4566`
- Local bucket used for AIFA-006:
  - `ai-form-augmentation-artifacts`
- Verified artifact key:
  - `rag-indexes/local-dev-form/chunks.json`
- LocalStack bucket had to be created manually with:

```bash
AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1 aws --endpoint-url=http://127.0.0.1:4566 s3 mb s3://ai-form-augmentation-artifacts
```

## Important Design Decisions
- Keep the PoC local-first.
- Keep low-level modules narrow and boring.
- `formId` stays at the artifact/pipeline layer, not inside the base chunker.
- LangChain is intentionally deferred.
  - AIFA-005 uses a simple in-house fixed-size chunker with overlap.
  - Revisit LangChain later only if chunking/source-position needs become more complex.
- LocalStack bucket bootstrap is intentionally manual for now.
  - If the local workflow becomes repetitive, automate it in a later ticket.
- Local embeddings use `@xenova/transformers`.
  - This is for functional local development only.
  - Do not treat local embedding quality as representative of production retrieval quality.
- Retrieval currently uses brute-force cosine similarity in memory.
  - This is intentional for the PoC.
  - FAISS remains deferred until scale or deployment constraints justify the extra complexity.
- OP-RAG ordering is intentionally a post-retrieval step.
  - Search decides what is relevant.
  - Ordering decides how the model should read those relevant chunks.
- Production-like PDFs may need a stronger extraction path than `pdf-parse` alone.
  - That fallback now exists locally through OCR behind the parsing seam.
  - In production, this seam can later point to an AWS-backed extractor without changing downstream pipeline code.
- `src/dev.ts` is currently a verification/demo script.
  - If it starts accumulating too many flows, split into dedicated scripts such as `src/dev/pdf.ts`, `src/dev/chunks.ts`, etc.
- Native local dependencies may need environment help.
  - `sharp` required explicit install-script approval and a manual install step before AIFA-007 would run locally.
  - `tesseract.js` may download local OCR assets during setup, so generated files should be reviewed before staging.
- AIFA-011 intentionally stops at raw model output.
  - Real Ollama output included markdown fences and extra explanation text around otherwise-correct JSON.
  - That normalization/parsing concern is now intentionally split into AIFA-011A.
- Model-returned citation metadata should not be trusted blindly.
  - The local model can echo the right chunk IDs while drifting on fields such as `order`.
  - A later result-storage step should reconcile citations against known chunk metadata before persisting or displaying them as authoritative.
- Full local CDK synth for `app-api` needs real AWS environment inputs.
  - The validation Lambda bundled successfully during synth attempts.
  - Remaining synth failures were caused by missing account/VPC context, not by the validation Lambda code itself.
- The current status flow is intentionally minimal.
  - The handler quickly advances from `validating` to `complete` because the real long-running work is still being layered in.
  - Later resolver/UI tickets can treat this as the first stable status artifact contract rather than the final stage-transition behavior.
- The GraphQL polling resolver is intentionally read-only.
  - it reads `status.json` and `validation-result.json`
  - it does not retrigger validation as a side effect
  - missing artifacts are treated as normal polling states, while real S3/read failures still surface as errors
- The trigger and polling resolvers intentionally key off `draftRevision`.
  - this matches the product workflow where AI validation runs while the user is preparing a submission
  - submitted-history fallbacks can be added later if product flow requires them
- The review-page UI is intentionally non-blocking.
  - users can still review and submit even if validation is pending, stale, or temporarily unavailable
  - this keeps AI validation additive at this stage instead of turning it into a hard product dependency
- Version/hash placeholders have now been replaced with shared utilities.
  - repeated runs with the same inputs keep stable hash values
  - form-only changes affect `formSnapshotHash` independently from document-set versioning

## Next Likely Ticket
- AIFA-019 Surface validation findings, not just pipeline status

## Suggested Next Step
- Keep the same approach:
  - explain first
  - propose the smallest possible implementation steps
  - include exact code and clear diff-style changes
  - wait for approval before making changes

## Useful Files
- `services/ai-form-augmentation/src/s3/s3Client.ts`
- `services/ai-form-augmentation/src/parsing/pdfParser.ts`
- `services/ai-form-augmentation/src/chunking/documentChunker.ts`
- `services/ai-form-augmentation/src/artifacts/chunksArtifact.ts`
- `services/ai-form-augmentation/src/embeddings/embeddingProvider.ts`
- `services/ai-form-augmentation/src/embeddings/xenovaEmbeddingProvider.ts`
- `services/ai-form-augmentation/src/vector-store/vectorStore.ts`
- `services/ai-form-augmentation/src/vector-store/bruteForceVectorStore.ts`
- `services/ai-form-augmentation/src/retrieval/opRagOrdering.ts`
- `services/ai-form-augmentation/src/dev.ts`

## Notes
- Ticket CSV updates were discussed and adjusted during the session, but doc/ticket files should not be staged by default unless explicitly requested.
- When reviewing code, add balanced comments that help a fresh reader understand intent without over-commenting obvious lines.

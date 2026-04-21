# AI Validation PoC

## Goal
Add AI validation to Review & Submit page.

## PoC scope
- PDF only
- dates only
- brute-force retrieval (no FAISS)
- local embeddings
- Ollama for LLM
- large-submission hardening before vector-index optimization

## Rules
- TypeScript only
- minimal changes
- follow repo patterns
- use interfaces (VectorStore, EmbeddingProvider)
- keep work selection conservative: defer low-priority documents, do not hard-exclude them

## Current ticket
AIFA-039 Add prod-shaped large-submission evaluation fixture

## AIFA-038 metadata and eligibility decision

Trigger-time contract document metadata currently available in app-api:
- `name`
- `s3URL` (deprecated, still used locally to recover the historical upload key)
- `s3BucketName`
- `s3Key`
- `sha256`
- `dateAdded`
- `downloadURL`

Metadata not currently available on the draft contract document shape:
- content type/MIME type
- object size
- ETag
- S3 version ID

PDF eligibility rule for later filtering:
- A document must have both `s3BucketName` and `s3Key`; otherwise it cannot be fetched by the worker.
- A document is a PDF candidate when either the display `name` or `s3Key` ends in `.pdf`, case-insensitively.
- If content type becomes available later and conflicts with the PDF extension rule, treat the document as unsupported and record a mismatch diagnostic.
- If content type is missing, do not block an otherwise eligible `.pdf` candidate.
- Extension and content type metadata are advisory only; actual PDF parse success must still be verified by the worker.

Renamed non-PDF risk:
- A non-PDF renamed to `.pdf` can pass metadata eligibility.
- Intended behavior is to let it reach PDF parsing and record a document-level failure once AIFA-041 adds per-document failure isolation.
- AIFA-040 should filter clearly unsupported files before worker execution, but should not claim renamed `.pdf` files were reviewed successfully.

artifactVersion decision:
- For AIFA-038, no runtime behavior changes.
- `artifactVersion` continues to hash all persisted contract document keys.
- Filtering in AIFA-040 should decide deliberately whether skipped unsupported documents remain part of versioning; the current conservative default avoids cache reuse surprises before diagnostics exist.

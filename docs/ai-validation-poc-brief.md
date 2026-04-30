# AI Validation PoC

## Goal

Provide advisory AI validation on Review & Submit by comparing uploaded contract PDFs against the form's `contractStartDate` and `contractEndDate`.

## Current Scope

- local-first execution from the real app flow via `./dev local`
- PDF-only document support
- start and end dates only
- advisory Review-page findings, not a submission gate
- brute-force retrieval, not FAISS
- local embeddings and local-model development flow by default
- conservative work selection with fallback

## Current Implementation

The PoC now runs end to end through the product-shaped local path:

- app-api triggers validation from the real draft revision
- the worker parses PDFs, chunks text, retrieves evidence, validates the two scoped fields, and persists artifacts
- Review & Submit polls `validationStatus` and renders findings with citations
- reruns reuse prior artifacts conservatively when document and form identity still match
- the evaluation harness measures fixed corpus scenarios, including an opt-in prod-shaped large-submission scenario

## What This PoC Is For

- proving the end-to-end user flow
- measuring start/end-date result quality against a fixed corpus
- hardening reruns, diagnostics, and large-submission behavior
- supporting a credible local demo path

## What This PoC Is Not

- general contract intelligence
- broad field coverage beyond start and end dates
- DOCX, XLSX, or generalized image support
- FAISS or production retrieval-scale optimization
- production Bedrock-readiness or final model-quality claims

## Handoff Rules

- treat AI findings as advisory and non-blocking
- treat `artifactVersion` as the source of truth for stale-versus-current artifacts
- preserve the current local-first, PDF-only, two-field scope unless a later ticket changes it explicitly
- keep work selection conservative; deferred documents may be skipped early, but fallback must remain able to recover them when evidence is weak or partial

## Source Of Truth

Use these documents in this order:

1. `docs/ai-validation-session.md`
2. `docs/technical-design/aifa-sprint-plan.csv`
3. this brief

This brief summarizes the current PoC shape. The session file and sprint CSV remain the authoritative source for current ticket sequencing and recent implementation history.

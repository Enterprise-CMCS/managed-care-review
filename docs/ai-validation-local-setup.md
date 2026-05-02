# AI Validation Local Setup Guide

This branch adds an AI validation PoC for contract date fields. This guide only covers what's specific to running it — assumed knowledge: `nvm`, `pnpm`, `direnv`, Docker, and `./dev local` already work for you.

## What this branch adds

- A local validation worker in `services/ai-form-augmentation` that runs against contract PDFs
- A new `ai-validation` LaunchDarkly flag (default `false`)
- AI validation UI in Review & Submit and Contract details (Storybook stories under `AIvalidationStatusCard`)
- An evaluation harness (`pnpm --filter ai-form-augmentation run evaluate`)
- Artifacts written to LocalStack at `s3://ai-form-augmentation-artifacts/rag-indexes/<contract-id>/`

## One-time prerequisites beyond the standard repo setup

1. **Install Ollama** and pull the local model:

   ```bash
   ollama serve            # leave running
   ollama pull llama3.1:8b
   ```

   The worker hits Ollama at `http://127.0.0.1:11434` (not configurable). The embedding model `Xenova/all-MiniLM-L6-v2` downloads lazily on first use.

2. **(Optional) AWS CLI** — only if you want to inspect artifacts directly in LocalStack S3.

## Running the PoC

1. `./dev local` as usual.
2. Enable the `ai-validation` LD flag
3. Create a draft contract with `contractStartDate`, `contractEndDate`, and at least one persisted PDF.
4. Go to Review & Submit. The AI validation card renders inline in Contract details. Validation is advisory and non-blocking; first runs are slow because models are cold.


## Branch-specific env vars

The artifact bucket (`AI_VALIDATION_ARTIFACT_BUCKET=ai-form-augmentation-artifacts`) is auto-seeded by [local-server.ts](../services/app-api/src/local-server.ts).

Optional overrides:

| Var | Default | Purpose |
|---|---|---|
| `AI_VALIDATION_WORK_SELECTION_MODE` | `gated-first-pass` | set to `all-doc` only as a debugging baseline |
| `AI_VALIDATION_INCLUDE_LARGE_SUBMISSION` | unset | evaluation only — enables the large prod-shaped fixture |
| `AI_VALIDATION_LLM_PROVIDER` / `AI_VALIDATION_BEDROCK_MODEL_ID` / `AI_VALIDATION_BEDROCK_REGION` | unset | evaluation only — switch the eval harness to Bedrock |

## Evaluation harness

```bash
pnpm --filter ai-form-augmentation run evaluate
```

The script bootstraps the LocalStack bucket itself before running the corpus. To include the large prod-shaped fixture:

```bash
AI_VALIDATION_INCLUDE_LARGE_SUBMISSION=true pnpm --filter ai-form-augmentation run evaluate
```

Output reports `PASS`/`FAIL` per scenario, deterministic vs LLM decision counts, malformed LLM result count, clause-evidence retrieval misses, and work-selection summary.

## Storybook (UI states without a real submission)

```bash
./dev local storybook
```

Storybook runs at `http://localhost:6006`. The AI validation cards live under `AIvalidationStatusCard`.

## Tests

```bash
pnpm --filter ai-form-augmentation test                              # worker unit tests
pnpm --filter ai-form-augmentation build                             # worker typecheck
pnpm --filter app-api exec vitest run \
  src/resolvers/validation/triggerValidation.test.ts \
  src/resolvers/validation/fetchValidationStatus.test.ts             # resolver tests
```

## Inspecting artifacts (LocalStack)

Artifacts are at `s3://ai-form-augmentation-artifacts/rag-indexes/<contract-id>/`:

- `status.json` — current worker state
- `validation-result.json` — final results and diagnostics
- `chunks.json` — persisted retrieved/indexed chunk set

Read one with:

```bash
AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1 \
  aws --endpoint-url=http://127.0.0.1:4566 \
  s3 cp s3://ai-form-augmentation-artifacts/rag-indexes/<contract-id>/status.json -
```

Swap `status.json` for `validation-result.json` or `chunks.json` as needed.

## Troubleshooting (branch-specific failures only)

**No AI validation UI, no trigger** — `ai-validation` flag is off. Toggle it at `http://localhost:3031`.

**Validation never starts** — no eligible PDFs. The worker is PDF-only and only sees documents persisted to S3 (not just selected in the browser).

**Validation stays in-progress** — usually Ollama is down or the model is missing:

```bash
curl http://127.0.0.1:11434/api/tags    # should return JSON
ollama pull llama3.1:8b                 # if model is missing
```

If Ollama is fine, check `status.json` and `validation-result.json` for the actual stage. If the worker is clearly wedged, restart `./dev local` and rerun on a fresh contract.

**Stale findings on Review & Submit** — artifacts are keyed by `artifactVersion` (document identity) and `formSnapshotHash` (form value identity). The page shows refresh/in-progress states until the current artifact catches up; that's expected.

**First run is slow** — Ollama is cold, Xenova embeddings aren't cached, no prior artifacts. Expected on a cold start.

## Scope / limitations

- PDF only
- Validates only `contractStartDate` and `contractEndDate`
- Advisory and non-blocking
- Local Ollama quality is not the final quality bar (Would be eventually replaced by Bedrock)

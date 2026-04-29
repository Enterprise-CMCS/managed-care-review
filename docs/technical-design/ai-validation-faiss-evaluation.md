# AI Validation FAISS Evaluation

## Scope

This note records the `AIFA-025` evaluation decision for vector search in the
current AI validation PoC.

The question is narrow:

- Should the current brute-force `VectorStore` implementation stay in place?
- Or is there enough evidence to justify introducing a FAISS-backed path now?

This is an evaluation only. It does not change runtime behavior.

## Current Implementation

The current worker uses:

- `BruteForceVectorStore` in
  `services/ai-form-augmentation/src/handlers/validationHandler.ts`
- the `VectorStore` abstraction in
  `services/ai-form-augmentation/src/vector-store/vectorStore.ts`

That means the PoC already has the seam needed for a future index-backed store.
The open question is whether a FAISS implementation would solve a real current
bottleneck.

## Measured Evidence

### 1. Retrieval is already isolated in timing data

Completed worker results now persist `phaseTimingsMs`, including a dedicated
`retrieval` phase.

That lets us compare vector search against:

- fetch
- parse
- OCR
- chunk
- embed
- final validation

without lumping everything into one "AI processing" bucket.

### 2. Recent large-submission runs do not show retrieval as the bottleneck

Recent 165-document runs recorded in the session notes show:

| Scenario | Retrieval | Dominant cost |
| --- | ---: | --- |
| Fresh large batch before reranking optimization | ~27 ms | reranking ~90 s, parse/OCR ~10 s |
| Fresh large batch after reranking optimization | still small | reranking ~53.5 s, parse/OCR ~10 s |
| Fast form-only rerun | ~155 ms | no parse/OCR/embed, still near-instant overall |

The important pattern is stable:

- retrieval is measured in milliseconds
- reranking, parse/OCR, and sometimes embed dominate wall-clock time
- current optimization work has repeatedly reduced end-to-end time without
  touching vector search

### 3. The prod-shaped fixture already gives enough scale context

The large-submission evaluation fixture exists specifically to measure realistic
high-document-count behavior without committing production files.

The evaluation path already reports:

- total documents
- processed documents
- `chunkCount`
- artifact sizes
- `phaseTimingsMs`

See:

- `services/ai-form-augmentation/src/evaluation/dateValidationEvaluation.ts`
- `services/ai-form-augmentation/src/evaluation/runDateValidationEvaluation.ts`

So the branch already has the instrumentation needed to revisit FAISS later if
chunk counts or retrieval latency grow materially.

## FAISS Comparison

### Brute-force path today

Pros:

- already implemented
- already behind the `VectorStore` abstraction
- no native addon packaging
- no separate on-disk index lifecycle
- works cleanly in local PoC execution
- current measured retrieval latency is small compared with other phases

Cons:

- search cost grows linearly with chunk count
- if chunk counts rise substantially, retrieval may eventually become material

### FAISS-backed path now

Potential upside:

- faster nearest-neighbor lookup when chunk counts become large enough that
  brute-force search is no longer cheap
- better long-term headroom if the PoC later broadens scope or removes current
  work-selection limits

Current downsides:

- native dependency and packaging friction
- added Lambda/runtime compatibility risk
- added local development friction
- added index build/serialization lifecycle complexity
- no evidence yet that it improves the actual current bottleneck

Those downsides are not theoretical. The older design notes already call out
`faiss-node` native-addon packaging as a major operational risk for this stack.
That concern is still valid.

## Recommendation

Recommendation: **defer FAISS and keep brute-force retrieval for the current
PoC**.

Reasoning:

1. Current measured retrieval time is already small.
2. The dominant large-submission costs are elsewhere:
   - reranking
   - parse/OCR
   - sometimes embed
3. Introducing FAISS now would add operational and packaging complexity without
   addressing the main observed latency path.
4. The existing `VectorStore` seam already keeps the option open if future
   measurements show retrieval becoming material.

## Revisit Criteria

FAISS should be reconsidered only if at least one of these becomes true:

- retrieval becomes a material share of worker-active time on realistic
  large-submission runs
- chunk counts rise far enough that brute-force search is no longer consistently
  cheap
- scope expands beyond the current PDF-only, start/end-date-only PoC in a way
  that substantially broadens active retrieval sets

### Note on future non-PDF support

If the pipeline later expands beyond PDFs, that alone still would not justify
FAISS immediately.

The first likely costs from broader document-type support would be:

- extraction and normalization complexity
- per-format failure isolation
- noisier chunk generation
- broader work-selection pressure

That expansion would increase the chance that FAISS becomes worthwhile later,
but only if fresh measurements then show retrieval itself becoming a meaningful
share of end-to-end time. Until those measurements exist, broader document-type
support is a reason to re-measure sooner, not a reason to preemptively add
vector-index complexity.

Until then, the cleaner engineering choice is to keep brute-force retrieval and
avoid premature vector-index complexity.

## Decision

- **Keep:** current brute-force `VectorStore`
- **Defer:** FAISS implementation
- **Do not implement now:** no runtime FAISS spike is justified by the current
  measurements

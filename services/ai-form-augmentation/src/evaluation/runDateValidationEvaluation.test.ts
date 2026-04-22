import assert from 'node:assert/strict'
import test from 'node:test'
import type { DateValidationEvaluationSummary } from './dateValidationEvaluation'
import { formatEvaluationSummary } from './runDateValidationEvaluation'

test('formatEvaluationSummary includes large-submission diagnostics when present', () => {
  const summary: DateValidationEvaluationSummary = {
    totalScenarios: 1,
    passedScenarios: 1,
    failedScenarios: 0,
    deterministicResults: 2,
    llmResults: 0,
    malformedLlmResults: 0,
    clauseEvidenceMisses: 0,
    llmProvider: 'ollama',
    reports: [
      {
        scenarioId: 'prod-shaped-large-submission',
        documentName: 'zz_buried_oddly_named_contract_evidence.pdf',
        summary: 'fixture',
        passed: true,
        statusStage: 'complete',
        error: null,
        largeSubmissionDiagnostics: {
          totalDocuments: 165,
          eligibleDocuments: 132,
          skippedDocuments: 32,
          failedDocuments: 1,
          processedDocuments: 132,
          chunkCount: 264,
          finalOutcomes: {
            match: 2,
            mismatch: 0,
            notEnoughEvidence: 0
          },
          ocr: {
            attemptedDocuments: 3,
            skippedDocuments: 5,
            cappedDocuments: 5
          },
          workSelection: {
            firstPassDocuments: 12,
            deferredDocuments: 120,
            relevantDocuments: 1,
            relevantDocumentsSelectedEarly: 1,
            citedEvidenceDocuments: 1,
            citedEvidenceDocumentsSelectedEarly: 1
          },
          indexing: {
            concurrencyLimit: 2,
            totalElapsedMs: 99,
            processedDocuments: 132,
            failedDocuments: 1
          },
          phaseTimingsMs: {
            fetch: 1,
            parse: 2,
            ocr: 3,
            chunk: 4,
            embed: 5,
            retrieval: 6,
            validation: 7
          },
          artifactSizesBytes: {
            parsedText: null,
            chunks: 100,
            vectors: 200,
            status: 20,
            results: 40
          }
        },
        fieldReports: []
      }
    ]
  }

  const formatted = formatEvaluationSummary(summary)

  assert.match(
    formatted,
    /large submission: total=165, eligible=132, skipped=32, failed=1, processed=132, chunks=264/
  )
  assert.match(
    formatted,
    /ocr: attempted=3, skipped=5, capped=5/
  )
  assert.match(
    formatted,
    /work selection: firstPass=12, deferred=120, relevantEarly=1\/1, citedEarly=1\/1/
  )
  assert.match(
    formatted,
    /indexing: concurrency=2, elapsedMs=99, processed=132, failed=1/
  )
  assert.match(
    formatted,
    /phase timings ms: fetch=1, parse=2, ocr=3, chunk=4, embed=5, retrieval=6, validation=7/
  )
  assert.match(
    formatted,
    /artifact sizes bytes: parsedText=not-available, chunks=100, vectors=200, status=20, results=40/
  )
})

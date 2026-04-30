import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildWorkSelectionPromotionDecision,
  compareWorkSelectionOutcomes,
  evaluateWorkSelectionStrategy,
  type DateValidationEvaluationScenarioReport,
  type DateValidationWorkSelectionComparison
} from './dateValidationEvaluation'

const buildScenarioReport = (
  overrides: Partial<DateValidationEvaluationScenarioReport> = {}
): DateValidationEvaluationScenarioReport => ({
  scenarioId: 'baseline-contract-term-match',
  documentName: 'scan.pdf',
  summary: 'fixture',
  passed: true,
  statusStage: 'complete',
  error: null,
  fieldReports: [],
  ...overrides
})

const buildWorkSelectionComparison = (
  overrides: Partial<DateValidationWorkSelectionComparison> = {}
): DateValidationWorkSelectionComparison => ({
  gatedPassed: true,
  comparison: 'match',
  fallbackRequiredFieldCount: 0,
  fieldComparisons: [],
  ...overrides
})

test('evaluateWorkSelectionStrategy requires fallback when cited evidence comes from deferred oddly named documents', () => {
  const strategy = evaluateWorkSelectionStrategy({
    documents: [
      {
        documentName: 'zz_buried_oddly_named_contract_evidence.pdf',
        contentType: 'application/pdf',
        disposition: 'eligible',
        role: 'relevant-contract',
        tags: ['eligible-pdf', 'oddly-named']
      }
    ],
    documentDiagnostics: [
      {
        documentName: 'zz_buried_oddly_named_contract_evidence.pdf',
        status: 'processed',
        usable: true,
        chunkCount: 2,
        workSelection: {
          priorityScore: 18,
          priorityReasons: ['Filename/key looks contract-oriented.'],
          bucket: 'first-pass'
        }
      }
    ],
    results: [
      {
        field: 'contractStartDate',
        outcome: 'match',
        confidence: 'high',
        message: 'Document text supports Contract Start Date as 01/01/2008.',
        citations: [
          {
            chunkId: 'chunk-1',
            documentName: 'zz_buried_oddly_named_contract_evidence.pdf',
            page: 1,
            order: 0
          }
        ]
      }
    ],
    retrievalDiagnostics: [
      {
        field: 'contractStartDate',
        candidateChunkCount: 8,
        initialChunkCount: 4,
        finalChunkCount: 4,
        representedDocumentCount: 1,
        droppedCandidateCount: 4,
        competingDateCount: 0,
        clauseEvidencePresentInitially: false,
        clauseEvidencePresentFinally: false,
        clauseEvidenceAdded: false
      }
    ]
  })

  assert.equal(strategy.oddlyNamedRelevantDeferred, 1)
  assert.equal(strategy.oddlyNamedRelevantRecoveredByFallback, 1)
  assert.deepEqual(strategy.fieldAnalyses, [
    {
      field: 'contractStartDate',
      evidenceSource: 'fallback',
      fallbackTriggers: ['deferred-document-evidence']
    }
  ])
  assert.equal(
    strategy.recommendation.recommendedMode,
    'require-full-fallback'
  )
})

test('evaluateWorkSelectionStrategy documents conservative fallback triggers from current diagnostics', () => {
  const strategy = evaluateWorkSelectionStrategy({
    documents: [
      {
        documentName: 'amendment-effective-date.pdf',
        contentType: 'application/pdf',
        disposition: 'eligible',
        role: 'relevant-contract',
        tags: ['eligible-pdf']
      },
      {
        documentName: 'ocr-capped.pdf',
        contentType: 'application/pdf',
        disposition: 'eligible',
        role: 'irrelevant-contract',
        tags: ['eligible-pdf']
      }
    ],
    documentDiagnostics: [
      {
        documentName: 'amendment-effective-date.pdf',
        status: 'processed',
        usable: true,
        chunkCount: 2,
        workSelection: {
          priorityScore: 24,
          priorityReasons: [
            'Amendment-style naming can contain controlling date changes.',
            'Filename/key hints at start-date or effective-date content.'
          ],
          bucket: 'first-pass'
        }
      },
      {
        documentName: 'ocr-capped.pdf',
        status: 'failed',
        usable: false,
        chunkCount: 0,
        ocrDisposition: 'skipped',
        reason: 'ocr-capped-large-batch'
      }
    ],
    results: [
      {
        field: 'contractEndDate',
        outcome: 'not-enough-evidence',
        confidence: 'low',
        message: 'The evidence is ambiguous because conflicting dates are present.',
        citations: []
      }
    ],
    retrievalDiagnostics: [
      {
        field: 'contractEndDate',
        candidateChunkCount: 8,
        initialChunkCount: 4,
        finalChunkCount: 2,
        representedDocumentCount: 1,
        droppedCandidateCount: 6,
        competingDateCount: 2,
        clauseEvidencePresentInitially: false,
        clauseEvidencePresentFinally: true,
        clauseEvidenceAdded: true
      }
    ]
  })

  assert.deepEqual(strategy.fieldAnalyses, [
    {
      field: 'contractEndDate',
      evidenceSource: 'fallback',
      fallbackTriggers: [
        'not-enough-evidence',
        'ambiguity',
        'missing-citations',
        'partial-coverage',
        'ocr-gaps',
        'failed-documents',
        'weak-evidence',
        'conflicting-date-evidence'
      ]
    }
  ])
})

test('compareWorkSelectionOutcomes treats gated not-enough-evidence as more conservative than all-doc match', () => {
  const comparison = compareWorkSelectionOutcomes({
    expectations: [
      {
        field: 'contractStartDate',
        formValue: '01/01/2008',
        expectedOutcome: 'match'
      }
    ],
    allDocResults: [
      {
        field: 'contractStartDate',
        outcome: 'match',
        confidence: 'high',
        message: 'Matched.',
        citations: []
      }
    ],
    gatedResults: [
      {
        field: 'contractStartDate',
        outcome: 'not-enough-evidence',
        confidence: 'low',
        message: 'Not enough evidence.',
        citations: []
      }
    ],
    gatedFieldDiagnostics: [
      {
        field: 'contractStartDate',
        evidenceSource: 'fallback',
        fallbackReasons: ['weak-evidence']
      }
    ],
    gatedPassed: true
  })

  assert.equal(comparison.gatedPassed, true)
  assert.equal(comparison.comparison, 'more-conservative')
  assert.equal(comparison.fallbackRequiredFieldCount, 1)
  assert.deepEqual(comparison.fieldComparisons, [
    {
      field: 'contractStartDate',
      allDocOutcome: 'match',
      gatedOutcome: 'not-enough-evidence',
      gatedEvidenceSource: 'fallback',
      gatedFallbackTriggers: ['weak-evidence'],
      comparison: 'more-conservative'
    }
  ])
})

test('buildWorkSelectionPromotionDecision keeps all-doc default when the prod-shaped comparison is missing', () => {
  const decision = buildWorkSelectionPromotionDecision([
    buildScenarioReport({
      workSelectionComparison: buildWorkSelectionComparison()
    })
  ])

  assert.deepEqual(decision, {
    recommendedDefaultMode: 'all-doc',
    gatedPassedScenarios: 1,
    matchedScenarios: 1,
    moreConservativeScenarios: 0,
    riskyScenarios: 0,
    reason:
      'Keep all-doc as the default until the prod-shaped large-submission fixture is included in the comparison run.'
  })
})

test('buildWorkSelectionPromotionDecision recommends gated-first-pass only when the prod-shaped comparison is present and non-risky', () => {
  const decision = buildWorkSelectionPromotionDecision([
    buildScenarioReport({
      scenarioId: 'prod-shaped-large-submission',
      documentName: 'prod-shaped.pdf',
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
          citedEvidenceDocumentsSelectedEarly: 1,
          oddlyNamedRelevantDeferred: 1,
          oddlyNamedRelevantRecoveredByFallback: 1,
          fieldAnalyses: [],
          recommendation: {
            recommendedMode: 'require-full-fallback',
            firstPassRules: [],
            fallbackTriggers: [],
            summary: 'Do not suppress fallback.'
          }
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
      workSelectionComparison: buildWorkSelectionComparison({
        fallbackRequiredFieldCount: 1
      })
    })
  ])

  assert.deepEqual(decision, {
    recommendedDefaultMode: 'gated-first-pass',
    gatedPassedScenarios: 1,
    matchedScenarios: 1,
    moreConservativeScenarios: 0,
    riskyScenarios: 0,
    reason:
      'Promote gated-first-pass only with the existing all-doc escape hatch still available, because the compared scenarios match all-doc or become more conservative.'
  })
})

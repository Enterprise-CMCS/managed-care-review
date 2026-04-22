import assert from 'node:assert/strict'
import test from 'node:test'
import { evaluateWorkSelectionStrategy } from './dateValidationEvaluation'

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

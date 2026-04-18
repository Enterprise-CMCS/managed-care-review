import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeLlmValidationResult, normalizeMismatchMessage } from './normalizeMismatchMessage'

test('normalizeMismatchMessage upgrades a year-only mismatch message to full dates from cited evidence', () => {
  const normalized = normalizeMismatchMessage({
    field: {
      field: 'contractStartDate',
      label: 'Contract Start Date',
      value: '04/01/2014'
    },
    result: {
      field: 'contractStartDate',
      outcome: 'mismatch',
      confidence: 'medium',
      message: 'The submitted start date does not match the document year 2012.',
      decisionSource: 'llm',
      citations: [
        {
          chunkId: 'chunk-1',
          documentName: 'fixture.pdf',
          page: 2,
          startPage: 2,
          endPage: 2,
          order: 0
        }
      ]
    },
    retrievedChunks: [
      {
        chunkId: 'chunk-1',
        documentName: 'fixture.pdf',
        page: 2,
        startPage: 2,
        endPage: 2,
        order: 0,
        text: 'The Contract will become effective January 1, 2012, and will continue in full force and effect through December 31, 2022December 31, 2023.'
      }
    ]
  })

  assert.equal(
    normalized.message,
    'Document start date (01/01/2012) does not match form start date (04/01/2014).'
  )
})

test('normalizeMismatchMessage leaves ambiguous cited evidence unchanged', () => {
  const normalized = normalizeMismatchMessage({
    field: {
      field: 'contractEndDate',
      label: 'Contract End Date',
      value: '12/31/2024'
    },
    result: {
      field: 'contractEndDate',
      outcome: 'mismatch',
      confidence: 'medium',
      message:
        'The submitted contract end date does not match the document term year 2023.',
      decisionSource: 'llm',
      citations: [
        {
          chunkId: 'chunk-2',
          documentName: 'fixture.pdf',
          page: 2,
          startPage: 2,
          endPage: 2,
          order: 0
        },
        {
          chunkId: 'chunk-3',
          documentName: 'fixture.pdf',
          page: 2,
          startPage: 2,
          endPage: 2,
          order: 1
        }
      ]
    },
    retrievedChunks: [
      {
        chunkId: 'chunk-2',
        documentName: 'fixture.pdf',
        page: 2,
        startPage: 2,
        endPage: 2,
        order: 0,
        text: 'The term of this Agreement is: January 1, 2012 through December 31, 2022.'
      },
      {
        chunkId: 'chunk-3',
        documentName: 'fixture.pdf',
        page: 2,
        startPage: 2,
        endPage: 2,
        order: 1,
        text: 'All references are hereinafter deemed to read January 1, 2012 through December 31, 2023.'
      }
    ]
  })

  assert.equal(
    normalized.message,
    'Document end date (12/31/2023) does not match form end date (12/31/2024).'
  )
})

test('normalizeMismatchMessage falls back to term-range wording for start-date mismatches', () => {
  const normalized = normalizeMismatchMessage({
    field: {
      field: 'contractStartDate',
      label: 'Contract Start Date',
      value: '01/02/2008'
    },
    result: {
      field: 'contractStartDate',
      outcome: 'mismatch',
      confidence: 'high',
      message: 'Form date 01/02/2008 does not match document dates',
      decisionSource: 'llm',
      citations: [
        {
          chunkId: 'chunk-0',
          documentName: 'fixture.pdf',
          page: 1,
          startPage: 1,
          endPage: 1,
          order: 0
        },
        {
          chunkId: 'chunk-1',
          documentName: 'fixture.pdf',
          page: 1,
          startPage: 1,
          endPage: 1,
          order: 1
        }
      ]
    },
    retrievedChunks: [
      {
        chunkId: 'chunk-0',
        documentName: 'fixture.pdf',
        page: 1,
        startPage: 1,
        endPage: 1,
        order: 0,
        text: '2. The term of this Agreement is: January 1, 2012 through December 31, 2023.'
      },
      {
        chunkId: 'chunk-1',
        documentName: 'fixture.pdf',
        page: 1,
        startPage: 1,
        endPage: 1,
        order: 1,
        text: 'IV. Paragraph 2 (term) on the face of the original STD 213 is amended to read: January 1, 2012 through December-31-2022December 31, 2023.'
      }
    ]
  })

  assert.equal(
    normalized.message,
    'Document start date (01/01/2012) does not match form start date (01/02/2008).'
  )
})

test('normalizeMismatchMessage falls back to term-range wording for end-date mismatches', () => {
  const normalized = normalizeMismatchMessage({
    field: {
      field: 'contractEndDate',
      label: 'Contract End Date',
      value: '01/01/2024'
    },
    result: {
      field: 'contractEndDate',
      outcome: 'mismatch',
      confidence: 'high',
      message:
        'Submitted date is after the extended contract end date stated in the document',
      decisionSource: 'llm',
      citations: [
        {
          chunkId: 'chunk-1',
          documentName: 'fixture.pdf',
          page: 1,
          startPage: 1,
          endPage: 1,
          order: 1
        },
        {
          chunkId: 'chunk-2',
          documentName: 'fixture.pdf',
          page: 1,
          startPage: 1,
          endPage: 1,
          order: 2
        }
      ]
    },
    retrievedChunks: [
      {
        chunkId: 'chunk-1',
        documentName: 'fixture.pdf',
        page: 1,
        startPage: 1,
        endPage: 1,
        order: 1,
        text: 'IV. Paragraph 2 (term) on the face of the original STD 213 is amended to read: January 1, 2012 through December-31-2022December 31, 2023.'
      },
      {
        chunkId: 'chunk-2',
        documentName: 'fixture.pdf',
        page: 1,
        startPage: 1,
        endPage: 1,
        order: 2,
        text: 'All references to the former contract term of January 1, 2012 through December 31, 2022, in any exhibit incorporated into this agreement are hereinafter deemed to read January 1, 2012 through December 31, 2023.'
      }
    ]
  })

  assert.equal(
    normalized.message,
    'Document end date (12/31/2023) does not match form end date (01/01/2024).'
  )
})

test('normalizeLlmValidationResult rewrites llm not-enough-evidence output into a conflict message when cited evidence has competing dates', () => {
  const normalized = normalizeLlmValidationResult({
    field: {
      field: 'contractEndDate',
      label: 'Contract End Date',
      value: '12/31/2023'
    },
    result: {
      field: 'contractEndDate',
      outcome: 'not-enough-evidence',
      confidence: 'medium',
      message: 'The document is ambiguous.',
      decisionSource: 'llm',
      citations: [
        {
          chunkId: 'chunk-0',
          documentName: 'fixture.pdf',
          page: 1,
          startPage: 1,
          endPage: 1,
          order: 0
        }
      ]
    },
    retrievedChunks: [
      {
        chunkId: 'chunk-0',
        documentName: 'fixture.pdf',
        page: 1,
        startPage: 1,
        endPage: 1,
        order: 0,
        text:
          'Original Contract Expiration Date: 12/31/2022 Current Contract Expiration Date: 12/31/2022 Requested Contract Expiration Date: 12/31/2023'
      }
    ]
  })

  assert.equal(
    normalized.message,
    'Document contains conflicting end date evidence, so the end date could not be verified. Conflicting dates found: 12/31/2022 and 12/31/2023.'
  )
})

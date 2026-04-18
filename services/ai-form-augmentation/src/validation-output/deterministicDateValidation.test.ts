import assert from 'node:assert/strict'
import test from 'node:test'
import { runDeterministicDateValidation } from './deterministicDateValidation'

test('runDeterministicDateValidation resolves competing end-date labels with a unique term clause', () => {
  const result = runDeterministicDateValidation({
    formFields: [
      {
        field: 'contractEndDate',
        label: 'Contract End Date',
        value: '12/31/2025'
      }
    ],
    retrievedChunks: [
      {
        chunkId: 'chunk-0',
        documentName: 'fixture.pdf',
        page: 1,
        startPage: 1,
        endPage: 1,
        order: 0,
        text:
          'Original Contract Expiration Date: 12/31/2024 Current Contract Expiration Date: 12/31/2024 Requested Contract Expiration Date: 12/31/2025'
      },
      {
        chunkId: 'chunk-1',
        documentName: 'fixture.pdf',
        page: 1,
        startPage: 1,
        endPage: 1,
        order: 1,
        text:
          '5.1 TERM. The term of this Contract shall be the Contract Year from January 1, 2024 (Effective Date) through December 31, 2025 (Termination Date).'
      }
    ]
  })

  assert.equal(result.resolvedResults.length, 1)
  assert.equal(result.unresolvedFields.length, 0)
  assert.equal(result.resolvedResults[0]?.outcome, 'match')
  assert.equal(
    result.resolvedResults[0]?.message,
    'Document text supports end date as 12/31/2025.'
  )
  assert.deepEqual(
    result.resolvedResults[0]?.citations.map((citation) => citation.chunkId),
    ['chunk-1']
  )
})

test('runDeterministicDateValidation lets an operative amendment clause outrank weaker summary end-date labels', () => {
  const result = runDeterministicDateValidation({
    formFields: [
      {
        field: 'contractEndDate',
        label: 'Contract End Date',
        value: '12/31/2026'
      }
    ],
    retrievedChunks: [
      {
        chunkId: 'chunk-0',
        documentName: 'fixture.pdf',
        page: 1,
        startPage: 1,
        endPage: 1,
        order: 0,
        text:
          'Original Contract Expiration Date: 12/31/2024 Current Contract Expiration Date: 12/31/2024 Requested Contract Expiration Date: 12/31/2025'
      },
      {
        chunkId: 'chunk-1',
        documentName: 'fixture.pdf',
        page: 2,
        startPage: 2,
        endPage: 2,
        order: 1,
        text:
          'Paragraph 2 is amended to read: January 1, 2024 through December 31, 2026.'
      }
    ]
  })

  assert.equal(result.resolvedResults.length, 1)
  assert.equal(result.unresolvedFields.length, 0)
  assert.equal(result.resolvedResults[0]?.outcome, 'match')
  assert.equal(
    result.resolvedResults[0]?.message,
    'Document text supports end date as 12/31/2026.'
  )
  assert.deepEqual(
    result.resolvedResults[0]?.citations.map((citation) => citation.chunkId),
    ['chunk-1']
  )
})

test('runDeterministicDateValidation keeps competing end dates ambiguous when term text is not uniquely resolvable', () => {
  const result = runDeterministicDateValidation({
    formFields: [
      {
        field: 'contractEndDate',
        label: 'Contract End Date',
        value: '12/31/2023'
      }
    ],
    retrievedChunks: [
      {
        chunkId: 'chunk-0',
        documentName: 'fixture.pdf',
        page: 2,
        startPage: 2,
        endPage: 2,
        order: 0,
        text:
          'Original Contract Expiration Date: 12/31/2022 Current Contract Expiration Date: 12/31/2022 Requested Contract Expiration Date: 12/31/2023'
      },
      {
        chunkId: 'chunk-1',
        documentName: 'fixture.pdf',
        page: 2,
        startPage: 2,
        endPage: 2,
        order: 1,
        text:
          'The contract contains conflicting renewal references and does not include one unique term clause resolving the final end date.'
      }
    ]
  })

  assert.equal(result.resolvedResults.length, 1)
  assert.equal(result.unresolvedFields.length, 0)
  assert.equal(result.resolvedResults[0]?.outcome, 'not-enough-evidence')
  assert.equal(
    result.resolvedResults[0]?.message,
    'Document contains conflicting end date evidence, so the end date could not be verified. Conflicting dates found: 12/31/2022 and 12/31/2023.'
  )
})

test('runDeterministicDateValidation keeps competing end dates ambiguous when equally strong amendment clauses disagree', () => {
  const result = runDeterministicDateValidation({
    formFields: [
      {
        field: 'contractEndDate',
        label: 'Contract End Date',
        value: '12/31/2026'
      }
    ],
    retrievedChunks: [
      {
        chunkId: 'chunk-0',
        documentName: 'fixture.pdf',
        page: 1,
        startPage: 1,
        endPage: 1,
        order: 0,
        text:
          'Original Contract Expiration Date: 12/31/2024 Requested Contract Expiration Date: 12/31/2025'
      },
      {
        chunkId: 'chunk-1',
        documentName: 'fixture.pdf',
        page: 2,
        startPage: 2,
        endPage: 2,
        order: 1,
        text:
          'Paragraph 2 is amended to read: January 1, 2024 through December 31, 2025.'
      },
      {
        chunkId: 'chunk-2',
        documentName: 'fixture.pdf',
        page: 3,
        startPage: 3,
        endPage: 3,
        order: 2,
        text:
          'Paragraph 2 is deemed to read: January 1, 2024 through December 31, 2026.'
      }
    ]
  })

  assert.equal(result.resolvedResults.length, 1)
  assert.equal(result.unresolvedFields.length, 0)
  assert.equal(result.resolvedResults[0]?.outcome, 'not-enough-evidence')
  assert.equal(
    result.resolvedResults[0]?.message,
    'Document contains conflicting end date evidence, so the end date could not be verified. Conflicting dates found: 12/31/2024 and 12/31/2025.'
  )
})

test('runDeterministicDateValidation resolves clause-only end-date evidence before the llm fallback', () => {
  const result = runDeterministicDateValidation({
    formFields: [
      {
        field: 'contractEndDate',
        label: 'Contract End Date',
        value: '12/31/2025'
      }
    ],
    retrievedChunks: [
      {
        chunkId: 'chunk-0',
        documentName: 'fixture.pdf',
        page: 2,
        startPage: 2,
        endPage: 2,
        order: 0,
        text:
          'Paragraph 2 is amended to read: January 1, 2024 through December 31, 2025.'
      }
    ]
  })

  assert.equal(result.resolvedResults.length, 1)
  assert.equal(result.unresolvedFields.length, 0)
  assert.equal(result.resolvedResults[0]?.outcome, 'match')
  assert.equal(
    result.resolvedResults[0]?.message,
    'Document text supports end date as 12/31/2025.'
  )
})

test('runDeterministicDateValidation keeps clause-only competing end dates conservative when one unique end date cannot be resolved', () => {
  const result = runDeterministicDateValidation({
    formFields: [
      {
        field: 'contractEndDate',
        label: 'Contract End Date',
        value: '12/31/2023'
      }
    ],
    retrievedChunks: [
      {
        chunkId: 'chunk-0',
        documentName: 'fixture.pdf',
        page: 1,
        startPage: 1,
        endPage: 1,
        order: 0,
        text:
          'The Contract will become effective January 1, 2012, and will continue in full force and effect through December 31, 2022December 31, 2023, subject to the Budget Contingency Clause.'
      }
    ]
  })

  assert.equal(result.resolvedResults.length, 1)
  assert.equal(result.unresolvedFields.length, 0)
  assert.equal(result.resolvedResults[0]?.outcome, 'not-enough-evidence')
  assert.equal(
    result.resolvedResults[0]?.message,
    'Document contains conflicting end date evidence, so the end date could not be verified. Conflicting dates found: 12/31/2022 and 12/31/2023.'
  )
})

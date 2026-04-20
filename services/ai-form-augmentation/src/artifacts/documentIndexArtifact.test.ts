import assert from 'node:assert/strict'
import test from 'node:test'
import {
  classifyDocumentSetChanges,
  computeDocumentCacheKey,
  summarizeIndexedDocument
} from './documentIndexArtifact'

test('computeDocumentCacheKey is stable for the same document identity', () => {
  const cacheKey = computeDocumentCacheKey({
    documentName: 'contract.pdf',
    sourceBucket: 'documents-bucket',
    sourceKey: 'uploads/form-123/contract.pdf'
  })

  assert.equal(
    cacheKey,
    computeDocumentCacheKey({
      documentName: 'contract.pdf',
      sourceBucket: 'documents-bucket',
      sourceKey: 'uploads/form-123/contract.pdf'
    })
  )
})

test('classifyDocumentSetChanges distinguishes unchanged added and removed documents', () => {
  const previousDocuments = [
    summarizeIndexedDocument({
      documentName: 'keep.pdf',
      sourceBucket: 'documents-bucket',
      sourceKey: 'uploads/form-123/keep.pdf',
      chunkCount: 2
    }),
    summarizeIndexedDocument({
      documentName: 'remove.pdf',
      sourceBucket: 'documents-bucket',
      sourceKey: 'uploads/form-123/remove.pdf',
      chunkCount: 1
    })
  ]

  const changeSet = classifyDocumentSetChanges(previousDocuments, [
    {
      documentName: 'keep.pdf',
      sourceBucket: 'documents-bucket',
      sourceKey: 'uploads/form-123/keep.pdf'
    },
    {
      documentName: 'add.pdf',
      sourceBucket: 'documents-bucket',
      sourceKey: 'uploads/form-123/add.pdf'
    }
  ])

  assert.equal(changeSet.unchanged.length, 1)
  assert.equal(changeSet.unchanged[0]?.documentName, 'keep.pdf')
  assert.equal(changeSet.added.length, 1)
  assert.equal(changeSet.added[0]?.documentName, 'add.pdf')
  assert.equal(changeSet.removed.length, 1)
  assert.equal(changeSet.removed[0]?.documentName, 'remove.pdf')
})

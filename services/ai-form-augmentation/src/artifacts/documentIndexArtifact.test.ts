import assert from 'node:assert/strict'
import test from 'node:test'
import {
  classifyDocumentSetChanges,
  computeDocumentCacheKey,
  summarizeIndexedDocument
} from './documentIndexArtifact'
import {
  buildParsedDocumentArtifact,
  getParsedDocumentArtifactKeyForDocument
} from './parsedDocumentArtifact'

test('computeDocumentCacheKey is stable for the same document identity', () => {
  const cacheKey = computeDocumentCacheKey({
    documentName: 'contract.pdf',
    sourceBucket: 'documents-bucket',
    sourceKey: 'uploads/form-123/contract.pdf',
    sourceSha256: 'sha-a'
  })

  assert.equal(
    cacheKey,
    computeDocumentCacheKey({
      documentName: 'contract.pdf',
      sourceBucket: 'documents-bucket',
      sourceKey: 'uploads/form-123/contract.pdf',
      sourceSha256: 'sha-a'
    })
  )
})

test('computeDocumentCacheKey changes when document content fingerprint changes at the same key', () => {
  assert.notEqual(
    computeDocumentCacheKey({
      documentName: 'contract.pdf',
      sourceBucket: 'documents-bucket',
      sourceKey: 'uploads/form-123/contract.pdf',
      sourceSha256: 'sha-a'
    }),
    computeDocumentCacheKey({
      documentName: 'contract.pdf',
      sourceBucket: 'documents-bucket',
      sourceKey: 'uploads/form-123/contract.pdf',
      sourceSha256: 'sha-b'
    })
  )
})

test('classifyDocumentSetChanges distinguishes unchanged added and removed documents', () => {
  const previousDocuments = [
    summarizeIndexedDocument({
      documentName: 'keep.pdf',
      sourceBucket: 'documents-bucket',
      sourceKey: 'uploads/form-123/keep.pdf',
      sourceSha256: 'sha-keep',
      chunkCount: 2
    }),
    summarizeIndexedDocument({
      documentName: 'remove.pdf',
      sourceBucket: 'documents-bucket',
      sourceKey: 'uploads/form-123/remove.pdf',
      sourceSha256: 'sha-remove',
      chunkCount: 1
    })
  ]

  const changeSet = classifyDocumentSetChanges(previousDocuments, [
    {
      documentName: 'keep.pdf',
      sourceBucket: 'documents-bucket',
      sourceKey: 'uploads/form-123/keep.pdf',
      sourceSha256: 'sha-keep'
    },
    {
      documentName: 'add.pdf',
      sourceBucket: 'documents-bucket',
      sourceKey: 'uploads/form-123/add.pdf',
      sourceSha256: 'sha-add'
    }
  ])

  assert.equal(changeSet.unchanged.length, 1)
  assert.equal(changeSet.unchanged[0]?.documentName, 'keep.pdf')
  assert.equal(changeSet.added.length, 1)
  assert.equal(changeSet.added[0]?.documentName, 'add.pdf')
  assert.equal(changeSet.removed.length, 1)
  assert.equal(changeSet.removed[0]?.documentName, 'remove.pdf')
})

test('classifyDocumentSetChanges treats same-key different-content documents as changed', () => {
  const previousDocuments = [
    summarizeIndexedDocument({
      documentName: 'keep.pdf',
      sourceBucket: 'documents-bucket',
      sourceKey: 'uploads/form-123/keep.pdf',
      sourceSha256: 'sha-old',
      chunkCount: 2
    })
  ]

  const changeSet = classifyDocumentSetChanges(previousDocuments, [
    {
      documentName: 'keep.pdf',
      sourceBucket: 'documents-bucket',
      sourceKey: 'uploads/form-123/keep.pdf',
      sourceSha256: 'sha-new'
    }
  ])

  assert.equal(changeSet.unchanged.length, 0)
  assert.equal(changeSet.added.length, 1)
  assert.equal(changeSet.removed.length, 1)
})

test('buildParsedDocumentArtifact preserves reusable parse metadata', () => {
  const artifact = buildParsedDocumentArtifact({
    documentName: 'contract.pdf',
    sourceBucket: 'documents-bucket',
    sourceKey: 'uploads/form-123/contract.pdf',
    sourceSha256: 'sha-a',
    pageCount: 2,
    rawText: 'Contract text',
    pageTexts: ['Page 1', 'Page 2'],
    extractionMethod: 'ocr',
    extractionNotes: ['OCR fallback used'],
    ocrDisposition: 'attempted'
  })

  assert.equal(artifact.document.documentName, 'contract.pdf')
  assert.equal(artifact.document.sourceSha256, 'sha-a')
  assert.equal(artifact.document.chunkCount, 0)
  assert.equal(artifact.pageCount, 2)
  assert.equal(artifact.rawText, 'Contract text')
  assert.deepEqual(artifact.pageTexts, ['Page 1', 'Page 2'])
  assert.equal(artifact.extractionMethod, 'ocr')
  assert.equal(artifact.ocrDisposition, 'attempted')
})

test('getParsedDocumentArtifactKeyForDocument stays aligned to document cache identity', () => {
  const key = getParsedDocumentArtifactKeyForDocument('form-123', {
    documentName: 'contract.pdf',
    sourceBucket: 'documents-bucket',
    sourceKey: 'uploads/form-123/contract.pdf',
    sourceSha256: 'sha-a'
  })

  assert.equal(
    key,
    `rag-indexes/form-123/parsed-documents/${computeDocumentCacheKey({
      documentName: 'contract.pdf',
      sourceBucket: 'documents-bucket',
      sourceKey: 'uploads/form-123/contract.pdf',
      sourceSha256: 'sha-a'
    })}.json`
  )
})

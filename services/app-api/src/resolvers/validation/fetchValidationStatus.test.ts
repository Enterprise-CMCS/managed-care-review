import { describe, expect, it, vi } from 'vitest'
import type { QueryResolvers } from '../../gen/gqlServer'
import { fetchValidationStatusResolver } from './fetchValidationStatus'
import type { Store } from '../../postgres'
import { computeFormSnapshotHash } from '../../../../ai-form-augmentation/src/versioning'
import { buildValidationFormFields } from './validationFormFields'

const { getJsonMock } = vi.hoisted(() => ({
    getJsonMock: vi.fn(),
}))

vi.mock('../../../../ai-form-augmentation/src/s3', () => ({
    newArtifactS3Client: vi.fn(() => ({
        getJson: getJsonMock,
    })),
}))

const baseConfig = {
    validationFunctionName: 'test-validation-function',
    artifactBucket: 'ai-form-augmentation-artifacts',
    region: 'us-east-1',
    useLocalS3: false,
    defaultWorkSelectionMode: 'gated-first-pass' as const,
}

const currentArtifactVersion =
    'f39f158107adaf18d7374ba14765dd351b2813e95e108836237ab76fcf6018ff' // pragma: allowlist secret

const buildStore = (draftRevision: unknown): Store =>
    ({
        findContractWithHistory: vi.fn().mockResolvedValue({
            draftRevision,
        }),
    }) as unknown as Store

const buildDraftRevision = () => ({
    formData: {
        contractDateStart: new Date(Date.UTC(2026, 3, 1)),
        contractDateEnd: new Date(Date.UTC(2026, 3, 4)),
        contractDocuments: [
            {
                id: 'doc-0',
                name: 'Document 0',
                s3URL: 's3://uploads-bucket/uploads/contracts/doc-a.pdf',
                s3BucketName: 'uploads-bucket',
                s3Key: 'uploads/contracts/doc-a.pdf',
            },
        ],
    },
})

const invokeValidationStatusResolver = async (
    resolver: NonNullable<QueryResolvers['validationStatus']>,
    contractID = 'test-abc-123'
) => {
    if (typeof resolver === 'function') {
        return resolver({}, { input: { contractID } }, {} as never, {} as never)
    }

    return resolver.resolve(
        {},
        { input: { contractID } },
        {} as never,
        {} as never
    )
}

describe('fetchValidationStatusResolver', () => {
    it('returns a partial coverage summary for eligible documents that were not fully reviewed', async () => {
        const draftRevision = buildDraftRevision()
        const formSnapshotHash = computeFormSnapshotHash(
            buildValidationFormFields(draftRevision.formData).map((field) => ({
                field: field.field,
                value: field.value,
            }))
        )

        getJsonMock
            .mockResolvedValueOnce({
                stage: 'complete',
                artifactVersion: currentArtifactVersion,
                updatedAt: '2026-04-17T00:00:00.000Z',
                error: null,
            })
            .mockResolvedValueOnce({
                artifactVersion: currentArtifactVersion,
                formSnapshotHash,
                results: [],
                documentDiagnostics: [
                    {
                        documentName: 'contract-main.pdf',
                        sourceBucket: 'uploads-bucket',
                        sourceKey: 'uploads/contracts/doc-a.pdf',
                        status: 'processed',
                        usable: true,
                        chunkCount: 8,
                    },
                    {
                        documentName: 'contract-amendment.pdf',
                        sourceBucket: 'uploads-bucket',
                        sourceKey: 'uploads/contracts/doc-b.pdf',
                        status: 'failed',
                        usable: false,
                        chunkCount: 0,
                    },
                    {
                        documentName: 'contract-appendix.pdf',
                        sourceBucket: 'uploads-bucket',
                        sourceKey: 'uploads/contracts/doc-c.pdf',
                        status: 'skipped',
                        usable: false,
                        chunkCount: 0,
                        reason: 'deferred-first-pass',
                    },
                    {
                        documentName: 'contract-scan.pdf',
                        sourceBucket: 'uploads-bucket',
                        sourceKey: 'uploads/contracts/doc-d.pdf',
                        status: 'skipped',
                        usable: false,
                        chunkCount: 0,
                        reason: 'ocr-capped-large-batch',
                    },
                    {
                        documentName: 'supporting-rate.docx',
                        status: 'skipped',
                        usable: false,
                        chunkCount: 0,
                        reason: 'missing-pdf-extension',
                    },
                ],
            })

        const store = buildStore(draftRevision)

        const resolver = fetchValidationStatusResolver(
            store,
            baseConfig
        ) as NonNullable<QueryResolvers['validationStatus']>

        const result = await invokeValidationStatusResolver(resolver)

        expect(result).toEqual({
            stage: 'complete',
            artifactVersion: currentArtifactVersion,
            isStale: false,
            error: null,
            coverageSummary: {
                isPartial: true,
                skippedDocuments: 3,
                failedDocuments: 1,
                ocrCappedDocuments: 1,
                deferredDocuments: 1,
                unprocessedDocuments: 3,
            },
            results: [],
        })
    })

    it('does not mark coverage partial when only unsupported documents were skipped before worker execution', async () => {
        const draftRevision = buildDraftRevision()
        const formSnapshotHash = computeFormSnapshotHash(
            buildValidationFormFields(draftRevision.formData).map((field) => ({
                field: field.field,
                value: field.value,
            }))
        )

        getJsonMock
            .mockResolvedValueOnce({
                stage: 'complete',
                artifactVersion: currentArtifactVersion,
                updatedAt: '2026-04-17T00:00:00.000Z',
                error: null,
            })
            .mockResolvedValueOnce({
                artifactVersion: currentArtifactVersion,
                formSnapshotHash,
                results: [],
                documentDiagnostics: [
                    {
                        documentName: 'contract-main.pdf',
                        sourceBucket: 'uploads-bucket',
                        sourceKey: 'uploads/contracts/doc-a.pdf',
                        status: 'processed',
                        usable: true,
                        chunkCount: 8,
                    },
                    {
                        documentName: 'supporting-rate.docx',
                        status: 'skipped',
                        usable: false,
                        chunkCount: 0,
                        reason: 'missing-pdf-extension',
                    },
                ],
            })

        const store = buildStore(draftRevision)

        const resolver = fetchValidationStatusResolver(
            store,
            baseConfig
        ) as NonNullable<QueryResolvers['validationStatus']>

        const result = await invokeValidationStatusResolver(resolver)

        expect(result).toEqual({
            stage: 'complete',
            artifactVersion: currentArtifactVersion,
            isStale: false,
            error: null,
            coverageSummary: {
                isPartial: false,
                skippedDocuments: 1,
                failedDocuments: 0,
                ocrCappedDocuments: 0,
                deferredDocuments: 0,
                unprocessedDocuments: 0,
            },
            results: [],
        })
    })

    it('marks results stale when form date values change without document changes', async () => {
        getJsonMock
            .mockResolvedValueOnce({
                stage: 'complete',
                artifactVersion:
                    '4eb8e3d3d3dd8a33d728c4fd35afceee5fe6f6f0416d5d0f401b5f9efc0db1aa', // pragma: allowlist secret
                updatedAt: '2026-04-17T00:00:00.000Z',
                error: null,
            })
            .mockResolvedValueOnce({
                artifactVersion:
                    '4eb8e3d3d3dd8a33d728c4fd35afceee5fe6f6f0416d5d0f401b5f9efc0db1aa', // pragma: allowlist secret
                formSnapshotHash: 'stale-form-hash',
                results: [
                    {
                        field: 'contractStartDate',
                        outcome: 'mismatch',
                        confidence: 'high',
                        message: 'Old result',
                        citations: [],
                    },
                ],
            })

        const store = buildStore({
            formData: {
                contractDateStart: new Date(Date.UTC(2026, 3, 1)),
                contractDateEnd: new Date(Date.UTC(2026, 3, 4)),
                contractDocuments: [
                    {
                        id: 'doc-0',
                        name: 'Document 0',
                        s3URL: 's3://uploads-bucket/uploads/contracts/doc-a.pdf',
                        s3BucketName: 'uploads-bucket',
                        s3Key: 'uploads/contracts/doc-a.pdf',
                    },
                ],
            },
        })

        const resolver = fetchValidationStatusResolver(
            store,
            baseConfig
        ) as NonNullable<QueryResolvers['validationStatus']>

        const result = await invokeValidationStatusResolver(resolver)

        expect(result).toEqual({
            stage: 'complete',
            artifactVersion:
                'f39f158107adaf18d7374ba14765dd351b2813e95e108836237ab76fcf6018ff', // pragma: allowlist secret
            isStale: true,
            error: null,
            coverageSummary: null,
            results: [],
        })
    })

    it('passes through supporting citation data when present on stored results', async () => {
        const draftRevision = buildDraftRevision()
        const formSnapshotHash = computeFormSnapshotHash(
            buildValidationFormFields(draftRevision.formData).map((field) => ({
                field: field.field,
                value: field.value,
            }))
        )

        getJsonMock
            .mockResolvedValueOnce({
                stage: 'complete',
                artifactVersion: currentArtifactVersion,
                updatedAt: '2026-04-17T00:00:00.000Z',
                error: null,
            })
            .mockResolvedValueOnce({
                artifactVersion: currentArtifactVersion,
                formSnapshotHash,
                results: [
                    {
                        field: 'contractStartDate',
                        outcome: 'mismatch',
                        confidence: 'high',
                        message: 'Start date mismatch.',
                        citations: [
                            {
                                chunkId: 'primary.pdf::chunk-0',
                                documentName: 'primary.pdf',
                                page: 1,
                                order: 0,
                            },
                        ],
                        supportingCitations: [
                            {
                                chunkId: 'supporting.pdf::chunk-0',
                                documentName: 'supporting.pdf',
                                page: 2,
                                order: 0,
                            },
                        ],
                        evidenceSummary: {
                            consideredDocumentCount: 3,
                            supportingDocumentCount: 2,
                        },
                    },
                ],
            })

        const store = buildStore(draftRevision)

        const resolver = fetchValidationStatusResolver(
            store,
            baseConfig
        ) as NonNullable<QueryResolvers['validationStatus']>

        const result = await invokeValidationStatusResolver(resolver)

        expect(result.results).toEqual([
            {
                field: 'contractStartDate',
                outcome: 'mismatch',
                confidence: 'high',
                message: 'Start date mismatch.',
                citations: [
                    {
                        chunkId: 'primary.pdf::chunk-0',
                        documentName: 'primary.pdf',
                        page: 1,
                        order: 0,
                    },
                ],
                supportingCitations: [
                    {
                        chunkId: 'supporting.pdf::chunk-0',
                        documentName: 'supporting.pdf',
                        page: 2,
                        order: 0,
                    },
                ],
                evidenceSummary: {
                    consideredDocumentCount: 3,
                    supportingDocumentCount: 2,
                },
            },
        ])
    })
})

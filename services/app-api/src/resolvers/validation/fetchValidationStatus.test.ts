import { describe, expect, it, vi } from 'vitest'
import type { QueryResolvers } from '../../gen/gqlServer'
import { fetchValidationStatusResolver } from './fetchValidationStatus'
import type { Store } from '../../postgres'

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
}

const buildStore = (draftRevision: unknown): Store =>
    ({
        findContractWithHistory: vi.fn().mockResolvedValue({
            draftRevision,
        }),
    }) as unknown as Store

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
            results: [],
        })
    })
})

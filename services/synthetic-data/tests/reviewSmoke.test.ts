import { describe, expect, it, vi } from 'vitest'
import type { GraphQLClient } from '../src/client/graphqlClient'
import type { UploadClient } from '../src/client/uploadClient'
import {
    SyntheticCreateContractDocument,
    SyntheticFetchContractDocument,
    SyntheticFetchStateProgramsDocument,
    SyntheticSubmitContractDocument,
    SyntheticUpdateContractDraftRevisionDocument,
} from '../src/gen/gqlClient'
import { Logger } from '../src/logger'
import { runReviewSmokeScenario } from '../src/scenarios/reviewSmoke'

function scenarioDependencies(persistedMarker: string) {
    const execute = vi.fn().mockImplementation(async (document) => {
        if (document === SyntheticFetchStateProgramsDocument) {
            return {
                fetchAllStatePrograms: {
                    edges: [
                        {
                            stateCode: 'MN',
                            node: {
                                id: 'minnesota-program',
                                isDeprecated: false,
                            },
                        },
                    ],
                },
            }
        }
        if (document === SyntheticCreateContractDocument) {
            return {
                createContract: {
                    contract: {
                        id: 'contract-1',
                        stateCode: 'MN',
                        status: 'DRAFT',
                        draftRevision: {
                            updatedAt: '2026-09-03T12:00:00.000Z',
                        },
                    },
                },
            }
        }
        if (document === SyntheticUpdateContractDraftRevisionDocument) {
            return {
                updateContractDraftRevision: {
                    contract: {
                        id: 'contract-1',
                        stateCode: 'MN',
                        status: 'DRAFT',
                        draftRevision: {
                            updatedAt: '2026-09-03T12:01:00.000Z',
                        },
                    },
                },
            }
        }
        if (document === SyntheticSubmitContractDocument) {
            return {
                submitContract: {
                    contract: {
                        id: 'contract-1',
                        stateCode: 'MN',
                        status: 'SUBMITTED',
                    },
                },
            }
        }
        if (document === SyntheticFetchContractDocument) {
            return {
                fetchContract: {
                    contract: {
                        id: 'contract-1',
                        stateCode: 'MN',
                        status: 'SUBMITTED',
                        packageSubmissions: [
                            {
                                contractRevision: {
                                    formData: {
                                        submissionDescription: persistedMarker,
                                    },
                                },
                            },
                        ],
                    },
                },
            }
        }
        throw new Error('Unexpected GraphQL operation')
    })
    const upload = vi.fn().mockResolvedValue({
        name: 'synthetic-review-test-seed.pdf',
        s3URL: 's3://review-bucket/contract.pdf',
        s3Key: 'contract.pdf',
        bucket: 'review-bucket',
        sha256: 'abc123',
    })

    return {
        graphql: { execute } as unknown as GraphQLClient,
        uploads: { upload } as unknown as UploadClient,
        execute,
        upload,
    }
}

describe('runReviewSmokeScenario', () => {
    it('uploads, submits, and verifies one marked Minnesota contract', async () => {
        const marker = '[SYNTHETIC:review-smoke-v1:contract-only:test-seed]'
        const dependencies = scenarioDependencies(marker)

        const result = await runReviewSmokeScenario({
            graphql: dependencies.graphql,
            uploads: dependencies.uploads,
            logger: new Logger({ sink: vi.fn() }),
            seed: 'test-seed',
        })

        expect(result).toEqual({
            scenarioKey: 'review-smoke-v1',
            seed: 'test-seed',
            marker,
            contractId: 'contract-1',
            status: 'SUBMITTED',
        })
        expect(dependencies.execute).toHaveBeenCalledTimes(5)
        expect(dependencies.upload).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'synthetic-review-test-seed.pdf',
                fileType: 'PDF',
                bucketName: 'HEALTH_PLAN_DOCS',
            })
        )
        expect(dependencies.execute.mock.calls[2][1]).toEqual(
            expect.objectContaining({
                input: expect.objectContaining({
                    contractID: 'contract-1',
                    lastSeenUpdatedAt: '2026-09-03T12:00:00.000Z',
                    formData: expect.objectContaining({
                        submissionDescription: marker,
                        contractDocuments: [
                            {
                                name: 'synthetic-review-test-seed.pdf',
                                s3URL: 's3://review-bucket/contract.pdf',
                                sha256: 'abc123',
                            },
                        ],
                    }),
                }),
            })
        )
        expect(dependencies.execute.mock.calls[1][1]).toEqual({
            input: expect.objectContaining({
                programIDs: ['minnesota-program'],
            }),
        })
    })

    it('fails when the submitted marker cannot be read back', async () => {
        const dependencies = scenarioDependencies('different marker')

        await expect(
            runReviewSmokeScenario({
                graphql: dependencies.graphql,
                uploads: dependencies.uploads,
                logger: new Logger({ sink: vi.fn() }),
                seed: 'test-seed',
            })
        ).rejects.toThrow('Synthetic contract verification failed')
    })
})

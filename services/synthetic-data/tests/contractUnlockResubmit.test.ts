import { describe, expect, it, vi } from 'vitest'
import type { GraphQLClient } from '../src/client/graphqlClient'
import type { UploadClient } from '../src/client/uploadClient'
import {
    contractResubmitReason,
    contractUnlockReason,
    contractUnlockResubmitMarker,
} from '../src/builders/contractUnlockResubmit'
import {
    SyntheticCreateContractDocument,
    SyntheticFetchContractDocument,
    SyntheticSubmitContractDocument,
    SyntheticUnlockContractDocument,
    SyntheticUpdateContractDraftRevisionDocument,
} from '../src/gen/gqlClient'
import { Logger } from '../src/logger'
import { runContractUnlockResubmitScenario } from '../src/scenarios/contractUnlockResubmit'

function scenarioDependencies(options?: { retainedDateAdded?: string }) {
    const initialMarker = contractUnlockResubmitMarker('test-seed', 'initial')
    const resubmittedMarker = contractUnlockResubmitMarker(
        'test-seed',
        'resubmitted'
    )
    const stateExecute = vi.fn()
    stateExecute
        .mockResolvedValueOnce({
            createContract: {
                contract: {
                    id: 'contract-1',
                    status: 'DRAFT',
                    draftRevision: {
                        updatedAt: '2026-09-03T12:00:00.000Z',
                    },
                },
            },
        })
        .mockResolvedValueOnce({
            updateContractDraftRevision: {
                contract: {
                    id: 'contract-1',
                    draftRevision: {
                        updatedAt: '2026-09-03T12:01:00.000Z',
                    },
                },
            },
        })
        .mockResolvedValueOnce({
            submitContract: {
                contract: { id: 'contract-1', status: 'SUBMITTED' },
            },
        })
        .mockResolvedValueOnce({
            fetchContract: {
                contract: {
                    id: 'contract-1',
                    status: 'SUBMITTED',
                    initiallySubmittedAt: '2026-09-03T12:02:00.000Z',
                    packageSubmissions: [],
                },
            },
        })
        .mockResolvedValueOnce({
            updateContractDraftRevision: {
                contract: {
                    id: 'contract-1',
                    draftRevision: {
                        updatedAt: '2026-09-03T12:04:00.000Z',
                    },
                },
            },
        })
        .mockResolvedValueOnce({
            submitContract: {
                contract: { id: 'contract-1', status: 'RESUBMITTED' },
            },
        })
        .mockResolvedValueOnce({
            fetchContract: {
                contract: {
                    id: 'contract-1',
                    stateCode: 'MN',
                    status: 'RESUBMITTED',
                    initiallySubmittedAt: '2026-09-03T12:02:00.000Z',
                    draftRevision: null,
                    packageSubmissions: [
                        {
                            submitInfo: {
                                updatedReason: contractResubmitReason,
                                updatedBy: {
                                    role: 'STATE_USER',
                                    email: 'synthetic-state@example.com',
                                },
                            },
                            contractRevision: {
                                unlockInfo: {
                                    updatedReason: contractUnlockReason,
                                    updatedBy: {
                                        role: 'CMS_USER',
                                        email: 'synthetic-cms@example.com',
                                    },
                                },
                                formData: {
                                    submissionDescription: resubmittedMarker,
                                    modifiedBenefitsProvided: false,
                                    modifiedGeoAreaServed: false,
                                    contractDocuments: [
                                        {
                                            name: 'initial.pdf',
                                            s3URL: 's3://bucket/initial.pdf',
                                            sha256: 'initial-sha',
                                            dateAdded:
                                                options?.retainedDateAdded ??
                                                '2026-09-03T12:02:00.000Z',
                                        },
                                    ],
                                    supportingDocuments: [
                                        {
                                            name: 'revised.docx',
                                            s3URL: 's3://bucket/revised.docx',
                                            sha256: 'revised-sha',
                                            dateAdded:
                                                '2026-09-03T12:05:00.000Z',
                                        },
                                    ],
                                },
                            },
                        },
                        {
                            submitInfo: {
                                updatedReason: 'Initial submission',
                                updatedBy: {
                                    role: 'STATE_USER',
                                    email: 'synthetic-state@example.com',
                                },
                            },
                            contractRevision: {
                                unlockInfo: null,
                                formData: {
                                    submissionDescription: initialMarker,
                                    modifiedBenefitsProvided: true,
                                    modifiedGeoAreaServed: true,
                                    contractDocuments: [
                                        {
                                            name: 'initial.pdf',
                                            s3URL: 's3://bucket/initial.pdf',
                                            sha256: 'initial-sha',
                                            dateAdded:
                                                '2026-09-03T12:02:00.000Z',
                                        },
                                    ],
                                    supportingDocuments: [],
                                },
                            },
                        },
                    ],
                },
            },
        })

    const cmsExecute = vi.fn().mockImplementation(async (document) => {
        if (document !== SyntheticUnlockContractDocument) {
            throw new Error('Unexpected CMS GraphQL operation')
        }
        return {
            unlockContract: {
                contract: {
                    id: 'contract-1',
                    status: 'UNLOCKED',
                    draftRevision: {
                        updatedAt: '2026-09-03T12:03:00.000Z',
                        unlockInfo: {
                            updatedReason: contractUnlockReason,
                            updatedBy: {
                                role: 'CMS_USER',
                                email: 'synthetic-cms@example.com',
                            },
                        },
                    },
                },
            },
        }
    })
    const upload = vi
        .fn()
        .mockResolvedValueOnce({
            name: 'initial.pdf',
            s3URL: 's3://bucket/initial.pdf',
            s3Key: 'initial.pdf',
            bucket: 'bucket',
            sha256: 'initial-sha',
        })
        .mockResolvedValueOnce({
            name: 'revised.docx',
            s3URL: 's3://bucket/revised.docx',
            s3Key: 'revised.docx',
            bucket: 'bucket',
            sha256: 'revised-sha',
        })

    return {
        stateGraphql: {
            execute: stateExecute,
        } as unknown as GraphQLClient,
        cmsGraphql: { execute: cmsExecute } as unknown as GraphQLClient,
        uploads: { upload } as unknown as UploadClient,
        stateExecute,
        cmsExecute,
        upload,
    }
}

describe('runContractUnlockResubmitScenario', () => {
    it('submits, unlocks, revises, resubmits, and verifies history', async () => {
        const dependencies = scenarioDependencies()

        const result = await runContractUnlockResubmitScenario({
            stateGraphql: dependencies.stateGraphql,
            cmsGraphql: dependencies.cmsGraphql,
            uploads: dependencies.uploads,
            logger: new Logger({ sink: vi.fn() }),
            seed: 'test-seed',
        })

        expect(result).toEqual({
            scenarioKey: 'contract-unlock-resubmit-v1',
            seed: 'test-seed',
            initialMarker:
                '[SYNTHETIC:contract-unlock-resubmit-v1:initial:test-seed]',
            resubmittedMarker:
                '[SYNTHETIC:contract-unlock-resubmit-v1:resubmitted:test-seed]',
            contractId: 'contract-1',
            status: 'RESUBMITTED',
            submissionCount: 2,
        })
        expect(dependencies.cmsExecute).toHaveBeenCalledWith(
            SyntheticUnlockContractDocument,
            {
                input: {
                    contractID: 'contract-1',
                    unlockedReason: contractUnlockReason,
                },
            }
        )
        expect(dependencies.stateExecute).toHaveBeenNthCalledWith(
            5,
            SyntheticUpdateContractDraftRevisionDocument,
            expect.objectContaining({
                input: expect.objectContaining({
                    contractID: 'contract-1',
                    lastSeenUpdatedAt: '2026-09-03T12:03:00.000Z',
                    formData: expect.objectContaining({
                        submissionDescription:
                            '[SYNTHETIC:contract-unlock-resubmit-v1:resubmitted:test-seed]',
                        modifiedBenefitsProvided: false,
                        modifiedGeoAreaServed: false,
                    }),
                }),
            })
        )
        expect(dependencies.stateExecute).toHaveBeenNthCalledWith(
            6,
            SyntheticSubmitContractDocument,
            {
                input: {
                    contractID: 'contract-1',
                    submittedReason: contractResubmitReason,
                },
            }
        )
        expect(dependencies.upload).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                fileType: 'DOCX',
                bucketName: 'HEALTH_PLAN_DOCS',
            })
        )
        expect(
            dependencies.stateExecute.mock.calls.map(([document]) => document)
        ).toEqual([
            SyntheticCreateContractDocument,
            SyntheticUpdateContractDraftRevisionDocument,
            SyntheticSubmitContractDocument,
            SyntheticFetchContractDocument,
            SyntheticUpdateContractDraftRevisionDocument,
            SyntheticSubmitContractDocument,
            SyntheticFetchContractDocument,
        ])
    })

    it('rejects a resubmission that loses original document history', async () => {
        const dependencies = scenarioDependencies({
            retainedDateAdded: '2026-09-04T12:02:00.000Z',
        })

        await expect(
            runContractUnlockResubmitScenario({
                stateGraphql: dependencies.stateGraphql,
                cmsGraphql: dependencies.cmsGraphql,
                uploads: dependencies.uploads,
                logger: new Logger({ sink: vi.fn() }),
                seed: 'test-seed',
            })
        ).rejects.toThrow(
            'Synthetic contract resubmission history verification failed'
        )
    })
})

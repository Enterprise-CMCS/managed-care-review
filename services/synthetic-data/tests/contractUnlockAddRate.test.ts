import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GraphQLClient } from '../src/client/graphqlClient'
import type { UploadClient } from '../src/client/uploadClient'
import {
    contractAddRateResubmitReason,
    contractUnlockAddRateReason,
} from '../src/builders/contractUnlockAddRate'
import {
    SyntheticSubmitContractDocument,
    SyntheticUnlockContractDocument,
    SyntheticUpdateContractDraftRevisionDocument,
    SyntheticUpdateDraftContractRatesDocument,
} from '../src/gen/gqlClient'
import { Logger } from '../src/logger'
import { runContractUnlockAddRateScenario } from '../src/scenarios/contractUnlockAddRate'
import { submitSyntheticContract } from '../src/scenarios/submitContract'

vi.mock('../src/scenarios/submitContract', () => ({
    submitSyntheticContract: vi.fn(),
}))

const mockedSubmitContract = vi.mocked(submitSyntheticContract)
const initialMarker =
    '[SYNTHETIC:contract-unlock-add-rate-v1:initial:test-seed]'
const resubmittedMarker =
    '[SYNTHETIC:contract-unlock-add-rate-v1:resubmitted:test-seed]'
const contractDocument = {
    name: 'contract.pdf',
    s3URL: 's3://synthetic-bucket/contract.pdf',
    s3Key: 'contract.pdf',
    bucket: 'synthetic-bucket',
    sha256: 'contract-sha',
}
const rateDocument = {
    name: 'rate.pdf',
    s3URL: 's3://synthetic-bucket/rate.pdf',
    s3Key: 'rate.pdf',
    bucket: 'synthetic-bucket',
    sha256: 'rate-sha',
}

function scenarioDependencies() {
    const stateExecute = vi.fn().mockImplementation(async (document) => {
        if (document === SyntheticUpdateContractDraftRevisionDocument) {
            return {
                updateContractDraftRevision: {
                    contract: {
                        id: 'contract-1',
                        draftRevision: {
                            updatedAt: '2026-01-01T00:02:00.000Z',
                        },
                    },
                },
            }
        }
        if (document === SyntheticUpdateDraftContractRatesDocument) {
            return {
                updateDraftContractRates: {
                    contract: {
                        id: 'contract-1',
                        draftRates: [{ id: 'rate-1' }],
                    },
                },
            }
        }
        if (document === SyntheticSubmitContractDocument) {
            return { submitContract: { contract: { id: 'contract-1' } } }
        }
        throw new Error('Unexpected state GraphQL operation')
    })
    const cmsExecute = vi.fn().mockResolvedValue({
        unlockContract: {
            contract: {
                id: 'contract-1',
                draftRevision: { updatedAt: '2026-01-01T00:01:00.000Z' },
            },
        },
    })
    const upload = vi.fn().mockResolvedValue(rateDocument)
    return {
        stateGraphql: { execute: stateExecute } as unknown as GraphQLClient,
        cmsGraphql: { execute: cmsExecute } as unknown as GraphQLClient,
        uploads: { upload } as unknown as UploadClient,
        logger: new Logger({ sink: vi.fn() }),
        seed: 'test-seed',
        stateExecute,
        cmsExecute,
        upload,
    }
}

describe('runContractUnlockAddRateScenario', () => {
    beforeEach(() => {
        mockedSubmitContract.mockReset().mockResolvedValue({
            contractId: 'contract-1',
            programId: 'program-1',
            contractDocument,
            rateIds: [],
        })
    })

    it('unlocks, uploads a rate, updates with returned timestamps, and resubmits without fetch-back verification', async () => {
        const dependencies = scenarioDependencies()
        const result = await runContractUnlockAddRateScenario(dependencies)

        expect(result).toEqual({
            scenarioKey: 'contract-unlock-add-rate-v1',
            seed: 'test-seed',
            initialMarker,
            resubmittedMarker,
            contractId: 'contract-1',
            rateId: 'rate-1',
            status: 'RESUBMITTED',
            submissionCount: 2,
        })
        expect(mockedSubmitContract).toHaveBeenCalledExactlyOnceWith({
            graphql: dependencies.stateGraphql,
            uploads: dependencies.uploads,
            marker: initialMarker,
            documentName:
                'synthetic-contract-unlock-add-rate-test-seed-initial.pdf',
        })
        expect(dependencies.cmsExecute).toHaveBeenCalledExactlyOnceWith(
            SyntheticUnlockContractDocument,
            {
                input: {
                    contractID: 'contract-1',
                    unlockedReason: contractUnlockAddRateReason,
                },
            }
        )
        expect(mockedSubmitContract.mock.invocationCallOrder[0]).toBeLessThan(
            dependencies.cmsExecute.mock.invocationCallOrder[0]
        )
        expect(
            dependencies.cmsExecute.mock.invocationCallOrder[0]
        ).toBeLessThan(dependencies.upload.mock.invocationCallOrder[0])
        expect(dependencies.upload.mock.invocationCallOrder[0]).toBeLessThan(
            dependencies.stateExecute.mock.invocationCallOrder[0]
        )
        expect(dependencies.upload).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({
                name: 'synthetic-contract-unlock-add-rate-test-seed-rate.pdf',
                fileType: 'PDF',
                bucketName: 'HEALTH_PLAN_DOCS',
            })
        )
        expect(
            dependencies.stateExecute.mock.calls.map(([document]) => document)
        ).toEqual([
            SyntheticUpdateContractDraftRevisionDocument,
            SyntheticUpdateDraftContractRatesDocument,
            SyntheticSubmitContractDocument,
        ])
        expect(dependencies.stateExecute.mock.calls[0][1]).toEqual({
            input: {
                contractID: 'contract-1',
                lastSeenUpdatedAt: '2026-01-01T00:01:00.000Z',
                formData: expect.objectContaining({
                    submissionType: 'CONTRACT_AND_RATES',
                    submissionDescription: resubmittedMarker,
                    contractDocuments: [
                        {
                            name: contractDocument.name,
                            s3URL: contractDocument.s3URL,
                            sha256: contractDocument.sha256,
                        },
                    ],
                }),
            },
        })
        expect(dependencies.stateExecute.mock.calls[1][1]).toEqual({
            input: {
                contractID: 'contract-1',
                lastSeenUpdatedAt: '2026-01-01T00:02:00.000Z',
                updatedRates: [
                    {
                        type: 'CREATE',
                        formData: expect.objectContaining({
                            rateProgramIDs: ['program-1'],
                            rateDocuments: [
                                {
                                    name: rateDocument.name,
                                    s3URL: rateDocument.s3URL,
                                    sha256: rateDocument.sha256,
                                },
                            ],
                        }),
                    },
                ],
            },
        })
        expect(dependencies.stateExecute.mock.calls[2][1]).toEqual({
            input: {
                contractID: 'contract-1',
                submittedReason: contractAddRateResubmitReason,
            },
        })
    })

    it('stops before uploading when unlock does not return a draft timestamp', async () => {
        const dependencies = scenarioDependencies()
        dependencies.cmsExecute.mockResolvedValueOnce({
            unlockContract: {
                contract: { id: 'contract-1', draftRevision: null },
            },
        })

        await expect(
            runContractUnlockAddRateScenario(dependencies)
        ).rejects.toThrow(
            'Synthetic unlock response did not contain the expected draft'
        )
        expect(dependencies.upload).not.toHaveBeenCalled()
        expect(dependencies.stateExecute).not.toHaveBeenCalled()
    })

    it('does not add a rate without the timestamp from the preceding update', async () => {
        const dependencies = scenarioDependencies()
        dependencies.stateExecute.mockResolvedValueOnce({
            updateContractDraftRevision: {
                contract: { id: 'contract-1', draftRevision: {} },
            },
        })

        await expect(
            runContractUnlockAddRateScenario(dependencies)
        ).rejects.toThrow(
            'Synthetic update response did not contain the expected draft'
        )
        expect(dependencies.stateExecute).toHaveBeenCalledTimes(1)
    })

    it('propagates a rate API rejection without resubmitting', async () => {
        const dependencies = scenarioDependencies()
        dependencies.stateExecute
            .mockResolvedValueOnce({
                updateContractDraftRevision: {
                    contract: {
                        id: 'contract-1',
                        draftRevision: {
                            updatedAt: '2026-01-01T00:02:00.000Z',
                        },
                    },
                },
            })
            .mockRejectedValueOnce(new Error('Rate creation rejected'))

        await expect(
            runContractUnlockAddRateScenario(dependencies)
        ).rejects.toThrow('Rate creation rejected')
        expect(dependencies.stateExecute).toHaveBeenCalledTimes(2)
    })

    it('does not resubmit when the rate response lacks an ID needed for the result', async () => {
        const dependencies = scenarioDependencies()
        dependencies.stateExecute
            .mockResolvedValueOnce({
                updateContractDraftRevision: {
                    contract: {
                        id: 'contract-1',
                        draftRevision: {
                            updatedAt: '2026-01-01T00:02:00.000Z',
                        },
                    },
                },
            })
            .mockResolvedValueOnce({
                updateDraftContractRates: {
                    contract: { id: 'contract-1', draftRates: [] },
                },
            })

        await expect(
            runContractUnlockAddRateScenario(dependencies)
        ).rejects.toThrow(
            'Synthetic rate update response did not contain the expected rate ID'
        )
        expect(dependencies.stateExecute).toHaveBeenCalledTimes(2)
    })
})

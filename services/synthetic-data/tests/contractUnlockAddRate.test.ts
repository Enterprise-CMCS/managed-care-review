import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GraphQLClient } from '../src/client/graphqlClient'
import type { UploadClient } from '../src/client/uploadClient'
import {
    SyntheticFetchContractDocument,
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

function packageSubmission(marker: string, includesRate: boolean) {
    return {
        submitInfo: {
            updatedReason: includesRate
                ? 'Synthetic scenario: resubmit contract with a new rate'
                : 'Initial submission',
            updatedBy: {
                role: 'STATE_USER',
                email: 'synthetic@example.com',
            },
        },
        contractRevision: {
            unlockInfo: includesRate
                ? {
                      updatedReason:
                          'Synthetic scenario: add a rate to an unlocked contract',
                      updatedBy: {
                          role: 'CMS_USER',
                          email: 'synthetic.cms@example.com',
                      },
                  }
                : null,
            formData: {
                submissionDescription: marker,
                modifiedBenefitsProvided: true,
                modifiedGeoAreaServed: true,
                contractDocuments: [],
                supportingDocuments: [],
            },
        },
        rateRevisions: includesRate
            ? [
                  {
                      rateID: 'rate-1',
                      rate: {
                          id: 'rate-1',
                          parentContractID: 'contract-1',
                          status: 'RESUBMITTED',
                      },
                      formData: {
                          rateCertificationName: 'MN-20260101-20261231-PMAP',
                          rateDocuments: [],
                      },
                  },
              ]
            : [],
    }
}

describe('runContractUnlockAddRateScenario', () => {
    beforeEach(() => {
        mockedSubmitContract.mockReset()
        mockedSubmitContract.mockResolvedValue({
            contractId: 'contract-1',
            programId: 'program-1',
            contractDocument: {
                name: 'contract.pdf',
                s3URL: 's3://synthetic-bucket/contract.pdf',
                s3Key: 'contract.pdf',
                bucket: 'synthetic-bucket',
                sha256: 'contract-sha',
            },
            rateIds: [],
        })
    })

    it('adds the first owned rate and verifies both package snapshots', async () => {
        const stateExecute = vi.fn().mockImplementation(async (document) => {
            if (document === SyntheticUpdateContractDraftRevisionDocument) {
                return {
                    updateContractDraftRevision: {
                        contract: {
                            id: 'contract-1',
                            stateCode: 'MN',
                            status: 'UNLOCKED',
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
                            stateCode: 'MN',
                            status: 'UNLOCKED',
                            draftRevision: {
                                updatedAt: '2026-01-01T00:03:00.000Z',
                            },
                            draftRates: [
                                {
                                    id: 'rate-1',
                                    parentContractID: 'contract-1',
                                    status: 'UNLOCKED',
                                    consolidatedStatus: 'UNLOCKED',
                                    draftRevision: {
                                        updatedAt: '2026-01-01T00:03:00.000Z',
                                    },
                                },
                            ],
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
                            status: 'RESUBMITTED',
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
                            status: 'RESUBMITTED',
                            initiallySubmittedAt: '2026-01-01T00:00:00.000Z',
                            draftRevision: null,
                            packageSubmissions: [
                                packageSubmission(initialMarker, false),
                                packageSubmission(resubmittedMarker, true),
                            ],
                        },
                    },
                }
            }
            throw new Error('Unexpected state GraphQL operation')
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
                            updatedAt: '2026-01-01T00:01:00.000Z',
                            unlockInfo: {
                                updatedReason:
                                    'Synthetic scenario: add a rate to an unlocked contract',
                                updatedBy: {
                                    role: 'CMS_USER',
                                    email: 'synthetic.cms@example.com',
                                },
                            },
                        },
                    },
                },
            }
        })
        const upload = vi.fn().mockResolvedValue({
            name: 'rate.pdf',
            s3URL: 's3://synthetic-bucket/rate.pdf',
            s3Key: 'rate.pdf',
            bucket: 'synthetic-bucket',
            sha256: 'rate-sha',
        })

        const result = await runContractUnlockAddRateScenario({
            stateGraphql: {
                execute: stateExecute,
            } as unknown as GraphQLClient,
            cmsGraphql: { execute: cmsExecute } as unknown as GraphQLClient,
            uploads: { upload } as unknown as UploadClient,
            logger: new Logger({ sink: vi.fn() }),
            seed: 'test-seed',
        })

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
        expect(stateExecute.mock.calls[0][1]).toEqual({
            input: expect.objectContaining({
                lastSeenUpdatedAt: '2026-01-01T00:01:00.000Z',
                formData: expect.objectContaining({
                    submissionType: 'CONTRACT_AND_RATES',
                    submissionDescription: resubmittedMarker,
                }),
            }),
        })
        expect(stateExecute.mock.calls[1][1]).toEqual({
            input: expect.objectContaining({
                lastSeenUpdatedAt: '2026-01-01T00:02:00.000Z',
                updatedRates: [expect.objectContaining({ type: 'CREATE' })],
            }),
        })
    })
})

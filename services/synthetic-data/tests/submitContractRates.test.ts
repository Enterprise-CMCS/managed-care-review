import { describe, expect, it, vi } from 'vitest'
import type { GraphQLClient } from '../src/client/graphqlClient'
import type { UploadClient } from '../src/client/uploadClient'
import {
    SyntheticCreateContractDocument,
    SyntheticSubmitContractDocument,
    SyntheticUpdateContractDraftRevisionDocument,
    SyntheticUpdateDraftContractRatesDocument,
} from '../src/gen/gqlClient'
import { submitSyntheticContract } from '../src/scenarios/submitContract'

describe('submitSyntheticContract rate support', () => {
    it('creates an owned rate as part of the submitted package', async () => {
        const execute = vi.fn().mockImplementation(async (document) => {
            if (document === SyntheticCreateContractDocument) {
                return {
                    createContract: {
                        contract: {
                            id: 'contract-1',
                            stateCode: 'MN',
                            status: 'DRAFT',
                            draftRevision: {
                                updatedAt: '2026-01-01T00:00:00.000Z',
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
                                updatedAt: '2026-01-01T00:01:00.000Z',
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
                            status: 'DRAFT',
                            draftRevision: {
                                updatedAt: '2026-01-01T00:02:00.000Z',
                            },
                            draftRates: [
                                {
                                    id: 'rate-1',
                                    parentContractID: 'contract-1',
                                    status: 'DRAFT',
                                    consolidatedStatus: 'DRAFT',
                                    draftRevision: {
                                        updatedAt: '2026-01-01T00:02:00.000Z',
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
                            status: 'SUBMITTED',
                        },
                    },
                }
            }
            throw new Error('Unexpected GraphQL operation')
        })
        const upload = vi
            .fn()
            .mockResolvedValueOnce({
                name: 'contract.pdf',
                s3URL: 's3://synthetic-bucket/contract.pdf',
                s3Key: 'contract.pdf',
                bucket: 'synthetic-bucket',
                sha256: 'contract-sha',
            })
            .mockResolvedValueOnce({
                name: 'rate.pdf',
                s3URL: 's3://synthetic-bucket/rate.pdf',
                s3Key: 'rate.pdf',
                bucket: 'synthetic-bucket',
                sha256: 'rate-sha',
            })

        const result = await submitSyntheticContract({
            graphql: { execute } as unknown as GraphQLClient,
            uploads: { upload } as unknown as UploadClient,
            marker: '[SYNTHETIC:test:owned-rate:seed]',
            documentName: 'contract.pdf',
            rates: [{ type: 'CREATE', documentName: 'rate.pdf' }],
        })

        expect(result.rateIds).toEqual(['rate-1'])
        expect(execute.mock.calls[0][1]).toEqual({
            input: expect.objectContaining({
                submissionType: 'CONTRACT_AND_RATES',
            }),
        })
        expect(execute.mock.calls[1][1]).toEqual({
            input: expect.objectContaining({
                formData: expect.objectContaining({
                    submissionType: 'CONTRACT_AND_RATES',
                }),
            }),
        })
        expect(execute.mock.calls[2][1]).toEqual({
            input: {
                contractID: 'contract-1',
                lastSeenUpdatedAt: '2026-01-01T00:01:00.000Z',
                updatedRates: [
                    {
                        type: 'CREATE',
                        formData: expect.objectContaining({
                            rateProgramIDs: [
                                '3fd36500-bf2c-47bc-80e8-e7aa417184c5',
                            ],
                            rateDocuments: [
                                {
                                    name: 'rate.pdf',
                                    s3URL: 's3://synthetic-bucket/rate.pdf',
                                    sha256: 'rate-sha',
                                },
                            ],
                        }),
                    },
                ],
            },
        })
    })
})

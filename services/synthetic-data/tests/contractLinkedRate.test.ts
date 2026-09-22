import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GraphQLClient } from '../src/client/graphqlClient'
import type { UploadClient } from '../src/client/uploadClient'
import { Logger } from '../src/logger'
import { runContractLinkedRateScenario } from '../src/scenarios/contractLinkedRate'
import { submitSyntheticContract } from '../src/scenarios/submitContract'

vi.mock('../src/scenarios/submitContract', () => ({
    submitSyntheticContract: vi.fn(),
}))

const mockedSubmitContract = vi.mocked(submitSyntheticContract)
const uploadedDocument = {
    name: 'contract.pdf',
    s3URL: 's3://synthetic-bucket/contract.pdf',
    s3Key: 'contract.pdf',
    bucket: 'synthetic-bucket',
    sha256: 'contract-sha',
}

function fetchedContract(
    contractId: string,
    marker: string,
    parentContractId: string
) {
    return {
        fetchContract: {
            contract: {
                id: contractId,
                stateCode: 'MN',
                status: 'SUBMITTED',
                initiallySubmittedAt: '2026-01-01T00:00:00.000Z',
                draftRevision: null,
                packageSubmissions: [
                    {
                        submitInfo: {
                            updatedReason: 'Initial submission',
                            updatedBy: {
                                role: 'STATE_USER',
                                email: 'synthetic@example.com',
                            },
                        },
                        contractRevision: {
                            unlockInfo: null,
                            formData: {
                                submissionDescription: marker,
                                modifiedBenefitsProvided: true,
                                modifiedGeoAreaServed: true,
                                contractDocuments: [],
                                supportingDocuments: [],
                            },
                        },
                        rateRevisions: [
                            {
                                rateID: 'rate-1',
                                rate: {
                                    id: 'rate-1',
                                    parentContractID: parentContractId,
                                    status: 'SUBMITTED',
                                },
                                formData: {
                                    rateCertificationName:
                                        'MN-20260101-20261231-PMAP',
                                    rateDocuments: [],
                                },
                            },
                        ],
                    },
                ],
            },
        },
    }
}

describe('runContractLinkedRateScenario', () => {
    beforeEach(() => {
        mockedSubmitContract.mockReset()
        mockedSubmitContract
            .mockResolvedValueOnce({
                contractId: 'source-contract',
                programId: 'program-1',
                contractDocument: uploadedDocument,
                rateIds: ['rate-1'],
            })
            .mockResolvedValueOnce({
                contractId: 'linked-contract',
                programId: 'program-1',
                contractDocument: uploadedDocument,
                rateIds: ['rate-1'],
            })
    })

    it('verifies that the linked contract does not become the rate parent', async () => {
        const execute = vi
            .fn()
            .mockResolvedValueOnce(
                fetchedContract(
                    'source-contract',
                    '[SYNTHETIC:contract-linked-rate-v1:source:test-seed]',
                    'source-contract'
                )
            )
            .mockResolvedValueOnce(
                fetchedContract(
                    'linked-contract',
                    '[SYNTHETIC:contract-linked-rate-v1:linked:test-seed]',
                    'source-contract'
                )
            )

        const result = await runContractLinkedRateScenario({
            graphql: { execute } as unknown as GraphQLClient,
            uploads: {} as UploadClient,
            logger: new Logger({ sink: vi.fn() }),
            seed: 'test-seed',
        })

        expect(result).toMatchObject({
            scenarioKey: 'contract-linked-rate-v1',
            contractId: 'linked-contract',
            sourceContractId: 'source-contract',
            rateId: 'rate-1',
            status: 'SUBMITTED',
        })
        expect(mockedSubmitContract.mock.calls[1][0]).toEqual(
            expect.objectContaining({
                rates: [{ type: 'LINK', rateId: 'rate-1' }],
            })
        )
    })

    it('rejects a linked package that changed the rate parent', async () => {
        const execute = vi
            .fn()
            .mockResolvedValueOnce(
                fetchedContract(
                    'source-contract',
                    '[SYNTHETIC:contract-linked-rate-v1:source:test-seed]',
                    'source-contract'
                )
            )
            .mockResolvedValueOnce(
                fetchedContract(
                    'linked-contract',
                    '[SYNTHETIC:contract-linked-rate-v1:linked:test-seed]',
                    'linked-contract'
                )
            )

        await expect(
            runContractLinkedRateScenario({
                graphql: { execute } as unknown as GraphQLClient,
                uploads: {} as UploadClient,
                logger: new Logger({ sink: vi.fn() }),
                seed: 'test-seed',
            })
        ).rejects.toThrow('Synthetic linked-rate topology verification failed')
    })
})

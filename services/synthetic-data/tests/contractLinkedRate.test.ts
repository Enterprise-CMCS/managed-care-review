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
const sourceResult = {
    contractId: 'source-contract',
    programId: 'program-1',
    contractDocument: uploadedDocument,
    rateIds: ['rate-1'],
}

function scenarioDependencies() {
    const execute = vi.fn()
    return {
        graphql: { execute } as unknown as GraphQLClient,
        uploads: {} as UploadClient,
        logger: new Logger({ sink: vi.fn() }),
        seed: 'test-seed',
        execute,
    }
}

describe('runContractLinkedRateScenario', () => {
    beforeEach(() => {
        mockedSubmitContract.mockReset()
        mockedSubmitContract
            .mockResolvedValueOnce(sourceResult)
            .mockResolvedValueOnce({
                ...sourceResult,
                contractId: 'linked-contract',
            })
    })

    it('submits the source before linking its returned rate ID, without fetching either contract', async () => {
        const dependencies = scenarioDependencies()
        const result = await runContractLinkedRateScenario(dependencies)

        expect(result).toEqual({
            scenarioKey: 'contract-linked-rate-v1',
            seed: 'test-seed',
            sourceMarker:
                '[SYNTHETIC:contract-linked-rate-v1:source:test-seed]',
            marker: '[SYNTHETIC:contract-linked-rate-v1:linked:test-seed]',
            contractId: 'linked-contract',
            sourceContractId: 'source-contract',
            rateId: 'rate-1',
            status: 'SUBMITTED',
        })
        expect(mockedSubmitContract).toHaveBeenCalledTimes(2)
        expect(mockedSubmitContract).toHaveBeenNthCalledWith(1, {
            graphql: dependencies.graphql,
            uploads: dependencies.uploads,
            marker: result.sourceMarker,
            documentName: 'synthetic-linked-rate-source-contract-test-seed.pdf',
            rates: [
                {
                    type: 'CREATE',
                    documentName:
                        'synthetic-linked-rate-source-rate-test-seed.pdf',
                },
            ],
        })
        expect(mockedSubmitContract).toHaveBeenNthCalledWith(2, {
            graphql: dependencies.graphql,
            uploads: dependencies.uploads,
            marker: result.marker,
            documentName: 'synthetic-linked-rate-target-contract-test-seed.pdf',
            rates: [{ type: 'LINK', rateId: 'rate-1' }],
        })
        expect(dependencies.execute).not.toHaveBeenCalled()
    })

    it('does not generate a linked target without a usable source rate ID', async () => {
        mockedSubmitContract.mockReset().mockResolvedValueOnce({
            ...sourceResult,
            rateIds: [],
        })

        await expect(
            runContractLinkedRateScenario(scenarioDependencies())
        ).rejects.toThrow('Synthetic source contract did not create one rate')
        expect(mockedSubmitContract).toHaveBeenCalledTimes(1)
    })

    it('propagates a target submission failure', async () => {
        mockedSubmitContract
            .mockReset()
            .mockResolvedValueOnce(sourceResult)
            .mockRejectedValueOnce(new Error('Target submission rejected'))

        await expect(
            runContractLinkedRateScenario(scenarioDependencies())
        ).rejects.toThrow('Target submission rejected')
        expect(mockedSubmitContract).toHaveBeenCalledTimes(2)
    })
})

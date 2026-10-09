import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GraphQLClient } from '../src/client/graphqlClient'
import type { UploadClient } from '../src/client/uploadClient'
import { Logger } from '../src/logger'
import { buildBaselineLitePlan } from '../src/planning/baselineLite'
import { runBaselineLiteScenario } from '../src/scenarios/baselineLite'
import { submitSyntheticContract } from '../src/scenarios/submitContract'

vi.mock('../src/planning/baselineLite', () => ({
    baselineLiteCounts: {
        contractOnly: 40,
        ownedRateSource: 10,
        linkedRateTarget: 20,
        unlockAddRate: 20,
        unlockResubmit: 10,
    },
    baselineLiteScenarioKey: 'baseline-lite-v1',
    buildBaselineLitePlan: vi.fn(),
}))

vi.mock('../src/scenarios/submitContract', () => ({
    submitSyntheticContract: vi.fn(),
}))

const mockedBuildPlan = vi.mocked(buildBaselineLitePlan)
const mockedSubmitContract = vi.mocked(submitSyntheticContract)
const uploadedDocument = {
    name: 'contract.pdf',
    s3URL: 's3://synthetic-bucket/contract.pdf',
    s3Key: 'contract.pdf',
    bucket: 'synthetic-bucket',
    sha256: 'contract-sha',
}

function configureThreeContractPlan(): void {
    mockedBuildPlan.mockReturnValue([
        {
            type: 'owned-rate-source',
            index: 1,
            seed: 'source-seed',
            marker: 'source-marker',
        },
        {
            type: 'linked-rate-target',
            index: 1,
            sourceIndex: 1,
            seed: 'target-one-seed',
            marker: 'target-one-marker',
        },
        {
            type: 'linked-rate-target',
            index: 2,
            sourceIndex: 1,
            seed: 'target-two-seed',
            marker: 'target-two-marker',
        },
    ])
    mockedSubmitContract
        .mockResolvedValueOnce({
            contractId: 'source-contract',
            programId: 'program-1',
            contractDocument: uploadedDocument,
            rateIds: ['rate-1'],
        })
        .mockResolvedValueOnce({
            contractId: 'target-one',
            programId: 'program-1',
            contractDocument: uploadedDocument,
            rateIds: ['rate-1'],
        })
        .mockResolvedValueOnce({
            contractId: 'target-two',
            programId: 'program-1',
            contractDocument: uploadedDocument,
            rateIds: ['rate-1'],
        })
}

describe('runBaselineLiteScenario', () => {
    beforeEach(() => {
        mockedBuildPlan.mockReset()
        mockedSubmitContract.mockReset()
        configureThreeContractPlan()
    })

    it('checkpoints progress for each generated contract', async () => {
        const onProgress = vi.fn().mockResolvedValue(undefined)

        const manifest = await runBaselineLiteScenario({
            stateGraphql: {} as GraphQLClient,
            cmsGraphql: {} as GraphQLClient,
            uploads: {} as UploadClient,
            logger: new Logger({ sink: vi.fn() }),
            seed: 'test-seed',
            onProgress,
        })

        expect(manifest).toMatchObject({ contractCount: 3, rateCount: 1 })
        expect(manifest.contracts).toEqual([
            expect.objectContaining({
                contractId: 'source-contract',
                rateIds: ['rate-1'],
            }),
            expect.objectContaining({
                contractId: 'target-one',
                sourceContractId: 'source-contract',
                rateIds: ['rate-1'],
            }),
            expect.objectContaining({
                contractId: 'target-two',
                sourceContractId: 'source-contract',
                rateIds: ['rate-1'],
            }),
        ])
        expect(
            onProgress.mock.calls.map(([manifest]) => manifest.contractCount)
        ).toEqual([0, 1, 2, 3])
    })

    it('retains the last successful checkpoint when later generation fails', async () => {
        mockedSubmitContract.mockReset()
        mockedSubmitContract
            .mockResolvedValueOnce({
                contractId: 'source-contract',
                programId: 'program-1',
                contractDocument: uploadedDocument,
                rateIds: ['rate-1'],
            })
            .mockResolvedValueOnce({
                contractId: 'target-one',
                programId: 'program-1',
                contractDocument: uploadedDocument,
                rateIds: ['rate-1'],
            })
            .mockRejectedValueOnce(new Error('Synthetic API request failed'))
        const onProgress = vi.fn().mockResolvedValue(undefined)

        await expect(
            runBaselineLiteScenario({
                stateGraphql: {} as GraphQLClient,
                cmsGraphql: {} as GraphQLClient,
                uploads: {} as UploadClient,
                logger: new Logger({ sink: vi.fn() }),
                seed: 'test-seed',
                onProgress,
            })
        ).rejects.toThrow('Synthetic API request failed')
        expect(
            onProgress.mock.calls.map(([manifest]) => manifest.contractCount)
        ).toEqual([0, 1, 2])
    })
})

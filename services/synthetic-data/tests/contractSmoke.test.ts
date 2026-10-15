import { describe, expect, it, vi } from 'vitest'
import type { GraphQLClient } from '../src/client/graphqlClient'
import type { UploadClient } from '../src/client/uploadClient'
import {
    SyntheticCreateContractDocument,
    SyntheticSubmitContractDocument,
    SyntheticUpdateContractDraftRevisionDocument,
} from '../src/gen/gqlClient'
import { Logger } from '../src/logger'
import { runContractSmokeScenario } from '../src/scenarios/contractSmoke'

function scenarioDependencies() {
    // Only IDs and concurrency timestamps are needed from the API responses.
    const execute = vi
        .fn()
        .mockResolvedValueOnce({
            createContract: {
                contract: {
                    id: 'contract-1',
                    draftRevision: { updatedAt: '2026-09-03T12:00:00.000Z' },
                },
            },
        })
        .mockResolvedValueOnce({
            updateContractDraftRevision: {
                contract: {
                    id: 'contract-1',
                    draftRevision: { updatedAt: '2026-09-03T12:01:00.000Z' },
                },
            },
        })
        .mockResolvedValueOnce({
            submitContract: { contract: { id: 'contract-1' } },
        })
    const upload = vi.fn().mockResolvedValue({
        name: 'synthetic-contract-smoke-test-seed.pdf',
        s3URL: 's3://synthetic-bucket/contract.pdf',
        s3Key: 'contract.pdf',
        bucket: 'synthetic-bucket',
        sha256: 'abc123',
    })

    return {
        graphql: { execute } as unknown as GraphQLClient,
        uploads: { upload } as unknown as UploadClient,
        logger: new Logger({ sink: vi.fn() }),
        seed: 'test-seed',
        execute,
        upload,
    }
}

describe('runContractSmokeScenario', () => {
    it('uploads and submits one marked Minnesota contract without fetch-back verification', async () => {
        const marker =
            '[SYNTHETIC:contract-submit-smoke-v1:contract-only:test-seed]'
        const dependencies = scenarioDependencies()

        const result = await runContractSmokeScenario(dependencies)

        expect(result).toEqual({
            scenarioKey: 'contract-submit-smoke-v1',
            seed: 'test-seed',
            marker,
            contractId: 'contract-1',
            status: 'SUBMITTED',
        })
        expect(
            dependencies.execute.mock.calls.map(([document]) => document)
        ).toEqual([
            SyntheticCreateContractDocument,
            SyntheticUpdateContractDraftRevisionDocument,
            SyntheticSubmitContractDocument,
        ])
        expect(dependencies.upload).toHaveBeenCalledExactlyOnceWith(
            expect.objectContaining({
                name: 'synthetic-contract-smoke-test-seed.pdf',
                fileType: 'PDF',
                bucketName: 'HEALTH_PLAN_DOCS',
            })
        )
        expect(dependencies.execute.mock.calls[1][1]).toEqual({
            input: expect.objectContaining({
                contractID: 'contract-1',
                lastSeenUpdatedAt: '2026-09-03T12:00:00.000Z',
                formData: expect.objectContaining({
                    submissionDescription: marker,
                    contractDocuments: [
                        {
                            name: 'synthetic-contract-smoke-test-seed.pdf',
                            s3URL: 's3://synthetic-bucket/contract.pdf',
                            sha256: 'abc123',
                        },
                    ],
                }),
            }),
        })
        expect(dependencies.execute.mock.calls[0][1]).toEqual({
            input: expect.objectContaining({
                programIDs: ['3fd36500-bf2c-47bc-80e8-e7aa417184c5'],
            }),
        })
        expect(dependencies.execute.mock.calls[2][1]).toEqual({
            input: { contractID: 'contract-1' },
        })
    })

    it.each([
        { id: '', draftRevision: { updatedAt: '2026-09-03T12:00:00.000Z' } },
        { id: 'contract-1', draftRevision: null },
    ])(
        'stops before uploading when the create response lacks required identifiers: %j',
        async (contract) => {
            const dependencies = scenarioDependencies()
            dependencies.execute.mockReset().mockResolvedValueOnce({
                createContract: { contract },
            })

            await expect(
                runContractSmokeScenario(dependencies)
            ).rejects.toThrow(
                'Synthetic create response did not contain a contract ID and draft timestamp'
            )
            expect(dependencies.upload).not.toHaveBeenCalled()
            expect(dependencies.execute).toHaveBeenCalledTimes(1)
        }
    )

    it('propagates an upload failure without updating or submitting', async () => {
        const dependencies = scenarioDependencies()
        dependencies.upload.mockRejectedValueOnce(new Error('Upload failed'))

        await expect(runContractSmokeScenario(dependencies)).rejects.toThrow(
            'Upload failed'
        )
        expect(dependencies.execute).toHaveBeenCalledTimes(1)
    })

    it('propagates a submission rejection without reporting completion', async () => {
        const dependencies = scenarioDependencies()
        const error = new Error('Submission rejected')
        dependencies.execute
            .mockReset()
            .mockResolvedValueOnce({
                createContract: {
                    contract: {
                        id: 'contract-1',
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
            .mockRejectedValueOnce(error)
        const sink = vi.fn()
        dependencies.logger = new Logger({ sink })

        await expect(runContractSmokeScenario(dependencies)).rejects.toThrow(
            error
        )
        expect(dependencies.execute).toHaveBeenCalledTimes(3)
        expect(
            sink.mock.calls.some(([line]) =>
                line.includes('synthetic.contract-smoke.completed')
            )
        ).toBe(false)
    })
})

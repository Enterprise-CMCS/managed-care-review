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
    SyntheticSubmitContractDocument,
    SyntheticUnlockContractDocument,
    SyntheticUpdateContractDraftRevisionDocument,
} from '../src/gen/gqlClient'
import { Logger } from '../src/logger'
import { runContractUnlockResubmitScenario } from '../src/scenarios/contractUnlockResubmit'

const initialDocument = {
    name: 'initial.pdf',
    s3URL: 's3://bucket/initial.pdf',
    s3Key: 'initial.pdf',
    bucket: 'bucket',
    sha256: 'initial-sha',
}
const supportingDocument = {
    name: 'revised.docx',
    s3URL: 's3://bucket/revised.docx',
    s3Key: 'revised.docx',
    bucket: 'bucket',
    sha256: 'revised-sha',
}

function scenarioDependencies() {
    const stateExecute = vi
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
        .mockResolvedValueOnce({
            updateContractDraftRevision: {
                contract: { id: 'contract-1', draftRevision: {} },
            },
        })
        .mockResolvedValueOnce({
            submitContract: { contract: { id: 'contract-1' } },
        })
    const cmsExecute = vi.fn().mockResolvedValue({
        unlockContract: {
            contract: {
                id: 'contract-1',
                draftRevision: { updatedAt: '2026-09-03T12:03:00.000Z' },
            },
        },
    })
    const upload = vi
        .fn()
        .mockResolvedValueOnce(initialDocument)
        .mockResolvedValueOnce(supportingDocument)

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

describe('runContractUnlockResubmitScenario', () => {
    it('submits, unlocks, uploads revised inputs, and resubmits without fetching domain history', async () => {
        const dependencies = scenarioDependencies()
        const result = await runContractUnlockResubmitScenario(dependencies)

        expect(result).toEqual({
            scenarioKey: 'contract-unlock-resubmit-v1',
            seed: 'test-seed',
            initialMarker: contractUnlockResubmitMarker('test-seed', 'initial'),
            resubmittedMarker: contractUnlockResubmitMarker(
                'test-seed',
                'resubmitted'
            ),
            contractId: 'contract-1',
            status: 'RESUBMITTED',
            submissionCount: 2,
        })
        expect(dependencies.cmsExecute).toHaveBeenCalledExactlyOnceWith(
            SyntheticUnlockContractDocument,
            {
                input: {
                    contractID: 'contract-1',
                    unlockedReason: contractUnlockReason,
                },
            }
        )
        expect(
            dependencies.stateExecute.mock.invocationCallOrder[2]
        ).toBeLessThan(dependencies.cmsExecute.mock.invocationCallOrder[0])
        expect(
            dependencies.cmsExecute.mock.invocationCallOrder[0]
        ).toBeLessThan(dependencies.upload.mock.invocationCallOrder[1])
        expect(dependencies.upload.mock.invocationCallOrder[1]).toBeLessThan(
            dependencies.stateExecute.mock.invocationCallOrder[3]
        )
        expect(dependencies.stateExecute).toHaveBeenNthCalledWith(
            4,
            SyntheticUpdateContractDraftRevisionDocument,
            {
                input: {
                    contractID: 'contract-1',
                    lastSeenUpdatedAt: '2026-09-03T12:03:00.000Z',
                    formData: expect.objectContaining({
                        submissionDescription: result.resubmittedMarker,
                        modifiedBenefitsProvided: false,
                        modifiedGeoAreaServed: false,
                        contractDocuments: [
                            {
                                name: initialDocument.name,
                                s3URL: initialDocument.s3URL,
                                sha256: initialDocument.sha256,
                            },
                        ],
                        supportingDocuments: [
                            {
                                name: supportingDocument.name,
                                s3URL: supportingDocument.s3URL,
                                sha256: supportingDocument.sha256,
                            },
                        ],
                    }),
                },
            }
        )
        expect(dependencies.stateExecute).toHaveBeenNthCalledWith(
            5,
            SyntheticSubmitContractDocument,
            {
                input: {
                    contractID: 'contract-1',
                    submittedReason: contractResubmitReason,
                },
            }
        )
        expect(dependencies.upload).toHaveBeenCalledTimes(2)
        expect(dependencies.upload).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                name: 'synthetic-contract-unlock-resubmit-test-seed-revised.docx',
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
            SyntheticUpdateContractDraftRevisionDocument,
            SyntheticSubmitContractDocument,
        ])
    })

    it('stops before revising when unlock does not return the required timestamp', async () => {
        const dependencies = scenarioDependencies()
        dependencies.cmsExecute.mockResolvedValueOnce({
            unlockContract: {
                contract: { id: 'contract-1', draftRevision: null },
            },
        })

        await expect(
            runContractUnlockResubmitScenario(dependencies)
        ).rejects.toThrow(
            'Synthetic unlock response did not contain the expected draft'
        )
        expect(dependencies.stateExecute).toHaveBeenCalledTimes(3)
        expect(dependencies.upload).toHaveBeenCalledTimes(1)
    })

    it('propagates a CMS unlock rejection without uploading revised documents', async () => {
        const dependencies = scenarioDependencies()
        dependencies.cmsExecute.mockRejectedValueOnce(
            new Error('Unlock rejected')
        )

        await expect(
            runContractUnlockResubmitScenario(dependencies)
        ).rejects.toThrow('Unlock rejected')
        expect(dependencies.stateExecute).toHaveBeenCalledTimes(3)
        expect(dependencies.upload).toHaveBeenCalledTimes(1)
    })

    it('propagates an update rejection without resubmitting', async () => {
        const dependencies = scenarioDependencies()
        // Preserve the initial creation/update/submission responses, reject only the revised update.
        const initialResponses = dependencies.stateExecute
        let calls = 0
        const execute = vi.fn().mockImplementation((...args) => {
            calls += 1
            if (calls === 4) {
                return Promise.reject(new Error('Revised update rejected'))
            }
            return initialResponses(...args)
        })
        dependencies.stateGraphql = { execute } as unknown as GraphQLClient

        await expect(
            runContractUnlockResubmitScenario(dependencies)
        ).rejects.toThrow('Revised update rejected')
        expect(execute).toHaveBeenCalledTimes(4)
    })
})

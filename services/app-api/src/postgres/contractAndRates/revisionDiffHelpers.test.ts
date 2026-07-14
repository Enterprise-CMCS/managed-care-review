import { findStatePrograms } from '../../postgres'
import { must } from '../../testHelpers/assertionHelpers'
import { mockSubmittableHealthPlanContract } from '../../testHelpers/contractDataMocks'
import {
    InvalidRevisionDiffInputError,
    resolveRevisionPair,
} from './findRevisionDiffByContractID'
import { buildRevisionDiff } from './revisionDiffHelpers'

const mockStateUser = () => ({
    id: 'state-user-id',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    givenName: 'Aang',
    familyName: 'Avatar',
    email: 'aang@example.com',
    role: 'STATE_USER' as const,
    stateCode: 'KY',
})

describe('revisionDiffHelpers', () => {
    it('builds data-only field changes for a submitted revision comparison', () => {
        const statePrograms = must(findStatePrograms('KY'))
        expect(statePrograms.length).toBeGreaterThan(1)

        const baseContract = mockSubmittableHealthPlanContract({
            programIDs: [statePrograms[0].id],
        })
        const baseFormData = baseContract.draftRevision!.formData

        const comparison = buildRevisionDiff(
            'contract-1',
            {
                submitInfo: {
                    updatedAt: new Date('2024-05-01T00:00:00.000Z'),
                    updatedBy: mockStateUser(),
                    updatedReason: 'Initial submission',
                },
                submittedRevisions: [],
                contractRevision: {
                    ...baseContract.draftRevision!,
                    id: 'older-revision',
                    submitInfo: {
                        updatedAt: new Date('2024-05-01T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Initial submission',
                    },
                    formData: {
                        ...baseFormData,
                        populationCovered: 'MEDICAID',
                        riskBasedContract: false,
                        contractType: 'BASE',
                        submissionDescription: 'Original description',
                        programIDs: [statePrograms[0].id],
                    },
                },
                rateRevisions: [],
            },
            {
                submitInfo: {
                    updatedAt: new Date('2024-05-11T00:00:00.000Z'),
                    updatedBy: mockStateUser(),
                    updatedReason: 'Resubmission with changes',
                },
                submittedRevisions: [],
                contractRevision: {
                    ...baseContract.draftRevision!,
                    id: 'newer-revision',
                    submitInfo: {
                        updatedAt: new Date('2024-05-11T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Resubmission with changes',
                    },
                    formData: {
                        ...baseFormData,
                        populationCovered: 'MEDICAID_AND_CHIP',
                        riskBasedContract: true,
                        contractType: 'AMENDMENT',
                        submissionDescription: 'Resubmitted description',
                        programIDs: [statePrograms[0].id, statePrograms[1].id],
                    },
                },
                rateRevisions: [],
            },
            statePrograms
        )

        expect(comparison).toEqual({
            contractID: 'contract-1',
            olderRevisionID: 'older-revision',
            newerRevisionID: 'newer-revision',
            olderSubmittedAt: new Date('2024-05-01T00:00:00.000Z'),
            newerSubmittedAt: new Date('2024-05-11T00:00:00.000Z'),
            fieldChanges: [
                {
                    fieldPath: 'populationCovered',
                    oldValue: 'Medicaid',
                    newValue: 'Medicaid and CHIP',
                },
                {
                    fieldPath: 'contractType',
                    oldValue: 'Base contract',
                    newValue: 'Contract amendment',
                },
                {
                    fieldPath: 'riskBasedContract',
                    oldValue: 'No',
                    newValue: 'Yes',
                },
                {
                    fieldPath: 'programIDs',
                    oldValue:
                        statePrograms[0].fullName ?? statePrograms[0].name,
                    newValue: `${statePrograms[0].fullName ?? statePrograms[0].name}, ${statePrograms[1].fullName ?? statePrograms[1].name}`,
                },
                {
                    fieldPath: 'submissionDescription',
                    oldValue: 'Original description',
                    newValue: 'Resubmitted description',
                },
            ],
        })
    })

    it('selects the latest two submitted revisions by default', () => {
        const contract = mockSubmittableHealthPlanContract()

        const selected = resolveRevisionPair(
            [
                {
                    submitInfo: {
                        updatedAt: new Date('2024-05-11T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Newest',
                    },
                    submittedRevisions: [],
                    contractRevision: {
                        ...contract.draftRevision!,
                        id: 'newest-revision',
                        submitInfo: {
                            updatedAt: new Date('2024-05-11T00:00:00.000Z'),
                            updatedBy: mockStateUser(),
                            updatedReason: 'Newest',
                        },
                    },
                    rateRevisions: [],
                },
                {
                    submitInfo: {
                        updatedAt: new Date('2024-05-01T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Older',
                    },
                    submittedRevisions: [],
                    contractRevision: {
                        ...contract.draftRevision!,
                        id: 'older-revision',
                        submitInfo: {
                            updatedAt: new Date('2024-05-01T00:00:00.000Z'),
                            updatedBy: mockStateUser(),
                            updatedReason: 'Older',
                        },
                    },
                    rateRevisions: [],
                },
            ],
            {
                contractID: 'contract-1',
            }
        )

        expect(selected).toEqual({
            olderSubmission: expect.objectContaining({
                contractRevision: expect.objectContaining({
                    id: 'older-revision',
                }),
            }),
            newerSubmission: expect.objectContaining({
                contractRevision: expect.objectContaining({
                    id: 'newest-revision',
                }),
            }),
        })
    })

    it('returns an input error when only one revision id is provided', () => {
        const contract = mockSubmittableHealthPlanContract()

        const selected = resolveRevisionPair(
            [
                {
                    submitInfo: {
                        updatedAt: new Date('2024-05-11T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Newest',
                    },
                    submittedRevisions: [],
                    contractRevision: {
                        ...contract.draftRevision!,
                        id: 'newest-revision',
                        submitInfo: {
                            updatedAt: new Date('2024-05-11T00:00:00.000Z'),
                            updatedBy: mockStateUser(),
                            updatedReason: 'Newest',
                        },
                    },
                    rateRevisions: [],
                },
                {
                    submitInfo: {
                        updatedAt: new Date('2024-05-01T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Older',
                    },
                    submittedRevisions: [],
                    contractRevision: {
                        ...contract.draftRevision!,
                        id: 'older-revision',
                        submitInfo: {
                            updatedAt: new Date('2024-05-01T00:00:00.000Z'),
                            updatedBy: mockStateUser(),
                            updatedReason: 'Older',
                        },
                    },
                    rateRevisions: [],
                },
            ],
            {
                contractID: 'contract-1',
                olderContractRevisionID: 'older-revision',
            }
        )

        expect(selected).toBeInstanceOf(InvalidRevisionDiffInputError)
    })
})

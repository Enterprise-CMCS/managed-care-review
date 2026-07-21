import { findStatePrograms } from '../../postgres'
import { expectToBeDefined, must } from '../../testHelpers/assertionHelpers'
import { mockSubmittableHealthPlanContract } from '../../testHelpers/contractDataMocks'
import { packageName } from '@mc-review/submissions'
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
                        dsnpContract: undefined,
                        riskBasedContract: false,
                        contractType: 'BASE',
                        contractExecutionStatus: 'UNEXECUTED',
                        contractDateStart: new Date('2027-01-01T00:00:00.000Z'),
                        contractDateEnd: new Date('2028-01-01T00:00:00.000Z'),
                        managedCareEntities: ['MCO'],
                        federalAuthorities: ['TITLE_XXI'],
                        inLieuServicesAndSettings: false,
                        modifiedBenefitsProvided: false,
                        modifiedGeoAreaServed: false,
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
                        dsnpContract: true,
                        riskBasedContract: true,
                        contractType: 'AMENDMENT',
                        contractExecutionStatus: 'EXECUTED',
                        contractDateStart: new Date('2027-05-15T00:00:00.000Z'),
                        contractDateEnd: new Date('2028-05-15T00:00:00.000Z'),
                        managedCareEntities: ['MCO', 'PIHP', 'PAHP', 'PCCM'],
                        federalAuthorities: [
                            'STATE_PLAN',
                            'WAIVER_1115',
                            'TITLE_XXI',
                        ],
                        inLieuServicesAndSettings: true,
                        modifiedBenefitsProvided: true,
                        modifiedGeoAreaServed: true,
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
                    fieldPath: 'submissionID',
                    oldValue: packageName(
                        'KY',
                        baseContract.stateNumber,
                        [statePrograms[0].id],
                        statePrograms
                    ),
                    newValue: packageName(
                        'KY',
                        baseContract.stateNumber,
                        [statePrograms[0].id, statePrograms[1].id],
                        statePrograms
                    ),
                },
                {
                    fieldPath: 'programIDs',
                    oldValue: statePrograms[0].name,
                    newValue: [statePrograms[0], statePrograms[1]]
                        .sort((left, right) => left.id.localeCompare(right.id))
                        .map((program) => program.name)
                        .join(', '),
                },
                {
                    fieldPath: 'submissionDescription',
                    oldValue: 'Original description',
                    newValue: 'Resubmitted description',
                },
                {
                    fieldPath: 'contractType',
                    oldValue: 'BASE',
                    newValue: 'AMENDMENT',
                },
                {
                    fieldPath: 'populationCovered',
                    oldValue: 'MEDICAID',
                    newValue: 'MEDICAID_AND_CHIP',
                },
                {
                    fieldPath: 'riskBasedContract',
                    oldValue: 'false',
                    newValue: 'true',
                },
                {
                    fieldPath: 'dsnpContract',
                    oldValue: null,
                    newValue: 'true',
                },
                {
                    fieldPath: 'contractExecutionStatus',
                    oldValue: 'UNEXECUTED',
                    newValue: 'EXECUTED',
                },
                {
                    fieldPath: 'contractDateStart',
                    oldValue: '2027-01-01T00:00:00.000Z',
                    newValue: '2027-05-15T00:00:00.000Z',
                },
                {
                    fieldPath: 'contractDateEnd',
                    oldValue: '2028-01-01T00:00:00.000Z',
                    newValue: '2028-05-15T00:00:00.000Z',
                },
                {
                    fieldPath: 'managedCareEntities',
                    oldValue: 'MCO',
                    newValue: 'MCO, PIHP, PAHP, PCCM',
                },
                {
                    fieldPath: 'federalAuthorities',
                    oldValue: 'TITLE_XXI',
                    newValue: 'STATE_PLAN, WAIVER_1115, TITLE_XXI',
                },
                {
                    fieldPath: 'inLieuServicesAndSettings',
                    oldValue: 'false',
                    newValue: 'true',
                },
                {
                    fieldPath: 'modifiedBenefitsProvided',
                    oldValue: 'false',
                    newValue: 'true',
                },
                {
                    fieldPath: 'modifiedGeoAreaServed',
                    oldValue: 'false',
                    newValue: 'true',
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

    it('selects the latest two unique submitted revisions by default when package submissions contain duplicates', () => {
        const contract = mockSubmittableHealthPlanContract()

        const selected = resolveRevisionPair(
            [
                {
                    submitInfo: {
                        updatedAt: new Date('2024-05-15T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Newest duplicate package event',
                    },
                    submittedRevisions: [],
                    contractRevision: {
                        ...contract.draftRevision!,
                        id: 'newest-revision',
                        submitInfo: {
                            updatedAt: new Date('2024-05-11T00:00:00.000Z'),
                            updatedBy: mockStateUser(),
                            updatedReason: 'Newest revision',
                        },
                    },
                    rateRevisions: [],
                },
                {
                    submitInfo: {
                        updatedAt: new Date('2024-05-11T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Newest package event',
                    },
                    submittedRevisions: [],
                    contractRevision: {
                        ...contract.draftRevision!,
                        id: 'newest-revision',
                        submitInfo: {
                            updatedAt: new Date('2024-05-11T00:00:00.000Z'),
                            updatedBy: mockStateUser(),
                            updatedReason: 'Newest revision',
                        },
                    },
                    rateRevisions: [],
                },
                {
                    submitInfo: {
                        updatedAt: new Date('2024-05-01T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Older package event',
                    },
                    submittedRevisions: [],
                    contractRevision: {
                        ...contract.draftRevision!,
                        id: 'older-revision',
                        submitInfo: {
                            updatedAt: new Date('2024-05-01T00:00:00.000Z'),
                            updatedBy: mockStateUser(),
                            updatedReason: 'Older revision',
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
                submitInfo: expect.objectContaining({
                    updatedAt: new Date('2024-05-15T00:00:00.000Z'),
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

    it('selects requested unique revisions when matching package submissions contain duplicates', () => {
        const contract = mockSubmittableHealthPlanContract()

        const selected = resolveRevisionPair(
            [
                {
                    submitInfo: {
                        updatedAt: new Date('2024-05-15T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Newest duplicate package event',
                    },
                    submittedRevisions: [],
                    contractRevision: {
                        ...contract.draftRevision!,
                        id: 'newest-revision',
                        submitInfo: {
                            updatedAt: new Date('2024-05-11T00:00:00.000Z'),
                            updatedBy: mockStateUser(),
                            updatedReason: 'Newest revision',
                        },
                    },
                    rateRevisions: [],
                },
                {
                    submitInfo: {
                        updatedAt: new Date('2024-05-11T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Newest package event',
                    },
                    submittedRevisions: [],
                    contractRevision: {
                        ...contract.draftRevision!,
                        id: 'newest-revision',
                        submitInfo: {
                            updatedAt: new Date('2024-05-11T00:00:00.000Z'),
                            updatedBy: mockStateUser(),
                            updatedReason: 'Newest revision',
                        },
                    },
                    rateRevisions: [],
                },
                {
                    submitInfo: {
                        updatedAt: new Date('2024-05-05T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Older duplicate package event',
                    },
                    submittedRevisions: [],
                    contractRevision: {
                        ...contract.draftRevision!,
                        id: 'older-revision',
                        submitInfo: {
                            updatedAt: new Date('2024-05-01T00:00:00.000Z'),
                            updatedBy: mockStateUser(),
                            updatedReason: 'Older revision',
                        },
                    },
                    rateRevisions: [],
                },
                {
                    submitInfo: {
                        updatedAt: new Date('2024-05-01T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Older package event',
                    },
                    submittedRevisions: [],
                    contractRevision: {
                        ...contract.draftRevision!,
                        id: 'older-revision',
                        submitInfo: {
                            updatedAt: new Date('2024-05-01T00:00:00.000Z'),
                            updatedBy: mockStateUser(),
                            updatedReason: 'Older revision',
                        },
                    },
                    rateRevisions: [],
                },
            ],
            {
                contractID: 'contract-1',
                olderContractRevisionID: 'older-revision',
                newerContractRevisionID: 'newest-revision',
            }
        )

        expect(selected).toEqual({
            olderSubmission: expect.objectContaining({
                contractRevision: expect.objectContaining({
                    id: 'older-revision',
                }),
                submitInfo: expect.objectContaining({
                    updatedAt: new Date('2024-05-05T00:00:00.000Z'),
                }),
            }),
            newerSubmission: expect.objectContaining({
                contractRevision: expect.objectContaining({
                    id: 'newest-revision',
                }),
                submitInfo: expect.objectContaining({
                    updatedAt: new Date('2024-05-15T00:00:00.000Z'),
                }),
            }),
        })
    })

    it('does not report a programIDs change when the same program abbreviations are reordered', () => {
        const statePrograms = must(findStatePrograms('MN'))
        const snbcProgram = statePrograms.find(
            (program) => program.name === 'SNBC'
        )
        const pmapProgram = statePrograms.find(
            (program) => program.name === 'PMAP'
        )
        expectToBeDefined(snbcProgram)
        expectToBeDefined(pmapProgram)

        const baseContract = mockSubmittableHealthPlanContract({
            programIDs: [snbcProgram.id, pmapProgram.id],
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
                        programIDs: [snbcProgram.id, pmapProgram.id],
                    },
                },
                rateRevisions: [],
            },
            {
                submitInfo: {
                    updatedAt: new Date('2024-05-11T00:00:00.000Z'),
                    updatedBy: mockStateUser(),
                    updatedReason: 'Resubmission',
                },
                submittedRevisions: [],
                contractRevision: {
                    ...baseContract.draftRevision!,
                    id: 'newer-revision',
                    submitInfo: {
                        updatedAt: new Date('2024-05-11T00:00:00.000Z'),
                        updatedBy: mockStateUser(),
                        updatedReason: 'Resubmission',
                    },
                    formData: {
                        ...baseFormData,
                        programIDs: [pmapProgram.id, snbcProgram.id],
                    },
                },
                rateRevisions: [],
            },
            statePrograms
        )

        expect(comparison).not.toBeInstanceOf(Error)
        expect(
            comparison instanceof Error
                ? []
                : comparison.fieldChanges.filter(
                      (change) => change.fieldPath === 'programIDs'
                  )
        ).toEqual([])
    })
})

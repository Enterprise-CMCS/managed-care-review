import { findStatePrograms } from '../../postgres'
import { must } from '../../testHelpers/assertionHelpers'
import { mockSubmittableHealthPlanContract } from '../../testHelpers/contractDataMocks'
import { buildSubmissionDiff } from '../../postgres/contractAndRates/submissionDiffHelpers'
import { fetchSubmissionDiffResolver } from './fetchSubmissionDiff'
import type { Store } from '../../postgres'
import type { CMSUserType, StateUserType } from '../../domain-models'

const mockStateUser = (): StateUserType => ({
    id: 'state-user-id',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    givenName: 'Aang',
    familyName: 'Avatar',
    email: 'aang@example.com',
    role: 'STATE_USER',
    stateCode: 'KY',
})

const mockCMSUser = (): CMSUserType => ({
    id: 'cms-user-id',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    givenName: 'Azula',
    familyName: 'Hotman',
    email: 'azula@example.com',
    role: 'CMS_USER',
    divisionAssignment: 'DMCO',
    stateAssignments: [],
})

describe('fetchSubmissionDiff', () => {
    it('builds display-ready field changes for a submitted revision comparison', () => {
        const statePrograms = must(findStatePrograms('KY'))
        expect(statePrograms.length).toBeGreaterThan(1)

        const baseContract = mockSubmittableHealthPlanContract({
            programIDs: [statePrograms[0].id],
        })
        const baseFormData = baseContract.draftRevision!.formData

        const comparison = buildSubmissionDiff(
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

        expect(comparison).not.toBeInstanceOf(Error)

        const sections = comparison instanceof Error ? [] : comparison.sections
        const changes = sections.flatMap((section) => section.changes)

        expect(changes).toEqual([
            {
                fieldPath: 'populationCovered',
                label: 'Medicaid populations',
                oldValue: 'Medicaid',
                newValue: 'Medicaid and CHIP',
            },
            {
                fieldPath: 'contractType',
                label: 'Contract action type',
                oldValue: 'Base contract',
                newValue: 'Contract amendment',
            },
            {
                fieldPath: 'riskBasedContract',
                label: 'Risk-based contract',
                oldValue: 'No',
                newValue: 'Yes',
            },
            {
                fieldPath: 'programIDs',
                label: 'Programs',
                oldValue: statePrograms[0].fullName ?? statePrograms[0].name,
                newValue: `${statePrograms[0].fullName ?? statePrograms[0].name}, ${statePrograms[1].fullName ?? statePrograms[1].name}`,
            },
            {
                fieldPath: 'submissionDescription',
                label: 'Submission description',
                oldValue: 'Original description',
                newValue: 'Resubmitted description',
            },
        ])
    })

    it('returns the store-backed diff through the GraphQL resolver', async () => {
        const comparison = {
            contractID: 'contract-1',
            olderRevisionID: 'older-revision',
            newerRevisionID: 'newer-revision',
            olderSubmittedAt: new Date('2024-05-01T00:00:00.000Z'),
            newerSubmittedAt: new Date('2024-05-11T00:00:00.000Z'),
            sections: [
                {
                    title: 'Submission Type',
                    changes: [
                        {
                            fieldPath: 'submissionDescription',
                            label: 'Submission description',
                            oldValue: 'Original description',
                            newValue: 'Resubmitted description',
                        },
                    ],
                },
            ],
        }

        const store = {
            findContractWithHistory: async () =>
                ({
                    id: 'contract-1',
                    stateCode: 'KY',
                }) as never,
            findSubmissionDiffByContractID: async () => comparison,
        } as unknown as Store

        const resolver = fetchSubmissionDiffResolver(store) as (
            ...args: any[]
        ) => Promise<unknown>
        const result = await resolver(
            {},
            {
                input: {
                    contractID: 'contract-1',
                },
            },
            {
                user: mockCMSUser(),
            }
        )

        expect(result).toEqual({
            contractID: 'contract-1',
            comparison,
        })
    })
})

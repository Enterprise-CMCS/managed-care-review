import type { CMSUserType, StateUserType } from '../../domain-models'
import { findStatePrograms, type Store } from '../../postgres'
import { buildRevisionDiff } from '../../postgres/revisionDiff/revisionDiffHelpers'
import { must } from '../../testHelpers/assertionHelpers'
import { mockSubmittableHealthPlanContract } from '../../testHelpers/contractDataMocks'
import { fetchRevisionDiffResolver } from './fetchRevisionDiff'

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

describe('fetchRevisionDiff', () => {
    it('returns the store-backed diff through the GraphQL resolver', async () => {
        const statePrograms = must(findStatePrograms('KY'))
        const baseContract = mockSubmittableHealthPlanContract({
            programIDs: [statePrograms[0].id],
        })
        const comparison = must(
            buildRevisionDiff(
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
                            ...baseContract.draftRevision!.formData,
                            submissionDescription: 'Updated description',
                        },
                    },
                    rateRevisions: [],
                },
                statePrograms
            )
        )

        const store = {
            findContractWithHistory: async () =>
                ({
                    id: 'contract-1',
                    stateCode: 'KY',
                }) as never,
            findRevisionDiffByContractID: async () => comparison,
        } as unknown as Store

        const resolver = fetchRevisionDiffResolver(store) as (
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

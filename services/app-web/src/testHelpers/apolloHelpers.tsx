import dayjs from 'dayjs'

import {
    DraftSubmission,
    Submission,
    FetchCurrentUserDocument,
    User as UserType,
    CreateDraftSubmissionDocument,
    FetchDraftSubmissionDocument,
    UpdateDraftSubmissionDocument,
    SubmitDraftSubmissionDocument,
    IndexSubmissionsDocument,
    DraftSubmissionUpdates,
    StateSubmission,
} from '../gen/gqlClient'
import { MockedResponse } from '@apollo/client/testing'
import { GraphQLError } from 'graphql'

/* For use with Apollo MockedProvider in jest tests */
const mockValidUser: UserType = {
    __typename: 'StateUser' as const,
    state: {
        name: 'Minnesota',
        code: 'MN',
        programs: [
            { id: 'msho', name: 'MSHO' },
            { id: 'pmap', name: 'PMAP' },
            { id: 'snbc', name: 'SNBC' },
        ],
    },
    role: 'State User',
    name: 'Bob it user',
    email: 'bob@dmas.mn.gov',
}

export function mockDraft(): DraftSubmission {
    return {
        __typename: 'DraftSubmission',
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-123',
        stateCode: 'MN',
        programIDs: ['snbc'],
        program: {
            id: 'snbc',
            name: 'SNBC',
        },
        name: 'MN-MSHO-0001',
        submissionType: 'CONTRACT_ONLY',
        submissionDescription: 'A real submission',
        documents: [],
        contractType: 'BASE',
        contractDocuments: [],
        contractDateStart: new Date(),
        contractDateEnd: dayjs().add(2, 'days').toDate(),
        contractAmendmentInfo: null,
        managedCareEntities: [],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateType: null,
        rateDocuments: [],
        rateDateStart: null,
        rateDateEnd: null,
        rateDateCertified: null,
        rateAmendmentInfo: null,
        stateContacts: [],
        actuaryContacts: [],
        actuaryCommunicationPreference: null,
    }
}

export function mockContactAndRatesDraft(): DraftSubmission {
    return {
        __typename: 'DraftSubmission',
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-123',
        stateCode: 'MN',
        programIDs: ['snbc'],
        program: {
            id: 'snbc',
            name: 'SNBC',
        },
        name: 'MN-MSHO-0001',
        submissionType: 'CONTRACT_AND_RATES',
        submissionDescription: 'A real submission',
        documents: [],
        contractType: 'BASE',
        contractDocuments: [],
        contractDateStart: new Date(),
        contractDateEnd: dayjs().add(2, 'days').toDate(),
        contractAmendmentInfo: null,
        managedCareEntities: [],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateType: null,
        rateDocuments: [],
        rateDateStart: null,
        rateDateEnd: null,
        rateDateCertified: null,
        rateAmendmentInfo: null,
        stateContacts: [],
        actuaryContacts: [],
        actuaryCommunicationPreference: null,
    }
}

export function mockCompleteDraft(): DraftSubmission {
    return {
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-123',
        stateCode: 'MN',
        programIDs: ['snbc'],
        program: {
            id: 'snbc',
            name: 'SNBC',
        },
        name: 'MN-MSHO-0001',
        submissionType: 'CONTRACT_ONLY',
        submissionDescription: 'A real submission',
        documents: [],
        contractType: 'BASE',
        contractDocuments: [],
        contractDateStart: new Date(),
        contractDateEnd: new Date(),
        contractAmendmentInfo: null,
        managedCareEntities: [],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateType: 'NEW',
        rateDocuments: [],
        rateDateStart: new Date(),
        rateDateEnd: new Date(),
        rateDateCertified: new Date(),
        rateAmendmentInfo: null,
        stateContacts: [
            {
                name: 'Test Person',
                titleRole: 'A Role',
                email: 'test@test.com',
            },
        ],
        actuaryContacts: [],
        actuaryCommunicationPreference: null,
    }
}

export function mockContractAndRatesDraft(): DraftSubmission {
    return {
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-123',
        stateCode: 'MN',
        programIDs: ['pmap'],
        program: {
            id: 'pmap',
            name: 'PMAP',
        },
        name: 'MN-PMAP-0001',
        submissionType: 'CONTRACT_AND_RATES',
        submissionDescription: 'A real submission',
        documents: [],
        contractType: 'AMENDMENT',
        contractDocuments: [],
        contractDateStart: new Date(),
        contractDateEnd: new Date(),
        contractAmendmentInfo: {
            itemsBeingAmended: [
                'BENEFITS_PROVIDED',
                'LENGTH_OF_CONTRACT_PERIOD',
                'CAPITATION_RATES',
            ],
            otherItemBeingAmended: 'Test amendment',
            capitationRatesAmendedInfo: {
                reason: 'OTHER',
                otherReason: 'Test reason',
            },
            relatedToCovid19: true,
        },
        managedCareEntities: ['MCO'],
        federalAuthorities: ['STATE_PLAN'],
        rateType: 'AMENDMENT',
        rateDocuments: [],
        rateDateStart: new Date(),
        rateDateEnd: new Date(),
        rateDateCertified: new Date(),
        rateAmendmentInfo: {
            effectiveDateStart: new Date(),
            effectiveDateEnd: new Date(),
        },
        stateContacts: [
            {
                name: 'State Contact 1',
                titleRole: 'Test State Contact 1',
                email: 'statecontact1@test.com',
            },
            {
                name: 'State Contact 2',
                titleRole: 'Test State Contact 2',
                email: 'statecontact2@test.com',
            },
        ],
        actuaryContacts: [
            {
                actuarialFirm: 'DELOITTE',
                name: 'Actuary Contact 1',
                titleRole: 'Test Actuary Contact 1',
                email: 'actuarycontact1@test.com',
            },
        ],
        actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
    }
}

function mockNewDraft(): DraftSubmission {
    return {
        __typename: 'DraftSubmission',
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-124',
        stateCode: 'MN',
        programIDs: ['snbc'],
        program: {
            id: 'snbc',
            name: 'SNBC',
        },
        name: 'MN-MSHO-0002',
        submissionType: 'CONTRACT_ONLY',
        submissionDescription: 'A real submission',
        documents: [],
        contractType: null,
        contractDocuments: [],
        contractDateStart: null,
        contractDateEnd: null,
        contractAmendmentInfo: null,
        managedCareEntities: [],
        federalAuthorities: [],
        rateType: null,
        rateDocuments: [],
        rateDateStart: null,
        rateDateEnd: null,
        rateDateCertified: null,
        stateContacts: [],
        actuaryContacts: [],
        actuaryCommunicationPreference: null,
    }
}

export function mockStateSubmission(): StateSubmission {
    return {
        __typename: 'StateSubmission',
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-125',
        stateCode: 'MN',
        programIDs: ['snbc'],
        program: {
            id: 'snbc',
            name: 'SNBC',
        },
        name: 'MN-MSHO-0003',
        submissionType: 'CONTRACT_AND_RATES',
        submissionDescription: 'A submitted submission',
        submittedAt: new Date(),
        documents: [{ s3URL: 'bar', name: 'foo' }],
        contractType: 'BASE',
        contractDocuments: [{ s3URL: 'bar', name: 'foo' }],
        contractDateStart: new Date(),
        contractDateEnd: new Date(),
        contractAmendmentInfo: null,
        managedCareEntities: ['ENROLLMENT_PROCESS'],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateType: 'NEW',
        rateDocuments: [{ s3URL: 'bar', name: 'foo' }],
        rateDateStart: new Date(),
        rateDateEnd: new Date(),
        rateDateCertified: new Date(),
        rateAmendmentInfo: null,
        stateContacts: [
            {
                name: 'Test Person',
                titleRole: 'A Role',
                email: 'test@test.com',
            },
        ],
        actuaryContacts: [],
        actuaryCommunicationPreference: null,
    }
}

type fetchCurrentUserMockProps = {
    user?: UserType | Partial<UserType>
    statusCode: 200 | 403 | 500
}
const fetchCurrentUserMock = ({
    user = mockValidUser,
    statusCode,
}: // eslint-disable-next-line @typescript-eslint/no-explicit-any
fetchCurrentUserMockProps): MockedResponse<Record<string, any>> => {
    switch (statusCode) {
        case 200:
            return {
                request: { query: FetchCurrentUserDocument },
                result: {
                    data: {
                        fetchCurrentUser: user,
                    },
                },
            }
        case 403:
            return {
                request: { query: FetchCurrentUserDocument },
                error: new Error('You are not logged in'),
            }
        default:
            return {
                request: { query: FetchCurrentUserDocument },
                error: new Error('A network error occurred'),
            }
    }
}

type createDraftSubmissionMockProps = {
    input: {
        programIDs: string[]
        submissionType: string
        submissionDescription: string
    }
    draftSubmission?: DraftSubmission | Partial<DraftSubmission>
    statusCode: 200 | 403 | 500
}

const createDraftSubmissionMock = ({
    input,
    draftSubmission = mockNewDraft(),
    statusCode, // eslint-disable-next-line @typescript-eslint/no-explicit-any
}: createDraftSubmissionMockProps): MockedResponse<Record<string, any>> => {
    const mergedDraftSubmission = Object.assign({}, draftSubmission, input)
    switch (statusCode) {
        case 200:
            return {
                request: {
                    query: CreateDraftSubmissionDocument,
                    variables: { input },
                },
                result: {
                    data: {
                        createDraftSubmission: {
                            draftSubmission: mergedDraftSubmission,
                        },
                    },
                },
            }
        case 403:
            return {
                request: { query: CreateDraftSubmissionDocument },
                error: new Error('You are not logged in'),
            }
        default:
            return {
                request: { query: CreateDraftSubmissionDocument },
                error: new Error('A network error occurred'),
            }
    }
}

type fetchDraftSubmissionMockProps = {
    draftSubmission?: DraftSubmission | Partial<DraftSubmission>
    id: string
    statusCode: 200 | 403 | 500
}

const fetchDraftSubmissionMock = ({
    draftSubmission = mockDraft(),
    id,
    statusCode, // eslint-disable-next-line @typescript-eslint/no-explicit-any
}: fetchDraftSubmissionMockProps): MockedResponse<Record<string, any>> => {
    // override the ID of the returned draft to match the queried id.
    const mergedDraftSubmission = Object.assign({}, draftSubmission, { id })
    switch (statusCode) {
        case 200:
            return {
                request: {
                    query: FetchDraftSubmissionDocument,
                    variables: { input: { submissionID: id } },
                },
                result: {
                    data: {
                        fetchDraftSubmission: {
                            draftSubmission: mergedDraftSubmission,
                        },
                    },
                },
            }
        case 403:
            return {
                request: { query: FetchDraftSubmissionDocument },
                error: new Error('You are not logged in'),
            }
        default:
            return {
                request: { query: FetchDraftSubmissionDocument },
                error: new Error('A network error occurred'),
            }
    }
}

type updateDraftSubmissionMockProps = {
    draftSubmission?: DraftSubmission | Partial<DraftSubmission>
    id: string
    updates: DraftSubmissionUpdates | Partial<DraftSubmissionUpdates>
    statusCode: 200 | 403 | 500
}

const updateDraftSubmissionMock = ({
    id,
    updates,
    statusCode, // eslint-disable-next-line @typescript-eslint/no-explicit-any
}: updateDraftSubmissionMockProps): MockedResponse<Record<string, any>> => {
    const mergedDraftSubmission = Object.assign(
        {},
        mockDraft(),
        updates,
        { id } // make sure the id matches what we queried
    )
    switch (statusCode) {
        case 200:
            return {
                request: {
                    query: UpdateDraftSubmissionDocument,
                    variables: {
                        input: {
                            submissionID: id,
                            draftSubmissionUpdates: updates,
                        },
                    },
                },
                // error: new Error('You are not logged in'),
                result: {
                    data: {
                        updateDraftSubmission: {
                            draftSubmission: mergedDraftSubmission,
                        },
                    },
                },
            }
        case 403:
            return {
                request: { query: UpdateDraftSubmissionDocument },
                error: new Error('You are not logged in'),
            }
        default:
            return {
                request: { query: UpdateDraftSubmissionDocument },
                error: new Error('A network error occurred'),
            }
    }
}

type submitDraftSubmissionMockSuccessProps = {
    stateSubmission?: StateSubmission | Partial<StateSubmission>
    id: string
}

const submitDraftSubmissionMockSuccess = ({
    id,
    stateSubmission,
}: submitDraftSubmissionMockSuccessProps): MockedResponse<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Record<string, any>
> => {
    const submission = stateSubmission ?? mockDraft()
    return {
        request: {
            query: SubmitDraftSubmissionDocument,
            variables: { input: { submissionID: id } },
        },
        result: { data: { submitDraftSubmission: { submission: submission } } },
    }
}

const submitDraftSubmissionMockError = ({
    id,
}: {
    id: string // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): MockedResponse<Record<string, any>> => {
    return {
        request: {
            query: SubmitDraftSubmissionDocument,
            variables: { input: { submissionID: id } },
        },
        result: {
            errors: [
                new GraphQLError('Incomplete submission cannot be submitted'),
            ],
        },
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const indexSubmissionsMockSuccess = (
    submissions: Submission[] = [mockDraft(), mockStateSubmission()]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): MockedResponse<Record<string, any>> => {
    const submissionEdges = submissions.map((sub) => {
        return {
            node: sub,
        }
    })
    return {
        request: {
            query: IndexSubmissionsDocument,
        },
        result: {
            data: {
                indexSubmissions: {
                    totalCount: submissionEdges.length,
                    edges: submissionEdges,
                },
            },
        },
    }
}

export {
    fetchCurrentUserMock,
    createDraftSubmissionMock,
    fetchDraftSubmissionMock,
    updateDraftSubmissionMock,
    submitDraftSubmissionMockSuccess,
    submitDraftSubmissionMockError,
    indexSubmissionsMockSuccess,
}

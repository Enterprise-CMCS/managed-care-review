import {
    DraftSubmission,
    FetchCurrentUserDocument,
    User as UserType,
    CreateDraftSubmissionDocument,
    FetchDraftSubmissionDocument,
    UpdateDraftSubmissionDocument,
    SubmitDraftSubmissionDocument,
    DraftSubmissionUpdates,
    StateSubmission,
} from '../gen/gqlClient'
import { MockedResponse } from '@apollo/client/testing'
import { GraphQLError } from 'graphql'

/* For use with Apollo MockedProvider in jest tests */
const mockValidUser: UserType = {
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

const mockDraftSubmission: DraftSubmission = {
    createdAt: new Date(),
    updatedAt: new Date(),
    id: 'test-abc-123',
    stateCode: 'MN',
    programID: 'snbc',
    program: {
        id: 'snbc',
        name: 'SNBC',
    },
    name: 'MN-MSHO-0001',
    submissionType: 'CONTRACT_ONLY',
    submissionDescription: 'A real submission',
    documents: [],
    contractType: 'BASE',
    contractDateStart: new Date(),
    contractDateEnd: new Date(),
    contractAmendmentInfo: null,
    managedCareEntities: [],
    federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
    rateType: null,
    rateDateStart: null,
    rateDateEnd: null,
    rateDateCertified: null,
    rateAmendmentInfo: null,
}
const mockCompleteDraftSubmission: DraftSubmission = {
    createdAt: new Date(),
    updatedAt: new Date(),
    id: 'test-abc-123',
    stateCode: 'MN',
    programID: 'snbc',
    program: {
        id: 'snbc',
        name: 'SNBC',
    },
    name: 'MN-MSHO-0001',
    submissionType: 'CONTRACT_ONLY',
    submissionDescription: 'A real submission',
    documents: [],
    contractType: 'BASE',
    contractDateStart: new Date(),
    contractDateEnd: new Date(),
    contractAmendmentInfo: null,
    managedCareEntities: [],
    federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
    rateType: 'NEW',
    rateDateStart: new Date(),
    rateDateEnd: new Date(),
    rateDateCertified: new Date(),
    rateAmendmentInfo: null,
}

// Only export a function that returns the mockDraftSubmission so that
// we don't ever accidentally modified the shared mock in tests.
export function mockDraft(): DraftSubmission {
    return mockDraftSubmission
}

export function mockCompleteDraft(): DraftSubmission {
    return mockCompleteDraftSubmission
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
    draftSubmission?: DraftSubmission | Partial<DraftSubmission>
    statusCode: 200 | 403 | 500
}

const createDraftSubmissionMock = ({
    draftSubmission = mockDraftSubmission,
    statusCode, // eslint-disable-next-line @typescript-eslint/no-explicit-any
}: createDraftSubmissionMockProps): MockedResponse<Record<string, any>> => {
    switch (statusCode) {
        case 200:
            return {
                request: { query: CreateDraftSubmissionDocument },
                result: {
                    data: {
                        createDraftSubmission: {
                            draftSubmission,
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
    draftSubmission = mockDraftSubmission,
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
        mockDraftSubmission,
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
    Record<string, any>
> => {
    const submission = stateSubmission ?? mockDraftSubmission
    return {
        request: {
            query: SubmitDraftSubmissionDocument,
            variables: {
                input: {
                    submissionID: id,
                },
            },
        },
        result: {
            data: {
                submitDraftSubmission: {
                    submission: submission,
                },
            },
        },
    }
}

const submitDraftSubmissionMockError = ({
    id,
}: {
    id: string
}): MockedResponse<Record<string, any>> => {
    return {
        request: {
            query: SubmitDraftSubmissionDocument,
            variables: {
                input: {
                    submissionID: id,
                },
            },
        },
        result: {
            errors: [
                new GraphQLError('Incomplete submission cannot be submitted'),
            ],
        },
    }
}

export {
    fetchCurrentUserMock,
    createDraftSubmissionMock,
    fetchDraftSubmissionMock,
    updateDraftSubmissionMock,
    mockDraftSubmission,
    submitDraftSubmissionMockSuccess,
    submitDraftSubmissionMockError,
}

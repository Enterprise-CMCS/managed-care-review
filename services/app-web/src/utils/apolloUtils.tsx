import {
    DraftSubmission,
    FetchCurrentUserDocument,
    SubmissionType,
    User as UserType,
    CreateDraftSubmissionDocument,
    FetchDraftSubmissionDocument,
    UpdateDraftSubmissionDocument,
    DraftSubmissionUpdates,
} from '../gen/gqlClient'
import { MockedResponse } from '@apollo/client/testing'

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

export const mockDraftSubmission: DraftSubmission = {
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
    submissionType: 'CONTRACT_ONLY' as SubmissionType.ContractOnly,
    submissionDescription: 'A real submission',
    documents: [],
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
                            draftSubmission,
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
    updates: DraftSubmissionUpdates
    statusCode: 200 | 403 | 500
}

const updateDraftSubmissionMock = ({
    id,
    updates,
    statusCode, // eslint-disable-next-line @typescript-eslint/no-explicit-any
}: updateDraftSubmissionMockProps): MockedResponse<Record<string, any>> => {
    switch (statusCode) {
        case 200:
            return {
                request: {
                    query: UpdateDraftSubmissionDocument,
                    variables: {
                        input: {
                            submissionID: id,
                            draftSubmissionUpdates: Object.assign(
                                {},
                                mockDraftSubmission,
                                updates
                            ),
                        },
                    },
                },
                // error: new Error('You are not logged in'),
                result: {
                    data: {
                        updateDraftSubmission: {
                            draftSubmission: updates,
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

export {
    fetchCurrentUserMock,
    createDraftSubmissionMock,
    fetchDraftSubmissionMock,
    updateDraftSubmissionMock,
}

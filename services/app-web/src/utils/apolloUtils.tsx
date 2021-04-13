import {
    DraftSubmission,
    GetCurrentUserDocument,
    SubmissionType,
    User as UserType,
    CreateDraftSubmissionDocument,
    ShowDraftSubmissionDocument,
    UpdateDraftSubmissionDocument,
    DraftSubmissionInput,
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
    submissionType: 'CONTRACT_ONLY' as SubmissionType.ContractOnly,
    submissionDescription: 'A real submission',
}

type getCurrentUserMockProps = {
    user?: UserType | Partial<UserType>
    statusCode: 200 | 403 | 500
}
const getCurrentUserMock = ({
    user = mockValidUser,
    statusCode,
}: // eslint-disable-next-line @typescript-eslint/no-explicit-any
getCurrentUserMockProps): MockedResponse<Record<string, any>> => {
    switch (statusCode) {
        case 200:
            return {
                request: { query: GetCurrentUserDocument },
                result: {
                    data: {
                        getCurrentUser: user,
                    },
                },
            }
        case 403:
            return {
                request: { query: GetCurrentUserDocument },
                error: new Error('You are not logged in'),
            }
        default:
            return {
                request: { query: GetCurrentUserDocument },
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

type showDraftSubmissionMockProps = {
    draftSubmission?: DraftSubmission | Partial<DraftSubmission>
    id: string
    statusCode: 200 | 403 | 500
}

const showDraftSubmissionMock = ({
    draftSubmission = mockDraftSubmission,
    id,
    statusCode, // eslint-disable-next-line @typescript-eslint/no-explicit-any
}: showDraftSubmissionMockProps): MockedResponse<Record<string, any>> => {
    switch (statusCode) {
        case 200:
            return {
                request: {
                    query: ShowDraftSubmissionDocument,
                    variables: { input: { submissionID: id } },
                },
                // error: new Error('You are not logged in'),
                result: {
                    data: {
                        showDraftSubmission: {
                            draftSubmission,
                        },
                    },
                },
            }
        case 403:
            return {
                request: { query: ShowDraftSubmissionDocument },
                error: new Error('You are not logged in'),
            }
        default:
            return {
                request: { query: ShowDraftSubmissionDocument },
                error: new Error('A network error occurred'),
            }
    }
}

type updateDraftSubmissionMockProps = {
    draftSubmission?: DraftSubmission | Partial<DraftSubmission>
    id: string
    updates: DraftSubmissionInput
    statusCode: 200 | 403 | 500
}

const updateDraftSubmissionMock = ({
    draftSubmission = mockDraftSubmission,
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
                        input: { submissionID: id, draftSubmission: updates },
                    },
                },
                // error: new Error('You are not logged in'),
                result: {
                    data: {
                        showDraftSubmission: {
                            draftSubmission,
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
    getCurrentUserMock,
    createDraftSubmissionMock,
    showDraftSubmissionMock,
    updateDraftSubmissionMock,
}

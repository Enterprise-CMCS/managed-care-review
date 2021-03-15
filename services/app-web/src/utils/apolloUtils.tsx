import { GetCurrentUserDocument, User as UserType } from '../gen/gqlClient'
import { MockedResponse } from '@apollo/client/testing'
import { GraphQLError } from 'graphql'

/* For use with Apollo MockedProvider in jest tests */
const mockValidUser: UserType = {
    state: {
        name: 'Minnesota',
        code: 'MN',
        programs: [{ name: 'MSHO' }, { name: 'PMAP' }, { name: 'SNBC' }],
    },
    role: 'State User',
    name: 'Bob it user',
    email: 'bob@dmas.mn.gov',
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
                result: {
                    // Need to double check types for both cognito and local login
                    // also double check that local login mocks 403 correctly
                    // https://www.apollographql.com/docs/react/development-testing/testing/#defining-mocked-responses
                    // ok: false,
                    // status: 403,
                    // statusText: 'Unauthenticated',
                    // data: {
                    //     error: 'you are not logged in',
                    // },
                    errors: [new GraphQLError('You are not logged in')],
                },
            }
        default:
            return {
                request: { query: GetCurrentUserDocument },
                error: new Error('A network error occurred'),
            }
    }
}

// TO BE DELETED
const mockGetCurrentUser200 = {
    request: { query: GetCurrentUserDocument },
    result: {
        data: {
            getCurrentUser: {
                state: {
                    name: 'Minnesota',
                    code: 'MN',
                    programs: [
                        { name: 'MSHO' },
                        { name: 'PMAP' },
                        { name: 'SNBC' },
                    ],
                },
                role: 'State User',
                name: 'Bob it user',
                email: 'bob@dmas.mn.gov',
            },
        },
    },
}

const mockGetCurrentUser403 = {
    request: { query: GetCurrentUserDocument },
    result: {
        ok: false,
        status: 403,
        statusText: 'Unauthenticated',
        data: {
            error: 'you are not logged in',
        },
        error: new Error('network error'),
    },
}

export { getCurrentUserMock, mockGetCurrentUser200, mockGetCurrentUser403 }

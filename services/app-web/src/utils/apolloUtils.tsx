import { GetCurrentUserDocument } from '../gen/gqlClient'

/* Apollo MockedProvider Mocks */
const mockGetCurrentUser200 = {
    request: { query: GetCurrentUserDocument },
    result: {
        data: {
            getCurrentUser: {
                state: {
                    name: 'Minnesota',
                    code: 'MN',
                    programs: [{ name: 'CCC Plus' }, { name: 'Medallion' }],
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

export { mockGetCurrentUser200, mockGetCurrentUser403 }

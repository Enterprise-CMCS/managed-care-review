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
    error: new Error('network error'),
}

export { mockGetCurrentUser200, mockGetCurrentUser403 }

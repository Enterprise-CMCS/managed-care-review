import { MockedResponse } from '@apollo/client/testing'
import { IndexUsersQuery, IndexUsersDocument } from '../../gen/gqlClient'

export const indexUsersQueryMock = (): MockedResponse<IndexUsersQuery> => {
    return {
        request: {
            query: IndexUsersDocument,
        },
        result: {
            data: {
                indexUsers: {
                    totalCount: 1,
                    edges: [
                        {
                            node: {
                                __typename: 'CMSUser',
                                role: 'CMS_USER',
                                id: '1',
                                familyName: 'Hotman',
                                givenName: 'Zuko',
                                divisionAssignment: null,
                                email: 'zuko@example.com',
                                stateAssignments: [],
                            },
                        },
                    ],
                },
            },
        },
    }
}

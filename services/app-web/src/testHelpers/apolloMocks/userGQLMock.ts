import { MockedResponse } from '@apollo/client/testing'
import { ServerError } from '@apollo/client'
import {
    CmsUser,
    FetchCurrentUserDocument,
    User as UserType,
    AdminUser,
    IndexUsersDocument,
    IndexUsersQuery,
    StateUser,
    HelpdeskUser, CmsApproverUser, BusinessOwnerUser
} from '../../gen/gqlClient'

import { mockMNState } from './stateMock'
function mockValidUser(userData?: Partial<StateUser>): StateUser {
    return Object.assign({}, {
        __typename: 'StateUser' as const,
        id: 'foo-id',
        state: mockMNState(),
        role: 'STATE_USER',
        givenName: 'bob',
        familyName: 'ddmas',
        email: 'bob@dmas.mn.gov',
    }, userData)
}

const mockValidStateUser = (userData?: Partial<StateUser>): StateUser => {
    return mockValidUser(userData)
}

function mockValidCMSUser(userData?: Partial<CmsUser>): CmsUser {
    return Object.assign({}, {
        __typename: 'CMSUser' as const,
        id: 'bar-id',
        role: 'CMS_USER',
        givenName: 'bob',
        familyName: 'ddmas',
        email: 'bob@dmas.mn.gov',
        divisionAssignment: 'DMCO',
        stateAssignments: [],
    }, userData)
}

function mockValidCMSApproverUser(userData?: Partial<CmsApproverUser>): CmsApproverUser {
    return Object.assign({}, {
        __typename: 'CMSApproverUser' as const,
        id: 'bar-id',
        role: 'CMS_APPROVER_USER',
        givenName: 'bob',
        familyName: 'ddmas',
        email: 'bob@dmas.mn.gov',
        divisionAssignment: 'DMCO',
        stateAssignments: [],
        ...userData,
    }, userData)
}

function mockValidAdminUser(userData?: Partial<AdminUser>): AdminUser {
    return Object.assign({}, {
        __typename: 'AdminUser' as const,
        id: 'bar-id',
        role: 'ADMIN_USER',
        givenName: 'bobadmin',
        familyName: 'ddmas',
        email: 'bobadmin@dmas.mn.gov',
    }, userData)
}

function mockValidHelpDeskUser(userData?: Partial<HelpdeskUser>): HelpdeskUser {
    return Object.assign({}, {
        __typename: 'HelpdeskUser' as const,
        id: 'bar-id',
        role: 'HELPDESK_USER',
        givenName: 'bob',
        familyName: 'ddmas',
        email: 'bob@dmas.mn.gov',
        ...userData,
    }, userData)
}

function mockValidBusinessOwnerUser(userData?: Partial<HelpdeskUser>): HelpdeskUser {
    return {
        __typename: 'HelpdeskUser' as const,
        id: 'bar-id',
        role: 'BUSINESSOWNER_USER',
        givenName: 'bob',
        familyName: 'ddmas',
        email: 'bob@dmas.mn.gov',
        ...userData,
    }
}

type fetchCurrentUserMockProps = {
    user?: UserType | Partial<UserType>
    statusCode: 200 | 403 | 500
}
const fetchCurrentUserMock = ({
    user = mockValidUser(), // defaults to logged in state user, we can override though from test
    statusCode,
}: // eslint-disable-next-line @typescript-eslint/no-explicit-any
fetchCurrentUserMockProps): MockedResponse<Record<string, any>> => {
    const mockError = (message: string, statusCode?: number) => {
        const error = new Error(message) as ServerError
        error.statusCode = statusCode || 400
        error.name = 'ServerError'
        return error
    }
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
                error: mockError('You are not logged in', 403),
            }
        default:
            return {
                request: { query: FetchCurrentUserDocument },
                error: mockError('A network error occurred', 500),
            }
    }
}

const indexUsersQueryMock = (): MockedResponse<IndexUsersQuery> => {
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

const iterableCmsUsersMockData: {
    userRole: 'CMS_USER' | 'CMS_APPROVER_USER',
    mockUser: <T>(userData?: Partial<T>) => CmsUser | CmsApproverUser
}[] = [
    {
        userRole: 'CMS_USER',
        mockUser: mockValidCMSUser
    },
    {
        userRole: 'CMS_APPROVER_USER',
        mockUser: mockValidCMSApproverUser
    }
]

const iterableAdminUsersMockData: {
    userRole: 'HELPDESK_USER' | 'BUSINESSOWNER_USER' | 'ADMIN_USER'
    mockUser: <T>(userData?: Partial<T>) => AdminUser | BusinessOwnerUser | HelpdeskUser
}[] = [
    {
        userRole: 'ADMIN_USER',
        mockUser: mockValidAdminUser,
    },
    {
        userRole: 'BUSINESSOWNER_USER',
        mockUser: mockValidBusinessOwnerUser,
    },
    {
        userRole: 'HELPDESK_USER',
        mockUser: mockValidHelpDeskUser
    }
]

export {
    fetchCurrentUserMock,
    mockValidStateUser,
    mockValidCMSUser,
    mockValidUser,
    mockValidAdminUser,
    indexUsersQueryMock,
    mockValidHelpDeskUser,
    mockValidCMSApproverUser,
    iterableCmsUsersMockData,
    mockValidBusinessOwnerUser,
    iterableAdminUsersMockData
}

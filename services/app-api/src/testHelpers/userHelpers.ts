import { NewPostgresStore, type InsertUserArgsType } from '../postgres'
import type {
    AdminUserType,
    CMSApproverUserType,
    CMSUserType,
    StateUserType,
    UserType,
    BusinessOwnerUserType,
    HelpdeskUserType,
} from '../domain-models'
import { sharedTestPrismaClient } from './storeHelpers'
import {
    testAdminUser,
    testStateUser,
    testCMSUser,
    testCMSApproverUser,
    testBusinessOwnerUser,
    testHelpdeskUser,
    testReadOnlyUser,
} from './userFactories'

const createDBUsersWithFullData = async (
    users: UserType[]
): Promise<UserType[]> => {
    const prismaClient = await sharedTestPrismaClient()
    const postgresStore = NewPostgresStore(prismaClient)

    const usersSeed: InsertUserArgsType[] = users.map((user: UserType) => {
        const userArgs: InsertUserArgsType & { id?: string } = {
            ...user,
            userID: user.id,
        }

        delete userArgs.id

        return userArgs as InsertUserArgsType
    })

    const result = await postgresStore.insertManyUsers(usersSeed)

    if (result instanceof Error) {
        throw result
    }

    return result
}

const iterableCmsUsersMockData: {
    userRole: 'CMS_USER' | 'CMS_APPROVER_USER'
    mockUser: <T>(userData?: Partial<T>) => CMSUserType | CMSApproverUserType
}[] = [
    {
        userRole: 'CMS_USER',
        mockUser: testCMSUser,
    },
    {
        userRole: 'CMS_APPROVER_USER',
        mockUser: testCMSApproverUser,
    },
]

const iterableNonCMSUsersMockData: {
    userRole:
        'HELPDESK_USER' | 'BUSINESSOWNER_USER' | 'ADMIN_USER' | 'STATE_USER'
    mockUser: <T>(
        userData?: Partial<T>
    ) =>
        AdminUserType | BusinessOwnerUserType | HelpdeskUserType | StateUserType
}[] = [
    {
        userRole: 'ADMIN_USER',
        mockUser: testAdminUser,
    },
    {
        userRole: 'BUSINESSOWNER_USER',
        mockUser: testBusinessOwnerUser,
    },
    {
        userRole: 'HELPDESK_USER',
        mockUser: testHelpdeskUser,
    },
    {
        userRole: 'STATE_USER',
        mockUser: testStateUser,
    },
]

export {
    testAdminUser,
    testStateUser,
    testCMSUser,
    createDBUsersWithFullData,
    iterableCmsUsersMockData,
    iterableNonCMSUsersMockData,
    testCMSApproverUser,
    testBusinessOwnerUser,
    testHelpdeskUser,
    testReadOnlyUser,
}

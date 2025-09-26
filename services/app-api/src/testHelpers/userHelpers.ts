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
import { v4 as uuidv4 } from 'uuid'

const testCMSUser = (userData?: Partial<CMSUserType>): CMSUserType => ({
    id: uuidv4(),
    role: 'CMS_USER',
    email: 'zuko@example.com',
    familyName: 'Zuko',
    givenName: 'Prince',
    divisionAssignment: 'DMCO' as const,
    stateAssignments: [],
    ...userData,
})

const testCMSApproverUser = (
    userData?: Partial<CMSApproverUserType>
): CMSApproverUserType => ({
    id: uuidv4(),
    role: 'CMS_APPROVER_USER',
    email: 'azula@example.com',
    familyName: 'Azula',
    givenName: 'Princess',
    divisionAssignment: 'DMCO' as const,
    stateAssignments: [],
    ...userData,
})

const testStateUser = (userData?: Partial<StateUserType>): StateUserType => ({
    id: uuidv4(),
    stateCode: 'FL',
    role: 'STATE_USER',
    email: 'james@example.com',
    familyName: 'Brown',
    givenName: 'James',
    ...userData,
})

const testAdminUser = (userData?: Partial<AdminUserType>): AdminUserType => ({
    id: uuidv4(),
    role: 'ADMIN_USER',
    email: 'iroh@example.com',
    familyName: 'Iroh',
    givenName: 'Uncle',
    ...userData,
})

const testBusinessOwnerUser = (
    userData?: Partial<BusinessOwnerUserType>
): BusinessOwnerUserType => ({
    id: uuidv4(),
    role: 'BUSINESSOWNER_USER',
    email: 'iroh@example.com',
    familyName: 'Iroh',
    givenName: 'Uncle',
    ...userData,
})

const testHelpdeskUser = (
    userData?: Partial<HelpdeskUserType>
): HelpdeskUserType => ({
    id: uuidv4(),
    role: 'HELPDESK_USER',
    email: 'iroh@example.com',
    familyName: 'Iroh',
    givenName: 'Uncle',
    ...userData,
})

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
        | 'HELPDESK_USER'
        | 'BUSINESSOWNER_USER'
        | 'ADMIN_USER'
        | 'STATE_USER'
    mockUser: <T>(
        userData?: Partial<T>
    ) =>
        | AdminUserType
        | BusinessOwnerUserType
        | HelpdeskUserType
        | StateUserType
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
}

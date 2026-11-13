import * as factories from './userFactories'
import * as helpers from './userHelpers'

const { sharedTestPrismaClient, NewPostgresStore, insertManyUsers } =
    vi.hoisted(() => ({
        sharedTestPrismaClient: vi.fn(),
        NewPostgresStore: vi.fn(),
        insertManyUsers: vi.fn(),
    }))
vi.mock('./storeHelpers', () => ({ sharedTestPrismaClient }))
vi.mock('../postgres', () => ({ NewPostgresStore }))

const factoryNames = [
    'testAdminUser',
    'testStateUser',
    'testCMSUser',
    'testCMSApproverUser',
    'testBusinessOwnerUser',
    'testHelpdeskUser',
    'testReadOnlyUser',
] as const

const prismaClient = {}
beforeEach(() => {
    vi.resetAllMocks()
    sharedTestPrismaClient.mockResolvedValue(prismaClient)
    NewPostgresStore.mockReturnValue({ insertManyUsers })
})

describe('userHelpers compatibility', () => {
    it.each(factoryNames)('re-exports the same %s implementation', (name) => {
        expect(helpers[name]).toBe(factories[name])
    })

    it('preserves the existing role groups and their factory references', () => {
        expect(helpers.iterableCmsUsersMockData).toEqual([
            { userRole: 'CMS_USER', mockUser: factories.testCMSUser },
            {
                userRole: 'CMS_APPROVER_USER',
                mockUser: factories.testCMSApproverUser,
            },
        ])
        expect(helpers.iterableNonCMSUsersMockData).toEqual([
            { userRole: 'ADMIN_USER', mockUser: factories.testAdminUser },
            {
                userRole: 'BUSINESSOWNER_USER',
                mockUser: factories.testBusinessOwnerUser,
            },
            { userRole: 'HELPDESK_USER', mockUser: factories.testHelpdeskUser },
            { userRole: 'STATE_USER', mockUser: factories.testStateUser },
        ])
    })

    it('keeps database seeding, ID mapping and returned users unchanged', async () => {
        const cmsUser = factories.testCMSUser({ id: 'cms-user' })
        const stateUser = factories.testStateUser({ id: 'state-user' })
        const users = [cmsUser, stateUser]
        const originalUsers = structuredClone(users)
        const storedUsers = [{ ...cmsUser, givenName: 'Stored' }, stateUser]
        insertManyUsers.mockResolvedValue(storedUsers)

        const result = await helpers.createDBUsersWithFullData(users)

        expect(sharedTestPrismaClient).toHaveBeenCalledTimes(1)
        expect(NewPostgresStore).toHaveBeenCalledWith(prismaClient)
        const { id: cmsID, ...cmsFields } = cmsUser
        const { id: stateID, ...stateFields } = stateUser
        expect(insertManyUsers).toHaveBeenCalledWith([
            { ...cmsFields, userID: cmsID },
            { ...stateFields, userID: stateID },
        ])
        expect(result).toBe(storedUsers)
        expect(users).toEqual(originalUsers)
    })

    it('propagates database initialization failures', async () => {
        const error = new Error('Test database initialization failed')
        sharedTestPrismaClient.mockRejectedValue(error)
        await expect(helpers.createDBUsersWithFullData([])).rejects.toBe(error)
        expect(NewPostgresStore).not.toHaveBeenCalled()
    })

    it('throws errors returned by the store', async () => {
        const error = new Error('Test user insertion failed')
        insertManyUsers.mockResolvedValue(error)
        await expect(helpers.createDBUsersWithFullData([])).rejects.toBe(error)
    })
})

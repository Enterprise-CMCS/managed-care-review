import {
    testAdminUser,
    testBusinessOwnerUser,
    testCMSApproverUser,
    testCMSUser,
    testHelpdeskUser,
    testStateUser,
} from '../../testHelpers/userHelpers'
import { v4 as uuidv4 } from 'uuid'
import type { InsertUserArgsType } from '../../postgres'
import { NewPostgresStore } from '../../postgres'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import UPDATE_STATE_ASSIGNMENTS_BY_STATE from '../../../../app-graphql/src/mutations/updateStateAssignmentsByState.graphql'
import INDEX_USERS from '../../../../app-graphql/src/queries/indexUsers.graphql'
import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import type { User, UserEdge } from '../../gen/gqlServer'
import {
    assertAnError,
    assertAnErrorCode,
    assertAnErrorExtensions,
} from '../../testHelpers'

const authorizedUserTests = [
    {
        userType: 'ADMIN user',
        mockUser: testAdminUser(),
    },
    {
        userType: 'DMCO CMS user',
        mockUser: testCMSUser({
            divisionAssignment: 'DMCO',
        }),
    },
    {
        userType: 'DMCO CMS approver user',
        mockUser: testCMSApproverUser({
            divisionAssignment: 'DMCO',
        }),
    },
    {
        userType: 'Business owner user',
        mockUser: testBusinessOwnerUser(),
    },
    {
        userType: 'Helpdesk user',
        mockUser: testHelpdeskUser(),
    },
    {
        userType: 'OACT CMS user',
        mockUser: testCMSUser({
            divisionAssignment: 'OACT',
        }),
    },
    {
        userType: 'DMCP CMS user',
        mockUser: testCMSUser({
            divisionAssignment: 'DMCP',
        }),
    },
    {
        userType: 'DMCP CMS approver user',
        mockUser: testCMSApproverUser({
            divisionAssignment: 'DMCP',
        }),
    },
    {
        userType: 'OACT CMS approver user',
        mockUser: testCMSApproverUser({
            divisionAssignment: 'OACT',
        }),
    },
]

const unauthorizedUserTests = [
    {
        userType: 'State user',
        mockUser: testStateUser(),
    },
]

describe.each(authorizedUserTests)(
    'updateStateAssignmentByState as $userType tests',
    ({ mockUser }) => {
        // setup a user in the db for us to modify
        const mockTestCMSUser = (): InsertUserArgsType => ({
            userID: uuidv4(),
            ...testCMSUser({
                id: uuidv4(),
                divisionAssignment: 'OACT',
            }),
        })

        const mockTestStateUser = (): InsertUserArgsType => ({
            userID: uuidv4(),
            ...testStateUser({
                id: uuidv4(),
            }),
        })

        it(`allows update state assignments`, async () => {
            const prismaClient = await sharedTestPrismaClient()
            const postgresStore = NewPostgresStore(prismaClient)

            const newUser = await postgresStore.insertUser(mockTestCMSUser())
            const secondUser = await postgresStore.insertUser(mockTestCMSUser())
            const thirdUser = await postgresStore.insertUser(mockTestCMSUser())

            if (
                newUser instanceof Error ||
                secondUser instanceof Error ||
                thirdUser instanceof Error
            ) {
                throw new Error('no user')
            }

            const server = await constructTestPostgresServer({
                store: postgresStore,
                context: {
                    user: mockUser,
                },
            })

            const updateRes = await server.executeOperation({
                query: UPDATE_STATE_ASSIGNMENTS_BY_STATE,
                variables: {
                    input: {
                        stateCode: 'CA',
                        assignedUsers: [newUser.id],
                    },
                },
            })

            expect(updateRes.data).toBeDefined()
            expect(updateRes.errors).toBeUndefined()

            if (!updateRes.data) {
                throw new Error('no data')
            }

            const users =
                updateRes.data.updateStateAssignmentsByState.assignedUsers
            expect(users).toHaveLength(1)
            const user = users[0]
            expect(user.id).toBe(newUser.id)
            expect(user.stateAssignments[0].code).toBe('CA')
            expect(user.divisionAssignment).toBe('OACT')

            // change the value and see if it updates
            const updateRes2 = await server.executeOperation({
                query: UPDATE_STATE_ASSIGNMENTS_BY_STATE,
                variables: {
                    input: {
                        stateCode: 'CA',
                        assignedUsers: [secondUser.id, thirdUser.id],
                    },
                },
            })

            expect(updateRes2.data).toBeDefined()
            expect(updateRes2.errors).toBeUndefined()

            if (!updateRes2.data) {
                throw new Error('no data')
            }

            const users2 =
                updateRes2.data.updateStateAssignmentsByState.assignedUsers
            expect(users2).toHaveLength(2)

            const updateRes3 = await server.executeOperation({
                query: UPDATE_STATE_ASSIGNMENTS_BY_STATE,
                variables: {
                    input: {
                        stateCode: 'NC',
                        assignedUsers: [secondUser.id],
                    },
                },
            })

            expect(updateRes3.data).toBeDefined()
            expect(updateRes3.errors).toBeUndefined()

            const allUsersQuery = await server.executeOperation({
                query: INDEX_USERS,
                variables: {},
            })

            expect(allUsersQuery.data).toBeDefined()
            expect(allUsersQuery.errors).toBeUndefined()

            if (!allUsersQuery.data) {
                throw new Error('no data')
            }

            const theseUserIDs = [newUser.id, secondUser.id, thirdUser.id]
            const theseUsers = allUsersQuery.data.indexUsers.edges
                .map((e: UserEdge) => e.node)
                .filter((n: User) => theseUserIDs.includes(n.id))

            const firstUserFound = theseUsers.find(
                (u: User) => u.id === newUser.id
            )
            const secondUserFound = theseUsers.find(
                (u: User) => u.id === secondUser.id
            )
            const thirdUserFound = theseUsers.find(
                (u: User) => u.id === thirdUser.id
            )

            expect(firstUserFound.stateAssignments).toHaveLength(0)
            expect(secondUserFound.stateAssignments).toHaveLength(2)
            expect(thirdUserFound.stateAssignments).toHaveLength(1)

            // finally, check the audit table.
            const allAudits = await prismaClient.userAudit.findMany({
                where: {
                    modifiedUserId: {
                        in: [newUser.id, secondUser.id, thirdUser.id],
                    },
                },
                orderBy: {
                    createdAt: 'asc',
                },
            })
            expect(allAudits).toHaveLength(5)

            // 1, add, remove
            const firstAudits = allAudits.filter(
                (a) => a.modifiedUserId === newUser.id
            )
            expect(firstAudits).toHaveLength(2)
            expect(firstAudits[0].priorValue).toBe('[]')
            if (!firstAudits[1].priorValue) {
                throw new Error('no Prior')
            }
            const priorJSON = firstAudits[1].priorValue
            let firstPriorVal = null
            if (typeof priorJSON === 'string') {
                firstPriorVal = JSON.parse(priorJSON)
            } else {
                throw new Error('got back a weird type from JSON')
            }
            expect(firstPriorVal).toHaveLength(1)
            expect(firstPriorVal[0].stateCode).toBe('CA')
            // 2, add, add
            const secondAudits = allAudits.filter(
                (a) => a.modifiedUserId === secondUser.id
            )
            expect(secondAudits).toHaveLength(2)
            expect(secondAudits[0].priorValue).toBe('[]')
            expect(secondAudits[1].priorValue).not.toBe('[]')
            // 3, add
            const thirdAudits = allAudits.filter(
                (a) => a.modifiedUserId === thirdUser.id
            )
            expect(thirdAudits).toHaveLength(1)
            expect(thirdAudits[0].priorValue).toBe('[]')
        })
        it('errors if state assignments are empty, undefined, or null', async () => {
            const prismaClient = await sharedTestPrismaClient()
            const postgresStore = NewPostgresStore(prismaClient)

            const newUser = await postgresStore.insertUser(mockTestCMSUser())

            if (newUser instanceof Error) {
                throw newUser
            }

            const server = await constructTestPostgresServer({
                store: postgresStore,
                context: {
                    user: mockUser,
                },
            })

            const updateResEmpty = await server.executeOperation({
                query: UPDATE_STATE_ASSIGNMENTS_BY_STATE,
                variables: {
                    input: {
                        stateCode: 'CA',
                        assignedUsers: [],
                    },
                },
            })

            expect(assertAnError(updateResEmpty).message).toContain(
                'cannot update state assignments with no assignments'
            )
            expect(assertAnErrorCode(updateResEmpty)).toBe('BAD_USER_INPUT')
            expect(
                assertAnErrorExtensions(updateResEmpty).argumentValues
            ).toEqual([])

            const updateResUndefined = await server.executeOperation({
                query: UPDATE_STATE_ASSIGNMENTS_BY_STATE,
                variables: {
                    input: {
                        stateCode: 'CA',
                        assignedUsers: undefined,
                    },
                },
            })

            expect(assertAnError(updateResUndefined).message).toContain(
                'Variable "$input" got invalid value'
            )
            expect(assertAnErrorCode(updateResUndefined)).toBe('BAD_USER_INPUT')

            const updateResNull = await server.executeOperation({
                query: UPDATE_STATE_ASSIGNMENTS_BY_STATE,
                variables: {
                    input: {
                        stateCode: 'CA',
                        assignedUsers: null,
                    },
                },
            })

            expect(assertAnError(updateResNull).message).toContain(
                'Variable "$input" got invalid value'
            )
            expect(assertAnErrorCode(updateResNull)).toBe('BAD_USER_INPUT')
        })
        it('returns an error with invalid state code', async () => {
            const prismaClient = await sharedTestPrismaClient()
            const postgresStore = NewPostgresStore(prismaClient)

            const newUser = await postgresStore.insertUser(mockTestCMSUser())

            if (newUser instanceof Error) {
                throw newUser
            }

            const server = await constructTestPostgresServer({
                store: postgresStore,
                context: {
                    user: mockUser,
                },
            })

            const updateRes = await server.executeOperation({
                query: UPDATE_STATE_ASSIGNMENTS_BY_STATE,
                variables: {
                    input: {
                        stateCode: 'XX',
                        assignedUsers: [newUser.id],
                    },
                },
            })

            expect(assertAnError(updateRes).message).toContain(
                'cannot update state assignments for invalid state'
            )
            expect(assertAnErrorCode(updateRes)).toBe('BAD_USER_INPUT')
            expect(assertAnErrorExtensions(updateRes).argumentValues).toBe('XX')
        })
        it('errors if the target is not a CMS user', async () => {
            const prismaClient = await sharedTestPrismaClient()
            const postgresStore = NewPostgresStore(prismaClient)
            const server = await constructTestPostgresServer({
                store: postgresStore,
                context: {
                    user: mockUser,
                },
            })

            const newStateUser =
                await postgresStore.insertUser(mockTestStateUser())

            if (newStateUser instanceof Error) {
                throw newStateUser
            }

            const updateRes = await server.executeOperation({
                query: UPDATE_STATE_ASSIGNMENTS_BY_STATE,
                variables: {
                    input: {
                        stateCode: 'CA',
                        assignedUsers: [newStateUser.id],
                    },
                },
            })

            expect(updateRes.errors).toBeDefined()

            expect(assertAnError(updateRes).message).toContain(
                'Attempted to assign non-cms-users to a state'
            )
            expect(assertAnErrorCode(updateRes)).toBe('BAD_USER_INPUT')
        })
        it('errors if the userID doesnt exist', async () => {
            const prismaClient = await sharedTestPrismaClient()
            const postgresStore = NewPostgresStore(prismaClient)
            const server = await constructTestPostgresServer({
                store: postgresStore,
                context: {
                    user: mockUser,
                },
            })

            const updateRes = await server.executeOperation({
                query: UPDATE_STATE_ASSIGNMENTS_BY_STATE,
                variables: {
                    input: {
                        stateCode: 'CA',
                        assignedUsers: ['not-existing-user-id'],
                    },
                },
            })

            expect(assertAnError(updateRes).message).toContain(
                'Some assigned user IDs do not exist or are duplicative'
            )
            expect(assertAnErrorCode(updateRes)).toBe('BAD_USER_INPUT')
        })

        it('errors if a userID is doubled', async () => {
            const prismaClient = await sharedTestPrismaClient()
            const postgresStore = NewPostgresStore(prismaClient)
            const server = await constructTestPostgresServer({
                store: postgresStore,
                context: {
                    user: mockUser,
                },
            })

            const newCMSUser = await postgresStore.insertUser(mockTestCMSUser())

            if (newCMSUser instanceof Error) {
                throw newCMSUser
            }

            const updateRes = await server.executeOperation({
                query: UPDATE_STATE_ASSIGNMENTS_BY_STATE,
                variables: {
                    input: {
                        stateCode: 'CA',
                        assignedUsers: [newCMSUser.id, newCMSUser.id],
                    },
                },
            })

            expect(updateRes.errors).toBeDefined()

            expect(assertAnError(updateRes).message).toContain(
                'Some assigned user IDs do not exist or are duplicative'
            )
            expect(assertAnErrorCode(updateRes)).toBe('BAD_USER_INPUT')
        })
    }
)

describe.each(unauthorizedUserTests)(
    'updateStateAssignment as $userType tests',
    ({ mockUser, userType }) => {
        it(`errors if called by a ${userType}`, async () => {
            const prismaClient = await sharedTestPrismaClient()
            const postgresStore = NewPostgresStore(prismaClient)
            const server = await constructTestPostgresServer({
                store: postgresStore,
                context: {
                    user: mockUser,
                },
            })

            const updateRes = await server.executeOperation({
                query: UPDATE_STATE_ASSIGNMENTS_BY_STATE,
                variables: {
                    input: {
                        stateCode: 'CA',
                        assignedUsers: ['not-existing-user-id'],
                    },
                },
            })

            expect(assertAnError(updateRes).message).toContain(
                'user not authorized to modify assignments'
            )
            expect(assertAnErrorCode(updateRes)).toBe('FORBIDDEN')
        })
    }
)

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
import UPDATE_STATE_ASSIGNMENTS from '../../../../app-graphql/src/mutations/updateStateAssignment.graphql'
import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import type { State } from '../../gen/gqlServer'
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
    'updateStateAssignment as $userType tests',
    ({ mockUser, userType }) => {
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
                query: UPDATE_STATE_ASSIGNMENTS,
                variables: {
                    input: {
                        cmsUserID: newUser.id,
                        stateAssignments: ['CA'],
                    },
                },
            })

            expect(updateRes.data).toBeDefined()
            expect(updateRes.errors).toBeUndefined()

            if (!updateRes.data) {
                throw new Error('no data')
            }

            const user = updateRes.data.updateStateAssignment.user
            expect(user.email).toBe(newUser.email)
            expect(user.stateAssignments).toHaveLength(1)
            expect(user.stateAssignments[0].code).toBe('CA')
            expect(user.divisionAssignment).toBe('OACT')

            // change the value and see if it updates
            const updateRes2 = await server.executeOperation({
                query: UPDATE_STATE_ASSIGNMENTS,
                variables: {
                    input: {
                        cmsUserID: newUser.id,
                        stateAssignments: ['VA', 'MA'],
                    },
                },
            })

            expect(updateRes2.data).toBeDefined()
            expect(updateRes2.errors).toBeUndefined()

            if (!updateRes2.data) {
                throw new Error('no data')
            }

            const user2 = updateRes2.data.updateStateAssignment.user
            expect(user2.email).toBe(newUser.email)
            expect(user2.stateAssignments).toHaveLength(2)
            expect(user2.stateAssignments.map((s: State) => s.code)).toEqual(
                expect.arrayContaining(['MA', 'VA'])
            )
            expect(user2.divisionAssignment).toBe('OACT')
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
                query: UPDATE_STATE_ASSIGNMENTS,
                variables: {
                    input: {
                        cmsUserID: newUser.id,
                        stateAssignments: [],
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
                query: UPDATE_STATE_ASSIGNMENTS,
                variables: {
                    input: {
                        cmsUserID: newUser.id,
                        stateAssignments: undefined,
                    },
                },
            })

            expect(assertAnError(updateResUndefined).message).toContain(
                'cannot update state assignments with no assignments'
            )
            expect(assertAnErrorCode(updateResUndefined)).toBe('BAD_USER_INPUT')
            expect(
                assertAnErrorExtensions(updateResUndefined).argumentValues
            ).toBeUndefined()

            const updateResNull = await server.executeOperation({
                query: UPDATE_STATE_ASSIGNMENTS,
                variables: {
                    input: {
                        cmsUserID: newUser.id,
                        stateAssignments: null,
                    },
                },
            })

            expect(assertAnError(updateResNull).message).toContain(
                'cannot update state assignments with no assignments'
            )
            expect(assertAnErrorCode(updateResNull)).toBe('BAD_USER_INPUT')
            expect(
                assertAnErrorExtensions(updateResNull).argumentValues
            ).toBeNull()
        })
        it('returns an error with invalid state codes', async () => {
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
                query: UPDATE_STATE_ASSIGNMENTS,
                variables: {
                    input: {
                        cmsUserID: newUser.id,
                        stateAssignments: ['CA', 'XX', 'BS'],
                    },
                },
            })

            expect(assertAnError(updateRes).message).toContain(
                'cannot update state assignments with invalid assignments'
            )
            expect(assertAnErrorCode(updateRes)).toBe('BAD_USER_INPUT')
            expect(assertAnErrorExtensions(updateRes).argumentValues).toEqual([
                'XX',
                'BS',
            ])
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
                query: UPDATE_STATE_ASSIGNMENTS,
                variables: {
                    input: {
                        cmsUserID: newStateUser.id,
                        stateAssignments: ['CA'],
                    },
                },
            })

            expect(assertAnError(updateRes).message).toContain(
                'cmsUserID does not exist'
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
                query: UPDATE_STATE_ASSIGNMENTS,
                variables: {
                    input: {
                        cmsUserID: 'not-an-existing-user',
                        stateAssignments: ['CA'],
                    },
                },
            })

            expect(assertAnError(updateRes).message).toContain(
                'cmsUserID does not exist'
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

            // setup a user in the db for us to modify
            const cmsUserID = uuidv4()

            const updateRes = await server.executeOperation({
                query: UPDATE_STATE_ASSIGNMENTS,
                variables: {
                    input: {
                        cmsUserID: cmsUserID,
                        stateAssignments: ['CA'],
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

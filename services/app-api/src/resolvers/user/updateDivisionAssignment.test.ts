import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import UPDATE_DIVISION_ASSIGNMENT from '../../../../app-graphql/src/mutations/updateDivisionAssignment.graphql'
import type { InsertUserArgsType } from '../../postgres'
import { NewPostgresStore } from '../../postgres'
import { v4 as uuidv4 } from 'uuid'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { assertAnError, assertAnErrorCode } from '../../testHelpers'
import type { Division } from '@prisma/client'
import { AuditAction } from '@prisma/client'
import {
    iterableCmsUsersMockData,
    testAdminUser,
} from '../../testHelpers/userHelpers'

describe('updateDivisionAssignment', () => {
    describe.each(iterableCmsUsersMockData)(
        'updateDivisionAssignment $userRole tests',
        ({ mockUser }) => {
            it('changes CMS users division assignment and creates an audit log', async () => {
                const firstDivisionAssignment: Division = 'DMCO'
                const secondDivisionAssignment: Division = 'DMCP'
                const adminUser = testAdminUser()

                const prismaClient = await sharedTestPrismaClient()
                const postgresStore = NewPostgresStore(prismaClient)
                const server = await constructTestPostgresServer({
                    store: postgresStore,
                    context: {
                        user: adminUser,
                    },
                })

                const cmsUserID = uuidv4()
                const userToInsert: InsertUserArgsType = {
                    userID: cmsUserID,
                    ...mockUser({ id: cmsUserID, divisionAssignment: null }),
                }

                const newUser = await postgresStore.insertUser(userToInsert)
                if (newUser instanceof Error) {
                    throw newUser
                }

                // make the first update to the division assignment
                const firstUpdateRes = await server.executeOperation({
                    query: UPDATE_DIVISION_ASSIGNMENT,
                    variables: {
                        input: {
                            cmsUserID: cmsUserID,
                            divisionAssignment: firstDivisionAssignment,
                        },
                    },
                })

                expect(firstUpdateRes.data).toBeDefined()
                expect(firstUpdateRes.errors).toBeUndefined()

                if (!firstUpdateRes.data) {
                    throw new Error('no data')
                }

                const firstUpdateToUser =
                    firstUpdateRes.data.updateDivisionAssignment.user
                expect(firstUpdateToUser.email).toBe(newUser.email)
                // division assignment should now be set
                expect(firstUpdateToUser.divisionAssignment).toBe(
                    firstDivisionAssignment
                )

                // make the second update to the division assignment
                const secondUpdateRes = await server.executeOperation({
                    query: UPDATE_DIVISION_ASSIGNMENT,
                    variables: {
                        input: {
                            cmsUserID: cmsUserID,
                            divisionAssignment: secondDivisionAssignment,
                        },
                    },
                })

                expect(secondUpdateRes.data).toBeDefined()
                expect(secondUpdateRes.errors).toBeUndefined()

                if (!secondUpdateRes.data) {
                    throw new Error('no data')
                }

                const secondUpdateToUser =
                    secondUpdateRes.data.updateDivisionAssignment.user
                expect(secondUpdateToUser.email).toBe(newUser.email)
                expect(secondUpdateToUser.divisionAssignment).toBe(
                    secondDivisionAssignment
                )

                const auditLogs = await prismaClient.userAudit.findMany({
                    where: { modifiedUserId: cmsUserID },
                })

                expect(auditLogs).toHaveLength(2)

                expect(auditLogs[0].action).toBe(
                    AuditAction.CHANGED_DIVISION_ASSIGNMENT
                )
                // we changed from null to a value, so priorValue should be null
                expect(auditLogs[0].priorValue).toBe(JSON.stringify(null))
                expect(auditLogs[0].updatedByUserId).toBe(adminUser.id)

                expect(auditLogs[1].action).toBe(
                    AuditAction.CHANGED_DIVISION_ASSIGNMENT
                )
                expect(auditLogs[1].priorValue).toBe(
                    JSON.stringify(firstDivisionAssignment)
                )
                expect(auditLogs[1].updatedByUserId).toBe(adminUser.id)
            })

            it('errors if called by a CMS user', async () => {
                const prismaClient = await sharedTestPrismaClient()
                const postgresStore = NewPostgresStore(prismaClient)
                const server = await constructTestPostgresServer({
                    store: postgresStore,
                    context: {
                        user: mockUser(),
                    },
                })

                // setup a user in the db for us to modify
                const cmsUserID = uuidv4()

                const updateRes = await server.executeOperation({
                    query: UPDATE_DIVISION_ASSIGNMENT,
                    variables: {
                        input: {
                            cmsUserID: cmsUserID,
                            divisionAssignment: 'OACT',
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

    it('errors if the target is not a CMS user', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const server = await constructTestPostgresServer({
            store: postgresStore,
            context: {
                user: testAdminUser(),
            },
        })

        // setup a user in the db for us to modify
        const cmsUserID = uuidv4()
        const userToInsert: InsertUserArgsType = {
            userID: cmsUserID,
            role: 'STATE_USER',
            givenName: 'Zuko',
            familyName: 'Firebender',
            email: 'zuko@example.com',
            stateCode: 'VA',
        }

        const newUser = await postgresStore.insertUser(userToInsert)
        if (newUser instanceof Error) {
            throw newUser
        }

        const updateRes = await server.executeOperation({
            query: UPDATE_DIVISION_ASSIGNMENT,
            variables: {
                input: {
                    cmsUserID: cmsUserID,
                    divisionAssignment: 'OACT',
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
                user: testAdminUser(),
            },
        })

        // setup a user in the db for us to modify
        const cmsUserID = uuidv4()

        const updateRes = await server.executeOperation({
            query: UPDATE_DIVISION_ASSIGNMENT,
            variables: {
                input: {
                    cmsUserID: cmsUserID,
                    divisionAssignment: 'OACT',
                },
            },
        })

        expect(assertAnError(updateRes).message).toContain(
            'cmsUserID does not exist'
        )
        expect(assertAnErrorCode(updateRes)).toBe('BAD_USER_INPUT')
    })

    it('errors if called by a state user', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const server = await constructTestPostgresServer({
            store: postgresStore,
        })

        // setup a user in the db for us to modify
        const cmsUserID = uuidv4()

        const updateRes = await server.executeOperation({
            query: UPDATE_DIVISION_ASSIGNMENT,
            variables: {
                input: {
                    cmsUserID: cmsUserID,
                    divisionAssignment: 'OACT',
                },
            },
        })

        expect(assertAnError(updateRes).message).toContain(
            'user not authorized to modify assignments'
        )
        expect(assertAnErrorCode(updateRes)).toBe('FORBIDDEN')
    })
})

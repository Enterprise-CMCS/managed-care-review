import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import UPDATE_CMS_USER from '@managed-care-review/app-graphql/src/mutations/updateCMSUser.graphql'
import {
    InsertUserArgsType,
    isStoreError,
    NewPostgresStore,
} from '../../postgres'
import { v4 as uuidv4 } from 'uuid'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import {
    assertAnError,
    assertAnErrorCode,
    assertAnErrorExtensions,
} from '../../testHelpers'
import { State } from '../../gen/gqlServer'
import { AuditAction, Division } from '@prisma/client'
import { testAdminUser, testCMSUser } from '../../testHelpers/userHelpers'

describe('updateCMSUser', () => {
    it('updates a cms users state assignments', async () => {
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
            role: 'CMS_USER',
            givenName: 'Zuko',
            familyName: 'Firebender',
            email: 'zuko@example.com',
        }

        const newUser = await postgresStore.insertUser(userToInsert)
        if (isStoreError(newUser)) {
            throw new Error(newUser.code)
        }

        const updateRes = await server.executeOperation({
            query: UPDATE_CMS_USER,
            variables: {
                input: {
                    cmsUserID: cmsUserID,
                    stateAssignments: ['CA'],
                },
            },
        })

        expect(updateRes.data).toBeDefined()
        expect(updateRes.errors).toBeUndefined()

        if (!updateRes.data) {
            throw new Error('no data')
        }

        const user = updateRes.data.updateCMSUser.user
        expect(user.email).toBe(newUser.email)
        expect(user.stateAssignments).toHaveLength(1)
        expect(user.stateAssignments[0].code).toBe('CA')

        // change the value and see if it updates
        const updateRes2 = await server.executeOperation({
            query: UPDATE_CMS_USER,
            variables: {
                input: {
                    cmsUserID: cmsUserID,
                    stateAssignments: ['VA', 'MA'],
                },
            },
        })

        expect(updateRes2.data).toBeDefined()
        expect(updateRes2.errors).toBeUndefined()

        if (!updateRes2.data) {
            throw new Error('no data')
        }

        const user2 = updateRes2.data.updateCMSUser.user
        expect(user2.email).toBe(newUser.email)
        expect(user2.stateAssignments).toHaveLength(2)
        expect(user2.stateAssignments.map((s: State) => s.code)).toEqual(
            expect.arrayContaining(['MA', 'VA'])
        )
    })

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
            role: 'CMS_USER',
            givenName: 'Zuko',
            familyName: 'Firebender',
            email: 'zuko@example.com',
        }

        const newUser = await postgresStore.insertUser(userToInsert)
        if (isStoreError(newUser)) {
            throw new Error(newUser.code)
        }

        // make the first update to the division assignment
        const firstUpdateRes = await server.executeOperation({
            query: UPDATE_CMS_USER,
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

        const firstUpdateToUser = firstUpdateRes.data.updateCMSUser.user
        expect(firstUpdateToUser.email).toBe(newUser.email)
        // division assignment should now be set
        expect(firstUpdateToUser.divisionAssignment).toBe(
            firstDivisionAssignment
        )

        // make the second update to the division assignment
        const secondUpdateRes = await server.executeOperation({
            query: UPDATE_CMS_USER,
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

        const secondUpdateToUser = secondUpdateRes.data.updateCMSUser.user
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
        if (isStoreError(newUser)) {
            throw new Error(newUser.code)
        }

        const updateRes = await server.executeOperation({
            query: UPDATE_CMS_USER,
            variables: {
                input: {
                    cmsUserID: cmsUserID,
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
                user: testAdminUser(),
            },
        })

        // setup a user in the db for us to modify
        const cmsUserID = uuidv4()

        const updateRes = await server.executeOperation({
            query: UPDATE_CMS_USER,
            variables: {
                input: {
                    cmsUserID: cmsUserID,
                    stateAssignments: ['CA'],
                },
            },
        })

        expect(assertAnError(updateRes).message).toContain(
            'cmsUserID does not exist'
        )
        expect(assertAnErrorCode(updateRes)).toBe('BAD_USER_INPUT')
    })

    it('errors if called by a CMS user', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const server = await constructTestPostgresServer({
            store: postgresStore,
            context: {
                user: testCMSUser(),
            },
        })

        // setup a user in the db for us to modify
        const cmsUserID = uuidv4()

        const updateRes = await server.executeOperation({
            query: UPDATE_CMS_USER,
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

    it('errors if called by a state user', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const server = await constructTestPostgresServer({
            store: postgresStore,
        })

        // setup a user in the db for us to modify
        const cmsUserID = uuidv4()

        const updateRes = await server.executeOperation({
            query: UPDATE_CMS_USER,
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

    it('returns an error with missing arguments', async () => {
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
            role: 'CMS_USER',
            givenName: 'Zuko',
            familyName: 'Firebender',
            email: 'zuko@example.com',
        }
        const newUser = await postgresStore.insertUser(userToInsert)
        if (isStoreError(newUser)) {
            throw new Error(newUser.code)
        }
        const updateRes = await server.executeOperation({
            query: UPDATE_CMS_USER,
            variables: {
                input: {
                    cmsUserID: cmsUserID,
                },
            },
        })

        expect(assertAnError(updateRes).message).toContain(
            'No state assignments or division assignment provided'
        )
        expect(assertAnErrorCode(updateRes)).toBe('BAD_USER_INPUT')
    })

    it('returns an error with invalid state codes', async () => {
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
            query: UPDATE_CMS_USER,
            variables: {
                input: {
                    cmsUserID: cmsUserID,
                    stateAssignments: ['CA', 'XX', 'BS'],
                },
            },
        })

        expect(assertAnError(updateRes).message).toContain(
            'Invalid state codes'
        )
        expect(assertAnErrorCode(updateRes)).toBe('BAD_USER_INPUT')
        expect(assertAnErrorExtensions(updateRes).argumentValues).toEqual([
            'XX',
            'BS',
        ])
    })
})

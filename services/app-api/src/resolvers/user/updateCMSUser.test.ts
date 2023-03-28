import { UserType } from '../../domain-models'
import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import UPDATE_CMS_USER from '../../../../app-graphql/src/mutations/updateCMSUser.graphql'
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

describe('updateCMSUser', () => {
    it('updates a cms users state assignments', async () => {
        const testAdminUser: UserType = {
            id: 'd60e82de-13d7-459b-825e-61ce6ca2eb36',
            role: 'ADMIN_USER',
            email: 'iroh@example.com',
            familyName: 'Iroh',
            givenName: 'Uncle',
        }

        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const server = await constructTestPostgresServer({
            store: postgresStore,
            context: {
                user: testAdminUser,
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

    it('errors if the target is not a CMS user', async () => {
        const testAdminUser: UserType = {
            id: 'd60e82de-13d7-459b-825e-61ce6ca2eb36',
            role: 'ADMIN_USER',
            email: 'iroh@example.com',
            familyName: 'Iroh',
            givenName: 'Uncle',
        }

        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const server = await constructTestPostgresServer({
            store: postgresStore,
            context: {
                user: testAdminUser,
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
        const testAdminUser: UserType = {
            id: 'd60e82de-13d7-459b-825e-61ce6ca2eb36',
            role: 'ADMIN_USER',
            email: 'iroh@example.com',
            familyName: 'Iroh',
            givenName: 'Uncle',
        }

        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const server = await constructTestPostgresServer({
            store: postgresStore,
            context: {
                user: testAdminUser,
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
        const testCMSUser: UserType = {
            id: 'd60e82de-13d7-459b-825e-61ce6ca2eb36',
            role: 'CMS_USER',
            email: 'iroh@example.com',
            familyName: 'Iroh',
            givenName: 'Uncle',
            stateAssignments: [],
        }

        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const server = await constructTestPostgresServer({
            store: postgresStore,
            context: {
                user: testCMSUser,
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
            'user not authorized to modify state assignments'
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
            'user not authorized to modify state assignments'
        )
        expect(assertAnErrorCode(updateRes)).toBe('FORBIDDEN')
    })

    it('returns an error with missing arguments', async () => {
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
                },
            },
        })

        expect(assertAnError(updateRes).message).toContain(
            'Variable "$input" got invalid value'
        )
        expect(assertAnErrorCode(updateRes)).toBe('BAD_USER_INPUT')
    })

    it('returns an error with invalid state codes', async () => {
        const testAdminUser: UserType = {
            id: 'd60e82de-13d7-459b-825e-61ce6ca2eb36',
            role: 'ADMIN_USER',
            email: 'iroh@example.com',
            familyName: 'Iroh',
            givenName: 'Uncle',
        }

        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const server = await constructTestPostgresServer({
            store: postgresStore,
            context: {
                user: testAdminUser,
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

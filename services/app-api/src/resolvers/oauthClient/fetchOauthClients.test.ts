import {
    constructTestPostgresServer,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import {
    testAdminUser,
    testStateUser,
    testCMSUser,
} from '../../testHelpers/userHelpers'
import {
    CreateOauthClientDocument,
    FetchOauthClientsDocument,
} from '../../gen/gqlClient'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { NewPostgresStore } from '../../postgres'
import { assertAnError } from '../../testHelpers'

describe('fetchOauthClients', () => {
    it('fetches all OAuth clients as ADMIN', async () => {
        const adminUser = testAdminUser()
        const cmsUser = testCMSUser()

        // Create CMS user in database with state assignments
        const client = await sharedTestPrismaClient()
        await client.user.create({
            data: {
                id: cmsUser.id,
                givenName: cmsUser.givenName,
                familyName: cmsUser.familyName,
                email: cmsUser.email,
                role: cmsUser.role,
                stateAssignments: {
                    connect: [
                        {
                            stateCode: 'FL',
                        },
                    ],
                },
            },
        })

        const server = await constructTestPostgresServer({
            context: { user: adminUser },
        })
        // Create two clients
        const client1Res = await executeGraphQLOperation(server, {
            query: CreateOauthClientDocument,
            variables: {
                input: {
                    description: 'Client 1',
                    grants: ['client_credentials'],
                    userID: cmsUser.id,
                },
            },
        })
        expect(client1Res.errors).toBeUndefined()
        const client1Id =
            client1Res.data?.createOauthClient.oauthClient.clientId

        const client2Res = await executeGraphQLOperation(server, {
            query: CreateOauthClientDocument,
            variables: {
                input: {
                    description: 'Client 2',
                    grants: ['client_credentials'],
                    userID: cmsUser.id,
                },
            },
        })
        expect(client2Res.errors).toBeUndefined()
        const client2Id =
            client2Res.data?.createOauthClient.oauthClient.clientId

        const res = await executeGraphQLOperation(server, {
            query: FetchOauthClientsDocument,
            variables: { input: { clientIds: [client1Id, client2Id] } },
        })
        expect(res.errors).toBeUndefined()
        const oauthClients = res.data?.fetchOauthClients.oauthClients
        expect(Array.isArray(oauthClients)).toBe(true)
        expect(oauthClients).toHaveLength(2)
        // Verify user objects are included
        oauthClients.forEach((client: unknown) => {
            const typedClient = client as {
                user: { id: string; email: string; role: string }
            }
            expect(typedClient.user).toBeDefined()
            expect(typedClient.user.id).toBe(cmsUser.id)
            expect(typedClient.user.email).toBeDefined()
            expect(typedClient.user.role).toBeDefined()
        })
    })

    it('fetches all OAuth clients as ADMIN with empty input', async () => {
        const adminUser = testAdminUser()

        const server = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const client = await sharedTestPrismaClient()

        // Create a CMS user with state assignments
        const cmsUser = testCMSUser()
        await client.user.create({
            data: {
                id: cmsUser.id,
                givenName: cmsUser.givenName,
                familyName: cmsUser.familyName,
                email: cmsUser.email,
                role: cmsUser.role,
                stateAssignments: {
                    connect: [
                        {
                            stateCode: 'FL',
                        },
                    ],
                },
            },
        })

        // Clean up any existing OAuth clients to ensure test isolation
        await client.oAuthClient.deleteMany()
        // Fetch all should return empty array after cleanup
        const emptyRes = await executeGraphQLOperation(server, {
            query: FetchOauthClientsDocument,
            variables: { input: {} },
        })
        expect(emptyRes.errors).toBeUndefined()
        expect(emptyRes.data?.fetchOauthClients.oauthClients).toHaveLength(0)

        // Create an OAuth client
        const createRes = await executeGraphQLOperation(server, {
            query: CreateOauthClientDocument,
            variables: {
                input: {
                    description: 'Test Client for fetch all',
                    grants: ['client_credentials'],
                    userID: cmsUser.id,
                },
            },
        })
        expect(createRes.errors).toBeUndefined()

        // Now fetch all should return our client
        const res = await executeGraphQLOperation(server, {
            query: FetchOauthClientsDocument,
            variables: { input: {} },
        })
        expect(res.errors).toBeUndefined()
        const oauthClients = res.data?.fetchOauthClients.oauthClients
        expect(Array.isArray(oauthClients)).toBe(true)
        expect(oauthClients).toHaveLength(1)

        // Basic verification of the client
        const ourClient = oauthClients[0]
        expect(ourClient.clientId).toBeDefined()
        expect(ourClient.description).toBe('Test Client for fetch all')
        expect(ourClient.user).toBeDefined()
        expect(ourClient.user.id).toBe(cmsUser.id)
        expect(ourClient.user.email).toBe(cmsUser.email)
        expect(ourClient.user.role).toBe(cmsUser.role)
    })

    it('fetches only specified clientIds', async () => {
        const adminUser = testAdminUser()
        const cmsUser = testCMSUser()

        // Create CMS user in database with state assignments
        const client = await sharedTestPrismaClient()
        await client.user.create({
            data: {
                id: cmsUser.id,
                givenName: cmsUser.givenName,
                familyName: cmsUser.familyName,
                email: cmsUser.email,
                role: cmsUser.role,
                stateAssignments: {
                    connect: [
                        {
                            stateCode: 'FL',
                        },
                    ],
                },
            },
        })

        const server = await constructTestPostgresServer({
            context: { user: adminUser },
        })
        // Create a client
        const createRes = await executeGraphQLOperation(server, {
            query: CreateOauthClientDocument,
            variables: {
                input: {
                    description: 'Specific client',
                    grants: ['client_credentials'],
                    userID: cmsUser.id,
                },
            },
        })
        expect(createRes.errors).toBeUndefined()
        const clientId = createRes.data?.createOauthClient.oauthClient.clientId
        const res = await executeGraphQLOperation(server, {
            query: FetchOauthClientsDocument,
            variables: { input: { clientIds: [clientId] } },
        })
        expect(res.errors).toBeUndefined()
        const oauthClients = res.data?.fetchOauthClients.oauthClients
        expect(Array.isArray(oauthClients)).toBe(true)
        expect(oauthClients).toHaveLength(1)
        expect(oauthClients[0].clientId).toBe(clientId)
        expect(oauthClients[0].user).toBeDefined()
        expect(oauthClients[0].user.id).toBe(cmsUser.id)
    })

    it('returns empty array if no clients match', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testAdminUser() },
        })
        const res = await executeGraphQLOperation(server, {
            query: FetchOauthClientsDocument,
            variables: { input: { clientIds: ['nonexistent'] } },
        })
        expect(res.errors).toBeUndefined()
        const oauthClients = res.data?.fetchOauthClients.oauthClients
        expect(Array.isArray(oauthClients)).toBe(true)
        expect(oauthClients).toHaveLength(0)
    })

    it('errors if not ADMIN', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testStateUser() },
        })
        const res = await executeGraphQLOperation(server, {
            query: FetchOauthClientsDocument,
        })
        expect(res.errors?.[0].message).toMatch(/not authorized/i)
    })

    it('errors on DB failure', async () => {
        // Use a mock store that throws
        const server = await constructTestPostgresServer({
            context: { user: testAdminUser() },
            store: {
                ...{},
                listOAuthClients: async () => new Error('DB fail'),
                getOAuthClientByClientId: async () => new Error('DB fail'),
            },
        })
        const res = await executeGraphQLOperation(server, {
            query: FetchOauthClientsDocument,
        })
        expect(res.errors?.[0].message).toMatch(/db fail/i)
    })

    it('errors when called by a state user and an oauth client', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)

        const server = await constructTestPostgresServer({
            store: postgresStore,
            context: {
                user: testStateUser(),
                oauthClient: {
                    clientId: 'test-client',
                    grants: ['client_credentials'],
                    isOAuthClient: true,
                    scopes: [],
                    isDelegatedUser: false,
                },
            },
        })

        const fetchOauthClients = await executeGraphQLOperation(server, {
            query: FetchOauthClientsDocument,
        })

        expect(assertAnError(fetchOauthClients).message).toContain(
            'oauth clients cannot access admin functions'
        )
    })

    it('errors when called by an admin user and an oauth client', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)

        const server = await constructTestPostgresServer({
            store: postgresStore,
            context: {
                user: testAdminUser(),
                oauthClient: {
                    clientId: 'test-client',
                    grants: ['client_credentials'],
                    isOAuthClient: true,
                    scopes: [],
                    isDelegatedUser: false,
                },
            },
        })

        const fetchOauthClients = await executeGraphQLOperation(server, {
            query: FetchOauthClientsDocument,
        })

        expect(assertAnError(fetchOauthClients).message).toContain(
            'oauth clients cannot access admin functions'
        )
    })
})

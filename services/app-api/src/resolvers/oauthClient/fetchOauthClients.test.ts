import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
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

describe('fetchOauthClients', () => {
    it('fetches all OAuth clients as ADMIN', async () => {
        const adminUser = testAdminUser()
        const cmsUser = testCMSUser()

        // Create CMS user in database
        const client = await sharedTestPrismaClient()
        await client.user.create({
            data: {
                id: cmsUser.id,
                givenName: cmsUser.givenName,
                familyName: cmsUser.familyName,
                email: cmsUser.email,
                role: cmsUser.role,
            },
        })

        const server = await constructTestPostgresServer({
            context: { user: adminUser },
        })
        // Create two clients
        const client1Res = await server.executeOperation({
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

        const client2Res = await server.executeOperation({
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

        const res = await server.executeOperation({
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
        const server = await constructTestPostgresServer({
            context: { user: testAdminUser() },
        })
        // Fetch all (empty input)
        const res = await server.executeOperation({
            query: FetchOauthClientsDocument,
            variables: { input: {} },
        })
        expect(res.errors).toBeUndefined()
        const oauthClients = res.data?.fetchOauthClients.oauthClients
        expect(Array.isArray(oauthClients)).toBe(true)
    })

    it('fetches only specified clientIds', async () => {
        const adminUser = testAdminUser()
        const cmsUser = testCMSUser()

        // Create CMS user in database
        const client = await sharedTestPrismaClient()
        await client.user.create({
            data: {
                id: cmsUser.id,
                givenName: cmsUser.givenName,
                familyName: cmsUser.familyName,
                email: cmsUser.email,
                role: cmsUser.role,
            },
        })

        const server = await constructTestPostgresServer({
            context: { user: adminUser },
        })
        // Create a client
        const createRes = await server.executeOperation({
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
        const res = await server.executeOperation({
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
        const res = await server.executeOperation({
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
        const res = await server.executeOperation({
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
        const res = await server.executeOperation({
            query: FetchOauthClientsDocument,
        })
        expect(res.errors?.[0].message).toMatch(/db fail/i)
    })
})

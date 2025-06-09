import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { testAdminUser, testStateUser } from '../../testHelpers/userHelpers'
import {
    CreateOauthClientDocument,
    UpdateOauthClientDocument,
} from '../../gen/gqlClient'

describe('updateOauthClient', () => {
    it('updates an OAuth client as ADMIN', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testAdminUser() },
        })

        const createRes = await server.executeOperation({
            query: CreateOauthClientDocument,
            variables: {
                input: {
                    description: 'Initial description',
                    grants: ['client_credentials'],
                    contactEmail: 'initial@example.com',
                },
            },
        })
        expect(createRes.errors).toBeUndefined()
        const clientId = createRes.data?.createOauthClient.oauthClient.clientId

        // Update the client
        const updateInput = {
            clientId,
            description: 'Updated description',
            contactEmail: 'updated@example.com',
            grants: ['client_credentials', 'refresh_token'],
        }
        const res = await server.executeOperation({
            query: UpdateOauthClientDocument,
            variables: { input: updateInput },
        })
        expect(res.errors).toBeUndefined()
        const oauthClient = res.data?.updateOauthClient.oauthClient
        expect(oauthClient).toBeDefined()
        expect(oauthClient.description).toBe(updateInput.description)
        expect(oauthClient.contactEmail).toBe(updateInput.contactEmail)
        expect(oauthClient.grants).toEqual(
            expect.arrayContaining(updateInput.grants)
        )
    })

    it('errors if not ADMIN', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testStateUser() },
        })
        const input = {
            clientId: 'test-client-id',
            description: 'Should fail',
        }
        const res = await server.executeOperation({
            query: UpdateOauthClientDocument,
            variables: { input },
        })
        expect(res.errors?.[0].message).toMatch(/not authorized/i)
        expect(res.errors?.[0].extensions?.code).toBe('FORBIDDEN')
    })

    it('errors if client not found', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testAdminUser() },
        })
        const input = {
            clientId: 'non-existent-client-id',
            description: 'Should fail',
        }
        const res = await server.executeOperation({
            query: UpdateOauthClientDocument,
            variables: { input },
        })
        expect(res.errors?.[0].message).toMatch(/not found/i)
        expect(res.errors?.[0].extensions?.code).toBe('NOT_FOUND')
        expect(res.errors?.[0].extensions?.cause).toBe('CLIENT_NOT_FOUND')
    })

    it('errors on DB failure', async () => {
        const server = await constructTestPostgresServer({
            context: { user: testAdminUser() },
            store: {
                ...{},
                getOAuthClientByClientId: async () => ({
                    id: '1',
                    clientId: 'fail',
                    clientSecret: '',
                    grants: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    lastUsedAt: null,
                    description: null,
                    contactEmail: null,
                }),
                updateOAuthClient: async () => new Error('DB fail'),
            },
        })
        const input = {
            clientId: 'fail',
            description: 'DB fail',
        }
        const res = await server.executeOperation({
            query: UpdateOauthClientDocument,
            variables: { input },
        })
        expect(res.errors?.[0].message).toMatch(/fail/i)
        expect(res.errors?.[0].extensions?.code).toBe('INTERNAL_SERVER_ERROR')
        expect(res.errors?.[0].extensions?.cause).toBe('DB_ERROR')
    })
})

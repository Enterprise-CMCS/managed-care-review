import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { testAdminUser, testCMSUser } from '../../testHelpers/userHelpers'
import { CreateOauthClientDocument } from '../../gen/gqlClient'
import { createOauthClientResolver } from './createOauthClient'

describe('createOauthClientResolver', () => {
  it('creates a new OAuth client as admin', async () => {
    const adminUser = testAdminUser()
    const server = await constructTestPostgresServer({
      context: { user: adminUser },
    })
    const input = {
      description: 'Test client',
      contactEmail: 'test@example.com',
      grants: ['client_credentials'],
    }
    const result = await server.executeOperation({
      query: CreateOauthClientDocument,
      variables: { input },
    })
    expect(result.errors).toBeUndefined()
    const client = result.data?.createOauthClient?.oauthClient
    expect(client).toBeDefined()
    expect(client.clientId).toBeDefined()
    expect(client.description).toBe(input.description)
    expect(client.contactEmail).toBe(input.contactEmail)
    expect(client.grants).toEqual(input.grants)
    expect(client.createdAt).toBeDefined()
    expect(client.updatedAt).toBeDefined()
  })

  it('returns ForbiddenError for non-admin user', async () => {
    const cmsUser = testCMSUser()
    const server = await constructTestPostgresServer({
      context: { user: cmsUser },
    })
    const input = {
      description: 'Test client',
      contactEmail: 'test@example.com',
      grants: ['client_credentials'],
    }
    const result = await server.executeOperation({
      query: CreateOauthClientDocument,
      variables: { input },
    })
    expect(result.errors).toBeDefined()
    expect(result.errors?.[0].message).toMatch(/not authorized/i)
  })
}) 
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { main } from '../oauth_token'
import { configurePostgres } from '../configuration'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { createOAuthClient } from '../../postgres/oauth/oauthClientStore'
import type { APIGatewayProxyEvent } from 'aws-lambda'
import { v4 as uuidv4 } from 'uuid'

// Mock dependencies
vi.mock('../configuration', () => ({
    configurePostgres: vi.fn(),
}))

vi.mock('jsonwebtoken', () => ({
    sign: vi.fn().mockReturnValue('mock.jwt.token'),
}))

vi.mock('../../oauth/oauth2Server', () => ({
    CustomOAuth2Server: vi.fn().mockImplementation(() => ({
        token: vi
            .fn()
            .mockImplementation(async (event: APIGatewayProxyEvent) => {
                if (!event.body) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({
                            error: 'invalid_request',
                            error_description: 'Missing request body',
                        }),
                    }
                }

                const body = JSON.parse(event.body)
                if (!body.client_id || !body.client_secret) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({
                            error: 'invalid_request',
                            error_description: 'Missing client credentials',
                        }),
                    }
                }

                if (body.client_secret === 'wrong-secret') {
                    // pragma: allowlist secret

                    return {
                        statusCode: 401,
                        body: JSON.stringify({
                            error: 'invalid_client',
                            error_description: 'Invalid client credentials',
                        }),
                    }
                }

                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        access_token: 'mock.jwt.token',
                        token_type: 'Bearer',
                        expires_in: 1800,
                    }),
                }
            }),
    })),
}))

describe('OAuth Token Handler', () => {
    let mockPrisma: Awaited<ReturnType<typeof sharedTestPrismaClient>>

    beforeEach(async () => {
        mockPrisma = await sharedTestPrismaClient()
        vi.mocked(configurePostgres).mockResolvedValue(mockPrisma)
        process.env.JWT_SECRET = 'test-secret' // pragma: allowlist secret
        process.env.DATABASE_URL = 'test-db-url'
        process.env.SECRETS_MANAGER_SECRET = 'test-secret' // pragma: allowlist secret
    })

    it('should return 500 if database configuration is missing', async () => {
        delete process.env.DATABASE_URL

        const result = await main({} as APIGatewayProxyEvent)

        expect(result.statusCode).toBe(500)
        expect(JSON.parse(result.body)).toEqual({
            error: 'server_error',
            error_description: 'Database configuration missing',
        })
    })

    it('should return 500 if JWT secret is missing', async () => {
        delete process.env.JWT_SECRET

        const result = await main({} as APIGatewayProxyEvent)

        expect(result.statusCode).toBe(500)
        expect(JSON.parse(result.body)).toEqual({
            error: 'server_error',
            error_description: 'JWT configuration missing',
        })
    })

    it('should return 400 for invalid request', async () => {
        const result = await main({
            body: JSON.stringify({
                grant_type: 'client_credentials',
                // Missing client_id and client_secret
            }),
        } as APIGatewayProxyEvent)

        expect(result.statusCode).toBe(400)
        expect(JSON.parse(result.body)).toEqual({
            error: 'invalid_request',
            error_description: expect.any(String),
        })
    })

    it('should return 401 for invalid client credentials', async () => {
        const result = await main({
            body: JSON.stringify({
                grant_type: 'client_credentials',
                client_id: 'test-client',
                client_secret: 'wrong-secret', // pragma: allowlist secret
            }),
        } as APIGatewayProxyEvent)

        expect(result.statusCode).toBe(401)
        expect(JSON.parse(result.body)).toEqual({
            error: 'invalid_client',
            error_description: expect.any(String),
        })
    })

    it('should return JWT token for valid client credentials', async () => {
        // Create a test user first
        const testUser = await mockPrisma.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Test',
                familyName: 'User',
                email: 'testuser@example.com',
                role: 'ADMIN_USER',
            },
        })

        // Create a test client
        await createOAuthClient(mockPrisma, {
            grants: ['client_credentials'],
            description: 'Test client',
            userID: testUser.id,
        })

        const result = await main({
            body: JSON.stringify({
                grant_type: 'client_credentials',
                client_id: 'test-client',
                client_secret: 'test-secret', // pragma: allowlist secret
            }),
        } as APIGatewayProxyEvent)

        expect(result.statusCode).toBe(200)
        expect(JSON.parse(result.body)).toEqual({
            access_token: 'mock.jwt.token',
            token_type: 'Bearer',
            expires_in: 1800,
        })
    })
})

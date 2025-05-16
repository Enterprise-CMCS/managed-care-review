import { describe, it, expect, vi, beforeEach } from 'vitest'
import { main } from '../oauth_token'
import { configurePostgres } from '../configuration'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { createOAuthClient } from '../../postgres/oauth/oauthClientStore'
import type {
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
    Context,
    Callback,
} from 'aws-lambda'

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
                        expires_in: 3600,
                    }),
                }
            }),
    })),
}))

const noop: Callback<APIGatewayProxyResult> = () => {}

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

        const result = (await main(
            {} as APIGatewayProxyEvent,
            {} as Context,
            noop
        )) as APIGatewayProxyResult

        expect(result.statusCode).toBe(500)
        expect(JSON.parse(result.body)).toEqual({
            error: 'server_error',
            error_description: 'Database configuration missing',
        })
    })

    it('should return 500 if JWT secret is missing', async () => {
        delete process.env.JWT_SECRET

        const result = (await main(
            {} as APIGatewayProxyEvent,
            {} as Context,
            noop
        )) as APIGatewayProxyResult

        expect(result.statusCode).toBe(500)
        expect(JSON.parse(result.body)).toEqual({
            error: 'server_error',
            error_description: 'JWT configuration missing',
        })
    })

    it('should return 400 for invalid request', async () => {
        const result = (await main(
            {
                body: JSON.stringify({
                    grant_type: 'client_credentials',
                    // Missing client_id and client_secret
                }),
            } as APIGatewayProxyEvent,
            {} as Context,
            noop
        )) as APIGatewayProxyResult

        expect(result.statusCode).toBe(400)
        expect(JSON.parse(result.body)).toEqual({
            error: 'invalid_request',
            error_description: expect.any(String),
        })
    })

    it('should return 401 for invalid client credentials', async () => {
        const result = (await main(
            {
                body: JSON.stringify({
                    grant_type: 'client_credentials',
                    client_id: 'test-client',
                    client_secret: 'wrong-secret', // pragma: allowlist secret
                }),
            } as APIGatewayProxyEvent,
            {} as Context,
            noop
        )) as APIGatewayProxyResult

        expect(result.statusCode).toBe(401)
        expect(JSON.parse(result.body)).toEqual({
            error: 'invalid_client',
            error_description: expect.any(String),
        })
    })

    it('should return JWT token for valid client credentials', async () => {
        // Create a test client
        await createOAuthClient(mockPrisma, {
            clientId: 'test-client',
            clientSecret: 'test-secret', // pragma: allowlist secret
            grants: ['client_credentials'],
            description: 'Test client',
            contactEmail: 'test@example.com',
        })

        const result = (await main(
            {
                body: JSON.stringify({
                    grant_type: 'client_credentials',
                    client_id: 'test-client',
                    client_secret: 'test-secret', // pragma: allowlist secret
                }),
            } as APIGatewayProxyEvent,
            {} as Context,
            noop
        )) as APIGatewayProxyResult

        expect(result.statusCode).toBe(200)
        expect(JSON.parse(result.body)).toEqual({
            access_token: 'mock.jwt.token',
            token_type: 'Bearer',
            expires_in: 3600,
        })
    })

    describe('Rate Limiting', () => {
        it('should allow requests within rate limit', async () => {
            const event = {
                body: JSON.stringify({
                    grant_type: 'client_credentials',
                    client_id: 'rate-test-client',
                    client_secret: 'test-secret', // pragma: allowlist secret
                }),
            } as APIGatewayProxyEvent

            // Make 60 requests (rate limit)
            for (let i = 0; i < 60; i++) {
                const result = (await main(
                    event,
                    {} as Context,
                    noop
                )) as APIGatewayProxyResult
                expect(result.statusCode).toBe(200)
            }
        })

        it('should return 429 when rate limit is exceeded', async () => {
            const event = {
                body: JSON.stringify({
                    grant_type: 'client_credentials',
                    client_id: 'rate-limit-client',
                    client_secret: 'test-secret', // pragma: allowlist secret
                }),
            } as APIGatewayProxyEvent

            // Make 61 requests (exceed rate limit)
            for (let i = 0; i < 60; i++) {
                const result = (await main(
                    event,
                    {} as Context,
                    noop
                )) as APIGatewayProxyResult
                expect(result.statusCode).toBe(200)
            }

            // 61st request should be rate limited
            const rateLimitedResult = (await main(
                event,
                {} as Context,
                noop
            )) as APIGatewayProxyResult

            expect(rateLimitedResult.statusCode).toBe(429)
            expect(JSON.parse(rateLimitedResult.body)).toEqual({
                error: 'rate_limit_exceeded',
                error_description: 'Too many requests',
            })
            expect(
                (rateLimitedResult.headers as Record<string, string>)[
                    'Retry-After'
                ]
            ).toBe('60')
        })

        it('should reset rate limit after window expires', async () => {
            const event = {
                body: JSON.stringify({
                    grant_type: 'client_credentials',
                    client_id: 'window-test-client',
                    client_secret: 'test-secret', // pragma: allowlist secret
                }),
            } as APIGatewayProxyEvent

            // Make 60 requests
            for (let i = 0; i < 60; i++) {
                const result = (await main(
                    event,
                    {} as Context,
                    noop
                )) as APIGatewayProxyResult
                expect(result.statusCode).toBe(200)
            }

            // Advance time by 1 minute
            vi.advanceTimersByTime(60 * 1000)

            // Should be able to make requests again
            const result = (await main(
                event,
                {} as Context,
                noop
            )) as APIGatewayProxyResult
            expect(result.statusCode).toBe(200)
        })
    })
})

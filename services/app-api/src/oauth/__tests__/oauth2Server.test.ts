import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CustomOAuth2Server } from '../oauth2Server'
import type { ExtendedPrismaClient } from '../../postgres/prismaClient'
import type { APIGatewayProxyEvent } from 'aws-lambda'
import type { Client, Token, User } from '@node-oauth/oauth2-server'

// Mock OAuth2 server
vi.mock('@node-oauth/oauth2-server', () => {
    class UnauthorizedClientError extends Error {
        constructor(message: string) {
            super(message)
            this.name = 'UnauthorizedClientError'
        }
    }

    class InvalidRequestError extends Error {
        constructor(message: string) {
            super(message)
            this.name = 'InvalidRequestError'
        }
    }

    class InvalidClientError extends Error {
        constructor(message: string) {
            super(message)
            this.name = 'InvalidClientError'
        }
    }

    class Request {
        body: Record<string, unknown>
        headers: Record<string, string>
        method: string
        query: Record<string, string>
        constructor(options: {
            body: Record<string, unknown>
            headers: Record<string, string>
            method: string
            query: Record<string, string>
        }) {
            this.body = options.body
            this.headers = options.headers
            this.method = options.method
            this.query = options.query
        }
    }

    class Response {
        body: Record<string, unknown>
        headers: Record<string, string>
        constructor() {
            this.body = {}
            this.headers = {}
        }
    }

    interface OAuth2ServerModel {
        getClient: (clientId: string, clientSecret: string) => Promise<Client>
        validateScope: (
            user: User,
            client: Client,
            scope: string
        ) => Promise<boolean>
        saveToken: (token: Token, client: Client, user: User) => Promise<Token>
        getAccessToken: (accessToken: string) => Promise<Token | null>
    }

    class OAuth2Server {
        private model: OAuth2ServerModel

        constructor(options: { model: OAuth2ServerModel }) {
            this.model = options.model
        }

        async token(request: Request, response: Response) {
            if (!request.body) {
                throw new InvalidRequestError('Missing request body')
            }

            if (!request.body.client_id || !request.body.client_secret) {
                throw new InvalidRequestError('Missing client credentials')
            }

            if (request.body.client_secret === 'invalid') {
                // pragma: allowlist secret
                throw new InvalidClientError('Invalid client credentials')
            }

            return {
                grantType: 'client_credentials',
                client: {
                    id: request.body.client_id,
                    grants: ['client_credentials'],
                } as Client,
                accessToken: 'mock.access.token',
                user: { id: 'system' } as User,
            } as Token
        }
    }

    return {
        default: OAuth2Server,
        OAuth2Server,
        UnauthorizedClientError,
        InvalidRequestError,
        InvalidClientError,
        Request,
        Response,
    }
})

describe('CustomOAuth2Server', () => {
    let oauth2Server: CustomOAuth2Server
    let mockPrisma: ExtendedPrismaClient
    const mockJwtSecret = 'test-secret' // pragma: allowlist secret

    beforeEach(() => {
        mockPrisma = {
            oAuthClient: {
                findUnique: vi.fn(),
            },
        } as unknown as ExtendedPrismaClient

        oauth2Server = new CustomOAuth2Server(mockPrisma, mockJwtSecret)
    })

    describe('token', () => {
        it('should return 400 for invalid request', async () => {
            const event = {
                body: JSON.stringify({}),
                headers: {},
                httpMethod: 'POST',
                queryStringParameters: null,
            } as APIGatewayProxyEvent

            const result = await oauth2Server.token(event)

            expect(result.statusCode).toBe(400)
            expect(JSON.parse(result.body)).toEqual({
                error: 'invalid_request',
                error_description: expect.any(String),
            })
        })

        it('should return 401 for invalid client credentials', async () => {
            const event = {
                body: JSON.stringify({
                    grant_type: 'client_credentials',
                    client_id: 'invalid',
                    client_secret: 'invalid', // pragma: allowlist secret
                }),
                headers: {},
                httpMethod: 'POST',
                queryStringParameters: null,
            } as APIGatewayProxyEvent

            const result = await oauth2Server.token(event)

            expect(result.statusCode).toBe(401)
            expect(JSON.parse(result.body)).toEqual({
                error: 'invalid_client',
                error_description: expect.any(String),
            })
        })

        it('should return JWT token for valid client credentials', async () => {
            const event = {
                body: JSON.stringify({
                    grant_type: 'client_credentials',
                    client_id: 'valid',
                    client_secret: 'valid', // pragma: allowlist secret
                }),
                headers: {},
                httpMethod: 'POST',
                queryStringParameters: null,
            } as APIGatewayProxyEvent

            const result = await oauth2Server.token(event)

            expect(result.statusCode).toBe(200)
            const response = JSON.parse(result.body)
            expect(response).toHaveProperty('access_token')
            expect(response).toHaveProperty('token_type', 'Bearer')
            expect(response).toHaveProperty('expires_in', 3600)
        })
    })
})

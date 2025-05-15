import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CustomOAuth2Server } from '../oauth2Server'
import type { ExtendedPrismaClient } from '../../postgres/prismaClient'
import type { APIGatewayProxyEvent } from 'aws-lambda'
import type { Client, Token, User } from '@node-oauth/oauth2-server'

// Mock OAuth2Server
vi.mock('@node-oauth/oauth2-server', () => {
    const mockToken = vi.fn()
    const mockOAuth2Server = vi.fn().mockImplementation(() => ({
        token: mockToken,
    }))

    return {
        default: mockOAuth2Server,
        OAuth2Server: mockOAuth2Server,
        InvalidRequestError: class extends Error {
            constructor(message: string) {
                super(message)
                this.name = 'InvalidRequestError'
            }
        },
        InvalidClientError: class extends Error {
            constructor(message: string) {
                super(message)
                this.name = 'InvalidClientError'
            }
        },
        Request: class {
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
        },
        Response: class {
            body: Record<string, unknown>
            headers: Record<string, string>
            constructor() {
                this.body = {}
                this.headers = {}
            }
        },
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

            // Mock OAuth2Server to throw InvalidRequestError
            const { OAuth2Server } = await import('@node-oauth/oauth2-server')
            const mockInstance = new OAuth2Server({
                model: {
                    getClient: vi.fn(),
                    validateScope: vi.fn(),
                    saveToken: vi.fn(),
                    getAccessToken: vi.fn(),
                },
            })
            vi.spyOn(mockInstance, 'token').mockRejectedValueOnce(
                new (
                    await import('@node-oauth/oauth2-server')
                ).InvalidRequestError('Invalid request')
            )

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

            // Mock OAuth2Server to throw InvalidClientError
            const { OAuth2Server } = await import('@node-oauth/oauth2-server')
            const mockInstance = new OAuth2Server({
                model: {
                    getClient: vi.fn(),
                    validateScope: vi.fn(),
                    saveToken: vi.fn(),
                    getAccessToken: vi.fn(),
                },
            })
            vi.spyOn(mockInstance, 'token').mockRejectedValueOnce(
                new (
                    await import('@node-oauth/oauth2-server')
                ).InvalidClientError('Invalid client credentials')
            )

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

            // Mock OAuth2Server to return valid token
            const { OAuth2Server } = await import('@node-oauth/oauth2-server')
            const mockInstance = new OAuth2Server({
                model: {
                    getClient: vi.fn(),
                    validateScope: vi.fn(),
                    saveToken: vi.fn(),
                    getAccessToken: vi.fn(),
                },
            })
            vi.spyOn(mockInstance, 'token').mockResolvedValueOnce({
                grantType: 'client_credentials',
                client: {
                    id: 'valid',
                    grants: ['client_credentials'],
                } as Client,
                accessToken: 'mock.access.token',
                user: { id: 'system' } as User,
            } as Token)

            const result = await oauth2Server.token(event)

            expect(result.statusCode).toBe(200)
            const response = JSON.parse(result.body)
            expect(response).toHaveProperty('access_token')
            expect(response).toHaveProperty('token_type', 'Bearer')
            expect(response).toHaveProperty('expires_in', 3600)
        })
    })
})

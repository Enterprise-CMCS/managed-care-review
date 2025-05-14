import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CustomOAuth2Server } from '../oauth2Server'
import type { ExtendedPrismaClient } from '../../postgres/prismaClient'
import type { APIGatewayProxyEvent } from 'aws-lambda'

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

            // Mock successful client validation
            vi.spyOn(
                mockPrisma.oAuthClient,
                'findUnique'
            ).mockResolvedValueOnce({
                id: 'valid',
                clientId: 'valid',
                clientSecret: 'valid', // pragma: allowlist secret
                grants: ['client_credentials'],
                createdAt: new Date(),
                lastUsedAt: null,
                description: null,
                contactEmail: null,
            })

            const result = await oauth2Server.token(event)

            expect(result.statusCode).toBe(200)
            const response = JSON.parse(result.body)
            expect(response).toHaveProperty('access_token')
            expect(response).toHaveProperty('token_type', 'Bearer')
            expect(response).toHaveProperty('expires_in', 3600)
        })
    })
})

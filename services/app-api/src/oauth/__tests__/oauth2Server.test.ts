import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CustomOAuth2Server } from '../oauth2Server'
import type { ExtendedPrismaClient } from '../../postgres/prismaClient'
import type { APIGatewayProxyEvent } from 'aws-lambda'

// These tests run against the real @node-oauth/oauth2-server library with only
// Prisma mocked, so they exercise the library's own request validation
// (method, content-type, required params) alongside our model methods.

const mockJwtSecret = 'abcd1234abcd1234abcd1234abcd1234' // pragma: allowlist secret
const mockOauthIssuer = 'mcreview-oauth'

const validClientId = 'oauth-client-abc'
const validClientSecret = 'super-secret-value' // pragma: allowlist secret

const adminUser = {
    id: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    role: 'ADMIN_USER',
    givenName: 'Ada',
    familyName: 'Admin',
    email: 'ada@example.com',
    divisionAssignment: null,
    stateCode: null,
    stateAssignments: [],
}

const oauthClientRow = {
    id: 'oauth-row-1',
    clientId: validClientId,
    clientSecret: validClientSecret,
    grants: ['client_credentials'],
    description: null,
    userID: adminUser.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastUsedAt: null,
    user: adminUser,
}

function tokenEvent(overrides?: {
    body?: string | null
    contentType?: string
    method?: string
    isBase64Encoded?: boolean
}): APIGatewayProxyEvent {
    const headers: Record<string, string> = {}
    if (overrides?.contentType !== undefined) {
        if (overrides.contentType !== '') {
            headers['Content-Type'] = overrides.contentType
        }
    } else {
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
    }

    const defaultBody = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: validClientId,
        client_secret: validClientSecret,
    }).toString()

    return {
        body: overrides?.body !== undefined ? overrides.body : defaultBody,
        headers,
        httpMethod: overrides?.method ?? 'POST',
        queryStringParameters: null,
        multiValueHeaders: {},
        multiValueQueryStringParameters: null,
        isBase64Encoded: overrides?.isBase64Encoded ?? false,
        path: '/oauth/token',
        pathParameters: null,
        stageVariables: null,
        requestContext: {
            accountId: '',
            apiId: '',
            authorizer: null,
            protocol: '',
            httpMethod: overrides?.method ?? 'POST',
            identity: {
                accessKey: null,
                accountId: null,
                apiKey: null,
                apiKeyId: null,
                caller: null,
                clientCert: null,
                cognitoAuthenticationProvider: null,
                cognitoAuthenticationType: null,
                cognitoIdentityId: null,
                cognitoIdentityPoolId: null,
                principalOrgId: null,
                sourceIp: '',
                user: null,
                userAgent: null,
                userArn: null,
            },
            path: '/oauth/token',
            stage: '',
            requestId: '',
            requestTimeEpoch: 0,
            resourceId: '',
            resourcePath: '',
        },
        resource: '',
    } as APIGatewayProxyEvent
}

describe('CustomOAuth2Server', () => {
    let oauth2Server: CustomOAuth2Server
    let findUnique: ReturnType<typeof vi.fn>
    let update: ReturnType<typeof vi.fn>

    beforeEach(() => {
        findUnique = vi.fn().mockResolvedValue(oauthClientRow)
        update = vi.fn().mockResolvedValue(oauthClientRow)
        const mockPrisma = {
            oAuthClient: {
                findUnique,
                update,
            },
        } as unknown as ExtendedPrismaClient

        oauth2Server = new CustomOAuth2Server(
            mockPrisma,
            mockJwtSecret,
            mockOauthIssuer
        )
    })

    describe('token', () => {
        it('returns a JWT for valid form-urlencoded credentials', async () => {
            const result = await oauth2Server.token(tokenEvent())

            expect(result.statusCode).toBe(200)
            const response = JSON.parse(result.body)
            expect(response).toHaveProperty('token_type', 'Bearer')
            expect(response).toHaveProperty('expires_in', 1800)
            // access_token should be a signed JWT carrying our client
            const [, payloadB64] = response.access_token.split('.')
            const payload = JSON.parse(
                Buffer.from(payloadB64, 'base64url').toString()
            )
            expect(payload.client_id).toBe(validClientId)
            expect(payload.user_id).toBe(adminUser.id)
            expect(payload.grants).toEqual(['client_credentials'])
        })

        it('accepts a content-type with a charset parameter', async () => {
            const result = await oauth2Server.token(
                tokenEvent({
                    contentType:
                        'application/x-www-form-urlencoded; charset=UTF-8',
                })
            )

            expect(result.statusCode).toBe(200)
        })

        it('accepts a mixed-case content-type header value', async () => {
            const result = await oauth2Server.token(
                tokenEvent({
                    contentType: 'Application/X-WWW-Form-Urlencoded',
                })
            )

            expect(result.statusCode).toBe(200)
        })

        it('decodes a base64-encoded form body', async () => {
            const formBody = new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: validClientId,
                client_secret: validClientSecret,
            }).toString()

            const result = await oauth2Server.token(
                tokenEvent({
                    body: Buffer.from(formBody).toString('base64'),
                    isBase64Encoded: true,
                })
            )

            expect(result.statusCode).toBe(200)
        })

        it('accepts camelCase parameter names in the form body', async () => {
            const result = await oauth2Server.token(
                tokenEvent({
                    body: new URLSearchParams({
                        grantType: 'client_credentials',
                        clientId: validClientId,
                        clientSecret: validClientSecret,
                    }).toString(),
                })
            )

            expect(result.statusCode).toBe(200)
        })

        it('returns 400 for application/json content, per RFC 6749', async () => {
            const result = await oauth2Server.token(
                tokenEvent({
                    body: JSON.stringify({
                        grant_type: 'client_credentials',
                        client_id: validClientId,
                        client_secret: validClientSecret,
                    }),
                    contentType: 'application/json',
                })
            )

            expect(result.statusCode).toBe(400)
            expect(JSON.parse(result.body)).toEqual({
                error: 'invalid_request',
                error_description:
                    'Content-Type must be application/x-www-form-urlencoded',
            })
        })

        it('returns 400 when content-type is missing', async () => {
            const result = await oauth2Server.token(
                tokenEvent({ contentType: '' })
            )

            expect(result.statusCode).toBe(400)
            expect(JSON.parse(result.body)).toEqual({
                error: 'invalid_request',
                error_description:
                    'Content-Type must be application/x-www-form-urlencoded',
            })
        })

        it('returns 400 when grant_type is missing', async () => {
            const result = await oauth2Server.token(
                tokenEvent({
                    body: new URLSearchParams({
                        client_id: validClientId,
                        client_secret: validClientSecret,
                    }).toString(),
                })
            )

            expect(result.statusCode).toBe(400)
            expect(JSON.parse(result.body)).toEqual({
                error: 'invalid_request',
                error_description: expect.stringContaining('grant_type'),
            })
        })

        it('returns 401 for a wrong client secret and does not mark the client used', async () => {
            const result = await oauth2Server.token(
                tokenEvent({
                    body: new URLSearchParams({
                        grant_type: 'client_credentials',
                        client_id: validClientId,
                        client_secret: 'wrong-secret', // pragma: allowlist secret
                    }).toString(),
                })
            )

            expect(result.statusCode).toBe(401)
            expect(JSON.parse(result.body)).toEqual({
                error: 'invalid_client',
                error_description: expect.any(String),
            })
            expect(update).not.toHaveBeenCalled()
        })

        it('returns 401 for an unknown client', async () => {
            findUnique.mockResolvedValue(null)

            const result = await oauth2Server.token(tokenEvent())

            expect(result.statusCode).toBe(401)
            expect(JSON.parse(result.body)).toEqual({
                error: 'invalid_client',
                error_description: expect.any(String),
            })
        })

        it('returns 500, not 401, when the database fails during verification', async () => {
            findUnique.mockRejectedValue(new Error('connection refused'))

            const result = await oauth2Server.token(tokenEvent())

            expect(result.statusCode).toBe(500)
            const response = JSON.parse(result.body)
            expect(response.error).toBe('server_error')
        })
    })
})

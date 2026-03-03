import OAuth2Server, {
    Request as OAuthRequest,
    Response as OAuthResponse,
    InvalidRequestError,
    InvalidClientError,
    UnauthorizedClientError,
    type Token,
    type Client,
    type User,
} from '@node-oauth/oauth2-server'
import type { ExtendedPrismaClient } from '../postgres/prismaClient'
import {
    verifyClientCredentials,
    getOAuthClientByClientId,
} from '../postgres/oauth/oauthClientStore'
import { newJWTLib } from '../jwt'
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

const JWT_EXPIRATION_SECONDS = 60 * 30 // 30 minutes

export class CustomOAuth2Server {
    private oauth2Server: InstanceType<typeof OAuth2Server>
    private prisma: ExtendedPrismaClient
    private jwtLib: ReturnType<typeof newJWTLib>

    constructor(
        prisma: ExtendedPrismaClient,
        jwtSecret: string,
        oauthIssuer: string
    ) {
        this.prisma = prisma
        this.jwtLib = newJWTLib({
            issuer: oauthIssuer,
            signingKey: Buffer.from(jwtSecret, 'hex'),
            expirationDurationS: JWT_EXPIRATION_SECONDS,
        })
        this.oauth2Server = new OAuth2Server({
            model: this,
        })
    }

    // Required OAuth2Server model methods
    async getClient(clientId: string, clientSecret: string) {
        const isValid = await verifyClientCredentials(
            this.prisma,
            clientId,
            clientSecret
        )
        if (!isValid) {
            throw new InvalidClientError('Invalid client credentials')
        }
        // Return a complete client object with all required properties
        return {
            id: clientId,
            clientId: clientId,
            clientSecret: clientSecret,
            grants: ['client_credentials'],
            redirectUris: [], // Not used for client credentials flow
            accessTokenLifetime: JWT_EXPIRATION_SECONDS,
            refreshTokenLifetime: 0, // Not used for client credentials flow
        }
    }

    /**
     * Required method for client credentials flow.
     * Since we don't have a user in client credentials flow, we return a system user.
     * @param client - The OAuth client
     * @returns A system user object
     */
    async getUserFromClient(_client: Client): Promise<User> {
        // For client credentials flow, we return a system user
        return {
            id: 'system',
            username: 'system',
        }
    }

    /**
     * Validates the requested scope for the client credentials flow.
     * Since we don't use scopes in our implementation, this always returns true.
     * @param user - The user making the request (system user for client credentials)
     * @param client - The OAuth client making the request
     * @param scope - The requested scope (unused in our implementation)
     * @returns Always returns true as we don't use scopes
     */
    async validateScope(
        _user: User,
        _client: Client,
        _scope: string
    ): Promise<boolean> {
        // For client credentials flow, we don't need to validate scopes
        return true
    }

    /**
     * Saves the generated token for the client credentials flow.
     * Since we use JWTs, we don't need to store tokens in the database.
     * @param token - The generated token
     * @param client - The OAuth client
     * @param user - The user (system user for client credentials)
     * @returns The token as-is, since we don't store it
     */
    async saveToken(token: Token, client: Client, user: User): Promise<Token> {
        // For client credentials flow, we don't need to save tokens
        // as we're using JWTs
        return {
            ...token,
            accessToken: await this.generateJWT(client.id),
            accessTokenExpiresAt: new Date(
                Date.now() + JWT_EXPIRATION_SECONDS * 1000
            ),
            client,
            user,
            scope: [], // Empty array since we don't use scopes
        }
    }

    /**
     * Retrieves an access token from storage.
     * Since we use JWTs, we don't store tokens in the database.
     * @param accessToken - The access token to retrieve
     * @returns Always returns null as we don't store tokens
     */
    async getAccessToken(_accessToken: string): Promise<Token | null> {
        // For client credentials flow, we don't need to retrieve tokens
        // as we're using JWTs
        return null
    }

    // Helper method to generate JWT
    private async generateJWT(clientId: string): Promise<string> {
        const clientResult = await getOAuthClientByClientId(
            this.prisma,
            clientId
        )
        if (clientResult instanceof Error || !clientResult) {
            throw new InvalidClientError('Client not found')
        }

        const token = this.jwtLib.createOAuthJWT(
            clientId,
            'client_credentials',
            clientResult.user.id,
            clientResult.grants
        )
        return token.key
    }

    // Main method to handle token requests
    async token(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
        let body: Record<string, unknown> = {}
        const contentType =
            event.headers['Content-Type'] || event.headers['content-type']

        try {
            if (contentType?.includes('application/json')) {
                try {
                    body = event.body ? JSON.parse(event.body) : {}
                } catch {
                    return {
                        statusCode: 400,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            error: 'invalid_request',
                            error_description: 'Invalid JSON payload',
                        }),
                    }
                }
            } else if (
                contentType?.includes('application/x-www-form-urlencoded')
            ) {
                // Parse form-urlencoded data
                const params = new URLSearchParams(event.body || '')
                body = Object.fromEntries(params.entries())
            } else {
                return {
                    statusCode: 400,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        error: 'invalid_request',
                        error_description:
                            'Content-Type must be application/json or application/x-www-form-urlencoded',
                    }),
                }
            }

            // Transform the body to match OAuth2 expected format
            const transformedBody = {
                grant_type: body.grant_type || body.grantType,
                client_id: body.client_id || body.clientId,
                client_secret: body.client_secret || body.clientSecret,
            }

            // Create a new request with the transformed body
            const query = event.queryStringParameters || {}
            const request = new OAuthRequest({
                body: transformedBody,
                headers: event.headers as Record<string, string>,
                method: event.httpMethod,
                query: query as Record<string, string>,
            })

            // Custom is method to get content-type correctly.
            request.is = function (types: string | string[]): string | false {
                const contentType =
                    this.get('content-type') || this.get('Content-Type') || ''

                if (Array.isArray(types)) {
                    for (const type of types) {
                        if (
                            contentType
                                .toLowerCase()
                                .includes(type.toLowerCase())
                        ) {
                            return type // Return the matching type
                        }
                    }
                    return false
                }

                // Single type
                return contentType.toLowerCase().includes(types.toLowerCase())
                    ? types
                    : false
            }

            const response = new OAuthResponse()

            try {
                const token = await this.oauth2Server.token(request, response)
                return {
                    statusCode: 200,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        access_token: token.accessToken,
                        token_type: 'Bearer',
                        expires_in: JWT_EXPIRATION_SECONDS,
                    }),
                }
            } catch (error) {
                if (error instanceof InvalidRequestError) {
                    return {
                        statusCode: 400,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            error: 'invalid_request',
                            error_description: error.message,
                        }),
                    }
                }
                if (error instanceof InvalidClientError) {
                    return {
                        statusCode: 401,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            error: 'invalid_client',
                            error_description: error.message,
                        }),
                    }
                }
                if (error instanceof UnauthorizedClientError) {
                    return {
                        statusCode: 401,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            error: 'unauthorized_client',
                            error_description: error.message,
                        }),
                    }
                }
                return {
                    statusCode: 500,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        error: 'server_error',
                        error_description:
                            error.message || 'Internal server error',
                        error_type: error.name,
                    }),
                }
            }
        } catch (error) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    error: 'invalid_request',
                    error_description:
                        error instanceof Error
                            ? error.message
                            : 'Invalid request body',
                }),
            }
        }
    }
}

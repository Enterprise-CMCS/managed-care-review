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
import { verifyClientCredentials } from '../postgres/oauth/oauthClientStore'
import { newJWTLib } from '../jwt'
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

const JWT_EXPIRATION_SECONDS = 3600 // 1 hour

export class CustomOAuth2Server {
    private oauth2Server: InstanceType<typeof OAuth2Server>
    private prisma: ExtendedPrismaClient
    private jwtLib: ReturnType<typeof newJWTLib>

    constructor(prisma: ExtendedPrismaClient, jwtSecret: string) {
        this.prisma = prisma
        this.jwtLib = newJWTLib({
            issuer: 'mcreview-oauth',
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
    async getUserFromClient(client: Client): Promise<User> {
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
        user: User,
        client: Client,
        scope: string
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
            accessToken: this.generateJWT(client.id),
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
    async getAccessToken(accessToken: string): Promise<Token | null> {
        // For client credentials flow, we don't need to retrieve tokens
        // as we're using JWTs
        return null
    }

    // Helper method to generate JWT
    private generateJWT(clientId: string): string {
        const token = this.jwtLib.createOAuthJWT(clientId, 'client_credentials')
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
                // Transform the JSON body to match OAuth2 expected format
                const transformedBody = {
                    grant_type: body.grantType,
                    client_id: body.clientId,
                    client_secret: body.clientSecret,
                }

                // Create a new request with the transformed body
                const request = new OAuthRequest({
                    body: transformedBody,
                    headers: {
                        ...event.headers,
                        'content-type': 'application/x-www-form-urlencoded',
                    },
                    method: event.httpMethod,
                    query: event.queryStringParameters || {},
                })
                const response = new OAuthResponse()

                try {
                    const token = await this.oauth2Server.token(
                        request,
                        response
                    )
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
                                error_details: error.stack,
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
                                error_details: error.stack,
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
                                error_details: error.stack,
                            }),
                        }
                    }
                    // For any other error, return a more detailed error response
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
                            error_details: error.stack,
                        }),
                    }
                }
            } else if (
                contentType?.includes('application/x-www-form-urlencoded')
            ) {
                // Parse form-urlencoded data
                const params = new URLSearchParams(event.body || '')
                body = Object.fromEntries(params.entries())
                const request = new OAuthRequest({
                    body,
                    headers: event.headers,
                    method: event.httpMethod,
                    query: event.queryStringParameters || {},
                })
                const response = new OAuthResponse()

                try {
                    const token = await this.oauth2Server.token(
                        request,
                        response
                    )

                    // Generate JWT for client credentials flow
                    if (token.grantType === 'client_credentials') {
                        const jwt = this.generateJWT(token.client.id)
                        return {
                            statusCode: 200,
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                access_token: jwt,
                                token_type: 'Bearer',
                                expires_in: 3600,
                            }),
                        }
                    }

                    return {
                        statusCode: 200,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(token),
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
                                error_details: error.stack,
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
                                error_details: error.stack,
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
                                error_details: error.stack,
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
                            error_details: error.stack,
                        }),
                    }
                }
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
                    error_details:
                        error instanceof Error ? error.stack : undefined,
                }),
            }
        }
    }
}

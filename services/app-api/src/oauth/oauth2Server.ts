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
import { sign } from 'jsonwebtoken'
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

export class CustomOAuth2Server {
    private oauth2Server: InstanceType<typeof OAuth2Server>
    private prisma: ExtendedPrismaClient
    private jwtSecret: string

    constructor(prisma: ExtendedPrismaClient, jwtSecret: string) {
        this.prisma = prisma
        this.jwtSecret = jwtSecret
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
        return { id: clientId, grants: ['client_credentials'] }
    }

    async validateScope(user: User, client: Client, scope: string) {
        // For client credentials flow, we don't need to validate scopes
        return true
    }

    async saveToken(token: Token, client: Client, user: User) {
        // For client credentials flow, we don't need to save tokens
        // as we're using JWTs
        return token
    }

    async getAccessToken(accessToken: string) {
        // For client credentials flow, we don't need to retrieve tokens
        // as we're using JWTs
        return null
    }

    // Helper method to generate JWT
    private generateJWT(clientId: string): string {
        const payload = {
            sub: clientId,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
        }
        return sign(payload, this.jwtSecret)
    }

    // Main method to handle token requests
    async token(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
        const request = new OAuthRequest({
            body: event.body ? JSON.parse(event.body) : {},
            headers: event.headers,
            method: event.httpMethod,
            query: event.queryStringParameters || {},
        })
        const response = new OAuthResponse()

        try {
            const token = await this.oauth2Server.token(request, response)

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
                    error_description: 'Internal server error',
                }),
            }
        }
    }
}

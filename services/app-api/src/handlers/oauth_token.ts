import type {
    APIGatewayProxyHandler,
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
} from 'aws-lambda'
import { configurePostgres } from './configuration'
import { CustomOAuth2Server } from '../oauth/oauth2Server'

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60 // 60 requests per minute
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(clientId: string): boolean {
    const now = Date.now()
    const clientRateLimit = rateLimitStore.get(clientId)

    if (!clientRateLimit || now > clientRateLimit.resetTime) {
        // First request or window expired
        rateLimitStore.set(clientId, {
            count: 1,
            resetTime: now + RATE_LIMIT_WINDOW_MS,
        })
        return true
    }

    if (clientRateLimit.count >= MAX_REQUESTS_PER_WINDOW) {
        return false
    }

    // Increment request count
    clientRateLimit.count++
    return true
}

// Export types for use in tests and other modules
export type { APIGatewayProxyEvent, APIGatewayProxyResult }

const main: APIGatewayProxyHandler = async (event) => {
    // Get required environment variables
    const dbURL = process.env.DATABASE_URL
    const secretsManagerSecret = process.env.SECRETS_MANAGER_SECRET
    const jwtSecret = process.env.JWT_SECRET

    if (!dbURL) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'server_error',
                error_description: 'Database configuration missing',
            }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true',
            },
        }
    }

    if (!jwtSecret) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'server_error',
                error_description: 'JWT configuration missing',
            }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true',
            },
        }
    }

    try {
        // Configure database connection
        const pgResult = await configurePostgres(dbURL, secretsManagerSecret)
        if (pgResult instanceof Error) {
            console.error("Init Error: Postgres couldn't be configured")
            throw pgResult
        }

        // Parse request body for rate limiting
        let clientId: string | undefined
        try {
            const body = event.body ? JSON.parse(event.body) : {}
            clientId = body.client_id
        } catch (err) {
            // Invalid JSON will be handled by OAuth2Server
            console.error('Error parsing request body:', err)
            // Continue without client ID - rate limiting won't be applied
            // and OAuth2Server will handle the invalid JSON error
        }

        // Check rate limit if client_id is present
        if (clientId && !checkRateLimit(clientId)) {
            return {
                statusCode: 429,
                body: JSON.stringify({
                    error: 'rate_limit_exceeded',
                    error_description: 'Too many requests',
                }),
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': 'true',
                    'Retry-After': '60',
                },
            }
        }

        const oauth2Server = new CustomOAuth2Server(pgResult, jwtSecret)

        // Handle the token request
        const result = await oauth2Server.token(event)

        return {
            ...result,
            headers: {
                ...result.headers,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true',
            },
        }
    } catch (error) {
        console.error('Error processing token request:', error)
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'server_error',
                error_description: 'Internal server error',
            }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true',
            },
        }
    }
}

export { main }

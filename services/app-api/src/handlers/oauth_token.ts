import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { configurePostgres } from './configuration'
import { CustomOAuth2Server } from '../oauth/oauth2Server'

async function main(
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
    // Check for required environment variables
    if (!process.env.DATABASE_URL) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                error: 'server_error',
                error_description: 'Database configuration missing',
            }),
        }
    }

    if (!process.env.JWT_SECRET) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                error: 'server_error',
                error_description: 'JWT configuration missing',
            }),
        }
    }

    if (!process.env.MCREVIEW_OAUTH_ISSUER) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                error: 'server_error',
                error_description: 'OAuth issuer configuration missing',
            }),
        }
    }

    // Configure database
    const db = await configurePostgres(
        process.env.DATABASE_URL,
        process.env.SECRETS_MANAGER_SECRET
    )
    if (db instanceof Error) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                error: 'server_error',
                error_description: "Error: Postgres couldn't be configured",
            }),
        }
    }

    // Initialize OAuth2 server
    const oauth2Server = new CustomOAuth2Server(
        db,
        process.env.JWT_SECRET,
        process.env.MCREVIEW_OAUTH_ISSUER
    )

    // Handle token request
    return oauth2Server.token(event)
}

export { main }

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

    if (!process.env.SECRETS_MANAGER_SECRET) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                error: 'server_error',
                error_description: 'Secrets manager env var missing',
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

    // stage is either set in lambda env or we can set to local for local dev
    const stage = process.env.stage ?? 'local'
    const dbURL = process.env.DATABASE_URL
    const sms = process.env.SECRETS_MANAGER_SECRET

    // Configure database
    const db = await configurePostgres(dbURL, sms, stage)
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

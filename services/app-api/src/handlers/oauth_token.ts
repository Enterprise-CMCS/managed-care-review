import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { configurePostgres } from './configuration'
import { CustomOAuth2Server } from '../oauth/oauth2Server'
import { initTracer, recordException, flushTracer } from '../otel/otel_handler'

async function main(
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
    const stageName = process.env.stage

    if (stageName === undefined) {
        throw new Error('Configuration Error: stage is required')
    }

    const serviceName = 'app-api-oauth-token-' + stageName
    initTracer(serviceName)

    try {
        // Check for required environment variables
        if (!process.env.DATABASE_URL) {
            const errMsg = 'Database configuration missing'
            recordException(errMsg, serviceName, 'config')
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    error: 'server_error',
                    error_description: errMsg,
                }),
            }
        }

        if (!process.env.SECRETS_MANAGER_SECRET) {
            const errMsg = 'Secrets manager env var missing'
            recordException(errMsg, serviceName, 'config')
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    error: 'server_error',
                    error_description: errMsg,
                }),
            }
        }

        if (!process.env.JWT_SECRET) {
            const errMsg = 'JWT configuration missing'
            recordException(errMsg, serviceName, 'config')
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    error: 'server_error',
                    error_description: errMsg,
                }),
            }
        }

        if (!process.env.MCREVIEW_OAUTH_ISSUER) {
            const errMsg = 'OAuth issuer configuration missing'
            recordException(errMsg, serviceName, 'config')
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    error: 'server_error',
                    error_description: errMsg,
                }),
            }
        }

        const dbURL = process.env.DATABASE_URL
        const sms = process.env.SECRETS_MANAGER_SECRET

        // Configure database
        const db = await configurePostgres(dbURL, sms, stageName)
        if (db instanceof Error) {
            const errMsg = "Error: Postgres couldn't be configured"
            recordException(errMsg, serviceName, 'configurePostgres')
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    error: 'server_error',
                    error_description: errMsg,
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
        return await oauth2Server.token(event)
    } finally {
        try {
            await flushTracer()
        } catch (flushErr) {
            console.warn('otel: flush failed', flushErr)
        }
    }
}

export { main }

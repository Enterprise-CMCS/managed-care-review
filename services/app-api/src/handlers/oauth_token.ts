import type { APIGatewayProxyHandler } from 'aws-lambda'
import { configurePostgres } from './configuration'
import { CustomOAuth2Server } from '../oauth/oauth2Server'

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
                'Access-Control-Allow-Credentials': true,
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
                'Access-Control-Allow-Credentials': true,
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

        const oauth2Server = new CustomOAuth2Server(pgResult, jwtSecret)

        // Handle the token request
        const result = await oauth2Server.token(event)

        return {
            ...result,
            headers: {
                ...result.headers,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
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
                'Access-Control-Allow-Credentials': true,
            },
        }
    }
}

export { main }

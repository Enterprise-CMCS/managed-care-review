import { configurePostgres } from '../handlers/configuration'
import { createOAuthClient } from '../postgres/oauth/oauthClientStore'
import { v4 as uuidv4 } from 'uuid'
import { logError, logSuccess } from '../logger'

async function main() {
    const dbURL = process.env.DATABASE_URL
    const secretsManagerSecret = process.env.SECRETS_MANAGER_SECRET

    if (!dbURL) {
        console.error('DATABASE_URL environment variable is required')
        process.exit(1)
    }

    try {
        // Configure database connection
        const pgResult = await configurePostgres(dbURL, secretsManagerSecret)
        if (pgResult instanceof Error) {
            console.error("Error: Postgres couldn't be configured")
            throw pgResult
        }

        // Generate a random client ID and secret
        const clientId = `test-client-${uuidv4().slice(0, 8)}`
        const clientSecret = uuidv4()
        // Create the OAuth client
        const result = await createOAuthClient(pgResult, {
            grants: ['client_credentials'],
            description: 'Test client for OAuth token endpoint',
            contactEmail: 'test@example.com',
        })

        if (result instanceof Error) {
            console.error('Error creating OAuth client:', result)
            process.exit(1)
        }

        logSuccess('Successfully created OAuth client:')
        logSuccess(`Client ID: ${clientId}`)
        logSuccess(`Client Secret: ${clientSecret}`)
        logSuccess(
            '\nYou can now use these credentials to test the OAuth token endpoint:'
        )
        logSuccess('POST /oauth/token')
        logSuccess('Content-Type: application/json')
        logSuccess('{')
        logSuccess('  "grant_type": "client_credentials",')
        logSuccess(`  "client_id": "${clientId}",`)
        logSuccess(`  "client_secret": "${clientSecret}"`)
        logSuccess('}')
    } catch (error) {
        logError('Error creating OAuth client:', error)
        process.exit(1)
    }
}

void main()

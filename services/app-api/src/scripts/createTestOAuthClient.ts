import { configurePostgres } from '../handlers/configuration'
import { createOAuthClient } from '../postgres/oauth/oauthClientStore'
import { v4 as uuidv4 } from 'uuid'

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
            clientId,
            clientSecret,
            grants: ['client_credentials'],
            description: 'Test client for OAuth token endpoint',
            contactEmail: 'test@example.com',
        })

        if (result instanceof Error) {
            console.error('Error creating OAuth client:', result)
            process.exit(1)
        }

        // eslint-disable-next-line no-console
        console.log('Successfully created OAuth client:')
        // eslint-disable-next-line no-console
        console.log('Client ID:', clientId)
        // eslint-disable-next-line no-console
        console.log('Client Secret:', clientSecret)
        // eslint-disable-next-line no-console
        console.log(
            '\nYou can now use these credentials to test the OAuth token endpoint:'
        )
        // eslint-disable-next-line no-console
        console.log('POST /oauth/token')
        // eslint-disable-next-line no-console
        console.log('Content-Type: application/json')
        // eslint-disable-next-line no-console
        console.log('{')
        // eslint-disable-next-line no-console
        console.log('  "grant_type": "client_credentials",')
        // eslint-disable-next-line no-console
        console.log(`  "client_id": "${clientId}",`)
        // eslint-disable-next-line no-console
        console.log(`  "client_secret": "${clientSecret}"`)
        // eslint-disable-next-line no-console
        console.log('}')
    } catch (error) {
        console.error('Error:', error)
        process.exit(1)
    }
}

void main()

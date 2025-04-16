import { SecretsManager } from './secrets'

// Environment variables
const DB_SECRET_ARN = process.env.DB_SECRET_ARN

export const handler = async () => {
    console.info('Starting database export process...')

    if (!DB_SECRET_ARN) {
        throw new Error('DB_SECRET_ARN environment variable is not set')
    }

    try {
        // Get the shared database credentials
        console.info(`Getting secrets from ${DB_SECRET_ARN}...`)

        const sm = new SecretsManager()
        const dbCredentials = await sm.getSecretDict(
            DB_SECRET_ARN,
            'AWSCURRENT'
        )

        if (!dbCredentials || !dbCredentials.host) {
            throw new Error(
                `Invalid database credentials from secret ${DB_SECRET_ARN}`
            )
        }
    } catch (err) {
        console.error('Error in db export process:', err)
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error during db export process',
                error: String(err),
            }),
        }
    }
}

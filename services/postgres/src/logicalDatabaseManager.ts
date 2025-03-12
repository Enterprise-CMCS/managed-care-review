import { SecretsManager } from './secrets'
import { DatabaseClient } from './db'
import { randomBytes } from 'crypto'
import { SecretDict } from './types'
import { Client } from 'pg'
import {
    DeleteSecretCommand,
    SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager'

interface LambdaEvent {
    action: 'create' | 'delete'
    stageName: string
    devDbSecretArn: string
    dbNamePrefix?: string
    prSecretName?: string
}

interface LambdaResponse {
    statusCode: number
    body: string
}

class DatabaseOperationError extends Error {
    constructor(
        message: string,
        public readonly operation: string,
        public readonly cause?: Error
    ) {
        super(message)
        this.name = 'DatabaseOperationError'
    }
}

export const handler = async (event: LambdaEvent): Promise<LambdaResponse> => {
    console.info('Event:', JSON.stringify(event, null, 2))

    try {
        const {
            action,
            stageName,
            devDbSecretArn,
            dbNamePrefix,
            prSecretName,
        } = event

        if (!action) {
            return formatErrorResponse('Action is required (create or delete)')
        }

        if (!stageName) {
            return formatErrorResponse('Stage name is required')
        }

        if (!devDbSecretArn) {
            return formatErrorResponse('Dev database secret ARN is required')
        }

        const prefix = dbNamePrefix || process.env.DB_NAME_PREFIX || 'reviewapp'
        const dbName = `${prefix}_${stageName}`
        const userName = `${prefix}_user_${stageName}`
        const secretName = prSecretName || `aurora_postgres_${stageName}`

        const manager = new LogicalDatabaseManager()

        try {
            if (action === 'create') {
                return await manager.createLogicalDatabase(
                    devDbSecretArn,
                    dbName,
                    userName,
                    secretName
                )
            } else if (action === 'delete') {
                return await manager.deleteLogicalDatabase(
                    devDbSecretArn,
                    dbName,
                    userName,
                    secretName
                )
            } else {
                return formatErrorResponse(
                    `Invalid action: ${action}. Must be 'create' or 'delete'`
                )
            }
        } catch (error) {
            console.error(`Error in ${action} operation:`, error)
            if (error instanceof DatabaseOperationError) {
                return formatErrorResponse(
                    `Database operation '${error.operation}' failed: ${error.message}`,
                    error
                )
            }
            return formatErrorResponse(
                `Unexpected error during ${action} operation`,
                error instanceof Error ? error : new Error(String(error))
            )
        }
    } catch (error) {
        console.error('Unhandled error in handler:', error)
        return formatErrorResponse(
            'Unhandled error in Lambda handler',
            error instanceof Error ? error : new Error(String(error))
        )
    }
}

// Helper function to format error responses consistently
function formatErrorResponse(message: string, error?: Error): LambdaResponse {
    console.error(message, error)

    return {
        statusCode: 500,
        body: JSON.stringify({
            statusCode: 500,
            message: message,
            error: error ? error.message : undefined,
        }),
    }
}

class LogicalDatabaseManager {
    private secrets: SecretsManager
    private dbClient: DatabaseClient
    private secretsClient: SecretsManagerClient

    constructor() {
        this.secrets = new SecretsManager()
        this.dbClient = new DatabaseClient()
        this.secretsClient = new SecretsManagerClient({})
    }

    /**
     * Create a logical database in the shared PostgreSQL instance
     */
    async createLogicalDatabase(
        secretArn: string,
        dbName: string,
        userName: string,
        prSecretName: string
    ): Promise<LambdaResponse> {
        let dbCredentials: SecretDict
        let client: Client | null = null

        try {
            console.info(`Getting secrets from ${secretArn}`)
            // Get the shared database credentials
            dbCredentials = await this.secrets.getSecretDict(
                secretArn,
                'AWSCURRENT'
            )

            if (!dbCredentials || !dbCredentials.host) {
                throw new Error(
                    `Invalid database credentials from secret ${secretArn}`
                )
            }

            console.info(`Connecting to database at ${dbCredentials.host}`)
            // Connect using our shared DatabaseClient which handles SSL correctly
            client = await this.dbClient.connect(dbCredentials)

            if (!client) {
                throw new DatabaseOperationError(
                    `Failed to connect to database using credentials from ${secretArn}`,
                    'createLogicalDatabase'
                )
            }

            console.info('Connected to PostgreSQL')

            // Check if database already exists
            console.info(`Checking if database ${dbName} exists`)
            const checkResult = await client.query(
                'SELECT 1 FROM pg_database WHERE datname = $1',
                [dbName]
            )

            if (checkResult.rowCount === 0) {
                console.info(`Creating database ${dbName}`)

                // Create the database if it doesn't exist
                // Use double quotes to preserve case sensitivity
                await client.query(`CREATE DATABASE "${dbName}"`)

                console.info(`Database ${dbName} created successfully`)
            } else {
                console.info(`Database ${dbName} already exists`)
            }

            // Check if user exists
            console.info(`Checking if user ${userName} exists`)
            const userCheckResult = await client.query(
                'SELECT 1 FROM pg_roles WHERE rolname = $1',
                [userName]
            )

            let password: string

            if (userCheckResult.rowCount === 0) {
                // Generate a random password
                password = await this.secrets.generatePassword()

                console.info(`Creating user ${userName}`)
                await client.query(
                    `CREATE USER "${userName}" WITH PASSWORD '${password}'`
                )

                console.info(`Granting privileges to ${userName}`)
                await client.query(
                    `GRANT ALL PRIVILEGES ON DATABASE "${dbName}" TO "${userName}"`
                )

                console.info(`User ${userName} created successfully`)
            } else {
                console.info(`User ${userName} already exists`)

                // Reset password for existing user using our DbClient's method
                password = await this.secrets.generatePassword()

                console.info(`Updating password for ${userName}`)
                await this.dbClient.updatePassword(client, userName, password)

                console.info(`Password for user ${userName} reset`)
            }

            // Create or update the PR secret with logical database connection info
            // Use the same secret name that your application would expect for a PR environment
            const secretValue: SecretDict = {
                username: userName,
                password: password,
                engine: 'postgres',
                host: dbCredentials.host,
                port: dbCredentials.port || 5432,
                dbname: dbName,
                ssl: true,
            }

            try {
                console.info(`Checking if secret ${prSecretName} exists`)
                // Check if secret exists
                await this.secrets.describeSecret(prSecretName)

                // Store the token for the update
                const token = randomBytes(32).toString('hex')

                console.info(`Updating secret ${prSecretName}`)
                // Update existing secret with AWSPENDING
                await this.secrets.putSecret(prSecretName, token, secretValue)

                // Move AWSPENDING to AWSCURRENT
                await this.secrets.updateSecretStage(prSecretName, token)

                console.info(
                    `Secret ${prSecretName} updated with logical database credentials`
                )
            } catch (error) {
                console.info(
                    `Secret ${prSecretName} doesn't exist, creating new secret`
                )
                // Secret doesn't exist, create it
                const token = randomBytes(32).toString('hex')
                await this.secrets.putSecret(prSecretName, token, secretValue)
                await this.secrets.updateSecretStage(prSecretName, token)

                console.info(
                    `Secret ${prSecretName} created with logical database credentials`
                )
            }

            return {
                statusCode: 200,
                body: JSON.stringify({
                    statusCode: 200,
                    message: `Database ${dbName} and user ${userName} setup complete`,
                    secretName: prSecretName,
                    dbName: dbName,
                }),
            }
        } catch (error) {
            console.error('Error in createLogicalDatabase:', error)
            throw new DatabaseOperationError(
                `Failed to create logical database ${dbName}`,
                'createLogicalDatabase',
                error instanceof Error ? error : new Error(String(error))
            )
        } finally {
            if (client) {
                try {
                    await client.end()
                    console.info('PostgreSQL connection closed')
                } catch (closeError) {
                    console.error(
                        'Error closing database connection:',
                        closeError
                    )
                }
            }
        }
    }

    /**
     * Delete a logical database from a shared PostgreSQL instance
     */
    async deleteLogicalDatabase(
        secretArn: string,
        dbName: string,
        userName: string,
        prSecretName: string
    ): Promise<LambdaResponse> {
        let dbCredentials: SecretDict
        let client: Client | null = null

        try {
            // Get the shared database credentials
            dbCredentials = await this.secrets.getSecretDict(
                secretArn,
                'AWSCURRENT'
            )

            // Connect using our shared DatabaseClient
            client = await this.dbClient.connect(dbCredentials)

            if (!client) {
                throw new DatabaseOperationError(
                    `Failed to connect to database using credentials from ${secretArn}`,
                    'deleteLogicalDatabase'
                )
            }

            console.info('Connected to PostgreSQL')

            // Terminate all connections to the database
            console.info(`Terminating all connections to ${dbName}`)
            await client.query(
                `
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = $1
            `,
                [dbName]
            )

            console.info(`Terminated all connections to ${dbName}`)

            // Drop the database
            console.info(`Dropping database ${dbName}`)
            await client.query(`DROP DATABASE IF EXISTS "${dbName}"`)
            console.info(`Database ${dbName} dropped`)

            // Drop the user
            console.info(`Dropping user ${userName}`)
            await client.query(`DROP USER IF EXISTS "${userName}"`)
            console.info(`User ${userName} dropped`)

            // Delete the secret (same one that would have been used for the PR environment)
            try {
                console.info(`Deleting secret ${prSecretName}`)
                // Delete the secret directly using the AWS SDK
                await this.secretsClient.send(
                    new DeleteSecretCommand({
                        SecretId: prSecretName,
                        ForceDeleteWithoutRecovery: true,
                    })
                )

                console.info(`Secret ${prSecretName} deleted`)
            } catch (error) {
                console.info(
                    `Secret ${prSecretName} not found or already deleted:`,
                    error
                )
            }

            return {
                statusCode: 200,
                body: JSON.stringify({
                    statusCode: 200,
                    message: `Database ${dbName} and user ${userName} deleted successfully`,
                }),
            }
        } catch (error) {
            console.error('Error in deleteLogicalDatabase:', error)
            throw new DatabaseOperationError(
                `Failed to delete logical database ${dbName}`,
                'deleteLogicalDatabase',
                error instanceof Error ? error : new Error(String(error))
            )
        } finally {
            if (client) {
                try {
                    await client.end()
                    console.info('PostgreSQL connection closed')
                } catch (closeError) {
                    console.error(
                        'Error closing database connection:',
                        closeError
                    )
                }
            }
        }
    }
}

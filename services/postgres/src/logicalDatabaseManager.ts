import { SecretsManager } from './secrets'
import { DatabaseClient } from './db'
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
                console.info(
                    `DELETE: ${devDbSecretArn}, ${dbName}, ${userName}, ${secretName}`
                )
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

    // Extract cause from error if available
    const cause =
        error && 'cause' in error && error.cause instanceof Error
            ? error.cause.message
            : undefined

    // Determine if this is a database operation error with more details
    const isDatabaseError = error instanceof DatabaseOperationError

    return {
        statusCode: 500,
        body: JSON.stringify({
            statusCode: 500,
            message: message,
            error: error ? error.message : undefined,
            cause: cause,
            operation: isDatabaseError
                ? (error as DatabaseOperationError).operation
                : undefined,
            // Include stack trace in dev environments but not in production
            stack:
                process.env.NODE_ENV !== 'production' && error
                    ? error.stack
                    : undefined,
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

            // Run diagnostic queries to help debug issues
            console.info('Running database diagnostics')

            // Check current user and permissions
            const userResult = await client.query(
                'SELECT current_user, current_database()'
            )
            console.info(
                `Connected as user: ${userResult.rows[0].current_user}, database: ${userResult.rows[0].current_database}`
            )

            // Check if connected user has createdb permission
            const permissionResult = await client.query(`
                SELECT rolname, rolcreatedb
                FROM pg_roles
                WHERE rolname = current_user
            `)
            if (permissionResult.rows.length > 0) {
                console.info(
                    `Current user createdb permission: ${permissionResult.rows[0].rolcreatedb}`
                )

                if (!permissionResult.rows[0].rolcreatedb) {
                    console.warn(
                        `Warning: Current user does not have createdb permission, which may cause failures`
                    )
                }
            } else {
                console.warn(
                    `Warning: Could not determine permissions for current user`
                )
            }

            // Check available databases
            const dbListResult = await client.query(`
                SELECT datname 
                FROM pg_database 
                WHERE datistemplate = false
                ORDER BY datname
            `)
            console.info(
                `Available databases: ${dbListResult.rows.map((row) => row.datname).join(', ')}`
            )

            // Check if database already exists
            console.info(`Checking if database ${dbName} exists`)
            const checkResult = await client.query(
                'SELECT 1 FROM pg_database WHERE datname = $1',
                [dbName]
            )

            if (checkResult.rowCount === 0) {
                console.info(`Creating database ${dbName}`)

                try {
                    // Create the database if it doesn't exist
                    // Use double quotes to preserve case sensitivity
                    await client.query(`CREATE DATABASE "${dbName}"`)
                    console.info(`Database ${dbName} created successfully`)
                } catch (createError) {
                    console.error(
                        `Error creating database ${dbName}:`,
                        createError
                    )

                    // If we get a permission error, try using a connection string that switches the database after connection
                    if (
                        createError instanceof Error &&
                        (createError.message.includes('permission denied') ||
                            createError.message.includes(
                                'insufficient privilege'
                            ))
                    ) {
                        console.info(
                            `Attempting alternative approach due to permission restrictions`
                        )

                        // Check if the connected user has CREATEDB privileges
                        const altPermissionCheck = await client.query(`
                            SELECT rolcreatedb FROM pg_roles WHERE rolname = current_user
                        `)

                        if (
                            altPermissionCheck.rows.length > 0 &&
                            altPermissionCheck.rows[0].rolcreatedb
                        ) {
                            console.info(
                                `Current user has CREATEDB privilege, proceeding with creation`
                            )
                            // Try again with the standard approach
                            await client.query(`CREATE DATABASE "${dbName}"`)
                            console.info(
                                `Database ${dbName} created successfully on second attempt`
                            )
                        } else {
                            // If we still can't create the DB, throw a specific error with helpful information
                            throw new Error(
                                `Cannot create database ${dbName}: The database user lacks CREATE DATABASE permission. ` +
                                    `Please ensure the user specified in secret ${secretArn} has CREATEDB privilege ` +
                                    `or update this Lambda to use a user with appropriate permissions.`
                            )
                        }
                    } else {
                        // Re-throw the original error if it's not permission-related
                        throw createError
                    }
                }
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
                console.info(
                    `Creating or updating secret ${prSecretName} with logical database credentials`
                )

                // Use the new specialized function that properly handles existing/new secrets
                await this.secrets.createOrUpdateDatabaseSecret(
                    prSecretName,
                    secretValue
                )

                console.info(
                    `Secret ${prSecretName} created/updated with logical database credentials`
                )
            } catch (error) {
                console.error(
                    `Failed to create/update secret ${prSecretName}:`,
                    error
                )
                throw new DatabaseOperationError(
                    `Failed to create/update secret ${prSecretName} for logical database`,
                    'createLogicalDatabase',
                    error instanceof Error ? error : new Error(String(error))
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
            // Capture more detailed error information
            const errorDetails =
                error instanceof Error ? error.message : String(error)

            // Include error stack trace for debugging
            if (error instanceof Error && error.stack) {
                console.error('Error stack trace:', error.stack)
            }

            // If it's a cause from another error, log that too
            if (error instanceof Error && 'cause' in error && error.cause) {
                console.error('Error cause:', error.cause)
            }

            // Handle specific error types for better diagnostics
            if (error instanceof Error) {
                if (error.message.includes('permission denied')) {
                    throw new DatabaseOperationError(
                        `Permission denied: The database user lacks privileges to create database ${dbName}`,
                        'createLogicalDatabase',
                        error
                    )
                } else if (error.message.includes('connect')) {
                    throw new DatabaseOperationError(
                        `Connection failed: Unable to connect to the database host. Check network/VPC settings and database availability`,
                        'createLogicalDatabase',
                        error
                    )
                } else if (error.message.includes('does not exist')) {
                    throw new DatabaseOperationError(
                        `Resource not found: The specified database resource does not exist`,
                        'createLogicalDatabase',
                        error
                    )
                } else if (error.message.includes('already exists')) {
                    throw new DatabaseOperationError(
                        `Resource conflict: A database resource with this name already exists and cannot be created again`,
                        'createLogicalDatabase',
                        error
                    )
                } else if (error.message.includes('timed out')) {
                    throw new DatabaseOperationError(
                        `Operation timeout: The database operation took too long to complete`,
                        'createLogicalDatabase',
                        error
                    )
                }
            }

            // Default generic error
            throw new DatabaseOperationError(
                `Failed to create logical database ${dbName}: ${errorDetails}`,
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

            if (dbCredentials.dbname === dbName) {
                throw new DatabaseOperationError(
                    `Safety check failed: Cannot drop the database (${dbName}) we're currently connected to`,
                    'deleteLogicalDatabase'
                )
            }

            // Log the database name we're about to operate on
            console.info(
                `Preparing to drop review database ${dbName} (distinct from current database ${dbCredentials.dbname})`
            )

            // Use PostgreSQL 14's WITH (FORCE) option to automatically terminate connections
            try {
                console.info(`Dropping database ${dbName} with FORCE option`)
                await client.query(
                    `DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`
                )
                console.info(`Database ${dbName} dropped successfully`)
            } catch (error) {
                console.error(`Error dropping database ${dbName}:`, error)
                // Log the specific error for debugging
                if (error instanceof Error) {
                    console.error(`Error details: ${error.message}`)
                }

                // Proceed with other cleanup tasks even if database drop fails
                console.warn(
                    `Continuing with cleanup despite database drop issue`
                )
            }

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

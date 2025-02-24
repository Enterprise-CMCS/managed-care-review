import { DescribeSecretCommandOutput } from '@aws-sdk/client-secrets-manager'
import { DatabaseClient } from './db'
import { SecretsManager, SecretsManagerError } from './secrets'
import { RotationEvent, SecretDict } from './types'

interface Context {
    awsRequestId: string
    functionName: string
    getRemainingTimeInMillis(): number
}

/**
 * Error class for rotation failures
 */
export class RotationError extends Error {
    constructor(
        message: string,
        public readonly step: string,
        public readonly secretArn?: string,
        public readonly cause?: Error
    ) {
        super(message)
        this.name = 'RotationError'
    }
}

export class Rotator {
    private db: DatabaseClient
    protected secrets: SecretsManager

    constructor() {
        this.db = new DatabaseClient()
        this.secrets = new SecretsManager()
    }

    async getSecretDetails(arn: string): Promise<void> {
        try {
            const secretDict = await this.secrets.getSecretDict(
                arn,
                'AWSCURRENT'
            )
            console.log('Secret details:', {
                username: secretDict.username,
                host: secretDict.host,
                dbname: secretDict.dbname,
                port: secretDict.port,
                // Don't log the password
            })
        } catch (error) {
            console.error('Failed to get secret details:', error)
            throw new RotationError(
                `Failed to get secret details for ARN: ${arn}`,
                'getSecretDetails',
                arn,
                error instanceof Error ? error : new Error(String(error))
            )
        }
    }

    async describeSecret(arn: string): Promise<DescribeSecretCommandOutput> {
        try {
            return await this.secrets.describeSecret(arn)
        } catch (error) {
            console.error(`Failed to describe secret ${arn}:`, error)
            throw new RotationError(
                `Failed to describe secret for ARN: ${arn}`,
                'describeSecret',
                arn,
                error instanceof Error ? error : new Error(String(error))
            )
        }
    }

    async createSecret(arn: string, token: string): Promise<void> {
        try {
            try {
                await this.secrets.getSecretDict(arn, 'AWSPENDING', token)
                console.log(`Secret already exists for ${arn}`)
                return
            } catch (err) {
                // This is expected if AWSPENDING doesn't exist yet
                console.log(
                    `AWSPENDING version not found, creating new secret for ${arn}`
                )
            }

            // Generate new secret if AWSPENDING doesn't exist
            let current: SecretDict
            try {
                current = await this.secrets.getSecretDict(arn, 'AWSCURRENT')
            } catch (error) {
                throw new RotationError(
                    `Failed to get current secret version for ARN: ${arn}`,
                    'createSecret',
                    arn,
                    error instanceof Error ? error : new Error(String(error))
                )
            }

            let password: string
            try {
                password = await this.secrets.generatePassword()
            } catch (error) {
                throw new RotationError(
                    'Failed to generate new password',
                    'createSecret',
                    arn,
                    error instanceof Error ? error : new Error(String(error))
                )
            }

            try {
                await this.secrets.putSecret(arn, token, {
                    ...current,
                    password,
                })
                console.log(
                    `Successfully created new secret version for ${arn}`
                )
            } catch (error) {
                throw new RotationError(
                    `Failed to store new secret for ARN: ${arn}`,
                    'createSecret',
                    arn,
                    error instanceof Error ? error : new Error(String(error))
                )
            }
        } catch (error) {
            if (error instanceof RotationError) {
                throw error
            }
            throw new RotationError(
                `Unexpected error during createSecret for ARN: ${arn}`,
                'createSecret',
                arn,
                error instanceof Error ? error : new Error(String(error))
            )
        }
    }

    async setSecret(arn: string, token: string): Promise<void> {
        try {
            let pending: SecretDict
            let current: SecretDict

            try {
                pending = await this.secrets.getSecretDict(
                    arn,
                    'AWSPENDING',
                    token
                )
            } catch (error) {
                throw new RotationError(
                    `Failed to get pending secret for ARN: ${arn}, token: ${token}`,
                    'setSecret',
                    arn,
                    error instanceof Error ? error : new Error(String(error))
                )
            }

            try {
                current = await this.secrets.getSecretDict(arn, 'AWSCURRENT')
            } catch (error) {
                throw new RotationError(
                    `Failed to get current secret for ARN: ${arn}`,
                    'setSecret',
                    arn,
                    error instanceof Error ? error : new Error(String(error))
                )
            }

            // Try pending connection first
            let conn = await this.db.connect(pending)
            if (conn) {
                console.log('Successfully connected with pending credentials')
                await conn.end()
                return
            }

            // Validate username and host match
            if (
                pending.username !== current.username ||
                pending.host !== current.host
            ) {
                throw new RotationError(
                    `Username or host mismatch between current and pending secrets for ARN: ${arn}`,
                    'setSecret',
                    arn
                )
            }

            // Try current credentials
            conn = await this.db.connect(current)
            if (!conn) {
                throw new RotationError(
                    `Unable to connect with current or pending credentials for ARN: ${arn}`,
                    'setSecret',
                    arn
                )
            }

            try {
                await this.db.updatePassword(
                    conn,
                    pending.username,
                    pending.password
                )
                console.log(`Updated password for ${pending.username}`)
            } catch (error) {
                throw new RotationError(
                    `Failed to update password for user ${pending.username}`,
                    'setSecret',
                    arn,
                    error instanceof Error ? error : new Error(String(error))
                )
            } finally {
                await conn.end()
            }
        } catch (error) {
            if (error instanceof RotationError) {
                throw error
            }
            throw new RotationError(
                `Unexpected error during setSecret for ARN: ${arn}`,
                'setSecret',
                arn,
                error instanceof Error ? error : new Error(String(error))
            )
        }
    }

    async testSecret(arn: string, token: string): Promise<void> {
        try {
            let pending: SecretDict

            try {
                pending = await this.secrets.getSecretDict(
                    arn,
                    'AWSPENDING',
                    token
                )
            } catch (error) {
                throw new RotationError(
                    `Failed to get pending secret for ARN: ${arn}, token: ${token}`,
                    'testSecret',
                    arn,
                    error instanceof Error ? error : new Error(String(error))
                )
            }

            const conn = await this.db.connect(pending)
            if (!conn) {
                throw new RotationError(
                    `Unable to connect with pending secret for ARN: ${arn}`,
                    'testSecret',
                    arn
                )
            }

            try {
                await conn.query('SELECT NOW()')
                console.log(
                    'Successfully tested connection with pending credentials'
                )
            } catch (error) {
                throw new RotationError(
                    `Database query test failed with pending credentials for ARN: ${arn}`,
                    'testSecret',
                    arn,
                    error instanceof Error ? error : new Error(String(error))
                )
            } finally {
                await conn.end()
            }
        } catch (error) {
            if (error instanceof RotationError) {
                throw error
            }
            throw new RotationError(
                `Unexpected error during testSecret for ARN: ${arn}`,
                'testSecret',
                arn,
                error instanceof Error ? error : new Error(String(error))
            )
        }
    }

    async finishSecret(arn: string, token: string): Promise<void> {
        try {
            let metadata: DescribeSecretCommandOutput

            try {
                metadata = await this.secrets.describeSecret(arn)
            } catch (error) {
                throw new RotationError(
                    `Failed to describe secret for ARN: ${arn}`,
                    'finishSecret',
                    arn,
                    error instanceof Error ? error : new Error(String(error))
                )
            }

            let currentVersion = null

            for (const [version, stages] of Object.entries(
                metadata.VersionIdsToStages || {}
            )) {
                if (stages?.includes('AWSCURRENT')) {
                    if (version === token) {
                        console.log(
                            `Version ${version} already marked as AWSCURRENT`
                        )
                        return
                    }
                    currentVersion = version
                    break
                }
            }

            try {
                await this.secrets.updateSecretStage(
                    arn,
                    token,
                    currentVersion || undefined
                )
                console.log(`Marked version ${token} as AWSCURRENT`)
            } catch (error) {
                throw new RotationError(
                    `Failed to update secret stage for ARN: ${arn}, token: ${token}`,
                    'finishSecret',
                    arn,
                    error instanceof Error ? error : new Error(String(error))
                )
            }
        } catch (error) {
            if (error instanceof RotationError) {
                throw error
            }
            throw new RotationError(
                `Unexpected error during finishSecret for ARN: ${arn}`,
                'finishSecret',
                arn,
                error instanceof Error ? error : new Error(String(error))
            )
        }
    }
}

// Handler function
export async function handler(
    event: RotationEvent,
    context: Context
): Promise<void> {
    console.log('Rotation event:', JSON.stringify(event, null, 2))

    const rotator = new Rotator()
    const { SecretId: arn, ClientRequestToken: token, Step: step } = event

    try {
        // Validate rotation is enabled
        let metadata: DescribeSecretCommandOutput
        try {
            metadata = await rotator.describeSecret(arn)
        } catch (error) {
            console.error(`Handler failed to describe secret ${arn}:`, error)
            throw error
        }

        if (metadata.RotationEnabled === false) {
            throw new RotationError(
                `Secret ${arn} is not enabled for rotation`,
                'handler',
                arn
            )
        }

        if (!metadata.VersionIdsToStages?.[token]) {
            throw new RotationError(
                `Secret version ${token} has no stage for rotation of secret ${arn}`,
                'handler',
                arn
            )
        }

        // Execute the appropriate rotation step
        try {
            switch (step) {
                case 'createSecret':
                    await rotator.createSecret(arn, token)
                    break
                case 'setSecret':
                    await rotator.setSecret(arn, token)
                    break
                case 'testSecret':
                    await rotator.testSecret(arn, token)
                    break
                case 'finishSecret':
                    await rotator.finishSecret(arn, token)
                    break
                default:
                    throw new RotationError(
                        `Invalid step parameter ${step}`,
                        'handler',
                        arn
                    )
            }
        } catch (error) {
            console.error(`Rotation step '${step}' failed:`, error)
            throw error
        }
    } catch (error) {
        console.error('Rotation handler failed:', error)
        if (
            error instanceof RotationError ||
            error instanceof SecretsManagerError
        ) {
            throw error
        }
        throw new RotationError(
            `Unexpected error in handler: ${error instanceof Error ? error.message : String(error)}`,
            'handler',
            arn,
            error instanceof Error ? error : new Error(String(error))
        )
    }
}

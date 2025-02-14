import { DescribeSecretCommandOutput } from '@aws-sdk/client-secrets-manager'
import { DatabaseClient } from './db'
import { SecretsManager } from './secrets'
import { RotationEvent } from './types'
import fs from 'fs'

interface Context {
    awsRequestId: string
    functionName: string
    getRemainingTimeInMillis(): number
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
            console.error('Failed to get secret:', error)
        }
    }

    async describeSecret(arn: string): Promise<DescribeSecretCommandOutput> {
        return this.secrets.describeSecret(arn)
    }

    async createSecret(arn: string, token: string): Promise<void> {
        try {
            await this.secrets.getSecretDict(arn, 'AWSPENDING', token)
            console.log(`Secret already exists for ${arn}`)
            return
        } catch (err) {
            // Generate new secret if AWSPENDING doesn't exist
            const current = await this.secrets.getSecretDict(arn, 'AWSCURRENT')
            const password = await this.secrets.generatePassword()

            await this.secrets.putSecret(arn, token, {
                ...current,
                password,
            })
        }
    }

    async setSecret(arn: string, token: string): Promise<void> {
        const pending = await this.secrets.getSecretDict(
            arn,
            'AWSPENDING',
            token
        )
        const current = await this.secrets.getSecretDict(arn, 'AWSCURRENT')

        // Try pending connection first
        let conn = await this.db.connect(pending)
        if (conn) {
            await conn.end()
            return
        }

        // Validate username and host match
        if (
            pending.username !== current.username ||
            pending.host !== current.host
        ) {
            throw new Error(
                'Username or host mismatch between current and pending secrets'
            )
        }

        // Try current credentials
        conn = await this.db.connect(current)
        if (!conn) {
            throw new Error(
                'Unable to connect with current or pending credentials'
            )
        }

        try {
            await this.db.updatePassword(
                conn,
                pending.username,
                pending.password
            )
            console.log(`Updated password for ${pending.username}`)
        } finally {
            await conn.end()
        }
    }

    async testSecret(arn: string, token: string): Promise<void> {
        const pending = await this.secrets.getSecretDict(
            arn,
            'AWSPENDING',
            token
        )
        const conn = await this.db.connect(pending)

        if (!conn) {
            throw new Error('Unable to connect with pending secret')
        }

        try {
            await conn.query('SELECT NOW()')
            console.log('Successfully tested connection')
        } finally {
            await conn.end()
        }
    }

    async finishSecret(arn: string, token: string): Promise<void> {
        const metadata = await this.secrets.describeSecret(arn)

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

        await this.secrets.updateSecretStage(
            arn,
            token,
            currentVersion || undefined
        )
        console.log(`Marked version ${token} as AWSCURRENT`)
    }
}

// Handler function
export async function handler(
    event: RotationEvent,
    context: Context
): Promise<void> {
    console.log('Event:', JSON.stringify(event, null, 2))

    try {
        fs.accessSync('/etc/pki/tls/certs/ca-bundle.crt')
        console.log('CA bundle exists at /etc/pki/tls/certs/ca-bundle.crt')
    } catch (error) {
        console.log('CA bundle not found:', error)
        ;[
            '/',
            '/etc/ssl/certs/ca-certificates.crt',
            '/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem',
        ].forEach((path) => {
            try {
                fs.accessSync(path)
                console.log(`Found certificates at: ${path}`)
            } catch (e) {
                console.log(`No certificates at: ${path}`)
            }
        })
    }

    const rotator = new Rotator()
    const { SecretId: arn, ClientRequestToken: token, Step: step } = event

    // Validate rotation is enabled
    const metadata = await rotator.describeSecret(arn)

    if (metadata.RotationEnabled === false) {
        throw new Error(`Secret ${arn} is not enabled for rotation`)
    }

    if (!metadata.VersionIdsToStages?.[token]) {
        throw new Error(
            `Secret version ${token} has no stage for rotation of secret ${arn}`
        )
    }

    // Execute the appropriate rotation step
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
            throw new Error(`Invalid step parameter ${step}`)
    }
}

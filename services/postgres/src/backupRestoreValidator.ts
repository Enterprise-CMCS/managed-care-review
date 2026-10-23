import { DatabaseClient } from './db'
import { SecretsManager } from './secrets'
import type { SecretDict } from './types'

export type BackupRestoreValidationEvent = {
    clusterIdentifier: string
    clusterArn: string
    host: string
    port: number
}

export type ValidationConfig = {
    DB_SECRET_ARN: string
    EXPECTED_ACCOUNT_ID: string
    RESTORE_CLUSTER_PREFIX: string
    SOURCE_CLUSTER_IDENTIFIER: string
    EXPECTED_DATABASE: string
    AWS_REGION: string
}

export type ValidationClient = {
    query(sql: string): Promise<{ rows: Record<string, unknown>[] }>
    end(): Promise<void>
}

export type ValidationDependencies = {
    getSecretDict(arn: string, stage: string): Promise<SecretDict>
    connect(credentials: SecretDict): Promise<ValidationClient | null>
}

type ValidationResult = { checks: string[]; appliedMigrationCount: number }

function validateTarget(
    event: BackupRestoreValidationEvent,
    config: ValidationConfig
): void {
    if (
        Object.values(config).some(
            (value) => typeof value !== 'string' || !value
        ) ||
        !/^\d{12}$/.test(config.EXPECTED_ACCOUNT_ID) ||
        !/^[a-z][a-z0-9-]*$/.test(config.RESTORE_CLUSTER_PREFIX) ||
        !/^[a-z]{2}-[a-z]+-\d+$/.test(config.AWS_REGION)
    ) {
        throw new Error('Invalid validator configuration')
    }
    const identifier = event?.clusterIdentifier
    const suffix =
        typeof identifier === 'string'
            ? identifier.slice(config.RESTORE_CLUSTER_PREFIX.length)
            : ''
    if (
        typeof identifier !== 'string' ||
        identifier.length > 63 ||
        !identifier.startsWith(config.RESTORE_CLUSTER_PREFIX) ||
        !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(suffix) ||
        identifier.includes('--') ||
        identifier === config.SOURCE_CLUSTER_IDENTIFIER ||
        event.clusterArn !==
            `arn:aws:rds:${config.AWS_REGION}:${config.EXPECTED_ACCOUNT_ID}:cluster:${identifier}` ||
        typeof event.host !== 'string' ||
        !event.host.startsWith(`${identifier}.`) ||
        !event.host.endsWith(`.${config.AWS_REGION}.rds.amazonaws.com`) ||
        !/^[a-z0-9.-]+$/.test(event.host) ||
        event.port !== 5432
    ) {
        throw new Error('Invalid restored cluster target')
    }
}

/** Read-only smoke checks; no source connection or repository migration baseline. */
export async function validateRestoredCluster(
    event: BackupRestoreValidationEvent,
    config: ValidationConfig,
    dependencies: ValidationDependencies
): Promise<ValidationResult> {
    validateTarget(event, config)
    let client: ValidationClient | null = null
    try {
        // Only a failed connection permits trying the previous password version.
        for (const stage of ['AWSCURRENT', 'AWSPREVIOUS']) {
            const credentials = await dependencies.getSecretDict(
                config.DB_SECRET_ARN,
                stage
            )
            if (credentials.host.toLowerCase() === event.host.toLowerCase()) {
                throw new Error('Restored target matches source host')
            }
            if (credentials.dbname !== config.EXPECTED_DATABASE) {
                throw new Error('Unexpected database in source credentials')
            }
            client = await dependencies.connect({
                ...credentials,
                host: event.host,
                port: event.port,
            })
            if (client) break
        }
        if (!client) throw new Error('Unable to connect to restored cluster')

        await client.query('BEGIN READ ONLY')
        await client.query("SET LOCAL statement_timeout = '10s'")
        const readOnly = await client.query('SHOW transaction_read_only')
        if (readOnly.rows[0]?.transaction_read_only !== 'on') {
            throw new Error('Read-only transaction not enabled')
        }
        const state = await client.query('SELECT 1 FROM public."State" LIMIT 1')
        if (state.rows.length === 0)
            throw new Error('Restored database has no State rows')

        const migrations = await client.query(
            'SELECT finished_at, rolled_back_at FROM public."_prisma_migrations"'
        )
        const activeAttempts = migrations.rows.filter(
            (row) => row.rolled_back_at === null
        )
        if (activeAttempts.some((row) => row.finished_at === null)) {
            throw new Error('Restored database has unfinished migrations')
        }
        const appliedMigrationCount = activeAttempts.filter(
            (row) => row.finished_at != null
        ).length
        if (appliedMigrationCount === 0)
            throw new Error('Restored database has no applied migrations')
        // A valid review environment can have no contracts yet.
        await client.query('SELECT id FROM public."ContractTable" LIMIT 1')
        await client.query('ROLLBACK')
        return {
            checks: [
                'read-only transaction',
                'State populated',
                'Prisma migrations applied',
                'ContractTable readable',
            ],
            appliedMigrationCount,
        }
    } finally {
        await client?.end()
    }
}

export const handler = async (
    event: BackupRestoreValidationEvent
): Promise<{ statusCode: number; body: string }> => {
    try {
        const secrets = new SecretsManager()
        const database = new DatabaseClient()
        const result = await validateRestoredCluster(
            event,
            {
                DB_SECRET_ARN: process.env.DB_SECRET_ARN ?? '',
                EXPECTED_ACCOUNT_ID: process.env.EXPECTED_ACCOUNT_ID ?? '',
                RESTORE_CLUSTER_PREFIX:
                    process.env.RESTORE_CLUSTER_PREFIX ?? '',
                SOURCE_CLUSTER_IDENTIFIER:
                    process.env.SOURCE_CLUSTER_IDENTIFIER ?? '',
                EXPECTED_DATABASE: process.env.EXPECTED_DATABASE ?? '',
                AWS_REGION: process.env.AWS_REGION ?? '',
            },
            {
                getSecretDict: (arn, stage) =>
                    secrets.getSecretDict(arn, stage),
                connect: (credentials) => database.connect(credentials),
            }
        )
        return { statusCode: 200, body: JSON.stringify(result) }
    } catch {
        // Never echo driver errors, secret material, caller input, or database rows.
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Restored cluster validation failed',
            }),
        }
    }
}

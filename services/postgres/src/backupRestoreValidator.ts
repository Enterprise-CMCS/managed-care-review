import { Client } from 'pg'
import { DatabaseClient } from './db'
import { SecretsManager } from './secrets'
import { SecretDict } from './types'

type BackupRestoreValidationEvent = {
    dbSecretArn: string
    restoredDbHost: string
    restoredDbPort?: number
}

type LambdaResponse = {
    statusCode: number
    body: string
}

// db.ts caps statements at 10s, which is fine for rotation but far too short for
// counting every row in a production-sized database.
const STATEMENT_TIMEOUT_MS = 300000

const quoteSqlIdentifier = (identifier: string): string =>
    `"${identifier.replace(/"/g, '""')}"`

async function getTableCounts(client: Client): Promise<Record<string, number>> {
    const tables = await client.query<{ table_name: string }>(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    `)

    const counts: Record<string, number> = {}

    for (const { table_name } of tables.rows) {
        const result = await client.query<{ row_count: string }>(
            `SELECT count(*)::text AS row_count FROM public.${quoteSqlIdentifier(table_name)};`
        )

        counts[table_name] = Number(result.rows[0].row_count)
    }

    return counts
}

/**
 * Reads the Prisma migration history out of the restored backup. A restore that
 * came back with rolled back or half-applied migrations is not usable for
 * recovery even if every table is present.
 */
async function getAppliedMigrations(client: Client): Promise<string[]> {
    const result = await client.query<{
        migration_name: string
        finished_at: Date | null
        rolled_back_at: Date | null
    }>(`
        SELECT migration_name, finished_at, rolled_back_at
        FROM public."_prisma_migrations"
        ORDER BY started_at;
    `)

    if (result.rows.length === 0) {
        throw new Error('Restored backup has no applied Prisma migrations')
    }

    const rolledBack = result.rows
        .filter((row) => row.rolled_back_at)
        .map((row) => row.migration_name)
    if (rolledBack.length > 0) {
        throw new Error(
            `Restored backup contains rolled back migrations: ${rolledBack.join(', ')}`
        )
    }

    const unfinished = result.rows
        .filter((row) => !row.finished_at)
        .map((row) => row.migration_name)
    if (unfinished.length > 0) {
        throw new Error(
            `Restored backup contains unfinished migrations: ${unfinished.join(', ')}`
        )
    }

    return result.rows.map((row) => row.migration_name)
}

function validateMinimumData(counts: Record<string, number>): void {
    const tableNames = Object.keys(counts)
    if (tableNames.length === 0) {
        throw new Error('Restored backup has no public tables')
    }

    const totalRows = Object.values(counts).reduce((sum, c) => sum + c, 0)
    if (totalRows === 0) {
        throw new Error('Restored backup has no rows')
    }

    if (!counts['State']) {
        throw new Error('Restored backup has no State rows')
    }
}

async function connectToDatabase(
    dbClient: DatabaseClient,
    credentials: SecretDict
): Promise<Client> {
    const client = await dbClient.connect(credentials)
    if (!client) {
        throw new Error(`Failed to connect to database at ${credentials.host}`)
    }

    await client.query(`SET statement_timeout = ${STATEMENT_TIMEOUT_MS}`)

    return client
}

function formatResponse(statusCode: number, body: unknown): LambdaResponse {
    return {
        statusCode,
        body: JSON.stringify(body),
    }
}

/**
 * Validates a restored Aurora backup. Only the restored cluster is queried --
 * the live source database is deliberately never connected to.
 */
export const handler = async (
    event: BackupRestoreValidationEvent
): Promise<LambdaResponse> => {
    console.info('Backup restore validation event:', {
        ...event,
        dbSecretArn: event.dbSecretArn ? '[provided]' : undefined,
    })

    const missingField = (['dbSecretArn', 'restoredDbHost'] as const).find(
        (field) => !event[field]
    )

    if (missingField) {
        return formatResponse(400, {
            message: `${missingField} is required`,
        })
    }

    const secrets = new SecretsManager()
    const dbClient = new DatabaseClient()
    let restoredClient: Client | undefined

    try {
        // The restore is a point-in-time copy, so it accepts the source
        // credentials. The source host is never used.
        const credentials = await secrets.getSecretDict(
            event.dbSecretArn,
            'AWSCURRENT'
        )

        restoredClient = await connectToDatabase(dbClient, {
            ...credentials,
            host: event.restoredDbHost,
            port: event.restoredDbPort ?? credentials.port,
        })

        const tableCounts = await getTableCounts(restoredClient)
        validateMinimumData(tableCounts)
        const appliedMigrations = await getAppliedMigrations(restoredClient)

        return formatResponse(200, {
            message: 'Aurora automated backup restore validation passed',
            tableCount: Object.keys(tableCounts).length,
            rowCount: Object.values(tableCounts).reduce((sum, c) => sum + c, 0),
            tableCounts,
            appliedMigrations,
        })
    } catch (error) {
        console.error(
            'Aurora automated backup restore validation failed',
            error
        )
        return formatResponse(500, {
            message: 'Aurora automated backup restore validation failed',
            error: error instanceof Error ? error.message : String(error),
        })
    } finally {
        await restoredClient?.end().catch((error) => {
            console.warn('Failed to close database connection', error)
        })
    }
}

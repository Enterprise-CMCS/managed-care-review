import { Client } from 'pg'
import { DatabaseClient } from './db'
import { SecretsManager } from './secrets'
import { SecretDict } from './types'

type BackupRestoreValidationEvent = {
    sourceDbSecretArn: string
    restoredDbHost: string
    restoredDbPort?: number
    skipSourceCompare?: boolean
}

type TableCount = {
    tableName: string
    rowCount: number
}

type LambdaResponse = {
    statusCode: number
    body: string
}

const quoteSqlIdentifier = (identifier: string): string =>
    `"${identifier.replace(/"/g, '""')}"`

const quoteQualifiedTableName = (tableName: string): string => {
    const [schema, table] = tableName.split('.')
    if (!schema || !table) {
        throw new Error(`Unexpected table name format: ${tableName}`)
    }

    return `${quoteSqlIdentifier(schema)}.${quoteSqlIdentifier(table)}`
}

async function getTableNames(client: Client): Promise<string[]> {
    const result = await client.query<{ table_name: string }>(`
        SELECT table_schema || '.' || table_name AS table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY 1;
    `)

    return result.rows.map((row) => row.table_name)
}

async function getTableCounts(client: Client): Promise<TableCount[]> {
    const tableNames = await getTableNames(client)
    const counts: TableCount[] = []

    for (const tableName of tableNames) {
        const result = await client.query<{ row_count: string }>(
            `SELECT count(*)::text AS row_count FROM ${quoteQualifiedTableName(tableName)};`
        )

        counts.push({
            tableName,
            rowCount: Number(result.rows[0].row_count),
        })
    }

    return counts
}

function validateMinimumData(counts: TableCount[]): void {
    const totalRows = counts.reduce((sum, count) => sum + count.rowCount, 0)
    const stateCount = counts.find(
        (count) => count.tableName === 'public.State'
    )?.rowCount

    if (counts.length === 0) {
        throw new Error('Restored backup has no public tables')
    }

    if (totalRows === 0) {
        throw new Error('Restored backup has no rows')
    }

    if (stateCount === 0) {
        throw new Error('Restored backup has no State rows')
    }
}

function compareTableCounts(
    sourceCounts: TableCount[],
    restoredCounts: TableCount[]
): void {
    const restoredCountByTable = new Map(
        restoredCounts.map((count) => [count.tableName, count.rowCount])
    )

    const mismatches = sourceCounts.flatMap((sourceCount) => {
        const restoredCount = restoredCountByTable.get(sourceCount.tableName)

        if (restoredCount === sourceCount.rowCount) return []

        return [
            {
                tableName: sourceCount.tableName,
                sourceRows: sourceCount.rowCount,
                restoredRows: restoredCount ?? 'missing',
            },
        ]
    })

    const sourceTableNames = new Set(
        sourceCounts.map((count) => count.tableName)
    )
    const extraRestoredTables = restoredCounts
        .filter((count) => !sourceTableNames.has(count.tableName))
        .map((count) => ({
            tableName: count.tableName,
            sourceRows: 'missing',
            restoredRows: count.rowCount,
        }))

    const allMismatches = [...mismatches, ...extraRestoredTables]
    if (allMismatches.length > 0) {
        console.table(allMismatches)
        throw new Error(
            `Restored backup does not match source table counts: ${allMismatches.length} mismatch(es)`
        )
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

    return client
}

function formatResponse(statusCode: number, body: unknown): LambdaResponse {
    return {
        statusCode,
        body: JSON.stringify(body),
    }
}

export const handler = async (
    event: BackupRestoreValidationEvent
): Promise<LambdaResponse> => {
    console.info('Backup restore validation event:', {
        ...event,
        sourceDbSecretArn: event.sourceDbSecretArn ? '[provided]' : undefined,
    })

    if (!event.sourceDbSecretArn) {
        return formatResponse(400, {
            message: 'sourceDbSecretArn is required',
        })
    }

    if (!event.restoredDbHost) {
        return formatResponse(400, {
            message: 'restoredDbHost is required',
        })
    }

    const secrets = new SecretsManager()
    const dbClient = new DatabaseClient()
    let sourceClient: Client | undefined
    let restoredClient: Client | undefined

    try {
        const sourceCredentials = await secrets.getSecretDict(
            event.sourceDbSecretArn,
            'AWSCURRENT'
        )
        const restoredCredentials: SecretDict = {
            ...sourceCredentials,
            host: event.restoredDbHost,
            port: event.restoredDbPort ?? sourceCredentials.port,
        }

        restoredClient = await connectToDatabase(dbClient, restoredCredentials)
        const restoredCounts = await getTableCounts(restoredClient)
        validateMinimumData(restoredCounts)

        if (!event.skipSourceCompare) {
            sourceClient = await connectToDatabase(dbClient, sourceCredentials)
            const sourceCounts = await getTableCounts(sourceClient)
            compareTableCounts(sourceCounts, restoredCounts)
        }

        return formatResponse(200, {
            message: 'Aurora automated backup restore validation passed',
            restoredTableCount: restoredCounts.length,
        })
    } catch (error) {
        console.error('Aurora automated backup restore validation failed', error)
        return formatResponse(500, {
            message: 'Aurora automated backup restore validation failed',
            error: error instanceof Error ? error.message : String(error),
        })
    } finally {
        await Promise.all([
            sourceClient?.end(),
            restoredClient?.end(),
        ]).catch((error) => {
            console.warn('Failed to close database connection', error)
        })
    }
}

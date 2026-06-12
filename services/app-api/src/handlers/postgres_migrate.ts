import type { Handler, APIGatewayProxyResultV2 } from 'aws-lambda'
import { spawnSync } from 'child_process'
import { getPostgresURL, getDBClusterID } from './configuration'
import { initTracer, recordException, flushTracer } from '../otel/otel_handler'
import { RDSClient, CreateDBClusterSnapshotCommand } from '@aws-sdk/client-rds'

const main: Handler = async (): Promise<APIGatewayProxyResultV2> => {
    const serviceName = 'postgres-migrate'
    initTracer(serviceName)
    try {
        const result = await run(serviceName)
        // Throw on a non-200 result so callers that key off a thrown error treat a
        // failed migration as a failure.
        if (typeof result !== 'string' && result.statusCode !== 200) {
            throw new Error(
                `postgres migrate failed: ${result.body ?? 'unknown error'}`
            )
        }
        return result
    } finally {
        try {
            await flushTracer()
        } catch (flushErr) {
            console.warn('otel: flush failed', flushErr)
        }
    }
}

const run = async (serviceName: string): Promise<APIGatewayProxyResultV2> => {
    // get the relevant env vars and check that they exist.
    const dbURL = process.env.DATABASE_URL
    const secretsManagerSecret = process.env.SECRETS_MANAGER_SECRET
    const connectTimeout = process.env.CONNECT_TIMEOUT ?? '60'
    // stage is either set in lambda env or we can set to local for local dev
    const stage = process.env.stage ?? 'local'

    if (!dbURL) {
        const errMsg = 'Init Error: DATABASE_URL is required to run app-api'
        recordException(errMsg, serviceName, 'dbURL')
        return fmtMigrateError(errMsg)
    }

    if (!secretsManagerSecret) {
        const errMsg =
            'Init Error: SECRETS_MANAGER_SECRET is required to run postgres migrate'
        recordException(errMsg, serviceName, 'secretsManagerSecret')
        return fmtMigrateError(errMsg)
    }

    if (!stage) {
        const errMsg = 'Init Error: STAGE not set in environment'
        recordException(errMsg, serviceName, 'stage')
        return fmtMigrateError(errMsg)
    }

    const dbConnResult = await getPostgresURL(dbURL, secretsManagerSecret)
    if (dbConnResult instanceof Error) {
        const errMsg = `Init Error: failed to get pg URL: ${dbConnResult}`
        recordException(errMsg, serviceName, 'getPostgresURL')
        return fmtMigrateError(errMsg)
    }

    const dbConnectionURL: string = dbConnResult

    // Take a snapshot of the DB before applying Prisma schema migrations (prisma migrate deploy).
    // Don't take snapshots for PR branches (temporary review environments).
    if (['dev', 'val', 'prod', 'main'].includes(stage)) {
        const dbClusterId = await getDBClusterID(secretsManagerSecret)
        if (dbClusterId instanceof Error) {
            const errMsg = `Init Error: failed to get db cluster ID: ${dbClusterId}`
            recordException(errMsg, serviceName, 'getDBClusterID')
            return fmtMigrateError(errMsg)
        }

        const snapshotID = stage + '-' + Date.now()
        const params = {
            DBClusterIdentifier: dbClusterId,
            DBClusterSnapshotIdentifier: snapshotID,
        }
        try {
            const rds = new RDSClient({ apiVersion: '2014-10-31' })
            const command = new CreateDBClusterSnapshotCommand(params)
            await rds.send(command)
            console.info(
                `Successfully created DB snapshot: ${snapshotID} for cluster: ${dbClusterId}`
            )
        } catch (err) {
            const errMsg = `Could not take RDS snapshot before migrating: ${err}`
            recordException(
                errMsg,
                serviceName,
                'CreateDBClusterSnapshotCommand'
            )
            return fmtMigrateError(errMsg)
        }
    }

    // run the schema migration. this will add any new tables or fields from schema.prisma to postgres
    try {
        // Aurora can have long cold starts, so we extend connection timeout on migrates
        const configPath =
            process.env.PRISMA_CONFIG_PATH ?? './prisma.config.ts'
        const prismaCliPath =
            process.env.PRISMA_CLI_PATH ??
            './node_modules/prisma/build/index.js'
        const prismaResult = spawnSync(
            process.execPath,
            [prismaCliPath, 'migrate', 'deploy', `--config=${configPath}`],
            {
                cwd: process.cwd(),
                env: {
                    ...process.env,
                    DATABASE_URL:
                        dbConnectionURL + `&connect_timeout=${connectTimeout}`,
                    // Ensure npm/prisma never tries to use an unwritable home dir in Lambda.
                    HOME: process.env.HOME ?? '/tmp',
                    NPM_CONFIG_CACHE:
                        process.env.NPM_CONFIG_CACHE ?? '/tmp/.npm',
                    PRISMA_HIDE_UPDATE_MESSAGE: 'true',
                },
            }
        )
        console.info('stderr', prismaResult.stderr?.toString() ?? 'no stderr')
        console.info('stdout', prismaResult.stdout?.toString() ?? 'no stdout')
        if (prismaResult.status !== 0) {
            const errMsg = `Could not run prisma migrate deploy: ${prismaResult.stderr?.toString() ?? prismaResult.error?.message ?? 'unknown error'}`
            recordException(errMsg, serviceName, 'prisma migrate deploy')
            return fmtMigrateError(errMsg)
        }
    } catch (err) {
        const errMsg = `Could not migrate the prisma database schema: ${err}`
        recordException(errMsg, serviceName, 'prisma migrate deploy')
        return fmtMigrateError(errMsg)
    }

    const success: APIGatewayProxyResultV2 = {
        statusCode: 200,
        body: JSON.stringify('successfully migrated postgres'),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
    }
    return success
}

function fmtMigrateError(error: string): APIGatewayProxyResultV2 {
    return {
        statusCode: 500,
        body: JSON.stringify(error),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
    }
}

export { main }

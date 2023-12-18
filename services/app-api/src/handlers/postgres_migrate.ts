import type { Handler, APIGatewayProxyResultV2 } from 'aws-lambda'
import { RDSClient, CreateDBClusterSnapshotCommand } from '@aws-sdk/client-rds'
import { spawnSync } from 'child_process'
import { getDBClusterID, getPostgresURL } from './configuration'
import { initTracer, recordException } from '../../../uploads/src/lib/otel'
import { migrate, newDBMigrator } from '../dataMigrations/dataMigrator'

export const main: Handler = async (): Promise<APIGatewayProxyResultV2> => {
    // setup otel tracing
    const otelCollectorURL = process.env.REACT_APP_OTEL_COLLECTOR_URL
    if (!otelCollectorURL || otelCollectorURL === '') {
        const errMsg =
            'Configuration Error: REACT_APP_OTEL_COLLECTOR_URL must be set'
        return fmtMigrateError(errMsg)
    }
    const serviceName = 'postgres-migrate'
    initTracer(serviceName, otelCollectorURL)

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

    // run the schema migration. this will add any new tables or fields from schema.prisma to postgres
    try {
        // Aurora can have long cold starts, so we extend connection timeout on migrates
        const schemaPath =
            process.env.SCHEMA_PATH ?? '/opt/nodejs/prisma/schema.prisma'
        const prismaResult = spawnSync(
            `${process.execPath}`,
            [
                '/opt/nodejs/node_modules/prisma/build/index.js',
                'migrate',
                'deploy',
                `--schema=${schemaPath}`,
            ],
            {
                env: {
                    DATABASE_URL:
                        dbConnectionURL + `&connect_timeout=${connectTimeout}`,
                },
            }
        )
        console.info(
            'stderror',
            prismaResult.stderr && prismaResult.stderr.toString()
        )
        console.info(
            'stdout',
            prismaResult.stdout && prismaResult.stdout.toString()
        )
        if (prismaResult.status !== 0) {
            const errMsg = `Could not run prisma migrate deploy: ${prismaResult.stderr.toString()}`
            recordException(errMsg, serviceName, 'prisma migrate deploy')
            return fmtMigrateError(errMsg)
        }
    } catch (err) {
        const errMsg = `Could not migrate the prisma database schema: ${err}`
        recordException(errMsg, serviceName, 'prisma migrate deploy')
        return fmtMigrateError(errMsg)
    }

    // take a snapshot of the DB before running data migration.
    // don't take a snapshot if we're in a PR branch
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

    // Run the prisma dataMigrations.
    // these are compiled in app-api so we can call them directly

    const dataMigratorDBURL =
        dbConnectionURL + `&connect_timeout=${connectTimeout}`

    const dataMigrator = newDBMigrator(dataMigratorDBURL)

    const migrationResult = await migrate(
        dataMigrator,
        '/opt/nodejs/dataMigrations/migrations/'
    )
    if (migrationResult instanceof Error) {
        const errMsg = `Could not migrate the database protobufs: ${migrationResult}`
        recordException(errMsg, serviceName, 'migrate protos db')
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

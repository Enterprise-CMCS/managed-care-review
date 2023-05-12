import { Handler, APIGatewayProxyResultV2 } from 'aws-lambda'
import { RDSClient, CreateDBClusterSnapshotCommand } from '@aws-sdk/client-rds'
import { spawnSync } from 'child_process'
import { getDBClusterID, getPostgresURL } from './configuration'
import { initTracer, recordException } from '../../../uploads/src/lib/otel'

export const main: Handler = async (): Promise<APIGatewayProxyResultV2> => {
    // setup otel tracing
    const otelCollectorURL = process.env.REACT_APP_OTEL_COLLECTOR_URL
    if (!otelCollectorURL || otelCollectorURL === '') {
        const error = new Error(
            'Configuration Error: REACT_APP_OTEL_COLLECTOR_URL must be set'
        )
        throw error
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
        const error = new Error(
            'Init Error: DATABASE_URL is required to run app-api'
        )
        recordException(error, serviceName, 'dbURL')
        return fmtMigrateError(error)
    }

    if (!secretsManagerSecret) {
        const error = new Error(
            'Init Error: SECRETS_MANAGER_SECRET is required to run postgres migrate'
        )
        recordException(error, serviceName, 'secretsManagerSecret')
        return fmtMigrateError(error)
    }

    if (!stage) {
        const error = new Error('Init Error: STAGE not set in environment')
        recordException(error, serviceName, 'stage')
        return fmtMigrateError(error)
    }

    const dbConnResult = await getPostgresURL(dbURL, secretsManagerSecret)
    if (dbConnResult instanceof Error) {
        const error = new Error(
            `Init Error: failed to get pg URL: ${dbConnResult}`
        )
        recordException(error, serviceName, 'getPostgresURL')
        return fmtMigrateError(error)
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
            const error = new Error(
                `Could not run prisma migrate deploy: ${prismaResult.stderr.toString()}`
            )
            recordException(error, serviceName, 'prisma migrate deploy')
            return fmtMigrateError(error)
        }
    } catch (err) {
        const error = new Error(`Could not migrate the database schema: ${err}`)
        recordException(error, serviceName, 'prisma migrate deploy')
        return fmtMigrateError(error)
    }

    // take a snapshot of the DB before running data migration.
    // don't take a snapshot if we're in a PR branch
    if (['dev', 'val', 'prod', 'main'].includes(stage)) {
        const dbClusterId = await getDBClusterID(secretsManagerSecret)
        if (dbClusterId instanceof Error) {
            const error = new Error(
                `Init Error: failed to get db cluster ID: ${dbClusterId}`
            )
            recordException(error, serviceName, 'getDBClusterID')
            return fmtMigrateError(error)
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
            const error = new Error(
                `Could not take RDS snapshot before migrating: ${err}`
            )
            recordException(
                error,
                serviceName,
                'CreateDBClusterSnapshotCommand'
            )
            return fmtMigrateError(error)
        }
    }

    // run the data migration. this will run any data changes to the protobufs stored in postgres
    try {
        const connectTimeout = process.env.CONNECT_TIMEOUT ?? '60'
        const migrateProtosResult = spawnSync(
            `${process.execPath}`,
            [
                '/opt/nodejs/protoMigrator/migrate_protos.js',
                'db',
                '/opt/nodejs/protoMigrator/healthPlanFormDataMigrations',
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
            migrateProtosResult.stderr && migrateProtosResult.stderr.toString()
        )
        console.info(
            'stdout',
            migrateProtosResult.stdout && migrateProtosResult.stdout.toString()
        )
        if (migrateProtosResult.status !== 0) {
            const error = new Error(
                `Could not run migrate_protos db: ${migrateProtosResult.stderr.toString()}`
            )
            recordException(error, serviceName, 'migrate_protos db')
            return fmtMigrateError(error)
        }
    } catch (err) {
        const error = new Error(
            `Could not migrate the database protobufs: ${err}`
        )
        recordException(error, serviceName, 'migrate protos db')
        return fmtMigrateError(error)
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

function fmtMigrateError(error: Error): APIGatewayProxyResultV2 {
    return {
        statusCode: 500,
        body: JSON.stringify(error),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
    }
}

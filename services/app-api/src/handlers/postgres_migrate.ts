import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda'
import { RDSClient, CreateDBClusterSnapshotCommand } from '@aws-sdk/client-rds'
import { spawnSync } from 'child_process'
import { getDBClusterID, getPostgresURL } from './configuration'
import { initTracer, recordException } from '../../../uploads/src/lib/otel'

export const main: APIGatewayProxyHandler =
    async (): Promise<APIGatewayProxyResult> => {
        // setup otel tracing
        const otelCollectorURL = process.env.REACT_APP_OTEL_COLLECTOR_URL
        if (!otelCollectorURL || otelCollectorURL === '') {
            throw new Error(
                'Configuration Error: REACT_APP_OTEL_COLLECTOR_URL must be set'
            )
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
            throw error
        }

        if (!secretsManagerSecret) {
            const error = new Error(
                'Init Error: SECRETS_MANAGER_SECRET is required to run postgres migrate'
            )
            recordException(error, serviceName, 'secretsManagerSecret')
            throw error
        }

        if (!stage) {
            const error = new Error('Init Error: STAGE not set in environment')
            recordException(error, serviceName, 'stage')
            throw error
        }

        const dbConnResult = await getPostgresURL(dbURL, secretsManagerSecret)
        if (dbConnResult instanceof Error) {
            const errorMessage = `Init Error: failed to get pg URL: ${dbConnResult}`
            recordException(errorMessage, serviceName, 'getPostgresURL')
            throw dbConnResult
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
                    'break-it',
                    'deploy',
                    `--schema=${schemaPath}`,
                ],
                {
                    env: {
                        DATABASE_URL:
                            dbConnectionURL +
                            `&connect_timeout=${connectTimeout}`,
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
                throw error
            }
        } catch (err) {
            const errorMessage = `Could not migrate the database schema: ${err}`
            recordException(errorMessage, serviceName, 'prisma migrate deploy')
            return {
                statusCode: 400,
                body: JSON.stringify({
                    code: 'SCHEMA_MIGRATION_FAILED',
                    message: errorMessage,
                }),
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                },
            } as APIGatewayProxyResult
        }

        // take a snapshot of the DB before running data migration.
        // don't take a snapshot if we're in a PR branch
        if (['dev', 'val', 'prod', 'main'].includes(stage)) {
            const dbClusterId = await getDBClusterID(secretsManagerSecret)
            if (dbClusterId instanceof Error) {
                const errorMessage = `Init Error: failed to get db cluster ID: ${dbClusterId}`
                recordException(errorMessage, serviceName, 'getDBClusterID')
                throw dbClusterId
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
                const errorMessage = `Could not take RDS snapshot before migrating: ${err}`
                recordException(
                    errorMessage,
                    serviceName,
                    'CreateDBClusterSnapshotCommand'
                )
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        code: 'DB_SNAPSHOT_FAILED',
                        message: errorMessage,
                    }),
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Credentials': true,
                    },
                } as APIGatewayProxyResult
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
                            dbConnectionURL +
                            `&connect_timeout=${connectTimeout}`,
                    },
                }
            )

            console.info(
                'stderror',
                migrateProtosResult.stderr &&
                    migrateProtosResult.stderr.toString()
            )
            console.info(
                'stdout',
                migrateProtosResult.stdout &&
                    migrateProtosResult.stdout.toString()
            )
            if (migrateProtosResult.status !== 0) {
                const error = new Error(
                    `Could not run migrate_protos db: ${migrateProtosResult.stderr.toString()}`
                )
                recordException(error, serviceName, 'migrate_protos db')
                throw error
            }
        } catch (err) {
            const errorMessage = `Could not migrate the database protobufs: ${err}`
            recordException(errorMessage, serviceName, 'migrate protos db')
            return {
                statusCode: 400,
                body: JSON.stringify({
                    code: 'DATA_MIGRATION_FAILED',
                    message: errorMessage,
                }),
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                },
            } as APIGatewayProxyResult
        }

        return {
            statusCode: 200,
            body: JSON.stringify('successfully migrated'),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        } as APIGatewayProxyResult
    }

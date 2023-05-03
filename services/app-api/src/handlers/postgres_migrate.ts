import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda'
import { RDSClient, CreateDBClusterSnapshotCommand } from '@aws-sdk/client-rds'
import { execSync } from 'child_process'
import { getDBClusterID, getPostgresURL } from './configuration'

export const main: APIGatewayProxyHandler =
    async (): Promise<APIGatewayProxyResult> => {
        // get the relevant env vars and check that they exist.
        const dbURL = process.env.DATABASE_URL
        const secretsManagerSecret = process.env.SECRETS_MANAGER_SECRET
        const connectTimeout = process.env.CONNECT_TIMEOUT ?? '60'
        // stage is either set in lambda env or we can set to local for local dev
        const stage = process.env.stage ?? 'local'

        if (!dbURL) {
            throw new Error(
                'Init Error: DATABASE_URL is required to run app-api'
            )
        }

        if (!secretsManagerSecret) {
            throw new Error(
                'Init Error: SECRETS_MANAGER_SECRET is required to run postgres migrate'
            )
        }

        if (!stage) {
            throw new Error('Init Error: STAGE not set in environment')
        }

        const dbConnResult = await getPostgresURL(dbURL, secretsManagerSecret)
        if (dbConnResult instanceof Error) {
            console.error('Init Error: failed to get pg URL', dbConnResult)
            throw dbConnResult
        }

        const dbConnectionURL: string = dbConnResult

        // run the schema migration. this will add any new tables or fields from schema.prisma to postgres
        try {
            // Aurora can have long cold starts, so we extend connection timeout on migrates
            const schemaPath =
                process.env.SCHEMA_PATH ?? '/opt/nodejs/prisma/schema.prisma'
            execSync(
                `${process.execPath} /opt/nodejs/node_modules/prisma/build/index.js migrate deploy --schema=${schemaPath}`,
                {
                    env: {
                        DATABASE_URL:
                            dbConnectionURL +
                            `&connect_timeout=${connectTimeout}`,
                    },
                }
            )
        } catch (err) {
            const errorMessage = `Could not migrate the database schema: ${err}`
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
                console.error(
                    'Init Error: failed to get db cluster ID, ',
                    dbClusterId
                )
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
                console.error(err)
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        code: 'DB_SNAPSHOT_FAILED',
                        message:
                            'Could not create a snapshot of the DB before migration: ' +
                            err,
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
            execSync(
                `${process.execPath} /opt/nodejs/protoMigrator/migrate_protos.js db '/opt/nodejs/protoMigrator/healthPlanFormDataMigrations'`,
                {
                    env: {
                        DATABASE_URL:
                            dbConnectionURL +
                            `&connect_timeout=${connectTimeout}`,
                    },
                }
            )
        } catch (err) {
            console.info(err)
            return {
                statusCode: 400,
                body: JSON.stringify({
                    code: 'DATA_MIGRATION_FAILED',
                    message: 'Could not migrate the database protobufs: ' + err,
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

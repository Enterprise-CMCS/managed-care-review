import type { Handler, APIGatewayProxyResultV2 } from 'aws-lambda'
import { spawnSync } from 'child_process'
import { getPostgresURL } from './configuration'
import { initTracer, recordException } from '../otel/otel_handler'

const main: Handler = async (): Promise<APIGatewayProxyResultV2> => {
    // setup otel tracing
    const otelCollectorURL = process.env.API_APP_OTEL_COLLECTOR_URL
    if (!otelCollectorURL || otelCollectorURL === '') {
        const errMsg =
            'Configuration Error: API_APP_OTEL_COLLECTOR_URL must be set'
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
        // With Prisma 7, schema and migrations are bundled directly with the Lambda
        const schemaPath = process.env.SCHEMA_PATH ?? './prisma/schema.prisma'
        const prismaCliPath =
            process.env.PRISMA_CLI_PATH ??
            './node_modules/prisma/build/index.js'
        const prismaResult = spawnSync(
            process.execPath,
            [prismaCliPath, 'migrate', 'deploy', `--schema=${schemaPath}`],
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

import type { APIGatewayProxyResultV2, Handler } from 'aws-lambda'
import { initTracer, recordException } from '../../../uploads/src/lib/otel'
import { configurePostgres } from './configuration'
import { NewPostgresStore } from '../postgres'

const main: Handler = async (): Promise<APIGatewayProxyResultV2> => {
    // setup otel tracing
    const otelCollectorURL = process.env.API_APP_OTEL_COLLECTOR_URL
    if (!otelCollectorURL || otelCollectorURL === '') {
        const errMsg =
            'Configuration Error: API_APP_OTEL_COLLECTOR_URL must be set'
        return fmtAuditError(errMsg)
    }
    const serviceName = 'audit-s3'
    initTracer(serviceName, otelCollectorURL)

    // get the relevant env vars and check that they exist.
    const dbURL = process.env.DATABASE_URL
    const secretsManagerSecret = process.env.SECRETS_MANAGER_SECRET

    // stage is either set in lambda env or we can set to local for local dev
    const stage = process.env.stage ?? 'local'

    if (!dbURL) {
        const errMsg = 'Init Error: DATABASE_URL is required to run app-api'
        recordException(errMsg, serviceName, 'dbURL')
        return fmtAuditError(errMsg)
    }

    if (!secretsManagerSecret) {
        const errMsg =
            'Init Error: SECRETS_MANAGER_SECRET is required to run postgres migrate'
        recordException(errMsg, serviceName, 'secretsManagerSecret')
        return fmtAuditError(errMsg)
    }

    if (!stage) {
        const errMsg = 'Init Error: STAGE not set in environment'
        recordException(errMsg, serviceName, 'stage')
        return fmtAuditError(errMsg)
    }

    const pgResult = await configurePostgres(dbURL, secretsManagerSecret)
    if (pgResult instanceof Error) {
        console.error("Init Error: Postgres couldn't be configured")
        throw pgResult
    }
    const store = NewPostgresStore(pgResult)
    const testRes = await store.findAllDocuments()
    console.info(
        `This doesn't return anything right now: ${JSON.stringify(testRes)}`
    )

    const success: APIGatewayProxyResultV2 = {
        statusCode: 200,
        body: JSON.stringify('testing success'),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
    }
    return success
}

function fmtAuditError(error: string): APIGatewayProxyResultV2 {
    return {
        statusCode: 500,
        body: JSON.stringify(error),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
    }
}

module.exports = { main }

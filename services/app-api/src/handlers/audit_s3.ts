import type { APIGatewayProxyResultV2, Handler } from 'aws-lambda'
import { initTracer, recordException } from '../../../uploads/src/lib/otel'
import { configurePostgres } from './configuration'
import { NewPostgresStore } from '../postgres'
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3'
import type { S3ServiceException } from '@aws-sdk/client-s3'
import type { AuditDocument } from '../domain-models'

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

    const s3Client = new S3Client({ region: 'us-east-1' })

    const pgResult = await configurePostgres(dbURL, secretsManagerSecret)
    if (pgResult instanceof Error) {
        console.error("Init Error: Postgres couldn't be configured")
        throw pgResult
    }
    const store = NewPostgresStore(pgResult)

    // fetch all the documents in the db
    const docResult = await store.findAllDocuments()
    if (docResult instanceof Error) {
        console.error('Audit failed:', docResult.message)
        return {
            statusCode: 500,
            body: JSON.stringify(docResult),
        }
    }

    // any doc we can't get on s3 or causes an error we care about
    const missingOrErrorDocuments: AuditDocument[] = []
    for (const doc of docResult) {
        const processResult = await processDocument(s3Client, doc)
        if (processResult) {
            missingOrErrorDocuments.push(processResult)
        }
    }
    console.info(
        `These documents could not be retreived from s3: ${JSON.stringify(missingOrErrorDocuments)}`
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

async function isDocumentInS3(
    client: S3Client,
    s3URL: string
): Promise<boolean> {
    try {
        const { bucket, key } = parseS3URL(s3URL)
        const command = new HeadObjectCommand({
            Bucket: bucket,
            Key: key,
        })
        await client.send(command)
        return true
    } catch (error) {
        if (isS3ServiceException(error) && error.name === 'NotFound') {
            return false
        }
        throw error
    }
}

function parseS3URL(s3URL: string): { bucket: string; key: string } {
    const url = new URL(s3URL)
    return {
        bucket: url.hostname,
        key: url.pathname.slice(1),
    }
}

// Type guard for S3ServiceException
function isS3ServiceException(error: unknown): error is S3ServiceException {
    return (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        typeof (error as S3ServiceException).name === 'string'
    )
}

async function processDocument(
    client: S3Client,
    doc: AuditDocument
): Promise<AuditDocument | void> {
    console.info(`Processing ${doc.type} document: ${doc.name}`)

    try {
        const existsInS3 = await isDocumentInS3(client, doc.s3URL)

        if (!existsInS3) {
            console.warn(
                `Document ${doc.name} (ID: ${doc.id}) does not exist in S3 at ${doc.s3URL}`
            )
            return doc
        }
    } catch (error) {
        console.error(
            `Error processing document ${doc.name} (ID: ${doc.id}):`,
            error
        )
        return doc
    }
}

module.exports = { main }

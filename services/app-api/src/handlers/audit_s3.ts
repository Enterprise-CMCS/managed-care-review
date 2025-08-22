import type { APIGatewayProxyResultV2, Handler } from 'aws-lambda'
import { initTracer, recordException } from '../../../uploads/src/lib/otel'
import { configurePostgres } from './configuration'
import { NewPostgresStore, NotFoundError } from '../postgres'
import type { Store } from '../postgres'
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3'
import type { S3ServiceException } from '@aws-sdk/client-s3'
import type { AuditDocument } from '../domain-models'
import type { ContractRevisionTable, RateRevisionTable } from '@prisma/client'

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

    // dedup
    const uniqueDocuments = deduplicateDocuments(missingOrErrorDocuments)
    console.info(
        `Missing ${uniqueDocuments.length} of ${docResult.length} documents`
    )

    // get the contract or rate
    const { results, errors } = await fetchAssociatedData(
        store,
        uniqueDocuments
    )
    if (errors.length > 0) {
        console.error(
            'Errors encountered while fetching associated data:',
            errors
        )
    }
    console.info(`found ${results.length} documents with associations`)
    console.info(
        `These documents could not be retreived from s3: ${JSON.stringify(results)}`
    )

    const success: APIGatewayProxyResultV2 = {
        statusCode: 200,
        body: JSON.stringify(results),
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
    const fullPath = url.pathname.slice(1) // Remove leading '/'
    const uuidPart = fullPath.split('/')[0] // Extract the UUID part
    const key = `allusers/${uuidPart}` // Construct the key

    return {
        bucket: url.hostname,
        key: key,
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

function deduplicateDocuments(documents: AuditDocument[]): AuditDocument[] {
    const uniqueDocuments = new Map<string, AuditDocument>()

    for (const doc of documents) {
        if (!uniqueDocuments.has(doc.s3URL)) {
            uniqueDocuments.set(doc.s3URL, doc)
        }
    }

    return Array.from(uniqueDocuments.values())
}

type DocumentWithAssociation = AuditDocument & {
    associatedContract?: ContractRevisionTable
    associatedRate?: RateRevisionTable
}

type FetchError = {
    documentId: string
    type: 'contractDoc' | 'rateDoc'
    error: Error | NotFoundError
    revisionId: string | null
}

async function fetchAssociatedData(
    store: Store,
    documents: AuditDocument[]
): Promise<{
    results: DocumentWithAssociation[]
    errors: FetchError[]
}> {
    const results: DocumentWithAssociation[] = []
    const errors: FetchError[] = []

    for (const doc of documents) {
        let associatedData: ContractRevisionTable | RateRevisionTable | null =
            null

        if (doc.type === 'contractDoc' && doc.contractRevisionID) {
            const contractResult = await store.findContractRevision(
                doc.contractRevisionID
            )
            if (
                contractResult instanceof Error ||
                contractResult instanceof NotFoundError
            ) {
                errors.push({
                    documentId: doc.id,
                    type: doc.type,
                    error: contractResult,
                    revisionId: doc.contractRevisionID,
                })
            } else {
                associatedData = contractResult
            }
        } else if (doc.type === 'rateDoc' && doc.rateRevisionID) {
            const rateResult = await store.findRateRevision(doc.rateRevisionID)
            if (
                rateResult instanceof Error ||
                rateResult instanceof NotFoundError
            ) {
                errors.push({
                    documentId: doc.id,
                    type: doc.type,
                    error: rateResult,
                    revisionId: doc.rateRevisionID,
                })
            } else {
                associatedData = rateResult
            }
        }

        results.push({
            ...doc,
            associatedContract:
                doc.type === 'contractDoc'
                    ? (associatedData as ContractRevisionTable)
                    : undefined,
            associatedRate:
                doc.type === 'rateDoc'
                    ? (associatedData as RateRevisionTable)
                    : undefined,
        })
    }

    return { results, errors }
}

module.exports = { main }

import { APIGatewayProxyHandler } from 'aws-lambda'
import { configurePostgres } from './configuration'
import { NewPostgresStore } from '../postgres/postgresStore'
import { HealthPlanRevisionTable } from '@prisma/client'
import {
    HealthPlanFormDataType,
    SubmissionDocument,
} from '../../../app-web/src/common-code/healthPlanFormDataType'
import { toDomain } from '../../../app-web/src/common-code/proto/healthPlanFormDataProto'
import { isStoreError, StoreError } from '../postgres/storeError'
import { S3 } from 'aws-sdk'
import { createHash } from 'crypto'
import {
    userFromCognitoAuthProvider,
    userFromLocalAuthProvider,
} from '../authn'
import { Store } from '../postgres'

const s3 = new S3()

const calculateSHA256 = async (s3URL: string): Promise<string> => {
    const s3Object = await s3
        .getObject({
            Bucket: process.env.S3_BUCKET_NAME as string,
            Key: s3URL,
        })
        .promise()

    const hash = createHash('sha256')
    hash.update(s3Object.Body as Buffer)
    return hash.digest('hex')
}

const updateDocumentsSHA256 = async (
    documents: SubmissionDocument[]
): Promise<SubmissionDocument[]> => {
    for (const document of documents) {
        const sha256 = await calculateSHA256(document.s3URL)
        document.sha256 = sha256
    }
    return documents
}

const processRevisions = async (
    store: Store,
    pkgID: string,
    revisions: HealthPlanRevisionTable[]
): Promise<void> => {
    for (const revision of revisions) {
        const decodedFormDataProto = toDomain(revision.formDataProto)
        if (!(decodedFormDataProto instanceof Error)) {
            const formData = decodedFormDataProto as HealthPlanFormDataType

            formData.documents = await updateDocumentsSHA256(formData.documents)
            formData.contractDocuments = await updateDocumentsSHA256(
                formData.contractDocuments
            )
            for (const rateInfo of formData.rateInfos) {
                rateInfo.rateDocuments = await updateDocumentsSHA256(
                    rateInfo.rateDocuments
                )
            }

            await store.updateHealthPlanRevision(pkgID, revision.id, formData)
        }
    }
}

export const main: APIGatewayProxyHandler = async (event, context) => {
    const authProvider =
        event.requestContext.identity.cognitoAuthenticationProvider || ''
    const dbURL = process.env.DATABASE_URL
    const secretsManagerSecret = process.env.SECRETS_MANAGER_SECRET

    if (!dbURL) {
        console.error('DATABASE_URL not set')
        throw new Error('Init Error: DATABASE_URL is required to run app-api')
    }
    if (!secretsManagerSecret) {
        console.error('SECRETS_MANAGER_SECRET not set')
    }

    const pgResult = await configurePostgres(dbURL, secretsManagerSecret)
    if (pgResult instanceof Error) {
        console.error(
            "Init Error: Postgres couldn't be configured in data exporter"
        )
        throw pgResult
    } else {
        console.info('Postgres configured in data exporter')
    }
    const store = NewPostgresStore(pgResult)

    // Get the package ID from the event object
    const pkgID = event.queryStringParameters?.pkgID
    if (!pkgID) {
        console.error('Package ID is missing in query parameters')
        throw new Error('Package ID is required')
    }
    const authMode = process.env.REACT_APP_AUTH_MODE

    // reject the request if it's not from a CMS or ADMIN user
    const userFetcher =
        authMode === 'LOCAL'
            ? userFromLocalAuthProvider
            : userFromCognitoAuthProvider
    const userResult = await userFetcher(authProvider, store)
    if (userResult.isErr()) {
        console.error('Error getting user from auth provider')
        throw new Error('Error getting user from auth provider')
    }
    if (
        userResult.value.role !== 'CMS_USER' &&
        userResult.value.role !== 'ADMIN_USER'
    ) {
        console.error('User is not authorized to run reports')
        throw new Error('User is not authorized to run reports')
    }
    console.info('User is authorized to run reports')

    const result: HealthPlanRevisionTable[] | StoreError =
        await store.findAllRevisions()
    if (isStoreError(result)) {
        console.error('Error getting revisions from db')
        throw new Error('Error getting records; cannot generate report')
    }

    await processRevisions(store, pkgID, result)

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'SHA256 update complete' }),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
    }
}

import { Handler } from 'aws-lambda'
import { Readable } from 'stream'
import { configurePostgres } from './configuration'
import { NewPostgresStore } from '../postgres/postgresStore'
import { HealthPlanRevisionTable } from '@prisma/client'
import {
    HealthPlanFormDataType,
    SubmissionDocument,
} from '@managed-care-review/common-code/healthPlanFormDataType'
import { toDomain } from '@managed-care-review/common-code/proto'
import { isStoreError, StoreError } from '../postgres/storeError'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { createHash } from 'crypto'
import { Store } from '../postgres'
import {
    parseKey,
    parseBucketName,
} from '@managed-care-review/common-code/s3URLEncoding'

const s3 = new S3Client({ region: 'us-east-1' })

export const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const chunks: Uint8Array[] = []
        stream.on('data', (chunk) => chunks.push(chunk))
        stream.on('error', reject)
        stream.on('end', () => resolve(Buffer.concat(chunks)))
    })
}

export const calculateSHA256 = async (s3URL: string): Promise<string> => {
    try {
        const getObjectCommand = new GetObjectCommand({
            Bucket: parseBucketName(s3URL) as string,
            Key: `allusers/${parseKey(s3URL)}`,
        })

        const s3Object = await s3.send(getObjectCommand)

        const buffer = await streamToBuffer(s3Object.Body as Readable)

        const hash = createHash('sha256')
        hash.update(buffer)
        return hash.digest('hex')
    } catch (err) {
        console.error(`Error calculating SHA256 for ${s3URL}: ${err}`)
        throw err
    }
}

export const updateDocumentsSHA256 = async (
    documents: SubmissionDocument[]
): Promise<SubmissionDocument[]> => {
    try {
        await Promise.all(
            documents.map(async (document) => {
                if (
                    !Object.prototype.hasOwnProperty.call(document, 'sha256') ||
                    !document.sha256
                ) {
                    try {
                        const sha256 = await calculateSHA256(document.s3URL)
                        document.sha256 = `${sha256}`
                    } catch (error) {
                        console.error('Error calculating SHA256:', error)
                    }
                }
            })
        )
        return documents
    } catch (error) {
        console.error('Error in updateDocumentsSHA256:', error)
        throw error
    }
}

export const processRevisions = async (
    store: Store,
    revisions: HealthPlanRevisionTable[]
): Promise<void> => {
    for (const revision of revisions) {
        const pkgID = revision.pkgID
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
            try {
                const update = await store.updateHealthPlanRevision(
                    pkgID,
                    revision.id,
                    formData
                )
                if (isStoreError(update)) {
                    console.error(
                        `StoreError updating revision ${
                            revision.id
                        }: ${JSON.stringify(update)}`
                    )
                    throw new Error('Error updating revision')
                }
            } catch (err) {
                console.error(`Error updating revision ${revision.id}: ${err}`)
                throw err
            }
        } else {
            console.error(
                `Error decoding formDataProto for revision ${revision.id} in sha migration: ${decodedFormDataProto}`
            )
            throw new Error('Error decoding formDataProto in sha migration')
        }
    }
}

export const getDatabaseConnection = async (): Promise<Store> => {
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

    return store
}

export const getRevisions = async (
    store: Store
): Promise<HealthPlanRevisionTable[]> => {
    const result: HealthPlanRevisionTable[] | StoreError =
        await store.findAllRevisions()
    if (isStoreError(result)) {
        console.error(`Error getting revisions from db ${result}`)
        throw new Error('Error getting records; cannot generate report')
    }

    return result
}

const main: Handler = async (event, context) => {
    const store = await getDatabaseConnection()

    const revisions = await getRevisions(store)

    // Get the pkgID from the first revision in the list
    const pkgID = revisions[0].pkgID
    if (!pkgID) {
        console.error('Package ID is missing in the revisions')
        throw new Error('Package ID is required')
    }

    await processRevisions(store, revisions)

    console.info('SHA256 update complete')
}

module.exports = { main }

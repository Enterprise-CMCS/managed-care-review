import type { Readable } from 'stream'
import { configurePostgres } from './configuration'
import { NewPostgresStore } from '../postgres/postgresStore'
import type { SubmissionDocument } from '../../../app-web/src/common-code/healthPlanFormDataType'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { createHash } from 'crypto'
import type { Store } from '../postgres'
import {
    parseKey,
    parseBucketName,
} from '../../../app-web/src/common-code/s3URLEncoding'
import { recordException } from '../../../uploads/src/lib/otel'

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
        console.error(`Error in calculateSHA256 for ${s3URL}: ${err}`)
        return ''
    }
}

export const updateDocumentsSHA256 = async (
    documents: SubmissionDocument[],
    serviceName: string
): Promise<SubmissionDocument[]> => {
    try {
        const updatedDocuments = await Promise.all(
            documents.map(async (document) => {
                if (
                    !Object.prototype.hasOwnProperty.call(document, 'sha256') ||
                    !document.sha256
                ) {
                    try {
                        const sha256 = await calculateSHA256(document.s3URL)
                        const updatedDocument = {
                            ...document,
                            sha256: `${sha256}`,
                        }
                        return updatedDocument
                    } catch (error) {
                        console.error('Error in updateDocumentsSHA256:', error)
                        recordException(error, serviceName, 'calculateSHA256')
                        // Return the original document if an error occurs
                        return document
                    }
                } else {
                    return document
                }
            })
        )
        return updatedDocuments
    } catch (error) {
        console.error('Error in updateDocumentsSHA256:', error)
        recordException(error, serviceName, 'updateDocumentsSHA256')
        throw error
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

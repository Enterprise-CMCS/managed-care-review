import { createHash } from 'node:crypto'
import {
    SyntheticGenerateUploadUrlDocument,
    type UploadBucketName,
    type UploadFileType,
} from '../gen/gqlClient'
import type { GraphQLClient } from './graphqlClient'
import {
    defaultHttpRetryConfig,
    fetchWithRetry,
    type Fetch,
    type HttpRetryConfig,
} from './http'

export type UploadInput = {
    name: string
    bytes: Uint8Array
    fileType: UploadFileType
    bucketName: UploadBucketName
    contentType: string
}

export type UploadedDocument = {
    name: string
    s3URL: string
    s3Key: string
    bucket: string
    sha256: string
}

export class DocumentUploadError extends Error {
    readonly status: number

    constructor(message: string, status: number) {
        super(message)
        this.name = 'DocumentUploadError'
        this.status = status
    }
}

type UploadClientOptions = {
    graphql: GraphQLClient
    fetch?: Fetch
    retry?: HttpRetryConfig
}

export class UploadClient {
    readonly #graphql: GraphQLClient
    readonly #fetch: Fetch
    readonly #retry: HttpRetryConfig

    constructor(options: UploadClientOptions) {
        this.#graphql = options.graphql
        this.#fetch = options.fetch ?? fetch
        this.#retry = options.retry ?? defaultHttpRetryConfig
    }

    async upload(input: UploadInput): Promise<UploadedDocument> {
        const data = await this.#graphql.execute(
            SyntheticGenerateUploadUrlDocument,
            {
                input: {
                    fileName: input.name,
                    fileType: input.fileType,
                    bucketName: input.bucketName,
                },
            }
        )
        const upload = data.generateUploadURL
        const response = await fetchWithRetry(
            this.#fetch,
            upload.uploadURL,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': input.contentType,
                },
                body: Uint8Array.from(input.bytes),
            },
            this.#retry
        )

        if (!response.ok) {
            throw new DocumentUploadError(
                `Document upload failed with status ${response.status}`,
                response.status
            )
        }

        return {
            name: input.name,
            s3URL: upload.s3URL,
            s3Key: upload.s3Key,
            bucket: upload.bucket,
            sha256: createHash('sha256').update(input.bytes).digest('hex'),
        }
    }
}

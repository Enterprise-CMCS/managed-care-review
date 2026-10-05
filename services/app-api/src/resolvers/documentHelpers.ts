import { parseBucketName, parseKey, type BucketShortName } from '../s3'
import { createUserInputError } from './errorUtils'
import { parseErrorToError } from '@mc-review/helpers'

/**
 * Document input with s3URL from GraphQL
 */
export type DocumentInput = {
    name: string
    s3URL: string
    sha256?: string
}

/**
 * Document with parsed bucket and key
 */
export type ParsedDocument = {
    name: string
    s3URL: string
    s3BucketName: string
    s3Key: string
    sha256?: string
}

/**
 * Base document type that can optionally have bucket/key for tests
 */
export type TestDocumentInput = {
    name: string
    s3URL: string
    sha256?: string
    s3BucketName?: string
    s3Key?: string
    dateAdded?: Date
    downloadURL?: string
    id?: string
}

const bucketEnvironmentVariable: Record<BucketShortName, string> = {
    HEALTH_PLAN_DOCS: 'VITE_APP_S3_DOCUMENTS_BUCKET',
    QUESTION_ANSWER_DOCS: 'VITE_APP_S3_QA_BUCKET',
}

function configuredBucketName(bucketType: BucketShortName): string {
    const environmentVariable = bucketEnvironmentVariable[bucketType]
    const bucketName = process.env[environmentVariable]
    if (!bucketName) {
        throw new Error(
            `${environmentVariable} environment variable is required`
        )
    }
    return bucketName
}
/**
 * Validates document s3URLs, normalizes their keys, and sets the configured
 * bucket for the document category. The original URL remains available to the
 * reconciliation Lambda until it verifies the object in that bucket.
 *
 * @param documents - Array of documents from GraphQL input
 * @param bucketType - Server-configured bucket category for persisted metadata
 * @returns Documents with canonical bucket/key metadata and their source URL
 */
export function parseAndValidateDocuments(
    documents: DocumentInput[],
    bucketType: BucketShortName
): ParsedDocument[] {
    const canonicalBucket = configuredBucketName(bucketType)
    return documents.map((doc, index) => {
        let bucket: string | Error
        let key: string | Error

        // parseBucketName throws instead of returning Error - need to catch it
        try {
            bucket = parseBucketName(doc.s3URL)
        } catch (err) {
            bucket = parseErrorToError(err)
        }

        // parseKey returns Error
        key = parseKey(doc.s3URL)

        if (bucket instanceof Error) {
            throw createUserInputError(
                `Invalid s3URL for document "${doc.name}" at index ${index}: ${bucket.message}`,
                'documents',
                doc.s3URL
            )
        }

        if (key instanceof Error) {
            throw createUserInputError(
                `Invalid s3URL for document "${doc.name}" at index ${index}: ${key.message}`,
                'documents',
                doc.s3URL
            )
        }

        // Normalize key to always include full path (allusers/ prefix for regular docs)
        // parseKey returns just UUID for regular docs, but we want to store the full S3 key
        const fullKey =
            key.startsWith('allusers/') || key.startsWith('zips/')
                ? key
                : `allusers/${key}`

        // Keep the submitted URL as the migration's source marker. The
        // reconciliation Lambda rewrites it only after confirming that the
        // object exists in the canonical bucket.
        return {
            name: doc.name,
            s3URL: doc.s3URL,
            s3BucketName: canonicalBucket,
            s3Key: fullKey,
            sha256: doc.sha256,
        }
    })
}

/**
 * Helper for tests: adds s3BucketName and s3Key to document objects
 * Throws Error if parsing fails
 *
 * @param doc - Document object from test
 * @returns Document with s3BucketName and s3Key
 */
export function addBucketKeyToDocument<T extends TestDocumentInput>(
    doc: T
): T & { s3BucketName: string; s3Key: string } {
    // If already has bucket/key, return as-is
    if (doc.s3BucketName && doc.s3Key) {
        return doc as T & { s3BucketName: string; s3Key: string }
    }

    const bucket = parseBucketName(doc.s3URL)
    const key = parseKey(doc.s3URL)

    if (bucket instanceof Error) {
        throw new Error(`Failed to parse bucket: ${bucket.message}`)
    }
    if (key instanceof Error) {
        throw new Error(`Failed to parse key: ${key.message}`)
    }

    // Normalize key to always include full path (allusers/ prefix for regular docs)
    const fullKey =
        key.startsWith('allusers/') || key.startsWith('zips/')
            ? key
            : `allusers/${key}`

    return {
        ...doc,
        s3BucketName: bucket,
        s3Key: fullKey,
    }
}

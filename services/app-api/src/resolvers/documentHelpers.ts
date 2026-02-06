import { parseBucketName, parseKey } from '../s3'
import { createUserInputError } from './errorUtils'

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

/**
 * Parses and validates document s3URLs, extracting bucket and key
 * Throws GraphQLError if parsing fails (validation at API boundary)
 *
 * @param documents - Array of documents from GraphQL input
 * @returns Array of documents with s3BucketName and s3Key populated
 */
export function parseAndValidateDocuments(
    documents: DocumentInput[]
): ParsedDocument[] {
    return documents.map((doc, index) => {
        let bucket: string | Error
        let key: string | Error

        // parseBucketName throws instead of returning Error - need to catch it
        try {
            bucket = parseBucketName(doc.s3URL)
        } catch (err) {
            bucket = err instanceof Error ? err : new Error(String(err))
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

        return {
            name: doc.name,
            s3URL: doc.s3URL,
            s3BucketName: bucket,
            s3Key: key,
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

    return {
        ...doc,
        s3BucketName: bucket,
        s3Key: key,
    }
}

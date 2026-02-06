import Url from 'url-parse'

// tslint:disable-next-line
const isValidS3URLFormat = (url: {
    protocol: string
    slashes: boolean
    pathname: string
}): boolean => {
    return (
        url.protocol === 's3:' &&
        url.slashes === true &&
        url.pathname.split('/').length === 3
    )
}

const parseBucketName = (maybeS3URL: string): string | Error => {
    const url = new Url(maybeS3URL)
    if (!isValidS3URLFormat(url))
        throw new Error(`Not valid S3URL for parsebucket: ${maybeS3URL}`)
    return url.hostname
}

const parseKey = (maybeS3URL: string): string | Error => {
    const url = new Url(maybeS3URL)
    if (!isValidS3URLFormat(url))
        return new Error(`Not valid S3URL for parsekey: ${maybeS3URL}`)
    return url.pathname.split('/')[1]
}

/**
 * Get S3 bucket name from a document object
 * Prefers the new s3BucketName field, falls back to parsing s3URL if not available
 */
const getS3Bucket = (doc: {
    s3BucketName?: string | null
    s3URL: string
}): string | Error => {
    // Prefer new field if available
    if (doc.s3BucketName) {
        return doc.s3BucketName
    }
    // Fall back to parsing the old s3URL format
    return parseBucketName(doc.s3URL)
}

/**
 * Get S3 key from a document object
 * Prefers the new s3Key field, falls back to parsing s3URL if not available
 */
const getS3Key = (doc: {
    s3Key?: string | null
    s3URL?: string
}): string | Error => {
    // Prefer new field if available
    if (doc.s3Key) {
        return doc.s3Key
    }
    // Fall back to parsing the old s3URL format
    if (!doc.s3URL) {
        return new Error('Document missing both s3Key and s3URL')
    }
    return parseKey(doc.s3URL)
}

type BucketShortName = 'HEALTH_PLAN_DOCS' | 'QUESTION_ANSWER_DOCS'
type S3BucketConfigType = {
    [K in BucketShortName]: string
}
export { parseBucketName, parseKey, getS3Bucket, getS3Key }
export type { BucketShortName, S3BucketConfigType }

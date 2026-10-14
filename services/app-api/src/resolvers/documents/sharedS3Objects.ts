import type { QueryResolvers } from '../../gen/gqlServer'
import type { S3ClientT } from '../../s3'
import { canRead } from '../../oauth/oauthAuthorization'
import { setResolverDetails, withResolverSpan } from '../attributeHelper'
import { createForbiddenError, createUserInputError } from '../errorUtils'

/**
 * Mirrors the existing Cognito browser role's authenticated allusers/ access.
 * Never expose the Lambda role's broader access to private/ or arbitrary paths.
 * This also works before an upload has a saved document row.
 */
function sharedKey(key: string, allowZip: boolean): string {
    const fileKey = key.startsWith('allusers/') ? key.slice(9) : key
    if (
        fileKey.length > 0 &&
        fileKey.length <= 1024 &&
        fileKey !== '.' &&
        fileKey !== '..' &&
        !/[\/\\\x00-\x1f]/.test(fileKey)
    ) {
        return fileKey
    }
    if (
        allowZip &&
        /^zips\/(contracts|rates)\/[a-zA-Z0-9-]+\/[a-zA-Z0-9_-]+\.zip$/.test(
            key
        )
    ) {
        return key
    }
    throw createUserInputError('Invalid shared S3 object key', 'key')
}

export function fetchUploadScanStatusResolver(
    s3Client: S3ClientT
): QueryResolvers['fetchUploadScanStatus'] {
    return async (_parent, { input }, context) =>
        withResolverSpan(
            context,
            'fetchUploadScanStatus',
            undefined,
            async (span) => {
                setResolverDetails(span, context.user)
                if (!canRead(context)) {
                    throw createForbiddenError(
                        'OAuth client does not have read permissions'
                    )
                }
                const key = sharedKey(input.key, false)
                return s3Client.getScanStatus(key, input.bucketName)
            }
        )
}

export function fetchS3DownloadURLResolver(
    s3Client: S3ClientT
): QueryResolvers['fetchS3DownloadURL'] {
    return async (_parent, { input }, context) =>
        withResolverSpan(
            context,
            'fetchS3DownloadURL',
            undefined,
            async (span) => {
                setResolverDetails(span, context.user)
                if (!canRead(context)) {
                    throw createForbiddenError(
                        'OAuth client does not have read permissions'
                    )
                }
                const key = sharedKey(input.key, true)
                if (key.startsWith('zips/')) {
                    if (input.bucketName !== 'HEALTH_PLAN_DOCS') {
                        throw createUserInputError(
                            'ZIPs must use the documents bucket',
                            'bucketName'
                        )
                    }
                    return s3Client.getZipURL(key, input.bucketName)
                }
                // Signing does not bypass S3's clean-scan GetObject deny policy.
                return s3Client.getURL(key, input.bucketName, 3600)
            }
        )
}

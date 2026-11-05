import { Buffer } from 'node:buffer'
import type { QueryResolvers } from '../../gen/gqlServer'
import type { S3ClientT } from '../../s3'
import { setResolverDetails, withResolverSpan } from '../attributeHelper'
import { createForbiddenError, createUserInputError } from '../errorUtils'

/**
 * Mirrors the existing Cognito browser role's authenticated allusers/ access.
 * Never expose the Lambda role's broader access to private/ or arbitrary paths.
 * This also works before an upload has a saved document row. Machine clients
 * retain the existing document APIs; ZIPs retain package-level authorization.
 */
function sharedKey(key: string): string {
    const fileKey = key.startsWith('allusers/') ? key.slice(9) : key
    if (
        fileKey.length > 0 &&
        Buffer.byteLength(`allusers/${fileKey}`, 'utf8') <= 1024 &&
        fileKey !== '.' &&
        fileKey !== '..' &&
        !/[\/\\\x00-\x1f]/.test(fileKey)
    ) {
        return fileKey
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
                if (context.oauthClient) {
                    throw createForbiddenError(
                        'Shared upload access is only available to browser users'
                    )
                }
                const key = sharedKey(input.key)
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
                if (context.oauthClient) {
                    throw createForbiddenError(
                        'Shared upload access is only available to browser users'
                    )
                }
                const key = sharedKey(input.key)
                // Signing does not bypass S3's clean-scan GetObject deny policy.
                return s3Client.getURL(key, input.bucketName, 3600)
            }
        )
}

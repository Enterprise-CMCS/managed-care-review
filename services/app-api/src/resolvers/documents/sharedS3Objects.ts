import { Buffer } from 'node:buffer'
import type { QueryResolvers } from '../../gen/gqlServer'
import type { S3ClientT } from '../../s3'
import { setResolverDetails, withResolverSpan } from '../attributeHelper'
import { createForbiddenError, createUserInputError } from '../errorUtils'

/**
 * Accept a filename or allusers/<filename>, even before a document record exists.
 * All authenticated human roles share this access; it does not check document
 * ownership or state assignments. OAuth upload permissions are handled separately
 * and do not grant access to these scan and download queries.
 *
 * Lambda can access more S3 paths than callers should. Reject private and nested
 * paths here; ZIP downloads must go through an authorized package fetch.
 */
function sharedKey(key: string): string {
    const fileKey = key.startsWith('allusers/') ? key.slice(9) : key
    // S3 counts UTF-8 bytes, not JavaScript characters. Include allusers/ in the
    // 1024-byte limit because the S3 adapter adds that prefix to bare filenames.
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
                // A URL can be issued before scanning finishes. S3 checks the scan tag
                // when the file is downloaded and denies access unless it is clean.
                return s3Client.getURL(key, input.bucketName, 3600)
            }
        )
}

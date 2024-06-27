import type { Resolvers } from '../../gen/gqlServer'

import { parseBucketName, parseKey } from '../../s3'
import type { S3ClientT } from '../../s3'

export function genericDocumentResolver(
    s3Client: S3ClientT
): Resolvers['GenericDocument'] {
    return {
        downloadURL: async (parent) => {
            const s3URL = parent.s3URL ?? ''
            const key = parseKey(s3URL)
            const bucket = parseBucketName(s3URL)
            if (key instanceof Error || bucket instanceof Error) {
                const err = new Error(
                    'S3 needs to be provided a valid key and bucket'
                )
                throw err
            }

            const url = await s3Client.getURL(key, 'HEALTH_PLAN_DOCS')
            if (!url) {
                throw new Error('error getting download url from S3')
            }
            return url
        },
    }
}

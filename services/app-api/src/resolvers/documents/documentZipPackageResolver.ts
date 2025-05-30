import type { Resolvers } from '../../gen/gqlServer'
import { parseKey } from '../../s3'
import type { S3ClientT } from '../../s3'

export function documentZipPackageResolver(
    s3Client: S3ClientT
): Resolvers['DocumentZipPackage'] {
    return {
        downloadUrl: async (parent) => {
            const s3URL = parent.s3URL ?? ''
            const key = parseKey(s3URL)

            if (key instanceof Error) {
                throw new Error('S3 needs to be provided a valid key')
            }

            const url = await s3Client.getURL(key, 'HEALTH_PLAN_DOCS')
            if (!url) {
                throw new Error('error getting download url from S3')
            }
            return url
        },
    }
}

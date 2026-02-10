import type { Resolvers } from '../../gen/gqlServer'
import type { S3ClientT } from '../../s3'
import { getS3Key } from '../../s3'

export function documentZipPackageResolver(
    s3Client: S3ClientT
): Resolvers['DocumentZipPackage'] {
    return {
        downloadUrl: async (parent) => {
            const key = getS3Key(parent)

            if (key instanceof Error) {
                throw new Error(
                    `Zip package missing valid s3Key: ${key.message}`
                )
            }

            const url = await s3Client.getZipURL(key, 'HEALTH_PLAN_DOCS')
            if (!url) {
                throw new Error('error getting download url from S3')
            }
            return url
        },
    }
}

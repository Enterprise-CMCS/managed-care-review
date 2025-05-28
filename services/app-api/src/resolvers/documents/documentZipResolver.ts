import type { Resolvers } from '../../gen/gqlServer'
import { parseBucketName, parseKey } from '../../s3'
import type { S3ClientT } from '../../s3'
import type { DocumentZipPackageType } from '../../domain-models/ZipType'

export function documentZipPackageResolver(
    s3Client: S3ClientT
): Resolvers['DocumentZipPackage'] {
    return {
        downloadUrl: async (parent: DocumentZipPackageType) => {
            const s3URL = parent.s3URL ?? ''
            const key = parseKey(s3URL)
            const bucket = parseBucketName(s3URL)

            if (key instanceof Error || bucket instanceof Error) {
                const err = new Error(
                    'S3 needs to be provided a valid key and bucket'
                )
                throw err
            }

            // HEALTH_PLAN_DOCS puts us in the regular health plan bucket
            const url = await s3Client.getURL(key, 'HEALTH_PLAN_DOCS')

            if (!url) {
                throw new Error('error getting download url from S3')
            }

            return url
        },
    }
}

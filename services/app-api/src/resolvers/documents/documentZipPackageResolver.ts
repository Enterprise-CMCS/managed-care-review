import type { Resolvers } from '../../gen/gqlServer'
import type { S3ClientT } from '../../s3'
import { getS3Key } from '../../s3'
import { logResolverError } from '../../logger'
import { GraphQLError } from 'graphql/index'

export function documentZipPackageResolver(
    s3Client: S3ClientT
): Resolvers['DocumentZipPackage'] {
    return {
        downloadUrl: async (parent, _args, context) => {
            const key = getS3Key(parent)

            if (key instanceof Error) {
                const errMessage = `Zip package missing valid s3Key: ${key.message}`
                logResolverError(
                    'documentZipPackageResolver.downloadUrl',
                    errMessage,
                    context
                )
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'S3_ERROR',
                    },
                })
            }

            const url = await s3Client.getZipURL(key, 'HEALTH_PLAN_DOCS')
            if (!url) {
                const errMessage = 'error getting download url from S3'
                logResolverError(
                    'documentZipPackageResolver.downloadUrl',
                    errMessage,
                    context
                )
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'S3_ERROR',
                    },
                })
            }
            return url
        },
    }
}

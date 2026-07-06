import type { Resolvers } from '../../gen/gqlServer'
import type { S3ClientT } from '../../s3'
import { getS3Key } from '../../s3'
import { logResolverError } from '../../logger'
import { GraphQLError } from 'graphql/index'
import { setResolverDetails, withResolverSpan } from '../attributeHelper'

export function genericDocumentResolver(
    s3Client: S3ClientT
): Resolvers['GenericDocument'] {
    return {
        downloadURL: async (parent, args, context) => {
            return withResolverSpan(
                context,
                'GenericDocument.downloadURL',
                { 'document.id': parent.id ?? 'unknown' },
                async (span) => {
                    setResolverDetails(span, context.user)

                    const key = getS3Key(parent)

                    if (key instanceof Error) {
                        const errMsg = `Document missing valid s3Key: ${key.message}`
                        logResolverError(
                            'genericDocumentResolver.downloadURL',
                            errMsg,
                            context
                        )
                        throw new GraphQLError(errMsg, {
                            extensions: {
                                code: 'INTERNAL_SERVER_ERROR',
                                cause: 'DB_ERROR',
                            },
                        })
                    }

                    const url = await s3Client.getURL(key, 'HEALTH_PLAN_DOCS')
                    if (!url) {
                        const errMsg = 'error getting download url from S3'
                        logResolverError(
                            'genericDocumentResolver.downloadURL',
                            errMsg,
                            context
                        )
                        throw new GraphQLError(errMsg, {
                            extensions: {
                                code: 'INTERNAL_SERVER_ERROR',
                                cause: 'DB_ERROR',
                            },
                        })
                    }
                    return url
                }
            )
        },
    }
}

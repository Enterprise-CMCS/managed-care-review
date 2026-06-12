import type { Resolvers } from '../../gen/gqlServer'
import type { S3ClientT } from '../../s3'
import { getS3Key } from '../../s3'
import type { QuestionAndResponseDocument } from '../../domain-models'
import { logResolverError } from '../../logger'
import { GraphQLError } from 'graphql'
import type { Context } from '../../handlers/apollo_gql'
import { setResolverDetails, withResolverSpan } from '../attributeHelper'

export function questionResponseDocumentResolver(
    s3Client: S3ClientT
): Resolvers['QuestionResponseDocument'] {
    return {
        downloadURL: async (
            parent: QuestionAndResponseDocument,
            _args: Record<string, never>,
            context: Context
        ) => {
            return withResolverSpan(
                context,
                'QuestionResponseDocument.downloadURL',
                { 'document.id': parent.id },
                async (span) => {
                    setResolverDetails(span, context.user)

                    const key = getS3Key(parent)

                    if (key instanceof Error) {
                        const errMsg = `Document missing valid s3Key: ${key.message}`
                        logResolverError(
                            'questionResponseDocumentResolver.downloadURL',
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

                    const url = await s3Client.getURL(
                        key,
                        'QUESTION_ANSWER_DOCS'
                    )
                    if (!url) {
                        const errMsg = 'error getting download url from S3'
                        logResolverError(
                            'questionResponseDocumentResolver.downloadURL',
                            errMsg,
                            context
                        )
                        throw new GraphQLError(errMsg, {
                            extensions: {
                                code: 'INTERNAL_SERVER_ERROR',
                                cause: 'S3_ERROR',
                            },
                        })
                    }
                    return url
                }
            )
        },
    }
}

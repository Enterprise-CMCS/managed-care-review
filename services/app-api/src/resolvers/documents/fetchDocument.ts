import { GraphQLError } from 'graphql'
import type { QueryResolvers } from '../../gen/gqlServer'
import { NotFoundError, type Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { canRead } from '../../authorization/oauthAuthorization'
import { logError, logSuccess } from '../../logger'
import type { S3ClientT } from '../../s3'
import { getS3Key } from '../../s3'
import type { SharedDocument } from '../../domain-models/DocumentType'
import { createUserInputError } from '../errorUtils'

export function fetchDocumentResolver(
    store: Store,
    s3Client: S3ClientT
): QueryResolvers['fetchDocument'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        // add a span to OTEL
        const span = tracer?.startSpan('fetchDocumentResolver', {}, ctx)
        setResolverDetailsOnActiveSpan('fetchDocument', user, span)

        // Check OAuth client read permissions
        if (!canRead(context)) {
            const errMessage = `OAuth client does not have read permissions`
            logError('fetchDocument', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'FORBIDDEN',
                    cause: 'INSUFFICIENT_OAUTH_GRANTS',
                },
            })
        }

        const fetchedDocument = await store.findDocumentById(
            input.documentID,
            input.documentType ?? undefined
        )

        if (fetchedDocument instanceof Error) {
            const errMessage = `Issue finding document message: ${fetchedDocument.message}`
            setErrorAttributesOnActiveSpan(errMessage, span)

            if (fetchedDocument instanceof NotFoundError) {
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'NOT_FOUND',
                        cause: 'DB_ERROR',
                    },
                })
            }

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        // Log OAuth client access for audit trail
        if (context.oauthClient) {
            logSuccess('fetchDocument')
        }

        const key = getS3Key(fetchedDocument)
        if (key instanceof Error) {
            const errMsg = `Document missing valid s3Key. Invalid for docID: ${input.documentID}: ${key.message}`
            console.error(errMsg)
            throw new Error(errMsg)
        }
        const expiresIn =
            input.expiresIn === undefined || input.expiresIn === null
                ? 3600
                : input.expiresIn
        if (expiresIn > 604800 || expiresIn <= 0) {
            const errMessage = `expiresIn field must be in range: 1 - 604,800 seconds (1 week). currently set to ${input.expiresIn}`
            throw createUserInputError(errMessage, 'expiresIn')
        }
        const qaDocs = [
            'CONTRACT_QUESTION_DOC',
            'CONTRACT_QUESTION_RESPONSE_DOC',
            'RATE_QUESTION_DOC',
            'RATE_QUESTION_RESPONSE_DOC',
        ]
        const bucketName = qaDocs.includes(
            input.documentType || fetchedDocument.type || ''
        )
            ? 'QUESTION_ANSWER_DOCS'
            : 'HEALTH_PLAN_DOCS'
        const url = await s3Client.getURL(key, bucketName, expiresIn)
        if (!url) {
            throw new Error('error getting download url from S3')
        }
        const doc: SharedDocument = {
            id: fetchedDocument.id,
            name: fetchedDocument.name,
            s3URL: fetchedDocument.s3URL,
            sha256: fetchedDocument.sha256 ?? undefined,
            downloadURL: url,
        }

        setSuccessAttributesOnActiveSpan(span)
        return { document: doc }
    }
}

import type { Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { isStateUser } from '../../domain-models'
import { logError, logSuccess } from '../../logger'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import { GraphQLError } from 'graphql/index'
import { canWrite } from '../../authorization/oauthAuthorization'
import {
    NotFoundError,
    UserInputPostgresError,
} from '../../postgres/postgresErrors'

export function submitSDP(store: Store) {
    return async (_parent: unknown, { input }: any, context: any) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('submitSDP', {}, ctx)
        setResolverDetailsOnActiveSpan('submitSDP', user, span)

        if (!canWrite(context)) {
            const errMessage = `OAuth client does not have write permissions`
            logError('submitSDP', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'FORBIDDEN',
                    cause: 'INSUFFICIENT_OAUTH_GRANTS',
                },
            })
        }

        if (!isStateUser(user)) {
            logError('submitSDP', 'user not authorized to submit SDP data')
            setErrorAttributesOnActiveSpan(
                'user not authorized to submit SDP data',
                span
            )
            throw createForbiddenError('user not authorized to submit SDP data')
        }

        const sdpResult = await store.submitSDP({
            sdpID: input.sdpID,
            stateCode: user.stateCode,
            submittedByUserID: user.id,
            lastSeenUpdatedAt: input.lastSeenUpdatedAt,
        })

        if (sdpResult instanceof NotFoundError) {
            const errMessage = `Error submitting SDP draft. Message: ${sdpResult.message}`
            logError('submitSDP', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'NOT_FOUND',
                    cause: 'DB_ERROR',
                },
            })
        }

        if (sdpResult instanceof UserInputPostgresError) {
            const errMessage = sdpResult.message
            logError('submitSDP', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createUserInputError(errMessage)
        }

        if (sdpResult instanceof Error) {
            const errMessage = `Error submitting SDP draft. Message: ${sdpResult.message}`
            logError('submitSDP', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        logSuccess('submitSDP')
        setSuccessAttributesOnActiveSpan(span)

        return {
            sdp: sdpResult,
        }
    }
}

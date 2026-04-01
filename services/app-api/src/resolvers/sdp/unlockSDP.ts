import type { Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { hasCMSPermissions } from '../../domain-models'
import { logError, logSuccess } from '../../logger'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import { GraphQLError } from 'graphql/index'
import { canWrite } from '../../authorization/oauthAuthorization'
import {
    NotFoundError,
    UserInputPostgresError,
} from '../../postgres/postgresErrors'

export function unlockSDP(store: Store) {
    return async (_parent: unknown, { input }: any, context: any) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('unlockSDP', {}, ctx)
        setResolverDetailsOnActiveSpan('unlockSDP', user, span)

        if (!canWrite(context)) {
            const errMessage = `OAuth client does not have write permissions`
            logError('unlockSDP', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'FORBIDDEN',
                    cause: 'INSUFFICIENT_OAUTH_GRANTS',
                },
            })
        }

        if (!hasCMSPermissions(user)) {
            logError('unlockSDP', 'user not authorized to unlock SDP')
            setErrorAttributesOnActiveSpan(
                'user not authorized to unlock SDP',
                span
            )
            throw createForbiddenError('user not authorized to unlock SDP')
        }

        const sdpResult = await store.unlockSDP({
            sdpID: input.sdpID,
            unlockedByUserID: user.id,
            unlockReason: input.unlockedReason,
        })

        if (sdpResult instanceof NotFoundError) {
            const errMessage = `Error unlocking SDP. Message: ${sdpResult.message}`
            logError('unlockSDP', errMessage)
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
            logError('unlockSDP', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createUserInputError(errMessage)
        }

        if (sdpResult instanceof Error) {
            const errMessage = `Error unlocking SDP. Message: ${sdpResult.message}`
            logError('unlockSDP', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        logSuccess('unlockSDP')
        setSuccessAttributesOnActiveSpan(span)

        return {
            sdp: sdpResult,
        }
    }
}

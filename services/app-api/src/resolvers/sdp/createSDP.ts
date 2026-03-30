import type { Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { isStateUser } from '../../domain-models'
import { logError, logSuccess } from '../../logger'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import { pluralize } from '@mc-review/common-code'
import { GraphQLError } from 'graphql/index'
import { canWrite } from '../../authorization/oauthAuthorization'

export function createSDP(store: Store) {
    return async (_parent: unknown, { input }: any, context: any) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('createSDP', {}, ctx)
        setResolverDetailsOnActiveSpan('createSDP', user, span)

        if (!canWrite(context)) {
            const errMessage = `OAuth client does not have write permissions`
            logError('createSDP', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'FORBIDDEN',
                    cause: 'INSUFFICIENT_OAUTH_GRANTS',
                },
            })
        }

        if (!isStateUser(user)) {
            logError('createSDP', 'user not authorized to create SDP data')
            setErrorAttributesOnActiveSpan(
                'user not authorized to create SDP data',
                span
            )
            throw createForbiddenError('user not authorized to create SDP data')
        }

        const stateFromCurrentUser = user.stateCode
        const programs = store.findPrograms(
            stateFromCurrentUser,
            input.programIDs
        )

        if (programs instanceof Error) {
            const count = input.programIDs.length
            const errMessage = `The program ${pluralize(
                'id',
                count
            )} ${input.programIDs.join(', ')} ${pluralize(
                'does',
                count
            )} not exist in state ${stateFromCurrentUser}`
            logError('createSDP', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createUserInputError(
                errMessage,
                'programIDs',
                input.programIDs
            )
        }

        const sdpResult = await store.insertDraftSDP({
            ...input,
            stateCode: stateFromCurrentUser,
        })

        if (sdpResult instanceof Error) {
            const errMessage = `Error creating a draft SDP. Message: ${sdpResult.message}`
            logError('createSDP', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        logSuccess('createSDP')
        setSuccessAttributesOnActiveSpan(span)

        return {
            sdp: sdpResult,
        }
    }
}

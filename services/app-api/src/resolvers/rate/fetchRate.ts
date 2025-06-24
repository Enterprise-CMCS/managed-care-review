import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { NotFoundError } from '../../postgres'
import type { QueryResolvers, State } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { GraphQLError } from 'graphql'
import { isStateUser } from '../../domain-models'
import { logError } from '../../logger'
import { ForbiddenError } from 'apollo-server-core'
import { canRead, canAccessState, getAuthContextInfo } from '../../authorization/oauthAuthorization'

export function fetchRateResolver(store: Store): QueryResolvers['fetchRate'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('fetchRate', {}, ctx)
        setResolverDetailsOnActiveSpan('fetchRate', user, span)

        const rateWithHistory = await store.findRateWithHistory(input.rateID)
        if (rateWithHistory instanceof Error) {
            const errMessage = `Issue finding rate message: ${rateWithHistory.message}`
            setErrorAttributesOnActiveSpan(errMessage, span)

            if (rateWithHistory instanceof NotFoundError) {
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

        // Check OAuth client permissions first
        if (!canRead(context)) {
            const authInfo = getAuthContextInfo(context)
            const errMessage = `OAuth client ${authInfo.clientId} does not have read permissions`
            logError('fetchRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new ForbiddenError(errMessage)
        }

        // Check state-based access (works for both OAuth clients and regular users)
        if (!canAccessState(context, rateWithHistory.stateCode)) {
            const authInfo = getAuthContextInfo(context)
            const errMessage = authInfo.isOAuthClient 
                ? `OAuth client ${authInfo.clientId} not authorized to fetch rate data from ${rateWithHistory.stateCode}`
                : 'State users are not authorized to fetch rate data from a different state.'
            logError('fetchRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new ForbiddenError(errMessage)
        }

        setSuccessAttributesOnActiveSpan(span)
        return { rate: rateWithHistory }
    }
}

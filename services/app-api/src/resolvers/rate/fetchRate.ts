import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { NotFoundError } from '../../postgres'
import type { QueryResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { GraphQLError } from 'graphql'
import {
    isStateUser,
    hasCMSPermissions,
    hasAdminPermissions,
} from '../../domain-models'
import { logError, logSuccess } from '../../logger'
import { createForbiddenError } from '../errorUtils'
import {
    canRead,
    getAuthContextInfo,
} from '../../authorization/oauthAuthorization'

export function fetchRateResolver(store: Store): QueryResolvers['fetchRate'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('fetchRate', {}, ctx)
        setResolverDetailsOnActiveSpan('fetchRate', user, span)

        // Check OAuth client read permissions
        if (!canRead(context)) {
            const errMessage = `OAuth client does not have read permissions`
            logError('fetchRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createForbiddenError(errMessage)
        }

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

        // Log OAuth client access for audit trail
        if (context.oauthClient) {
            logSuccess('fetchRate')
        }

        // Authorization check (same for both OAuth clients and regular users)
        if (isStateUser(user)) {
            if (user.stateCode !== rateWithHistory.stateCode) {
                const authInfo = getAuthContextInfo(context)
                const errMessage = authInfo.isOAuthClient
                    ? `OAuth client not authorized to fetch rate data from ${rateWithHistory.stateCode}`
                    : 'State users are not authorized to fetch rate data from a different state.'
                logError('fetchRate', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw createForbiddenError(errMessage)
            }
        } else if (!hasCMSPermissions(user) && !hasAdminPermissions(user)) {
            const errMessage = 'User not authorized to fetch rate data'
            logError('fetchRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createForbiddenError(errMessage)
        }

        setSuccessAttributesOnActiveSpan(span)
        return { rate: rateWithHistory }
    }
}

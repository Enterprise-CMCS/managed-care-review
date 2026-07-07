import { setResolverDetails, withResolverSpan } from '../attributeHelper'
import { NotFoundError } from '../../postgres'
import type { QueryResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { GraphQLError } from 'graphql'
import {
    isStateUser,
    hasCMSPermissions,
    hasAdminPermissions,
} from '../../domain-models'
import { logResolverError, logResolverSuccess } from '../../logger'
import { createForbiddenError } from '../errorUtils'
import { canRead } from '../../oauth/oauthAuthorization'

export function fetchRateResolver(store: Store): QueryResolvers['fetchRate'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'fetchRate',
            { 'rate.id': input.rateID },
            async (span) => {
                setResolverDetails(span, user)

                if (!canRead(context)) {
                    const errMessage = `OAuth client does not have read permissions`
                    logResolverError('fetchRate', errMessage, context)
                    throw createForbiddenError(errMessage)
                }

                const rateWithHistory = await store.findRateWithHistory(
                    input.rateID
                )
                if (rateWithHistory instanceof Error) {
                    const errMessage = `Issue finding rate message: ${rateWithHistory.message}`
                    logResolverError('fetchRate', errMessage, context)

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

                if (isStateUser(user)) {
                    if (user.stateCode !== rateWithHistory.stateCode) {
                        const authInfo = !!context.oauthClient
                        const errMessage = authInfo
                            ? `OAuth client not authorized to fetch rate data from ${rateWithHistory.stateCode}`
                            : 'State users are not authorized to fetch rate data from a different state.'
                        logResolverError('fetchRate', errMessage, context)
                        throw createForbiddenError(errMessage)
                    }
                } else if (
                    !hasCMSPermissions(user) &&
                    !hasAdminPermissions(user)
                ) {
                    const errMessage = 'User not authorized to fetch rate data'
                    logResolverError('fetchRate', errMessage, context)
                    throw createForbiddenError(errMessage)
                }

                logResolverSuccess(
                    context.oauthClient
                        ? 'fetchRate - oauthClient'
                        : 'fetchRate',
                    context
                )
                return { rate: rateWithHistory }
            }
        )
    }
}

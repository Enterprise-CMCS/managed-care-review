import { GraphQLError } from 'graphql'
import type { QueryResolvers } from '../../gen/gqlServer'
import { NotFoundError, type Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import {
    isStateUser,
    hasCMSPermissions,
    hasAdminPermissions,
} from '../../domain-models'
import {
    canRead,
    canAccessState,
    getAuthContextInfo,
} from '../../authorization/oauthAuthorization'
import { logError, logSuccess } from '../../logger'

export function fetchContractResolver(
    store: Store
): QueryResolvers['fetchContract'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        // add a span to OTEL
        const span = tracer?.startSpan('fetchContractResolver', {}, ctx)
        setResolverDetailsOnActiveSpan('fetchContract', user, span)

        const contractWithHistory = await store.findContractWithHistory(
            input.contractID
        )

        if (contractWithHistory instanceof Error) {
            const errMessage = `Issue finding contract message: ${contractWithHistory.message}`
            setErrorAttributesOnActiveSpan(errMessage, span)

            if (contractWithHistory instanceof NotFoundError) {
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

        // Handle OAuth clients separately from regular users
        if (context.oauthClient?.isOAuthClient) {
            // Check OAuth client permissions
            if (!canRead(context)) {
                const authInfo = getAuthContextInfo(context)
                const errMessage = `OAuth client ${authInfo.clientId} does not have read permissions`
                logError('fetchContract', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)

                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'FORBIDDEN',
                        cause: 'INSUFFICIENT_OAUTH_GRANTS',
                    },
                })
            }

            // Check OAuth client state access
            if (!canAccessState(context, contractWithHistory.stateCode)) {
                const authInfo = getAuthContextInfo(context)
                const errMessage = `OAuth client ${authInfo.clientId} not allowed to access contract from ${contractWithHistory.stateCode}`
                logError('fetchContract', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)

                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'FORBIDDEN',
                        cause: 'INVALID_STATE_REQUESTER',
                    },
                })
            }
        } else {
            // Regular user authorization
            if (isStateUser(user)) {
                if (user.stateCode !== contractWithHistory.stateCode) {
                    const errMessage = `User from state ${user.stateCode} not allowed to access contract from ${contractWithHistory.stateCode}`
                    logError('fetchContract', errMessage)
                    setErrorAttributesOnActiveSpan(errMessage, span)

                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'INVALID_STATE_REQUESTER',
                        },
                    })
                }
            } else if (!hasCMSPermissions(user) && !hasAdminPermissions(user)) {
                const errMessage = 'User not allowed to access contract'
                logError('fetchContract', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)

                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'FORBIDDEN',
                        cause: 'INVALID_STATE_REQUESTER',
                    },
                })
            }
        }

        logSuccess('fetchContract')
        setSuccessAttributesOnActiveSpan(span)
        return { contract: contractWithHistory }
    }
}

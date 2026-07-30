import { GraphQLError } from 'graphql'
import type { QueryResolvers } from '../../gen/gqlServer'
import { NotFoundError, type Store } from '../../postgres'
import { withResolverSpan, setResolverDetails } from '../attributeHelper'
import { isStateUser, hasReadPermissions } from '../../domain-models'
import { canRead } from '../../oauth/oauthAuthorization'
import { logResolverError, logResolverSuccess } from '../../logger'

export function fetchContractResolver(
    store: Store
): QueryResolvers['fetchContract'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'fetchContract',
            { 'contract.id': input.contractID },
            async (span) => {
                // Set user context on the span
                setResolverDetails(span, user)

                // Check OAuth client read permissions
                if (!canRead(context)) {
                    const errMessage = `OAuth client does not have read permissions`
                    logResolverError('fetchContract', errMessage, context)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'INSUFFICIENT_OAUTH_GRANTS',
                        },
                    })
                }

                const contractWithHistory = await store.findContractWithHistory(
                    input.contractID
                )

                if (contractWithHistory instanceof Error) {
                    const errMessage = `Issue finding contract message: ${contractWithHistory.message}`
                    logResolverError('fetchContract', errMessage, context)

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

                // Authorization check (same for both OAuth clients and regular users)
                if (isStateUser(user)) {
                    if (user.stateCode !== contractWithHistory.stateCode) {
                        const authInfo = !!context.oauthClient
                        const errMessage = authInfo
                            ? `OAuth client not allowed to access contract from ${contractWithHistory.stateCode}`
                            : `User from state ${user.stateCode} not allowed to access contract from ${contractWithHistory.stateCode}`
                        logResolverError('fetchContract', errMessage, context)
                        throw new GraphQLError(errMessage, {
                            extensions: {
                                code: 'FORBIDDEN',
                                cause: 'INVALID_STATE_REQUESTER',
                            },
                        })
                    }
                } else if (!hasReadPermissions(user)) {
                    const errMessage = 'User not allowed to access contract'
                    logResolverError('fetchContract', errMessage, context)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'INVALID_STATE_REQUESTER',
                        },
                    })
                }

                logResolverSuccess(
                    context.oauthClient
                        ? 'fetchContract - oauthClient'
                        : 'fetchContract',
                    context
                )
                return { contract: contractWithHistory }
            }
        )
    }
}

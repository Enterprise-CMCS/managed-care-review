import { GraphQLError } from 'graphql'
import type { QueryResolvers } from '../../gen/gqlServer'
import { NotFoundError, type Store } from '../../postgres'
import { canRead } from '../../oauth/oauthAuthorization'
import {
    hasAdminPermissions,
    hasCMSPermissions,
    isStateUser,
} from '../../domain-models'
import { logResolverError, logResolverSuccess } from '../../logger'
import { setResolverDetails, withResolverSpan } from '../attributeHelper'

export function fetchSubmissionHistoryResolver(
    store: Store
): QueryResolvers['fetchSubmissionHistory'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'fetchSubmissionHistory',
            { 'contract.id': input.contractID },
            async (span) => {
                setResolverDetails(span, user)

                if (!canRead(context)) {
                    const errMessage = `OAuth client does not have read permissions`
                    logResolverError(
                        'fetchSubmissionHistory',
                        errMessage,
                        context
                    )
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
                    logResolverError(
                        'fetchSubmissionHistory',
                        errMessage,
                        context
                    )

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

                // Keep permissions aligned with fetchContract: state users only
                // see their own state's contracts; CMS/Admin users can see all
                // submitted contract history.
                if (isStateUser(user)) {
                    if (user.stateCode !== contractWithHistory.stateCode) {
                        const authInfo = !!context.oauthClient
                        const errMessage = authInfo
                            ? `OAuth client not allowed to access contract from ${contractWithHistory.stateCode}`
                            : `User from state ${user.stateCode} not allowed to access contract from ${contractWithHistory.stateCode}`
                        logResolverError(
                            'fetchSubmissionHistory',
                            errMessage,
                            context
                        )
                        throw new GraphQLError(errMessage, {
                            extensions: {
                                code: 'FORBIDDEN',
                                cause: 'INVALID_STATE_REQUESTER',
                            },
                        })
                    }
                } else if (
                    !hasCMSPermissions(user) &&
                    !hasAdminPermissions(user)
                ) {
                    const errMessage = 'User not allowed to access contract'
                    logResolverError(
                        'fetchSubmissionHistory',
                        errMessage,
                        context
                    )
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'INVALID_STATE_REQUESTER',
                        },
                    })
                }

                const submissionHistory =
                    await store.findSubmissionHistoryByContractID(
                        input.contractID
                    )

                if (submissionHistory instanceof Error) {
                    const errMessage = `Issue finding submission history: ${submissionHistory.message}`
                    logResolverError(
                        'fetchSubmissionHistory',
                        errMessage,
                        context
                    )

                    if (submissionHistory instanceof NotFoundError) {
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

                logResolverSuccess(
                    context.oauthClient
                        ? 'fetchSubmissionHistory - oauthClient'
                        : 'fetchSubmissionHistory',
                    context
                )

                return {
                    contractID: submissionHistory.contractID,
                    history: submissionHistory.history,
                }
            }
        )
    }
}

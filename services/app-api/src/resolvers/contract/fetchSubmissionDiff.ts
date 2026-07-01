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
import { createUserInputError } from '../errorUtils'
import { InvalidSubmissionDiffInputError } from '../../postgres/contractAndRates/findSubmissionDiffByContractID'

export function fetchSubmissionDiffResolver(
    store: Store
): QueryResolvers['fetchSubmissionDiff'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'fetchSubmissionDiff',
            { 'contract.id': input.contractID },
            async (span) => {
                setResolverDetails(span, user)

                if (!canRead(context)) {
                    const errMessage = `OAuth client does not have read permissions`
                    logResolverError('fetchSubmissionDiff', errMessage, context)
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
                    logResolverError('fetchSubmissionDiff', errMessage, context)

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

                if (isStateUser(user)) {
                    if (user.stateCode !== contractWithHistory.stateCode) {
                        const authInfo = !!context.oauthClient
                        const errMessage = authInfo
                            ? `OAuth client not allowed to access contract from ${contractWithHistory.stateCode}`
                            : `User from state ${user.stateCode} not allowed to access contract from ${contractWithHistory.stateCode}`
                        logResolverError(
                            'fetchSubmissionDiff',
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
                    logResolverError('fetchSubmissionDiff', errMessage, context)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'INVALID_STATE_REQUESTER',
                        },
                    })
                }

                const comparison = await store.findSubmissionDiffByContractID({
                    contractID: input.contractID,
                    olderContractRevisionID: input.olderContractRevisionID,
                    newerContractRevisionID: input.newerContractRevisionID,
                })

                if (comparison instanceof Error) {
                    const errMessage = `Issue finding submission diff: ${comparison.message}`
                    logResolverError('fetchSubmissionDiff', errMessage, context)

                    if (comparison instanceof InvalidSubmissionDiffInputError) {
                        throw createUserInputError(errMessage)
                    }

                    if (comparison instanceof NotFoundError) {
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
                        ? 'fetchSubmissionDiff - oauthClient'
                        : 'fetchSubmissionDiff',
                    context
                )

                return {
                    contractID: comparison.contractID,
                    comparison,
                }
            }
        )
    }
}

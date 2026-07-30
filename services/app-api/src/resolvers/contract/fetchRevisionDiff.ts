import { GraphQLError } from 'graphql'
import type { QueryResolvers } from '../../gen/gqlServer'
import {
    hasAdminPermissions,
    hasCMSPermissions,
    isStateUser,
    type RevisionDiff,
} from '../../domain-models'
import { logResolverError, logResolverSuccess } from '../../logger'
import { canRead } from '../../oauth/oauthAuthorization'
import { NotFoundError, type Store } from '../../postgres'
import { InvalidRevisionDiffInputError } from '../../postgres/revisionDiff/findRevisionDiffByContractID'
import { setResolverDetails, withResolverSpan } from '../attributeHelper'
import { createUserInputError } from '../errorUtils'

function serializeRevisionDiffFieldValue(value: unknown):
    | {
          kind: 'STRING'
          value: string
      }
    | {
          kind: 'BOOLEAN'
          value: boolean
      }
    | {
          kind: 'DATE'
          value: Date
      }
    | {
          kind: 'STRING_ARRAY'
          value: string[]
      }
    | undefined {
    if (value === undefined || value === null) {
        return undefined
    }

    if (value instanceof Date) {
        return {
            kind: 'DATE',
            value,
        }
    }

    if (Array.isArray(value)) {
        return {
            kind: 'STRING_ARRAY',
            value: value.map((item) => String(item)),
        }
    }

    if (typeof value === 'boolean') {
        return {
            kind: 'BOOLEAN',
            value,
        }
    }

    return {
        kind: 'STRING',
        value: String(value),
    }
}

function serializeRevisionDiffForGraphQL(comparison: RevisionDiff) {
    return {
        ...comparison,
        fieldChanges: comparison.fieldChanges.map((fieldChange) => ({
            ...fieldChange,
            oldValue: serializeRevisionDiffFieldValue(fieldChange.oldValue),
            newValue: serializeRevisionDiffFieldValue(fieldChange.newValue),
        })),
    }
}

export function fetchRevisionDiffResolver(
    store: Store
): QueryResolvers['fetchRevisionDiff'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'fetchRevisionDiff',
            { 'contract.id': input.contractID },
            async (span) => {
                setResolverDetails(span, user)

                if (!canRead(context)) {
                    const errMessage = `OAuth client does not have read permissions`
                    logResolverError('fetchRevisionDiff', errMessage, context)
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
                    logResolverError('fetchRevisionDiff', errMessage, context)

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
                            'fetchRevisionDiff',
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
                    logResolverError('fetchRevisionDiff', errMessage, context)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'INVALID_STATE_REQUESTER',
                        },
                    })
                }

                const comparison = await store.findRevisionDiffByContractID({
                    contractID: input.contractID,
                    olderContractRevisionID: input.olderContractRevisionID,
                    newerContractRevisionID: input.newerContractRevisionID,
                })

                if (comparison instanceof Error) {
                    const errMessage = `Issue finding revision diff: ${comparison.message}`
                    logResolverError('fetchRevisionDiff', errMessage, context)

                    if (comparison instanceof InvalidRevisionDiffInputError) {
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
                        ? 'fetchRevisionDiff - oauthClient'
                        : 'fetchRevisionDiff',
                    context
                )

                return {
                    contractID: comparison.contractID,
                    comparison: serializeRevisionDiffForGraphQL(comparison),
                }
            }
        )
    }
}

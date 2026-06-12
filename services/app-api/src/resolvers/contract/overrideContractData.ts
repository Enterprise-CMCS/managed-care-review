import { GraphQLError } from 'graphql'
import { canOauthWrite } from '../../authorization/oauthAuthorization'
import { isAdminUser } from '../../domain-models'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logResolverError, logResolverSuccess } from '../../logger'
import { NotFoundError, type Store } from '../../postgres'
import { setResolverDetails, withResolverSpan } from '../attributeHelper'
import { createForbiddenError, createUserInputError } from '../errorUtils'

const isOverrideUserInputError = (message: string): boolean =>
    message.startsWith('Invalid ') ||
    message.startsWith('Cannot override data') ||
    message.startsWith('Could not find latest submitted')

export function overrideContractData(
    store: Store
): MutationResolvers['overrideContractData'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'overrideContractData',
            { 'mcreview.package_id': input.contractID },
            async (span) => {
                setResolverDetails(span, user)

                if (!canOauthWrite(context)) {
                    const errMessage = `OAuth client does not have write permissions`
                    logResolverError(
                        'overrideContractData',
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

                if (!isAdminUser(user)) {
                    const errMessage =
                        'user not authorized to override contract data'
                    logResolverError(
                        'overrideContractData',
                        errMessage,
                        context
                    )
                    throw createForbiddenError(errMessage)
                }

                const contractResult = await store.findContractWithHistory(
                    input.contractID
                )
                if (contractResult instanceof Error) {
                    logResolverError(
                        'overrideContractData',
                        contractResult.message,
                        context
                    )

                    if (contractResult instanceof NotFoundError) {
                        throw new GraphQLError(contractResult.message, {
                            extensions: {
                                code: 'NOT_FOUND',
                                cause: 'DB_ERROR',
                            },
                        })
                    }

                    throw new GraphQLError(contractResult.message, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                if (
                    !['SUBMITTED', 'RESUBMITTED', 'APPROVED'].includes(
                        contractResult.consolidatedStatus
                    )
                ) {
                    const errMessage = `Cannot override data, contract consolidated status must be SUBMITTED, RESUBMITTED, or APPROVED. Consolidated status: ${contractResult.consolidatedStatus}`
                    logResolverError(
                        'overrideContractData',
                        errMessage,
                        context
                    )
                    throw createUserInputError(errMessage, 'contractID')
                }

                const result = await store.overrideContractData({
                    contractID: input.contractID,
                    updatedByID: user.id,
                    description: input.description,
                    overrides: {
                        initiallySubmittedAt:
                            input.overrides.initiallySubmittedAt,
                        initiallySubmittedAtOp:
                            input.overrides.initiallySubmittedAtOp,
                        revisionOverride: input.overrides.revisionOverride
                            ? {
                                  contractType:
                                      input.overrides.revisionOverride
                                          .contractType,
                                  contractTypeOp:
                                      input.overrides.revisionOverride
                                          .contractTypeOp,
                                  contractDocuments:
                                      input.overrides.revisionOverride
                                          .contractDocuments ?? undefined,
                                  supportingDocuments:
                                      input.overrides.revisionOverride
                                          .supportingDocuments ?? undefined,
                              }
                            : undefined,
                    },
                })

                if (result instanceof Error) {
                    logResolverError(
                        'overrideContractData',
                        result.message,
                        context
                    )

                    if (result instanceof NotFoundError) {
                        throw new GraphQLError(result.message, {
                            extensions: {
                                code: 'NOT_FOUND',
                                cause: 'DB_ERROR',
                            },
                        })
                    }

                    if (isOverrideUserInputError(result.message)) {
                        throw createUserInputError(
                            result.message,
                            'input',
                            input
                        )
                    }

                    throw new GraphQLError(result.message, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                logResolverSuccess('overrideContractData', context)

                return { contract: result }
            }
        )
    }
}

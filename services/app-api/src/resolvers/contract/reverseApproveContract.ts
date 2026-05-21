import { createForbiddenError, createUserInputError } from '../errorUtils'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logResolverError, logResolverSuccess } from '../../logger'
import { NotFoundError, type Store } from '../../postgres'
import { withResolverSpan, setResolverDetails } from '../attributeHelper'
import { GraphQLError } from 'graphql'
import { hasCMSPermissions, isAdminUser } from '../../domain-models/user'
import { canOauthWrite } from '../../authorization/oauthAuthorization'

export function reverseApproveContract(
    store: Store
): MutationResolvers['reverseApproveContract'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'reverseApproveContract',
            { 'mcreview.package_id': input.contractID },
            async (span) => {
                setResolverDetails(span, user)

                const { contractID, updatedReason } = input

                // Check OAuth client write permissions
                if (!canOauthWrite(context)) {
                    const errMessage = `OAuth client does not have write permissions`
                    logResolverError(
                        'reverseApproveContract',
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

                if (!hasCMSPermissions(user) && !isAdminUser(user)) {
                    const message =
                        'user not authorized to reverse approve a contract'
                    logResolverError('reverseApproveContract', message, context)
                    throw createForbiddenError(message)
                }

                const contractWithHistory =
                    await store.findContractWithHistory(contractID)

                if (contractWithHistory instanceof Error) {
                    const errMessage = `Issue finding contract message: ${contractWithHistory.message}`

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

                if (contractWithHistory.consolidatedStatus !== 'APPROVED') {
                    const errMessage = `Attempted to reverse approval for contract with wrong status: ${contractWithHistory.consolidatedStatus}`
                    logResolverError(
                        'reverseApproveContract',
                        errMessage,
                        context
                    )
                    throw createUserInputError(errMessage, 'contractID')
                }

                const latestAction =
                    contractWithHistory.reviewStatusActions?.[0]
                if (
                    !latestAction ||
                    latestAction.actionType !== 'MARK_AS_APPROVED'
                ) {
                    const errMessage = `Cannot reverse approval: latest review action is not MARK_AS_APPROVED`
                    logResolverError(
                        'reverseApproveContract',
                        errMessage,
                        context
                    )
                    throw createUserInputError(errMessage, 'contractID')
                }

                const reverseResult = await store.reverseApproveContract({
                    contractID: contractID,
                    updatedByID: user.id,
                    updatedReason: updatedReason,
                })

                if (reverseResult instanceof Error) {
                    if (reverseResult instanceof NotFoundError) {
                        logResolverError(
                            'reverseApproveContract',
                            reverseResult.message,
                            context
                        )
                        throw new GraphQLError(reverseResult.message, {
                            extensions: {
                                code: 'NOT_FOUND',
                                cause: 'DB_ERROR',
                            },
                        })
                    }

                    const errMessage = `Failed to reverse approval for contract ID:${contractID}`
                    logResolverError(
                        'reverseApproveContract',
                        errMessage,
                        context
                    )
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                logResolverSuccess('reverseApproveContract', context)

                return { contract: reverseResult }
            }
        )
    }
}

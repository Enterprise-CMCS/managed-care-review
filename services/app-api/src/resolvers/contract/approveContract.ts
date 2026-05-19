import { createForbiddenError, createUserInputError } from '../errorUtils'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import { NotFoundError, type Store } from '../../postgres'
import { withResolverSpan, setResolverDetails } from '../attributeHelper'
import { GraphQLError } from 'graphql'
import { hasCMSPermissions, isAdminUser } from '../../domain-models/user'
import { canOauthWrite } from '../../authorization/oauthAuthorization'

export function approveContract(
    store: Store
): MutationResolvers['approveContract'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'approveContract',
            { 'mcreview.package_id': input.contractID },
            async (span) => {
                setResolverDetails(span, user)

                // Check OAuth client read permissions
                if (!canOauthWrite(context)) {
                    const errMessage = `OAuth client does not have write permissions`
                    logError('approveContract', errMessage)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'INSUFFICIENT_OAUTH_GRANTS',
                        },
                    })
                }

                const {
                    contractID,
                    dateApprovalReleasedToState,
                    updatedReason,
                } = input

                if (!hasCMSPermissions(user) && !isAdminUser(user)) {
                    const message = 'user not authorized to approve a contract'
                    logError('approveContract', message)
                    throw createForbiddenError(message)
                }

                if (isAdminUser(user) && !updatedReason?.trim()) {
                    const errMessage =
                        'Approving a contract as an admin requires a reason'
                    logError('approveContract', errMessage)
                    throw createUserInputError(errMessage, 'updatedReason')
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

                const allowedStatus = ['SUBMITTED', 'RESUBMITTED'].includes(
                    contractWithHistory.consolidatedStatus
                )

                if (!allowedStatus) {
                    const errMessage = `Attempted to approve contract with wrong status: ${contractWithHistory.consolidatedStatus}`
                    logError('approveContract', errMessage)
                    throw createUserInputError(errMessage, 'contractID')
                }

                const today = new Date()
                const dateApprovalReleasedToStateAsDate = new Date(
                    dateApprovalReleasedToState
                )

                if (dateApprovalReleasedToStateAsDate > today) {
                    const errMessage = `Attempted to approve contract with invalid approval release date: ${dateApprovalReleasedToState}`
                    logError('approveContract', errMessage)
                    throw createUserInputError(errMessage)
                }

                const approveContractResult = await store.approveContract({
                    contractID: contractID,
                    updatedByID: user.id,
                    dateApprovalReleasedToState: dateApprovalReleasedToState,
                    updatedReason,
                })

                if (approveContractResult instanceof Error) {
                    if (approveContractResult instanceof NotFoundError) {
                        logError(
                            'approveContract',
                            approveContractResult.message
                        )
                        throw new GraphQLError(approveContractResult.message, {
                            extensions: {
                                code: 'NOT_FOUND',
                                cause: 'DB_ERROR',
                            },
                        })
                    }

                    const errMessage = `Failed to approve contract ID:${contractID}`
                    logError('approveContract', errMessage)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                logSuccess('approveContract')

                return { contract: approveContractResult }
            }
        )
    }
}

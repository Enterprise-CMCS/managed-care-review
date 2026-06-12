import type { Store } from '../../postgres'
import type { MutationResolvers } from '../../gen/gqlServer'
import type { Emailer } from '../../emailer'
import type { StateCodeType } from '@mc-review/submissions'
import { withResolverSpan, setResolverDetails } from '../attributeHelper'
import { hasCMSPermissions } from '../../domain-models'
import { logResolverError, logResolverSuccess } from '../../logger'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import { NotFoundError } from '../../postgres/postgresErrors'
import { GraphQLError } from 'graphql/index'
import { canOauthWrite } from '../../authorization/oauthAuthorization'
import type { LDService } from '../../launchDarkly/launchDarkly'

export function undoWithdrawRate(
    store: Store,
    emailer: Emailer,
    launchDarkly: LDService
): MutationResolvers['undoWithdrawRate'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'undoWithdrawRate',
            { 'mcreview.package_id': input.rateID },
            async (span) => {
                setResolverDetails(span, user)

                const { rateID, updatedReason } = input

                const featureFlags = await launchDarkly.allFlags({
                    key: context.user.email,
                })

                // Check OAuth client write permissions
                if (!canOauthWrite(context, featureFlags)) {
                    const errMessage = `OAuth client does not have write permissions`
                    logResolverError('undoWithdrawRate', errMessage, context)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'INSUFFICIENT_OAUTH_GRANTS',
                        },
                    })
                }

                if (!hasCMSPermissions(user)) {
                    const message = 'user not authorized to undo withdraw rate'
                    logResolverError('undoWithdrawRate', message, context)
                    throw createForbiddenError(message)
                }

                const rateWithHistory = await store.findRateWithHistory(rateID)

                if (rateWithHistory instanceof Error) {
                    const errMessage = `Issue finding rate: ${rateWithHistory.message}`
                    logResolverError('undoWithdrawRate', errMessage, context)

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

                if (
                    !['WITHDRAWN'].includes(rateWithHistory.consolidatedStatus)
                ) {
                    const errMessage = `Attempted to undo rate withdrawal with wrong status. Rate: ${rateWithHistory.consolidatedStatus}`
                    logResolverError('undoWithdrawRate', errMessage, context)
                    throw createUserInputError(errMessage, 'rateID')
                }

                // There must be one contract rate was withdrawn from and all must be in a submitted state.
                const withdrawnFromContracts =
                    rateWithHistory.withdrawnFromContracts
                if (!withdrawnFromContracts?.length) {
                    throw new GraphQLError(
                        'Cannot undo withdraw rate with no associated contracts',
                        {
                            extensions: {
                                code: 'NOT_FOUND',
                                cause: 'DB_ERROR',
                            },
                        }
                    )
                }

                const parentContract = withdrawnFromContracts.find(
                    (contract) =>
                        contract.id === rateWithHistory.parentContractID
                )

                if (!parentContract) {
                    const errMessage = `Attempted to undo rate withdrawal without a parent contract`
                    logResolverError('undoWithdrawRate', errMessage, context)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'NOT_FOUND',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                // Parent contract must be in a SUBMITTED or RESUBMITTED statuses, we are not supporting rate parent contract
                // reassignment when a rate is being unwithdrawn while its parent is withdrawn.
                if (
                    !['SUBMITTED', 'RESUBMITTED'].includes(
                        parentContract.consolidatedStatus
                    )
                ) {
                    const errMessage = `Attempted to undo rate withdrawal with parent contract in an invalid state: ${parentContract.consolidatedStatus}`
                    logResolverError('undoWithdrawRate', errMessage, context)
                    throw createUserInputError(errMessage, 'rateID')
                }

                // Other linked contracts can be in 'SUBMITTED', 'RESUBMITTED', 'WITHDRAWN' statuses
                const invalidLinkedContractStatus =
                    withdrawnFromContracts.filter(
                        (contract) =>
                            !['SUBMITTED', 'RESUBMITTED', 'WITHDRAWN'].includes(
                                contract.consolidatedStatus
                            ) && contract.id !== parentContract.id
                    )

                if (invalidLinkedContractStatus.length > 0) {
                    const errMessage = `Attempted to undo rate withdrawal with contract(s) that are in an invalid state. Invalid contract IDs: ${invalidLinkedContractStatus.map((contract) => contract.id)}`
                    logResolverError('undoWithdrawRate', errMessage, context)
                    throw createUserInputError(errMessage, 'rateID')
                }

                const undoWithdrawRateResult = await store.undoWithdrawRate({
                    rateID,
                    updatedByID: user.id,
                    updatedReason,
                })

                if (undoWithdrawRateResult instanceof Error) {
                    const errMessage = `Failed to undo withdraw rate: ${undoWithdrawRateResult.message}`
                    logResolverError('undoWithdrawRate', errMessage, context)

                    if (undoWithdrawRateResult instanceof NotFoundError) {
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

                logResolverSuccess('undoWithdrawRate', context)

                //Send emails upon success
                const statePrograms = store.findStatePrograms(
                    undoWithdrawRateResult.stateCode
                )

                if (statePrograms instanceof Error) {
                    const errMessage = `Email failed: ${statePrograms.message}`
                    logResolverError('undoWithdrawRate', errMessage, context)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'EMAIL_ERROR',
                        },
                    })
                }

                let stateAnalystEmails: string[] = []
                const stateAnalystEmailsResult =
                    await store.findStateAssignedUsers(
                        undoWithdrawRateResult.stateCode as StateCodeType
                    )

                if (stateAnalystEmailsResult instanceof Error) {
                    logResolverError(
                        'getStateAnalystEmails',
                        stateAnalystEmailsResult.message,
                        context
                    )
                } else {
                    stateAnalystEmails = stateAnalystEmailsResult.map(
                        (u) => u.email
                    )
                }

                //State emails
                const sendUndoWithdrawnRateStateEmail =
                    await emailer.sendUndoWithdrawnRateStateEmail(
                        undoWithdrawRateResult,
                        parentContract.contractSubmissionType,
                        statePrograms
                    )

                //CMS emails
                const sendUndoWithdrawnRateCMSEmail =
                    await emailer.sendUndoWithdrawnRateCMSEmail(
                        undoWithdrawRateResult,
                        parentContract.contractSubmissionType,
                        statePrograms,
                        stateAnalystEmails
                    )

                //Send email error handling
                if (
                    sendUndoWithdrawnRateStateEmail instanceof Error ||
                    sendUndoWithdrawnRateCMSEmail instanceof Error
                ) {
                    let errMessage = ''

                    if (sendUndoWithdrawnRateStateEmail instanceof Error) {
                        errMessage = `State email failed: ${sendUndoWithdrawnRateStateEmail.message}`
                    }

                    if (sendUndoWithdrawnRateCMSEmail instanceof Error) {
                        errMessage = `CMS email failed: ${sendUndoWithdrawnRateCMSEmail.message}`
                    }

                    logResolverError('undoWithdrawnRate', errMessage, context)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'EMAIL_ERROR',
                        },
                    })
                }

                return {
                    rate: undoWithdrawRateResult,
                }
            }
        )
    }
}

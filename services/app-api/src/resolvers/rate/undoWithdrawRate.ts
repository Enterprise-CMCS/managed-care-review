import type { Store } from '../../postgres'
import type { MutationResolvers } from '../../gen/gqlServer'
import type { Emailer } from '../../emailer'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { hasCMSPermissions } from '../../domain-models'
import { logError, logSuccess } from '../../logger'
import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { NotFoundError } from '../../postgres'
import { GraphQLError } from 'graphql/index'
import type { StateCodeType } from '../../testHelpers'
import { canWrite } from '../../authorization/oauthAuthorization'

export function undoWithdrawRate(
    store: Store,
    emailer: Emailer
): MutationResolvers['undoWithdrawRate'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('undoWithdrawRate', {}, ctx)
        setResolverDetailsOnActiveSpan('undoWithdrawRate', user, span)

        const { rateID, updatedReason } = input
        span?.setAttribute('mcreview.package_id', rateID)

        // Check OAuth client read permissions
        if (!canWrite(context)) {
            const errMessage = `OAuth client does not have write permissions`
            logError('undoWithdrawRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'FORBIDDEN',
                    cause: 'INSUFFICIENT_OAUTH_GRANTS',
                },
            })
        }

        if (!hasCMSPermissions(user)) {
            const message = 'user not authorized to undo withdraw rate'
            logError('undoWithdrawRate', message)
            setErrorAttributesOnActiveSpan(message, span)
            throw new ForbiddenError(message)
        }

        const rateWithHistory = await store.findRateWithHistory(rateID)

        if (rateWithHistory instanceof Error) {
            const errMessage = `Issue finding rate: ${rateWithHistory.message}`
            logError('undoWithdrawRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

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

        if (!['WITHDRAWN'].includes(rateWithHistory.consolidatedStatus)) {
            const errMessage = `Attempted to undo rate withdrawal with wrong status. Rate: ${rateWithHistory.consolidatedStatus}`
            logError('undoWithdrawRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                argumentName: 'rateID',
                cause: 'INVALID_PACKAGE_STATUS',
            })
        }

        // There must be one contract rate was withdrawn from and all must be in a submitted state.
        const withdrawnFromContracts = rateWithHistory.withdrawnFromContracts
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
            (contract) => contract.id === rateWithHistory.parentContractID
        )

        if (!parentContract) {
            const errMessage = `Attempted to undo rate withdrawal without a parent contract`
            logError('undoWithdrawRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
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
            logError('undoWithdrawRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                argumentName: 'rateID',
                cause: 'INVALID_PACKAGE_STATUS',
            })
        }

        // Other linked contracts can be in 'SUBMITTED', 'RESUBMITTED', 'WITHDRAWN' statuses
        const invalidLinkedContractStatus = withdrawnFromContracts.filter(
            (contract) =>
                !['SUBMITTED', 'RESUBMITTED', 'WITHDRAWN'].includes(
                    contract.consolidatedStatus
                ) && contract.id !== parentContract.id
        )

        if (invalidLinkedContractStatus.length > 0) {
            const errMessage = `Attempted to undo rate withdrawal with contract(s) that are in an invalid state. Invalid contract IDs: ${invalidLinkedContractStatus.map((contract) => contract.id)}`
            logError('undoWithdrawRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                argumentName: 'rateID',
                cause: 'INVALID_PACKAGE_STATUS',
            })
        }

        const undoWithdrawRate = await store.undoWithdrawRate({
            rateID,
            updatedByID: user.id,
            updatedReason,
        })

        if (undoWithdrawRate instanceof Error) {
            const errMessage = `Failed to undo withdraw rate: ${undoWithdrawRate.message}`
            logError('undoWithdrawRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            if (undoWithdrawRate instanceof NotFoundError) {
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
        logSuccess('undoWithdrawRate')
        setSuccessAttributesOnActiveSpan(span)

        //Send emails upon success
        const statePrograms = store.findStatePrograms(
            undoWithdrawRate.stateCode
        )

        if (statePrograms instanceof Error) {
            const errMessage = `Email failed: ${statePrograms.message}`
            logError('undoWithdrawRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'EMAIL_ERROR',
                },
            })
        }

        let stateAnalystEmails: string[] = []
        const stateAnalystEmailsResult = await store.findStateAssignedUsers(
            undoWithdrawRate.stateCode as StateCodeType
        )

        if (stateAnalystEmailsResult instanceof Error) {
            logError('getStateAnalystEmails', stateAnalystEmailsResult.message)
            setErrorAttributesOnActiveSpan(
                stateAnalystEmailsResult.message,
                span
            )
        } else {
            stateAnalystEmails = stateAnalystEmailsResult.map((u) => u.email)
        }

        //State emails
        const sendUndoWithdrawnRateStateEmail =
            await emailer.sendUndoWithdrawnRateStateEmail(
                undoWithdrawRate,
                statePrograms
            )

        //CMS emails
        const sendUndoWithdrawnRateCMSEmail =
            await emailer.sendUndoWithdrawnRateCMSEmail(
                undoWithdrawRate,
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

            logError('undoWithdrawnRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'EMAIL_ERROR',
                },
            })
        }

        return {
            rate: undoWithdrawRate,
        }
    }
}

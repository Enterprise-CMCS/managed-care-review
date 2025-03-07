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
        if (!withdrawnFromContracts || withdrawnFromContracts.length === 0) {
            const errMessage =
                'Cannot undo withdraw rate with no associated contracts'
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'NOT_FOUND',
                    cause: 'DB_ERROR',
                },
            })
        }

        const invalidStatusContract = withdrawnFromContracts.filter(
            (contract) =>
                !['SUBMITTED', 'RESUBMITTED'].includes(
                    contract.consolidatedStatus
                )
        )
        if (invalidStatusContract.length > 0) {
            const errMessage = `Attempted to undo rate withdrawal with contract(s) that are in an invalid state. Invalid contract IDs: ${invalidStatusContract.map((contract) => contract.id)}`
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
        const statePrograms = await store.findStatePrograms(
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

        //State emails
        const sendUndoWithdrawnRateStateEmail =
            await emailer.sendUndoWithdrawnRateStateEmail(
                undoWithdrawRate,
                statePrograms
            )

        if (sendUndoWithdrawnRateStateEmail instanceof Error) {
            let errMessage = ''

            if (sendUndoWithdrawnRateStateEmail instanceof Error) {
                errMessage = `State email failed: ${sendUndoWithdrawnRateStateEmail.message}`
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

import type { Store } from '../../postgres'
import { NotFoundError } from '../../postgres'
import type { MutationResolvers } from '../../gen/gqlServer'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { hasCMSPermissions } from '../../domain-models'
import { logError, logSuccess } from '../../logger'
import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { GraphQLError } from 'graphql/index'
import type { Emailer } from '../../emailer'
import type { StateCodeType } from '../../testHelpers'

export function withdrawRate(
    store: Store,
    emailer: Emailer
): MutationResolvers['withdrawRate'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('withdrawRate', {}, ctx)
        setResolverDetailsOnActiveSpan('withdrawRate', user, span)

        const { rateID, updatedReason } = input
        span?.setAttribute('mcreview.package_id', rateID)

        if (!hasCMSPermissions(user)) {
            const message = 'user not authorized to withdraw a rate'
            logError('withdrawRate', message)
            setErrorAttributesOnActiveSpan(message, span)
            throw new ForbiddenError(message)
        }

        const rateWithHistory = await store.findRateWithHistory(rateID)

        if (rateWithHistory instanceof Error) {
            const errMessage = `Issue finding rate message: ${rateWithHistory.message}`
            logError('withdrawRate', errMessage)
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

        const parentContractID = rateWithHistory.parentContractID

        const parentContract =
            await store.findContractWithHistory(parentContractID)

        if (parentContract instanceof Error) {
            const errMessage = `Issue finding contract message: ${parentContract.message}`
            logError('withdrawRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            if (parentContract instanceof NotFoundError) {
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

        const allowedRateStatus = ['SUBMITTED', 'RESUBMITTED'].includes(
            rateWithHistory.consolidatedStatus
        )

        // Parent contract should also not be unlocked. Currently, there is no way to get into the state where rate is in
        // a valid status, but parent contract is invalid status.
        const allowedParentContractStatus = [
            'SUBMITTED',
            'RESUBMITTED',
            'WITHDRAWN',
        ].includes(parentContract.consolidatedStatus)

        if (!allowedRateStatus || !allowedParentContractStatus) {
            const errMessage = `Attempted to withdraw rate with wrong status. Rate: ${rateWithHistory.consolidatedStatus}, Parent contract: ${parentContract.consolidatedStatus}`
            logError('withdrawRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                argumentName: 'rateID',
                cause: 'INVALID_PACKAGE_STATUS',
            })
        }

        const withdrawnRate = await store.withdrawRate({
            rateID,
            updatedByID: user.id,
            updatedReason,
        })

        if (withdrawnRate instanceof Error) {
            const errMessage = `Failed to withdraw rate message: ${withdrawnRate.message}`
            logError('withdrawRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            if (withdrawnRate instanceof NotFoundError) {
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

        logSuccess('withdrawRate')
        setSuccessAttributesOnActiveSpan(span)

        // Send out email to state contacts
        const statePrograms = await store.findStatePrograms(
            withdrawnRate.stateCode
        )

        if (statePrograms instanceof Error) {
            const errMessage = `Email failed: ${statePrograms.message}`
            logError('withdrawRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'EMAIL_ERROR',
                },
            })
        }

        let stateAnalystsEmails: string[] = []
        // not great that state code type isn't being used in ContractType but I'll risk the conversion for now
        const stateAnalystsEmailsResult = await store.findStateAssignedUsers(
            withdrawnRate.stateCode as StateCodeType
        )

        if (stateAnalystsEmailsResult instanceof Error) {
            logError(
                'getStateAnalystsEmails',
                stateAnalystsEmailsResult.message
            )
            setErrorAttributesOnActiveSpan(
                stateAnalystsEmailsResult.message,
                span
            )
        } else {
            stateAnalystsEmails = stateAnalystsEmailsResult.map((u) => u.email)
        }

        const sendWithdrawCMSEmail = await emailer.sendWithdrawnRateCMSEmail(
            withdrawnRate,
            statePrograms,
            stateAnalystsEmails
        )

        const sendWithdrawStateEmail =
            await emailer.sendWithdrawnRateStateEmail(
                withdrawnRate,
                statePrograms
            )

        if (
            sendWithdrawStateEmail instanceof Error ||
            sendWithdrawCMSEmail instanceof Error
        ) {
            let errMessage = ''

            if (sendWithdrawStateEmail instanceof Error) {
                errMessage = `State Email failed: ${sendWithdrawStateEmail.message}`
            }
            if (sendWithdrawCMSEmail instanceof Error) {
                errMessage = `CMS Email failed: ${sendWithdrawCMSEmail.message}`
            }

            logError('withdrawRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'EMAIL_ERROR',
                },
            })
        }

        return {
            rate: withdrawnRate,
        }
    }
}

import type { Store } from '../../postgres'
import { NotFoundError } from '../../postgres'
import type { MutationResolvers } from '../../gen/gqlServer'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
} from '../attributeHelper'
import { hasCMSPermissions } from '../../domain-models'
import { logError } from '../../logger'
import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { GraphQLError } from 'graphql/index'
import type { Emailer } from '../../emailer'
import type { StateCodeType } from '../../testHelpers'

export function withdrawContract(
    store: Store,
    emailer: Emailer
): MutationResolvers['withdrawContract'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('withdrawContract', {}, ctx)
        setResolverDetailsOnActiveSpan('withdrawContract', user, span)

        const { contractID, updatedReason } = input
        span?.setAttribute('mcreview.package_id', contractID)

        if (!hasCMSPermissions(user)) {
            const message = 'user not authorized to withdraw a rate'
            logError('withdrawRate', message)
            setErrorAttributesOnActiveSpan(message, span)
            throw new ForbiddenError(message)
        }

        const contractWithHistory =
            await store.findContractWithHistory(contractID)

        if (contractWithHistory instanceof Error) {
            if (contractWithHistory instanceof NotFoundError) {
                const errMessage = `A contract must exist to be unlocked: ${contractID}`
                logError('unlockContract', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new UserInputError(errMessage, {
                    argumentName: 'contractID',
                })
            }

            const errMessage = `Issue finding a contract. Message: ${contractWithHistory.message}`
            logError('unlockContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        if (
            !['SUBMITTED', 'RESUBMITTED'].includes(
                contractWithHistory.consolidatedStatus
            )
        ) {
            const errMessage = `Attempted to withdraw submission with invalid contract status of ${contractWithHistory.consolidatedStatus}`
            logError('withdrawContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                argumentName: 'contractID',
                cause: 'INVALID_PACKAGE_STATUS',
            })
        }

        const withdrawResult = await store.withdrawContract({
            contract: contractWithHistory,
            updatedByID: user.id,
            updatedReason,
        })

        if (withdrawResult instanceof Error) {
            const errMessage = `Failed to withdraw contract. ${withdrawResult.message}`
            logError('withdrawSubmission', errMessage)

            if (withdrawResult instanceof NotFoundError) {
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

        const { withdrawnContract, ratesForDisplay } = withdrawResult

        let stateAnalystsEmails: string[] = []
        const stateAnalystsEmailsResult = await store.findStateAssignedUsers(
            withdrawnContract.stateCode as StateCodeType
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

        const sendWithdrawCMSEmail =
            await emailer.sendWithdrawnSubmissionCMSEmail(
                withdrawnContract,
                ratesForDisplay,
                stateAnalystsEmails
            )

        if (sendWithdrawCMSEmail instanceof Error) {
            let errMessage = ''

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
            contract: withdrawnContract,
        }
    }
}

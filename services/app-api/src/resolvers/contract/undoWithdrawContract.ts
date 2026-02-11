import type { Store } from '../../postgres'
import type { MutationResolvers } from '../../gen/gqlServer'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { NotFoundError } from '../../postgres'
import { logError, logSuccess } from '../../logger'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import { GraphQLError } from 'graphql/index'
import { hasCMSPermissions } from '../../domain-models'
import type { StateCodeType } from '@mc-review/submissions'
import type { Emailer } from '../../emailer'
import { canOauthWrite } from '../../authorization/oauthAuthorization'
import type { DocumentZipService } from '../../zip/generateZip'

export function undoWithdrawContract(
    store: Store,
    emailer: Emailer,
    documentZip: DocumentZipService
): MutationResolvers['undoWithdrawContract'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('undoWithdrawContract', {}, ctx)
        setResolverDetailsOnActiveSpan('undoWithdrawContract', user, span)

        const { contractID, updatedReason } = input
        span?.setAttribute('mcreview.package_id', contractID)

        // Check OAuth client read permissions
        if (!canOauthWrite(context)) {
            const errMessage = `OAuth client does not have write permissions`
            logError('undoWithdrawContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'FORBIDDEN',
                    cause: 'INSUFFICIENT_OAUTH_GRANTS',
                },
            })
        }

        if (!hasCMSPermissions(user)) {
            const message =
                'user not authorized to undo a submission withdrawal'
            logError('undoWithdrawContract', message)
            setErrorAttributesOnActiveSpan(message, span)
            throw createForbiddenError(message)
        }

        const contractWithHistory =
            await store.findContractWithHistory(contractID)

        if (contractWithHistory instanceof Error) {
            if (contractWithHistory instanceof NotFoundError) {
                const errMessage = `A contract must exist to undo a submission withdrawal: ${contractID}`
                logError('undoWithdrawContract', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw createUserInputError(errMessage, 'contractID')
            }

            const errMessage = `Issue finding a contract. Message: ${contractWithHistory.message}`
            logError('undoWithdrawContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        if (contractWithHistory.consolidatedStatus !== 'WITHDRAWN') {
            const errMessage = `Attempted to undo a submission withdrawal with invalid contract status of ${contractWithHistory.consolidatedStatus}`
            logError('undoWithdrawContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createUserInputError(errMessage, 'contractID')
        }

        const undoWithdrawResult = await store.undoWithdrawContract({
            contract: contractWithHistory,
            updatedByID: user.id,
            updatedReason,
        })

        if (undoWithdrawResult instanceof Error) {
            const errMessage = `Failed to undo a submission withdrawal. ${undoWithdrawResult.message}`
            logError('undoWithdrawContract', errMessage)

            if (undoWithdrawResult instanceof NotFoundError) {
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

        const { contract, ratesForDisplay } = undoWithdrawResult
        // Generate zips!
        const contractZipRes = await documentZip.createContractZips(
            contract,
            span
        )
        if (contractZipRes instanceof Error) {
            const errMessage = `Failed to zip files for contract revision with ID: ${contract.id}: ${contractZipRes.message}`
            logError('submitContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
        }
        const rateZipRes = await documentZip.createRateZips(contract, span)
        if (rateZipRes instanceof Array) {
            const errorMessage = `Failed to zip files for ${rateZipRes.length} rate revision(s) on contract ${contract.id}`
            logError('submitContract', errorMessage)
            setErrorAttributesOnActiveSpan(errorMessage, span)

            rateZipRes.forEach((error, index) => {
                logError(
                    'submitContract',
                    `Rate zip error ${index + 1}: ${error.message}`
                )
            })
        }
        let stateAnalystsEmails: string[] = []
        const stateAnalystsEmailsResult = await store.findStateAssignedUsers(
            contract.stateCode as StateCodeType
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

        const sendUndoWithdrawCMSEmail =
            await emailer.sendUndoWithdrawnSubmissionCMSEmail(
                contract,
                ratesForDisplay,
                stateAnalystsEmails
            )

        const sendUndoWithdrawStateEmail =
            await emailer.sendUndoWithdrawnSubmissionStateEmail(
                contract,
                ratesForDisplay
            )

        if (
            sendUndoWithdrawCMSEmail instanceof Error ||
            sendUndoWithdrawStateEmail instanceof Error
        ) {
            let errMessage = ''

            if (sendUndoWithdrawCMSEmail instanceof Error) {
                errMessage = `CMS Email failed: ${sendUndoWithdrawCMSEmail.message}`
            }

            if (sendUndoWithdrawStateEmail instanceof Error) {
                errMessage = `State Email failed: ${sendUndoWithdrawStateEmail.message}`
            }

            logError('undoWithdrawContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'EMAIL_ERROR',
                },
            })
        }

        logSuccess('undoWithdrawContract')
        setSuccessAttributesOnActiveSpan(span)

        return {
            contract: contract,
        }
    }
}

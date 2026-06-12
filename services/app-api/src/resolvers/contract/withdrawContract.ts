import type { Store } from '../../postgres'
import { NotFoundError } from '../../postgres'
import type { MutationResolvers } from '../../gen/gqlServer'
import {
    withResolverSpan,
    setResolverDetails,
    recordResolverError,
} from '../attributeHelper'
import { hasCMSPermissions } from '../../domain-models'
import { logResolverError } from '../../logger'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import { GraphQLError } from 'graphql/index'
import type { Emailer } from '../../emailer'
import type { StateCodeType } from '@mc-review/submissions'
import { canOauthWrite } from '../../oauth/oauthAuthorization'
import type { DocumentZipService } from '../../zip/generateZip'
import type { LDService } from '../../launchDarkly/launchDarkly'

export function withdrawContract(
    store: Store,
    emailer: Emailer,
    documentZip: DocumentZipService,
    launchDarkly: LDService
): MutationResolvers['withdrawContract'] {
    return async (_parent, { input }, context) => {
        const { user } = context
        const { contractID, updatedReason } = input

        return withResolverSpan(
            context,
            'withdrawContract',
            { 'mcreview.contract_id': contractID },
            async (span) => {
                setResolverDetails(span, user)

                const featureFlags = await launchDarkly.allFlags({
                    key: context.user.email,
                })

                // Check OAuth client write permissions
                if (!canOauthWrite(context, featureFlags)) {
                    const errMessage = `OAuth client does not have write permissions`
                    logResolverError('withdrawContract', errMessage, context)

                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'INSUFFICIENT_OAUTH_GRANTS',
                        },
                    })
                }

                if (!hasCMSPermissions(user)) {
                    const message = 'user not authorized to withdraw a contract'
                    logResolverError('withdrawContract', message, context)
                    throw createForbiddenError(message)
                }

                const contractWithHistory =
                    await store.findContractWithHistory(contractID)

                if (contractWithHistory instanceof Error) {
                    if (contractWithHistory instanceof NotFoundError) {
                        const errMessage = `A contract must exist to be withdrawn: ${contractID}`
                        logResolverError(
                            'withdrawContract',
                            errMessage,
                            context
                        )
                        throw createUserInputError(errMessage, 'contractID')
                    }

                    const errMessage = `Issue finding a contract. Message: ${contractWithHistory.message}`
                    logResolverError('withdrawContract', errMessage, context)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                if (
                    ![
                        'SUBMITTED',
                        'RESUBMITTED',
                        'NOT_SUBJECT_TO_REVIEW',
                    ].includes(contractWithHistory.consolidatedStatus)
                ) {
                    const errMessage = `Attempted to withdraw submission with invalid contract status of ${contractWithHistory.consolidatedStatus}`
                    logResolverError('withdrawContract', errMessage, context)
                    throw createUserInputError(errMessage, 'contractID')
                }

                const withdrawResult = await store.withdrawContract({
                    contract: contractWithHistory,
                    updatedByID: user.id,
                    updatedReason,
                })

                if (withdrawResult instanceof Error) {
                    const errMessage = `Failed to withdraw contract. ${withdrawResult.message}`
                    logResolverError('withdrawContract', errMessage, context)

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

                // Generate zips!
                const contractZipRes = await documentZip.createContractZips(
                    withdrawnContract,
                    span
                )
                if (contractZipRes instanceof Error) {
                    const errMessage = `Failed to zip files for contract revision with ID: ${withdrawnContract.id}: ${contractZipRes.message}`
                    logResolverError('withdrawContract', errMessage, context)
                    recordResolverError(span, errMessage)
                }
                const rateZipRes = await documentZip.createRateZips(
                    withdrawnContract,
                    span
                )
                if (rateZipRes instanceof Array) {
                    const errorMessage = `Failed to zip files for ${rateZipRes.length} rate revision(s) on contract ${withdrawnContract.id}`
                    logResolverError('withdrawContract', errorMessage, context)
                    recordResolverError(span, errorMessage)

                    rateZipRes.forEach((error, index) => {
                        logResolverError(
                            'withdrawContract',
                            `Rate zip error ${index + 1}: ${error.message}`,
                            context
                        )
                    })
                }
                let stateAnalystsEmails: string[] = []
                const stateAnalystsEmailsResult =
                    await store.findStateAssignedUsers(
                        withdrawnContract.stateCode as StateCodeType
                    )

                if (stateAnalystsEmailsResult instanceof Error) {
                    logResolverError(
                        'getStateAnalystsEmails',
                        stateAnalystsEmailsResult.message,
                        context
                    )
                    recordResolverError(span, stateAnalystsEmailsResult)
                } else {
                    stateAnalystsEmails = stateAnalystsEmailsResult.map(
                        (u) => u.email
                    )
                }

                const sendWithdrawCMSEmail =
                    await emailer.sendWithdrawnSubmissionCMSEmail(
                        withdrawnContract,
                        ratesForDisplay,
                        stateAnalystsEmails
                    )

                const sendWithdrawStateEmail =
                    await emailer.sendWithdrawnSubmissionStateEmail(
                        withdrawnContract,
                        ratesForDisplay
                    )

                if (
                    sendWithdrawCMSEmail instanceof Error ||
                    sendWithdrawStateEmail instanceof Error
                ) {
                    let errMessage = ''

                    if (sendWithdrawCMSEmail instanceof Error) {
                        errMessage = `CMS Email failed: ${sendWithdrawCMSEmail.message}`
                    }

                    if (sendWithdrawStateEmail instanceof Error) {
                        errMessage = `State Email failed: ${sendWithdrawStateEmail.message}`
                    }

                    logResolverError('withdrawContract', errMessage, context)
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
        )
    }
}

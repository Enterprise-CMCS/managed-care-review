import { createForbiddenError, createUserInputError } from '../errorUtils'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logResolverError, logResolverSuccess } from '../../logger'
import {
    NotFoundError,
    UserInputPostgresError,
    handleUserInputPostgresError,
    type Store,
} from '../../postgres'
import { setResolverDetails, withResolverSpan } from '../attributeHelper'
import { GraphQLError } from 'graphql'
import {
    contractSubmitters,
    hasAdminPermissions,
    hasCMSPermissions,
} from '../../domain-models'
import type { UpdateInfoType } from '../../domain-models'
import { canOauthWrite } from '../../oauth/oauthAuthorization'
import type { LDService } from '../../launchDarkly/launchDarkly'
import type { Emailer } from '../../emailer'
import { getStateAnalystsEmails, getStatePrograms } from '../helpers'

export function undoUnlockContract(
    store: Store,
    emailer: Emailer,
    launchDarkly: LDService
): MutationResolvers['undoUnlockContract'] {
    return async (_parent, { input }, context) => {
        const { user } = context
        const { contractID, updatedReason } = input

        return withResolverSpan(
            context,
            'undoUnlockContract',
            { 'contract.id': contractID },
            async (span) => {
                setResolverDetails(span, user)

                const featureFlags = await launchDarkly.allFlags({
                    key: context.user.email,
                })

                if (!canOauthWrite(context, featureFlags)) {
                    const errMessage = `OAuth client does not have write permissions`
                    logResolverError('undoUnlockContract', errMessage, context)

                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'INSUFFICIENT_OAUTH_GRANTS',
                        },
                    })
                }

                if (!hasCMSPermissions(user) && !hasAdminPermissions(user)) {
                    const message =
                        'user not authorized to undo unlock a contract'
                    logResolverError('undoUnlockContract', message, context)
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

                if (contractWithHistory.status !== 'UNLOCKED') {
                    const errMessage = `Attempted to undo unlock for contract with wrong status: ${contractWithHistory.status}`
                    logResolverError('undoUnlockContract', errMessage, context)
                    throw createUserInputError(errMessage, 'contractID')
                }

                if (
                    !contractWithHistory.draftRevision?.unlockInfo ||
                    contractWithHistory.draftRevision.submitInfo
                ) {
                    const errMessage =
                        'Cannot undo unlock: latest contract revision is not an unlocked draft revision'
                    logResolverError('undoUnlockContract', errMessage, context)
                    throw createUserInputError(errMessage, 'contractID')
                }

                const reverseResult = await store.undoUnlockContract({
                    contractID,
                    updatedByID: user.id,
                    updatedReason,
                })

                if (reverseResult instanceof Error) {
                    if (reverseResult instanceof UserInputPostgresError) {
                        logResolverError(
                            'undoUnlockContract',
                            reverseResult.message,
                            context
                        )
                        throw handleUserInputPostgresError(
                            reverseResult,
                            'contractID',
                            contractID
                        )
                    }

                    if (reverseResult instanceof NotFoundError) {
                        logResolverError(
                            'undoUnlockContract',
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

                    const errMessage = `Failed to undo unlock for contract ID:${contractID}`
                    logResolverError('undoUnlockContract', errMessage, context)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                const stateAnalystsEmails = await getStateAnalystsEmails(
                    reverseResult,
                    store,
                    context
                )

                const statePrograms = getStatePrograms(
                    reverseResult.stateCode,
                    store,
                    context,
                    {
                        operation: 'undoUnlockContract',
                        errorMsg: (m) => `Email failed: ${m}`,
                        cause: 'EMAIL_ERROR',
                    }
                )

                const resultsUpdateInfo = reverseResult.undoUnlockPackages?.[0]
                    .undoUnlockInfo as UpdateInfoType
                const updateInfo: UpdateInfoType = {
                    updatedAt: resultsUpdateInfo.updatedAt,
                    updatedBy: resultsUpdateInfo.updatedBy,
                    updatedReason: resultsUpdateInfo.updatedReason,
                }

                const undoUnlockContractCMSEmailResult =
                    await emailer.sendUndoUnlockContractCMSEmail(
                        reverseResult,
                        updateInfo,
                        stateAnalystsEmails,
                        statePrograms
                    )

                const submitterEmails = contractSubmitters(reverseResult)
                const undoUnlockContractStateEmailResult =
                    await emailer.sendUndoUnlockContractStateEmail(
                        reverseResult,
                        updateInfo,
                        submitterEmails,
                        statePrograms
                    )

                if (
                    undoUnlockContractCMSEmailResult instanceof Error ||
                    undoUnlockContractStateEmailResult instanceof Error
                ) {
                    if (undoUnlockContractCMSEmailResult instanceof Error) {
                        logResolverError(
                            'undoUnlockContractCMSEmail - CMS email failed',
                            undoUnlockContractCMSEmailResult,
                            context
                        )
                    }
                    if (undoUnlockContractStateEmailResult instanceof Error) {
                        logResolverError(
                            'undoUnlockContractStateEmail - state email failed',
                            undoUnlockContractStateEmailResult,
                            context
                        )
                    }
                    throw new GraphQLError('Email failed.', {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'EMAIL_ERROR',
                        },
                    })
                }

                logResolverSuccess('undoUnlockContract', context)

                return { contract: reverseResult }
            }
        )
    }
}

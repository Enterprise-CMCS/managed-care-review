import { createForbiddenError, createUserInputError } from '../errorUtils'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import {
    NotFoundError,
    UserInputPostgresError,
    handleUserInputPostgresError,
    type Store,
} from '../../postgres'
import { setResolverDetails, withResolverSpan } from '../attributeHelper'
import { GraphQLError } from 'graphql'
import { hasAdminPermissions, hasCMSPermissions } from '../../domain-models'
import { canOauthWrite } from '../../authorization/oauthAuthorization'

export function undoUnlockContract(
    store: Store
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

                if (!canOauthWrite(context)) {
                    const errMessage = `OAuth client does not have write permissions`
                    logError('undoUnlockContract', errMessage)

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
                    logError('undoUnlockContract', message)
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
                    logError('undoUnlockContract', errMessage)
                    throw createUserInputError(errMessage, 'contractID')
                }

                if (
                    !contractWithHistory.draftRevision?.unlockInfo ||
                    contractWithHistory.draftRevision.submitInfo
                ) {
                    const errMessage =
                        'Cannot undo unlock: latest contract revision is not an unlocked draft revision'
                    logError('undoUnlockContract', errMessage)
                    throw createUserInputError(errMessage, 'contractID')
                }

                const reverseResult = await store.undoUnlockContract({
                    contractID,
                    updatedByID: user.id,
                    updatedReason,
                })

                if (reverseResult instanceof Error) {
                    if (reverseResult instanceof UserInputPostgresError) {
                        logError('undoUnlockContract', reverseResult.message)
                        throw handleUserInputPostgresError(
                            reverseResult,
                            'contractID',
                            contractID
                        )
                    }

                    if (reverseResult instanceof NotFoundError) {
                        logError('undoUnlockContract', reverseResult.message)
                        throw new GraphQLError(reverseResult.message, {
                            extensions: {
                                code: 'NOT_FOUND',
                                cause: 'DB_ERROR',
                            },
                        })
                    }

                    const errMessage = `Failed to undo unlock for contract ID:${contractID}`
                    logError('undoUnlockContract', errMessage)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                logSuccess('undoUnlockContract')

                return { contract: reverseResult }
            }
        )
    }
}

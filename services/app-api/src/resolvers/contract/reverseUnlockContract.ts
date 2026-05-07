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
import { hasCMSPermissions } from '../../domain-models/user'
import { canOauthWrite } from '../../authorization/oauthAuthorization'

export function reverseUnlockContract(
    store: Store
): MutationResolvers['reverseUnlockContract'] {
    return async (_parent, { input }, context) => {
        const { user } = context
        const { contractID, updatedReason } = input

        return withResolverSpan(
            context,
            'reverseUnlockContract',
            { 'contract.id': contractID },
            async (span) => {
                setResolverDetails(span, user)

                if (!canOauthWrite(context)) {
                    const errMessage = `OAuth client does not have write permissions`
                    logError('reverseUnlockContract', errMessage)

                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'INSUFFICIENT_OAUTH_GRANTS',
                        },
                    })
                }

                if (!hasCMSPermissions(user)) {
                    const message =
                        'user not authorized to reverse unlock a contract'
                    logError('reverseUnlockContract', message)
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
                    const errMessage = `Attempted to reverse unlock for contract with wrong status: ${contractWithHistory.status}`
                    logError('reverseUnlockContract', errMessage)
                    throw createUserInputError(errMessage, 'contractID')
                }

                if (
                    !contractWithHistory.draftRevision?.unlockInfo ||
                    contractWithHistory.draftRevision.submitInfo
                ) {
                    const errMessage =
                        'Cannot reverse unlock: latest contract revision is not an unlocked draft revision'
                    logError('reverseUnlockContract', errMessage)
                    throw createUserInputError(errMessage, 'contractID')
                }

                const reverseResult = await store.reverseUnlockContract({
                    contractID,
                    updatedByID: user.id,
                    updatedReason,
                })

                if (reverseResult instanceof Error) {
                    if (reverseResult instanceof UserInputPostgresError) {
                        logError('reverseUnlockContract', reverseResult.message)
                        throw handleUserInputPostgresError(
                            reverseResult,
                            'contractID',
                            contractID
                        )
                    }

                    if (reverseResult instanceof NotFoundError) {
                        logError('reverseUnlockContract', reverseResult.message)
                        throw new GraphQLError(reverseResult.message, {
                            extensions: {
                                code: 'NOT_FOUND',
                                cause: 'DB_ERROR',
                            },
                        })
                    }

                    const errMessage = `Failed to reverse unlock for contract ID:${contractID}`
                    logError('reverseUnlockContract', errMessage)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                logSuccess('reverseUnlockContract')

                return { contract: reverseResult }
            }
        )
    }
}

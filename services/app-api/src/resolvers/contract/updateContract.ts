import { createForbiddenError, createUserInputError } from '../errorUtils'
import { hasCMSPermissions } from '../../domain-models'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logResolverError } from '../../logger'
import type { Store } from '../../postgres'
import { withResolverSpan, setResolverDetails } from '../attributeHelper'
import { GraphQLError } from 'graphql'
import { NotFoundError } from '../../postgres'
import { canWrite } from '../../authorization/oauthAuthorization'

export function updateContract(
    store: Store
): MutationResolvers['updateContract'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'updateContract',
            { 'mcreview.package_id': input.id },
            async (span) => {
                setResolverDetails(span, user)

                // Check OAuth client read permissions
                if (!canWrite(context)) {
                    const errMessage = `OAuth client does not have write permissions`
                    logResolverError('updateContract', errMessage, context)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'INSUFFICIENT_OAUTH_GRANTS',
                        },
                    })
                }

                // This resolver is only callable by CMS users
                if (!hasCMSPermissions(user)) {
                    const errMessage = 'user not authorized to update contract'
                    logResolverError('updateContract', errMessage, context)
                    throw createForbiddenError(errMessage)
                }

                const contractWithHistory = await store.findContractWithHistory(
                    input.id
                )
                if (contractWithHistory instanceof Error) {
                    throw contractWithHistory
                }

                if (contractWithHistory instanceof Error) {
                    const errMessage = `Issue finding a contract with history with id ${input.id}. Message: ${contractWithHistory.message}`
                    logResolverError('updateContract', errMessage, context)

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

                const isSubmittedOrUnlocked =
                    contractWithHistory.status === 'SUBMITTED' ||
                    contractWithHistory.status === 'RESUBMITTED' ||
                    contractWithHistory.status === 'UNLOCKED'

                if (!isSubmittedOrUnlocked) {
                    const errMessage = `Can not update a contract has not been submitted or unlocked. Fails for contract with ID: ${contractWithHistory.id}`
                    logResolverError('updateContract', errMessage, context)
                    throw createUserInputError(errMessage, 'contractID')
                }

                const updatedContract = await store.updateContract({
                    contractID: input.id,
                    mccrsID: input.mccrsID || undefined,
                })

                if (updatedContract instanceof Error) {
                    const errMessage = `Failed to update contract with ID: ${input.id}. Message: ${updatedContract.message}`
                    logResolverError('updateContract', errMessage, context)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                return {
                    contract: updatedContract,
                }
            }
        )
    }
}

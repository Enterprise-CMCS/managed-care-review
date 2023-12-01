import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import {
    isCMSUser,
    convertContractWithRatesToUnlockedHPP,
} from '../../domain-models'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logError } from '../../logger'
import type { Store } from '../../postgres'
import {
    setResolverDetailsOnActiveSpan,
    setErrorAttributesOnActiveSpan,
} from '../attributeHelper'
import { GraphQLError } from 'graphql'
import { NotFoundError } from '../../postgres'

export function updateContract(
    store: Store
): MutationResolvers['updateContract'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context
        setResolverDetailsOnActiveSpan('updateContract', user, span)

        // This resolver is only callable by CMS users
        if (!isCMSUser(user)) {
            logError('updateContract', 'user not authorized to update contract')
            setErrorAttributesOnActiveSpan(
                'user not authorized to update contract',
                span
            )
            throw new ForbiddenError('user not authorized to update contract')
        }

        const contractWithHistory = await store.findContractWithHistory(
            input.id
        )
        if (contractWithHistory instanceof Error) {
            throw contractWithHistory
        }

        if (contractWithHistory instanceof Error) {
            const errMessage = `Issue finding a contract with history with id ${input.id}. Message: ${contractWithHistory.message}`
            logError('updateContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

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
            logError('updateContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                argumentName: 'contractID',
                cause: 'INVALID_PACKAGE_STATUS',
            })
        }

        const updatedContract = await store.updateContract({
            contractID: input.id,
            mccrsID: input.mccrsID || undefined,
        })

        if (updatedContract instanceof Error) {
            const errMessage = `Failed to update contract with ID: ${input.id}. Message: ${updatedContract.message}`
            logError('updateContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        const convertedPkg =
            convertContractWithRatesToUnlockedHPP(updatedContract)

        if (convertedPkg instanceof Error) {
            const errMessage = `Issue converting contract. Message: ${convertedPkg.message}`
            logError('updateContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'PROTO_DECODE_ERROR',
                },
            })
        }
        return {
            pkg: convertedPkg,
        }
    }
}

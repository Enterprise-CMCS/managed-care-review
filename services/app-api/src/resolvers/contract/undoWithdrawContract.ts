import type { Store } from '../../postgres'
import type { MutationResolvers } from '../../gen/gqlServer'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { NotFoundError } from '../../postgres'
import { logError, logSuccess } from '../../logger'
import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { GraphQLError } from 'graphql/index'
import { hasCMSPermissions } from '../../domain-models'

export function undoWithdrawContract(
    store: Store
): MutationResolvers['undoWithdrawContract'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('undoWithdrawContract', {}, ctx)
        setResolverDetailsOnActiveSpan('undoWithdrawContract', user, span)

        const { contractID, updatedReason } = input
        span?.setAttribute('mcreview.package_id', contractID)

        if (!hasCMSPermissions(user)) {
            const message =
                'user not authorized to undo a submission withdrawal'
            logError('undoWithdrawContract', message)
            setErrorAttributesOnActiveSpan(message, span)
            throw new ForbiddenError(message)
        }

        const contractWithHistory =
            await store.findContractWithHistory(contractID)

        if (contractWithHistory instanceof Error) {
            if (contractWithHistory instanceof NotFoundError) {
                const errMessage = `A contract must exist to undo a submission withdrawal: ${contractID}`
                logError('undoWithdrawContract', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new UserInputError(errMessage, {
                    argumentName: 'contractID',
                })
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
            throw new UserInputError(errMessage, {
                argumentName: 'contractID',
                cause: 'INVALID_PACKAGE_STATUS',
            })
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

        const { contract } = undoWithdrawResult

        logSuccess('undoWithdrawContract')
        setSuccessAttributesOnActiveSpan(span)

        return {
            contract: contract,
        }
    }
}

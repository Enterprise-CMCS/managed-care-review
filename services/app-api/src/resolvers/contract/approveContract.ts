import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { isCMSUser } from '../../domain-models'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import {
    NotFoundError,
    UserInputPostgresError,
    type Store,
} from '../../postgres'

import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { GraphQLError } from 'graphql'
import { isCMSApproverUser } from '../../domain-models/user'

export function approveContract(
    store: Store
): MutationResolvers['approveContract'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('approveContract', {}, ctx)
        setResolverDetailsOnActiveSpan('approveContract', user, span)

        const { contractID } = input
        span?.setAttribute('mcreview.package_id', contractID)

        if (!isCMSUser(user) && !isCMSApproverUser(user)) {
            const message = 'user not authorized to approve a contract'
            logError('approveContract', message)
            setErrorAttributesOnActiveSpan(message, span)
            throw new ForbiddenError(message)
        }

        const contractWithHistory =
            await store.findContractWithHistory(contractID)

        if (contractWithHistory instanceof Error) {
            const errMessage = `Issue finding contract message: ${contractWithHistory.message}`
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

        if (
            !(
                contractWithHistory.status === 'SUBMITTED' ||
                contractWithHistory.status === 'RESUBMITTED'
            ) ||
            contractWithHistory.reviewStatus !== 'UNDER_REVIEW'
        ) {
            const errMessage = `Attempted to approve contract with wrong status`
            logError('approveContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                argumentName: 'contractID',
                cause: 'INVALID_PACKAGE_STATUS',
            })
        }
        const approveContractResult = await store.approveContract({
            contractID: contractID,
            updatedByID: user.id,
        })

        if (approveContractResult instanceof UserInputPostgresError) {
            throw new UserInputError(approveContractResult.message)
        }

        if (approveContractResult instanceof NotFoundError) {
            throw new GraphQLError(approveContractResult.message, {
                extensions: {
                    code: 'NOT_FOUND',
                    cause: 'DB_ERROR',
                },
            })
        }

        if (approveContractResult instanceof Error) {
            const errMessage = `Failed to approve contract ID:${contractID}`
            logError('approveContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        logSuccess('approveContract')
        setSuccessAttributesOnActiveSpan(span)

        return { contract: approveContractResult }
    }
}

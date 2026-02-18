import { createForbiddenError, createUserInputError } from '../errorUtils'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import { NotFoundError, type Store } from '../../postgres'

import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { GraphQLError } from 'graphql'
import { hasCMSPermissions } from '../../domain-models/user'
import { canOauthWrite } from '../../authorization/oauthAuthorization'

export function approveContract(
    store: Store
): MutationResolvers['approveContract'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('approveContract', {}, ctx)
        setResolverDetailsOnActiveSpan('approveContract', user, span)

        // Check OAuth client read permissions
        if (!canOauthWrite(context)) {
            const errMessage = `OAuth client does not have write permissions`
            logError('approveContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'FORBIDDEN',
                    cause: 'INSUFFICIENT_OAUTH_GRANTS',
                },
            })
        }

        const { contractID, dateApprovalReleasedToState } = input
        span?.setAttribute('mcreview.package_id', contractID)

        if (!hasCMSPermissions(user)) {
            const message = 'user not authorized to approve a contract'
            logError('approveContract', message)
            setErrorAttributesOnActiveSpan(message, span)
            throw createForbiddenError(message)
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
        const allowedStatus = ['SUBMITTED', 'RESUBMITTED'].includes(
            contractWithHistory.consolidatedStatus
        )

        if (!allowedStatus) {
            const errMessage = `Attempted to approve contract with wrong status: ${contractWithHistory.consolidatedStatus}`
            logError('approveContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createUserInputError(errMessage, 'contractID')
        }
        const today = new Date()
        const dateApprovalReleasedToStateAsDate = new Date(
            dateApprovalReleasedToState
        )

        if (dateApprovalReleasedToStateAsDate > today) {
            const errMessage = `Attempted to approve contract with invalid approval release date: ${dateApprovalReleasedToState}`
            logError('approveContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createUserInputError(errMessage)
        }
        const approveContractResult = await store.approveContract({
            contractID: contractID,
            updatedByID: user.id,
            dateApprovalReleasedToState: dateApprovalReleasedToState,
        })

        if (approveContractResult instanceof Error) {
            if (approveContractResult instanceof NotFoundError) {
                logError('approveContract', approveContractResult.message)
                throw new GraphQLError(approveContractResult.message, {
                    extensions: {
                        code: 'NOT_FOUND',
                        cause: 'DB_ERROR',
                    },
                })
            }

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

import { createForbiddenError, createUserInputError } from '../errorUtils'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logResolverError, logSuccess } from '../../logger'
import { NotFoundError, type Store } from '../../postgres'

import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { GraphQLError } from 'graphql'
import { hasCMSPermissions, isAdminUser } from '../../domain-models/user'
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
            logResolverError('approveContract', errMessage, context)
            setErrorAttributesOnActiveSpan(errMessage, span)

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'FORBIDDEN',
                    cause: 'INSUFFICIENT_OAUTH_GRANTS',
                },
            })
        }

        const { contractID, dateApprovalReleasedToState, updatedReason } = input
        span?.setAttribute('mcreview.package_id', contractID)

        if (!hasCMSPermissions(user) && !isAdminUser(user)) {
            const message = 'user not authorized to approve a contract'
            logResolverError('approveContract', message, context)
            setErrorAttributesOnActiveSpan(message, span)
            throw createForbiddenError(message)
        }

        if (isAdminUser(user) && !updatedReason?.trim()) {
            const errMessage =
                'Approving a contract as an admin requires a reason'
            logResolverError('approveContract', errMessage, context)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createUserInputError(errMessage, 'updatedReason')
        }

        const contractWithHistory =
            await store.findContractWithHistory(contractID)

        if (contractWithHistory instanceof Error) {
            const errMessage = `Issue finding contract message: ${contractWithHistory.message}`
            logResolverError('approveContract', errMessage, context)
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
            logResolverError('approveContract', errMessage, context)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createUserInputError(errMessage, 'contractID')
        }
        const today = new Date()
        const dateApprovalReleasedToStateAsDate = new Date(
            dateApprovalReleasedToState
        )

        if (dateApprovalReleasedToStateAsDate > today) {
            const errMessage = `Attempted to approve contract with invalid approval release date: ${dateApprovalReleasedToState}`
            logResolverError('approveContract', errMessage, context)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createUserInputError(errMessage)
        }
        const approveContractResult = await store.approveContract({
            contractID: contractID,
            updatedByID: user.id,
            dateApprovalReleasedToState: dateApprovalReleasedToState,
            updatedReason,
        })

        if (approveContractResult instanceof Error) {
            if (approveContractResult instanceof NotFoundError) {
                logResolverError(
                    'approveContract',
                    approveContractResult.message,
                    context
                )
                throw new GraphQLError(approveContractResult.message, {
                    extensions: {
                        code: 'NOT_FOUND',
                        cause: 'DB_ERROR',
                    },
                })
            }

            const errMessage = `Failed to approve contract ID:${contractID}`
            logResolverError('approveContract', errMessage, context)
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

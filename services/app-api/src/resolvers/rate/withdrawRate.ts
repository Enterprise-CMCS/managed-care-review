import type { Store } from '../../postgres'
import { NotFoundError } from '../../postgres'
import type { MutationResolvers } from '../../gen/gqlServer'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { hasCMSPermissions } from '../../domain-models'
import { logError, logSuccess } from '../../logger'
import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { GraphQLError } from 'graphql/index'

export function withdrawRate(store: Store): MutationResolvers['withdrawRate'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('withdrawRate', {}, ctx)
        setResolverDetailsOnActiveSpan('withdrawRate', user, span)

        const { rateID, updatedReason } = input
        span?.setAttribute('mcreview.package_id', rateID)

        if (!hasCMSPermissions(user)) {
            const message = 'user not authorized to withdraw a rate'
            logError('withdrawRate', message)
            setErrorAttributesOnActiveSpan(message, span)
            throw new ForbiddenError(message)
        }

        const rateWithHistory = await store.findRateWithHistory(rateID)

        if (rateWithHistory instanceof Error) {
            const errMessage = `Issue finding rate message: ${rateWithHistory.message}`
            logError('withdrawRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            if (rateWithHistory instanceof NotFoundError) {
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
            rateWithHistory.consolidatedStatus
        )

        if (!allowedStatus) {
            const errMessage = `Attempted to withdraw rate with wrong status: ${rateWithHistory.consolidatedStatus}`
            logError('withdrawRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                argumentName: 'rateID',
                cause: 'INVALID_PACKAGE_STATUS',
            })
        }

        const withdrawnRate = await store.withdrawRate({
            rateID,
            updatedByID: user.id,
            updatedReason,
        })

        if (withdrawnRate instanceof Error) {
            const errMessage = `Failed to withdraw rate message: ${withdrawnRate.message}`
            logError('withdrawRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            if (withdrawnRate instanceof NotFoundError) {
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

        logSuccess('withdrawRate')
        setSuccessAttributesOnActiveSpan(span)

        return {
            rate: withdrawnRate,
        }
    }
}

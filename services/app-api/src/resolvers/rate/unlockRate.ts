import { createForbiddenError, createUserInputError } from '../errorUtils'
import type { RateType } from '../../domain-models'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import { NotFoundError } from '../../postgres/postgresErrors'
import type { Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { GraphQLError } from 'graphql'
import { hasCMSPermissions } from '../../domain-models'

export function unlockRate(store: Store): MutationResolvers['unlockRate'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('unlockRate', {}, ctx)
        setResolverDetailsOnActiveSpan('unlockRate', user, span)

        const { unlockedReason, rateID } = input
        span?.setAttribute('mcreview.rate_id', rateID)

        // This resolver is only callable by CMS users
        if (!hasCMSPermissions(user)) {
            logError('unlockRate', 'user not authorized to unlock rate')
            setErrorAttributesOnActiveSpan(
                'user not authorized to unlock rate',
                span
            )
            throw createForbiddenError('user not authorized to unlock rate')
        }

        const initialRateResult = await store.findRateWithHistory(rateID)

        if (initialRateResult instanceof Error) {
            if (initialRateResult instanceof NotFoundError) {
                const errMessage = `A rate must exist to be unlocked: ${rateID}`
                logError('unlockRate', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw createUserInputError(errMessage, 'rateID')
            }

            const errMessage = `Issue finding a rate. Message: ${initialRateResult.message}`
            logError('unlockRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        const rate: RateType = initialRateResult

        if (!['SUBMITTED', 'RESUBMITTED'].includes(rate.consolidatedStatus)) {
            const errMessage = `Attempted to unlock rate with wrong status: ${rate.consolidatedStatus}`
            logError('unlockRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createUserInputError(errMessage, 'rateID')
        }

        const contractResult = await store.findContractWithHistory(
            rate.parentContractID
        )
        if (contractResult instanceof Error) {
            if (contractResult instanceof NotFoundError) {
                const errMessage = `A contract must exist that is associated with the rate: ${rate.id}`
                logError('unlockRate', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw createUserInputError(errMessage, 'rateID')
            }

            const errMessage = `Issue finding a contract. Message: ${contractResult.message}`
            logError('unlockRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        if (
            ['WITHDRAWN', 'APPROVED'].includes(
                contractResult.consolidatedStatus
            )
        ) {
            const errMessage = `Attempted to unlock a rate that is associated with a contract with wrong status: ${contractResult.consolidatedStatus}`
            logError('unlockRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createUserInputError(errMessage, 'rateID')
        }

        const unlockRateResult = await store.unlockRate({
            rateID: rate.id,
            unlockReason: unlockedReason,
            unlockedByUserID: user.id,
        })

        if (unlockRateResult instanceof Error) {
            const errMessage = `Failed to unlock rate revision with ID: ${rate.id}; ${unlockRateResult.message}`
            logError('unlockRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        logSuccess('unlockRate')
        setSuccessAttributesOnActiveSpan(span)

        return { rate: unlockRateResult }
    }
}

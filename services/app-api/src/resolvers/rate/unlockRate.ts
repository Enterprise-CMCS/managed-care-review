import { createForbiddenError, createUserInputError } from '../errorUtils'
import type { RateType } from '../../domain-models'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logResolverError, logSuccess } from '../../logger'
import { NotFoundError } from '../../postgres/postgresErrors'
import type { Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { GraphQLError } from 'graphql'
import { hasCMSPermissions } from '../../domain-models'
import { canWrite } from '../../authorization/oauthAuthorization'

export function unlockRate(store: Store): MutationResolvers['unlockRate'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('unlockRate', {}, ctx)
        setResolverDetailsOnActiveSpan('unlockRate', user, span)

        const { unlockedReason, rateID } = input
        span?.setAttribute('mcreview.rate_id', rateID)

        // Check OAuth client read permissions
        if (!canWrite(context)) {
            const errMessage = `OAuth client does not have write permissions`
            logResolverError('unlockRate', errMessage, context)
            setErrorAttributesOnActiveSpan(errMessage, span)

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'FORBIDDEN',
                    cause: 'INSUFFICIENT_OAUTH_GRANTS',
                },
            })
        }

        // This resolver is only callable by CMS users
        if (!hasCMSPermissions(user)) {
            logResolverError(
                'unlockRate',
                'user not authorized to unlock rate',
                context
            )
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
                logResolverError('unlockRate', errMessage, context)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw createUserInputError(errMessage, 'rateID')
            }

            const errMessage = `Issue finding a rate. Message: ${initialRateResult.message}`
            logResolverError('unlockRate', errMessage, context)
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
            logResolverError('unlockRate', errMessage, context)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createUserInputError(errMessage, 'rateID')
        }

        const contractResult = await store.findContractWithHistory(
            rate.parentContractID
        )
        if (contractResult instanceof Error) {
            if (contractResult instanceof NotFoundError) {
                const errMessage = `A contract must exist that is associated with the rate: ${rate.id}`
                logResolverError('unlockRate', errMessage, context)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw createUserInputError(errMessage, 'rateID')
            }

            const errMessage = `Issue finding a contract. Message: ${contractResult.message}`
            logResolverError('unlockRate', errMessage, context)
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
            logResolverError('unlockRate', errMessage, context)
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
            logResolverError('unlockRate', errMessage, context)
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

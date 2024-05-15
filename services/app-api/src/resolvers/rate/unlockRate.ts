import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import type { RateType } from '../../domain-models'
import { isCMSUser } from '../../domain-models'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import { NotFoundError } from '../../postgres'
import type { Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { GraphQLError } from 'graphql'

export function unlockRate(store: Store): MutationResolvers['unlockRate'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('unlockRate', {}, ctx)
        setResolverDetailsOnActiveSpan('unlockRate', user, span)

        const { unlockedReason, rateID } = input
        span?.setAttribute('mcreview.rate_id', rateID)

        // This resolver is only callable by CMS users
        if (!isCMSUser(user)) {
            logError('unlockRate', 'user not authorized to unlock rate')
            setErrorAttributesOnActiveSpan(
                'user not authorized to unlock rate',
                span
            )
            throw new ForbiddenError('user not authorized to unlock rate')
        }

        const initialRateResult = await store.findRateWithHistory(rateID)

        if (initialRateResult instanceof Error) {
            if (initialRateResult instanceof NotFoundError) {
                const errMessage = `A rate must exist to be unlocked: ${rateID}`
                logError('unlockRate', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new UserInputError(errMessage, {
                    argumentName: 'rateID',
                })
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

        if (rate.draftRevision) {
            const errMessage = `Attempted to unlock rate with wrong status`
            logError('unlockRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                argumentName: 'rateID',
                cause: 'INVALID_PACKAGE_STATUS',
            })
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

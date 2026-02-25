import { createForbiddenError, createUserInputError } from '../errorUtils'
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
import { isAdminUser } from '../../domain-models'
import type { OverrideRateDataArgsType } from '../../postgres/contractAndRates/overrideRateData'
import { rateOverrideDataFragmentSchema } from '../../domain-models/contractAndRates/contractRateOverrideTypes'

const parseRateOverrides = (
    overridesInput: OverrideRateDataArgsType['overrides']
) => {
    const overridesParser = rateOverrideDataFragmentSchema.superRefine(
        (rateOverrides, ctx) => {
            if (rateOverrides.initiallySubmittedAt) {
                const currentDate = new Date()
                currentDate.setHours(0, 0, 0, 0)

                const overrideInitialSubmitDate = new Date(
                    rateOverrides.initiallySubmittedAt
                )
                overrideInitialSubmitDate.setHours(0, 0, 0, 0)

                if (overrideInitialSubmitDate > currentDate) {
                    ctx.addIssue({
                        code: 'custom',
                        message:
                            'initiallySubmittedAt cannot be in the future.',
                    })
                }
            }
        }
    )

    const parsedData = overridesParser.safeParse(overridesInput)

    if (parsedData.error) {
        return parsedData.error
    }

    return parsedData.data
}

export function overrideRateData(
    store: Store
): MutationResolvers['overrideRateData'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('overrideRateData', {}, ctx)
        setResolverDetailsOnActiveSpan('overrideRateData', user, span)

        const { rateID, description, data: overrides } = input
        span?.setAttribute('mcreview.rate_id', rateID)

        // Deny any requests using OAuth.
        if (context.oauthClient) {
            const errMessage = `OAuth client does not have write permissions`
            logError('overrideRateData', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'FORBIDDEN',
                    cause: 'INSUFFICIENT_OAUTH_GRANTS',
                },
            })
        }

        // This resolver is only callable by admin users
        if (!isAdminUser(user)) {
            const errMessage = 'user not authorized to override rate data'
            logError('overrideRateData', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createForbiddenError(errMessage)
        }

        // Validate the rate exists and check its status
        const rateResult = await store.findRateWithHistory(rateID)

        if (rateResult instanceof Error) {
            if (rateResult instanceof NotFoundError) {
                const errMessage = `Rate not found with ID: ${rateID}`
                logError('overrideRateData', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw createUserInputError(errMessage, 'rateID')
            }

            const errMessage = `Issue finding rate. Message: ${rateResult.message}`
            logError('overrideRateData', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        if (
            !['SUBMITTED', 'RESUBMITTED'].includes(
                rateResult.consolidatedStatus
            )
        ) {
            const errMessage = `Rate must be in SUBMITTED or RESUBMITTED status to override data. Current status: ${rateResult.consolidatedStatus}`
            logError('overrideRateData', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createUserInputError(errMessage, 'rateID')
        }

        const parsedOverrides = parseRateOverrides(overrides)

        if (parsedOverrides instanceof Error) {
            const errMessage = `Override data invalid: ${parsedOverrides.message}`
            logError('overrideRateData', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createUserInputError(errMessage, 'overrides')
        }

        const overrideResult = await store.overrideRateData({
            rateID,
            updatedByID: user.id,
            description,
            overrides: {
                initiallySubmittedAt: overrides.initiallySubmittedAt ?? null,
            },
        })

        if (overrideResult instanceof Error) {
            const errMessage = `Failed to override rate data for rate with ID: ${rateID}; ${overrideResult.message}`
            logError('overrideRateData', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        logSuccess('overrideRateData')
        setSuccessAttributesOnActiveSpan(span)

        return { rate: overrideResult }
    }
}

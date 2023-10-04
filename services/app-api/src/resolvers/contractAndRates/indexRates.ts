import { ForbiddenError } from 'apollo-server-core'
import type { Span } from '@opentelemetry/api'

import { isAdminUser, isCMSUser } from '../../domain-models'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { isHelpdeskUser } from '../../domain-models/user'
import { NotFoundError } from '../../postgres'
import type { QueryResolvers } from '../../gen/gqlServer'
import type { LDService } from '../../launchDarkly/launchDarkly'
import type { Store } from '../../postgres'
import type { RateOrErrorArrayType } from '../../postgres/contractAndRates'
import { logError } from '../../logger'
import { GraphQLError } from 'graphql'
import type { RateType } from '../../domain-models/contractAndRates'

const validateAndReturnRates = (
    results: RateOrErrorArrayType,
    span?: Span
): RateType[] => {
    // separate valid rates and errors
    const parsedRates: RateType[] = []
    const errorParseRates: string[] = []
    results.forEach((parsed) => {
        if (parsed.rate instanceof Error) {
            errorParseRates.push(`${parsed.rateID}: ${parsed.rate.message}`)
        } else {
            parsedRates.push(parsed.rate)
        }
    })

    // log all rates that failed
    if (errorParseRates.length > 0) {
        const errMessage = `Failed to parse the following rates:\n${errorParseRates.join(
            '\n'
        )}`
        logError('indexRatesResolver', errMessage)
        setErrorAttributesOnActiveSpan(errMessage, span)
    }
    return parsedRates
}

export function indexRatesResolver(
    store: Store,
    launchDarkly: LDService
): QueryResolvers['indexRates'] {
    return async (_parent, _args, context) => {
        const { user, span } = context
        setResolverDetailsOnActiveSpan('indexRates', user, span)
        const ratesDatabaseRefactor = await launchDarkly.getFeatureFlag(
            context,
            'rates-db-refactor'
        )

        if (!ratesDatabaseRefactor) {
            throw new ForbiddenError(
                'indexRates must be used with rates database refactor flag'
            )
        }

        if (isCMSUser(user) || isAdminUser(user) || isHelpdeskUser(user)) {
            const ratesWithHistory =
                await store.findAllRatesWithHistoryBySubmitInfo()
            if (ratesWithHistory instanceof Error) {
                const errMessage = `Issue finding rates with history Message: ${ratesWithHistory.message}`
                logError('fetchHealthPlanPackage', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)

                if (ratesWithHistory instanceof NotFoundError) {
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
            const rates: RateType[] = validateAndReturnRates(
                ratesWithHistory,
                span
            )
            const edges = rates.map((rate) => {
                return {
                    node: {
                        ...rate,
                    },
                }
            })
            setSuccessAttributesOnActiveSpan(span)
            return { totalCount: edges.length, edges }
        } else {
            const errMsg = 'user not authorized to fetch rate reviews data'
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw new ForbiddenError(errMsg)
        }
    }
}

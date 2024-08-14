import { ForbiddenError } from 'apollo-server-core'
import type { Span } from '@opentelemetry/api'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import {
    hasAdminPermissions,
    hasCMSPermissions,
    isStateUser,
} from '../../domain-models/user'
import { NotFoundError } from '../../postgres'
import type { QueryResolvers } from '../../gen/gqlServer'
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

export function indexRatesResolver(store: Store): QueryResolvers['indexRates'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('indexRates', {}, ctx)
        setResolverDetailsOnActiveSpan('indexRates', user, span)

        const adminPermissions = hasAdminPermissions(user)
        const cmsUser = hasCMSPermissions(user)
        const stateUser = isStateUser(user)

        if (adminPermissions || cmsUser || stateUser) {
            let ratesWithHistory
            if (stateUser) {
                ratesWithHistory =
                    await store.findAllRatesWithHistoryBySubmitInfo(
                       { stateCode: user.stateCode}
                    )
            } else if (input && input.stateCode) {
                ratesWithHistory = await store.findAllRatesWithHistoryBySubmitInfo(
                    {stateCode: input.stateCode}
                )
            } else {
                ratesWithHistory =
                    await store.findAllRatesWithHistoryBySubmitInfo()
            }
            if (ratesWithHistory instanceof Error) {
                const errMessage = `Issue finding rates with history Message: ${ratesWithHistory.message}`
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
            const edges: object[] = []
            if (stateUser) {
                rates.forEach((rate) => {
                    if (user.stateCode === rate.stateCode) {
                        edges.push({
                            node: {
                                ...rate,
                            },
                        })
                    }
                })
            } else {
                rates.forEach((rate) => {
                    edges.push({
                        node: {
                            ...rate,
                        },
                    })
                })
            }
            setSuccessAttributesOnActiveSpan(span)
            return { totalCount: edges.length, edges }
        } else {
            const errMsg = 'user not authorized to fetch rate reviews data'
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw new ForbiddenError(errMsg)
        }
    }
}

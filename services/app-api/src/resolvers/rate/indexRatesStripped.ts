import { createForbiddenError } from '../errorUtils'
import type { Span } from '@opentelemetry/api'
import {
    recordResolverError,
    setResolverDetails,
    withResolverSpan,
} from '../attributeHelper'
import {
    hasAdminPermissions,
    hasCMSPermissions,
    isStateUser,
} from '../../domain-models'
import { NotFoundError } from '../../postgres'
import type { QueryResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { logError, logResolverError } from '../../logger'
import { GraphQLError } from 'graphql'
import type { StrippedRateType } from '../../domain-models'
import type { StrippedRateOrErrorArrayType } from '../../postgres/contractAndRates/findAllRatesStripped'

const validateAndReturnRates = (
    results: StrippedRateOrErrorArrayType,
    span?: Span
): StrippedRateType[] => {
    const parsedRates: StrippedRateType[] = []
    const errorParseRates: string[] = []
    results.forEach((parsed) => {
        if (parsed.rate instanceof Error) {
            errorParseRates.push(`${parsed.rateID}: ${parsed.rate.message}`)
        } else {
            parsedRates.push(parsed.rate)
        }
    })

    if (errorParseRates.length > 0) {
        const errMessage = `Failed to parse the following rates:\n${errorParseRates.join(
            '\n'
        )}`
        logError('indexRatesStripped', errMessage)
        recordResolverError(span, errMessage)
    }
    return parsedRates
}

export function indexRatesStripped(
    store: Store
): QueryResolvers['indexRatesStripped'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'indexRatesStripped',
            {
                'mcreview.rate_ids_count': input?.rateIDs?.length ?? 0,
                ...(input?.stateCode
                    ? { 'mcreview.state_code': input.stateCode }
                    : {}),
            },
            async (span) => {
                setResolverDetails(span, user)

                const adminPermissions = hasAdminPermissions(user)
                const cmsUser = hasCMSPermissions(user)
                const stateUser = isStateUser(user)

                if (adminPermissions || cmsUser || stateUser) {
                    let ratesWithHistory
                    if (stateUser) {
                        ratesWithHistory = await store.findAllRatesStripped({
                            stateCode: user.stateCode,
                            rateIDs: input?.rateIDs ?? undefined,
                        })
                    } else {
                        ratesWithHistory = await store.findAllRatesStripped({
                            stateCode: input?.stateCode ?? undefined,
                            rateIDs: input?.rateIDs ?? undefined,
                        })
                    }
                    if (ratesWithHistory instanceof Error) {
                        const errMessage = `Issue finding rates: ${ratesWithHistory.message}`
                        logResolverError(
                            'indexRatesStripped',
                            errMessage,
                            context
                        )

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
                    const rates: StrippedRateType[] = validateAndReturnRates(
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

                    return { totalCount: edges.length, edges }
                }

                const errMsg = 'user not authorized to fetch rate reviews data'
                logResolverError('indexRatesStripped', errMsg, context)
                throw createForbiddenError(errMsg)
            }
        )
    }
}

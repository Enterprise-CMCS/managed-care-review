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
import { logError } from '../../logger'
import { GraphQLError } from 'graphql'
import type { StrippedRateType } from '../../domain-models/contractAndRates'
import type { StrippedRateOrErrorArrayType } from '../../postgres/contractAndRates/findAllRatesStripped'

const validateAndReturnRates = (
    results: StrippedRateOrErrorArrayType,
    span?: Span
): StrippedRateType[] => {
    // separate valid rates and errors
    const parsedRates: StrippedRateType[] = []
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
        logError('indexRatesStripped', errMessage)
        setErrorAttributesOnActiveSpan(errMessage, span)
    }
    return parsedRates
}

export function indexRatesStripped(
    store: Store
): QueryResolvers['indexRatesStripped'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('indexRatesStripped', {}, ctx)
        setResolverDetailsOnActiveSpan('indexRatesStripped', user, span)

        const adminPermissions = hasAdminPermissions(user)
        const cmsUser = hasCMSPermissions(user)
        const stateUser = isStateUser(user)

        if (adminPermissions || cmsUser || stateUser) {
            let ratesWithHistory
            if (stateUser) {
                ratesWithHistory = await store.findAllRatesStripped(
                    user.stateCode,
                    input?.rateIDs ?? undefined
                )
            } else {
                ratesWithHistory = await store.findAllRatesStripped(
                    input?.stateCode ?? undefined,
                    input?.rateIDs ?? undefined
                )
            }
            if (ratesWithHistory instanceof Error) {
                const errMessage = `Issue finding rates: ${ratesWithHistory.message}`
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

            setSuccessAttributesOnActiveSpan(span)
            return { totalCount: edges.length, edges }
        } else {
            const errMsg = 'user not authorized to fetch rate reviews data'
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw new ForbiddenError(errMsg)
        }
    }
}

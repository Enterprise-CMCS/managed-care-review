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
import type { RateOrErrorArrayType } from '../../postgres/contractAndRates'
import { logError, logResolverError, logResolverSuccess } from '../../logger'
import { GraphQLError } from 'graphql'
import type { RateType } from '../../domain-models'
import { canRead } from '../../authorization/oauthAuthorization'

const validateAndReturnRates = (
    results: RateOrErrorArrayType,
    span?: Span
): RateType[] => {
    const parsedRates: RateType[] = []
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
        logError('indexRatesResolver', errMessage)
        recordResolverError(span, errMessage)
    }
    return parsedRates
}

export function indexRatesResolver(store: Store): QueryResolvers['indexRates'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'indexRates',
            {
                'mcreview.rate_ids_count': input?.rateIDs?.length ?? 0,
                ...(input?.stateCode
                    ? { 'mcreview.state_code': input.stateCode }
                    : {}),
            },
            async (span) => {
                setResolverDetails(span, user)

                if (!canRead(context)) {
                    const errMessage = `OAuth client does not have read permissions`
                    logResolverError('indexRates', errMessage, context)
                    throw createForbiddenError(errMessage)
                }

                const adminPermissions = hasAdminPermissions(user)
                const cmsUser = hasCMSPermissions(user)
                const stateUser = isStateUser(user)

                if (adminPermissions || cmsUser || stateUser) {
                    let ratesWithHistory
                    if (stateUser) {
                        ratesWithHistory =
                            await store.findAllRatesWithHistoryBySubmitInfo({
                                stateCode: user.stateCode,
                                rateIDs: input?.rateIDs ?? undefined,
                                useZod: true,
                            })
                    } else if (input && input.stateCode) {
                        ratesWithHistory =
                            await store.findAllRatesWithHistoryBySubmitInfo({
                                stateCode: input.stateCode,
                                rateIDs: input?.rateIDs ?? undefined,
                                useZod: true,
                            })
                    } else {
                        ratesWithHistory =
                            await store.findAllRatesWithHistoryBySubmitInfo({
                                rateIDs: input?.rateIDs ?? undefined,
                                useZod: false,
                            })
                    }
                    if (ratesWithHistory instanceof Error) {
                        const errMessage = `Issue finding rates with history Message: ${ratesWithHistory.message}`
                        logResolverError('indexRates', errMessage, context)

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
                    logResolverSuccess(
                        context.oauthClient
                            ? 'indexRates - oauthClient'
                            : 'indexRates',
                        context
                    )
                    return { totalCount: edges.length, edges }
                }

                const authInfo = !!context.oauthClient
                const errMsg = authInfo
                    ? `OAuth client not authorized to fetch rate reviews data`
                    : 'user not authorized to fetch rate reviews data'
                logResolverError('indexRatesResolver', errMsg, context)
                throw createForbiddenError(errMsg)
            }
        )
    }
}

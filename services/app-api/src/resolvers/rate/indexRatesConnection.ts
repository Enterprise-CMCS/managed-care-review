import { createForbiddenError, createUserInputError } from '../errorUtils'
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
import type { QueryResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import type { RateOrErrorArrayType } from '../../postgres/contractAndRates'
import { logError, logSuccess } from '../../logger'
import { GraphQLError } from 'graphql'
import type { RateType } from '../../domain-models/contractAndRates'
import { canRead } from '../../authorization/oauthAuthorization'
import { NotFoundError } from '../../postgres/postgresErrors'

const DEFAULT_INDEX_RATES_PAGE_SIZE = 10
const MAX_INDEX_RATES_PAGE_SIZE = 50

type RateCursor = {
    rateID: string
    updatedAt: string
}

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
        logError('indexRatesConnectionResolver', errMessage)
        setErrorAttributesOnActiveSpan(errMessage, span)
    }
    return parsedRates
}

function compareRates(a: RateType, b: RateType): number {
    const updatedAtDiff = b.updatedAt.getTime() - a.updatedAt.getTime()
    if (updatedAtDiff !== 0) {
        return updatedAtDiff
    }

    return b.id.localeCompare(a.id)
}

function encodeRateCursor(cursor: RateCursor): string {
    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64')
}

function decodeRateCursor(encodedCursor: string): RateCursor {
    const decodedCursor = JSON.parse(
        Buffer.from(encodedCursor, 'base64').toString('utf8')
    ) as Partial<RateCursor>

    if (
        typeof decodedCursor.rateID !== 'string' ||
        typeof decodedCursor.updatedAt !== 'string' ||
        Number.isNaN(Date.parse(decodedCursor.updatedAt))
    ) {
        throw new Error('Cursor is not a valid rate pagination cursor')
    }

    return {
        rateID: decodedCursor.rateID,
        updatedAt: decodedCursor.updatedAt,
    }
}

function normalizeIndexRatesPageSize(first?: number): number {
    const pageSize = first ?? DEFAULT_INDEX_RATES_PAGE_SIZE

    if (pageSize < 1 || pageSize > MAX_INDEX_RATES_PAGE_SIZE) {
        throw createUserInputError(
            `first must be between 1 and ${MAX_INDEX_RATES_PAGE_SIZE}`,
            'first',
            first
        )
    }

    return pageSize
}

function normalizeAfterCursor(after?: string) {
    if (!after) {
        return undefined
    }

    try {
        return decodeRateCursor(after)
    } catch {
        throw createUserInputError(
            'after must be a valid rate pagination cursor',
            'after',
            after
        )
    }
}

export function indexRatesConnectionResolver(
    store: Store
): QueryResolvers['indexRatesConnection'] {
    return async (_parent, { input, first, after }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('indexRatesConnection', {}, ctx)
        setResolverDetailsOnActiveSpan('indexRatesConnection', user, span)

        if (!canRead(context)) {
            const errMessage = `OAuth client does not have read permissions`
            logError('indexRatesConnection', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createForbiddenError(errMessage)
        }

        const adminPermissions = hasAdminPermissions(user)
        const cmsUser = hasCMSPermissions(user)
        const stateUser = isStateUser(user)

        if (adminPermissions || cmsUser || stateUser) {
            const pageSize = normalizeIndexRatesPageSize(first ?? undefined)
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

            const rates = validateAndReturnRates(ratesWithHistory, span)

            const filteredRates = stateUser
                ? rates.filter((rate) => user.stateCode === rate.stateCode)
                : rates
            const sortedRates = [...filteredRates].sort(compareRates)
            const decodedAfter = normalizeAfterCursor(after ?? undefined)
            const startIndex = decodedAfter
                ? sortedRates.findIndex(
                      (rate) =>
                          rate.id === decodedAfter.rateID &&
                          rate.updatedAt.toISOString() ===
                              decodedAfter.updatedAt
                  ) + 1
                : 0

            if (decodedAfter && startIndex === 0) {
                throw createUserInputError(
                    'after cursor does not match any rate in this result set',
                    'after',
                    after
                )
            }

            const pageRates = sortedRates.slice(
                startIndex,
                startIndex + pageSize
            )
            const edges: Array<{ cursor: string; node: RateType }> = []
            if (stateUser) {
                pageRates.forEach((rate) => {
                    if (user.stateCode === rate.stateCode) {
                        edges.push({
                            cursor: encodeRateCursor({
                                rateID: rate.id,
                                updatedAt: rate.updatedAt.toISOString(),
                            }),
                            node: {
                                ...rate,
                            },
                        })
                    }
                })
            } else {
                pageRates.forEach((rate) => {
                    edges.push({
                        cursor: encodeRateCursor({
                            rateID: rate.id,
                            updatedAt: rate.updatedAt.toISOString(),
                        }),
                        node: {
                            ...rate,
                        },
                    })
                })
            }

            logSuccess(
                context.oauthClient
                    ? 'indexRatesConnection - oauthClient'
                    : 'indexRatesConnection'
            )
            setSuccessAttributesOnActiveSpan(span)
            return {
                totalCount: filteredRates.length,
                edges,
                pageInfo: {
                    hasNextPage: startIndex + pageSize < filteredRates.length,
                    endCursor: edges[edges.length - 1]?.cursor ?? null,
                },
            }
        } else {
            const authInfo = !!context.oauthClient
            const errMsg = authInfo
                ? `OAuth client not authorized to fetch rate reviews data`
                : 'user not authorized to fetch rate reviews data'
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw createForbiddenError(errMsg)
        }
    }
}

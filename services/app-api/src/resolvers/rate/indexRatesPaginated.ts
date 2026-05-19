import { createForbiddenError, createUserInputError } from '../errorUtils'
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
import type { QueryResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import type { RateOrErrorArrayType } from '../../postgres/contractAndRates'
import { logError, logResolverError, logResolverSuccess } from '../../logger'
import { GraphQLError } from 'graphql'
import type { RateType } from '../../domain-models'
import { canRead } from '../../authorization/oauthAuthorization'
import { NotFoundError } from '../../postgres'
import { getRateLastUpdatedForDisplay } from '../helpers'

const DEFAULT_INDEX_RATES_PAGE_SIZE = 10
const MAX_INDEX_RATES_PAGE_SIZE = 150

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
        logError('indexRatesPaginatedResolver', errMessage)
        recordResolverError(span, errMessage)
    }
    return parsedRates
}

function compareRates(a: RateType, b: RateType): number {
    const updatedAtDiff =
        rateLastUpdatedForDisplay(b).getTime() -
        rateLastUpdatedForDisplay(a).getTime()
    if (updatedAtDiff !== 0) {
        return updatedAtDiff
    }

    return b.id.localeCompare(a.id)
}

function rateLastUpdatedForDisplay(rate: RateType): Date {
    return getRateLastUpdatedForDisplay(rate) ?? rate.updatedAt
}

function encodeRateCursor(cursor: RateCursor): string {
    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64')
}

function decodeRateCursor(encodedCursor: string): RateCursor | Error {
    const decodedCursor = JSON.parse(
        Buffer.from(encodedCursor, 'base64').toString('utf8')
    ) as Partial<RateCursor>

    if (
        typeof decodedCursor.rateID !== 'string' ||
        typeof decodedCursor.updatedAt !== 'string' ||
        Number.isNaN(Date.parse(decodedCursor.updatedAt))
    ) {
        return new Error('Cursor is not a valid rate pagination cursor')
    }

    return {
        rateID: decodedCursor.rateID,
        updatedAt: decodedCursor.updatedAt,
    }
}

function normalizeIndexRatesPageSize(
    requestedPageSize?: number
): number | Error {
    const pageSize = requestedPageSize ?? DEFAULT_INDEX_RATES_PAGE_SIZE

    if (pageSize < 1 || pageSize > MAX_INDEX_RATES_PAGE_SIZE) {
        return new Error(
            `pageSize must be between 1 and ${MAX_INDEX_RATES_PAGE_SIZE}`
        )
    }

    return pageSize
}

function normalizeAfterCursor(after?: string): RateCursor | Error | undefined {
    if (!after) {
        return undefined
    }

    return decodeRateCursor(after)
}

export function indexRatesPaginatedResolver(
    store: Store
): QueryResolvers['indexRatesPaginated'] {
    return async (_parent, { input }, context) => {
        const pageSizeInput = input?.pageSize
        const after = input?.after
        const { user } = context

        return withResolverSpan(
            context,
            'indexRatesPaginated',
            {
                'mcreview.rate_ids_count': input?.rateIDs?.length ?? 0,
                'mcreview.pagination.page_size':
                    pageSizeInput ?? DEFAULT_INDEX_RATES_PAGE_SIZE,
                'mcreview.pagination.has_after': Boolean(after),
                ...(input?.stateCode
                    ? { 'mcreview.state_code': input.stateCode }
                    : {}),
            },
            async (span) => {
                setResolverDetails(span, user)

                if (!canRead(context)) {
                    const errMessage = `OAuth client does not have read permissions`
                    logResolverError('indexRatesPaginated', errMessage, context)
                    throw createForbiddenError(errMessage)
                }

                const adminPermissions = hasAdminPermissions(user)
                const cmsUser = hasCMSPermissions(user)
                const stateUser = isStateUser(user)

                if (adminPermissions || cmsUser || stateUser) {
                    const pageSize = normalizeIndexRatesPageSize(
                        pageSizeInput ?? undefined
                    )

                    if (pageSize instanceof Error) {
                        const errMsg = `normalizeIndexRatesPageSize failed. ${pageSize.message}`
                        logResolverError('indexRatesPaginated', errMsg, context)
                        throw createUserInputError(
                            errMsg,
                            'pageSize',
                            pageSizeInput
                        )
                    }

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
                        logResolverError(
                            'indexRatesPaginated',
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

                    const rates = validateAndReturnRates(ratesWithHistory, span)

                    const sortedRates = [...rates].sort(compareRates)
                    const decodedAfter = normalizeAfterCursor(
                        after ?? undefined
                    )

                    if (decodedAfter instanceof Error) {
                        const errMsg = `normalizeAfterCursor failed. ${decodedAfter.message}`
                        logResolverError('indexRatesPaginated', errMsg, context)
                        throw createUserInputError(errMsg, 'after', after)
                    }

                    const startIndex = decodedAfter
                        ? sortedRates.findIndex(
                              (rate) =>
                                  rate.id === decodedAfter.rateID &&
                                  rateLastUpdatedForDisplay(
                                      rate
                                  ).toISOString() === decodedAfter.updatedAt
                          ) + 1
                        : 0

                    if (decodedAfter && startIndex === 0) {
                        const errMessage =
                            'after cursor does not match any rate in this result set'
                        logResolverError(
                            'indexRatesPaginated',
                            errMessage,
                            context
                        )
                        throw createUserInputError(errMessage, 'after', after)
                    }

                    const pageRates = sortedRates.slice(
                        startIndex,
                        startIndex + pageSize
                    )
                    const edges = pageRates.map((rate) => ({
                        cursor: encodeRateCursor({
                            rateID: rate.id,
                            updatedAt:
                                rateLastUpdatedForDisplay(rate).toISOString(),
                        }),
                        node: {
                            ...rate,
                        },
                    }))

                    logResolverSuccess(
                        context.oauthClient
                            ? 'indexRatesPaginated - oauthClient'
                            : 'indexRatesPaginated',
                        context
                    )
                    const totalCount = rates.length
                    const totalPages = Math.ceil(totalCount / pageSize)

                    return {
                        totalCount,
                        totalPages,
                        edges,
                        pageInfo: {
                            hasNextPage: startIndex + pageSize < totalCount,
                            endCursor: edges[edges.length - 1]?.cursor ?? null,
                        },
                    }
                } else {
                    const authInfo = !!context.oauthClient
                    const errMsg = authInfo
                        ? `OAuth client not authorized to fetch rate reviews data`
                        : 'user not authorized to fetch rate reviews data'
                    logResolverError('indexRatesPaginated', errMsg, context)
                    throw createForbiddenError(errMsg)
                }
            }
        )
    }
}

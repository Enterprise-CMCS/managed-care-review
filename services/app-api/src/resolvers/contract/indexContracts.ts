import type { Span } from '@opentelemetry/api'
import { createForbiddenError } from '../errorUtils'
import {
    isStateUser,
    hasAdminPermissions,
    hasCMSPermissions,
} from '../../domain-models'
import type { ContractType } from '../../domain-models'
import type {
    QueryResolvers,
    ConsolidatedContractStatus,
} from '../../gen/gqlServer'
import { logError, logResolverError, logResolverSuccess } from '../../logger'
import type { Store } from '../../postgres'
import { NotFoundError } from '../../postgres'
import {
    recordResolverError,
    setResolverDetails,
    withResolverSpan,
} from '../attributeHelper'
import { GraphQLError } from 'graphql/index'
import type { ContractOrErrorArrayType } from '../../postgres/contractAndRates'
import { canRead } from '../../oauth/oauthAuthorization'
import type { LDService } from '../../launchDarkly/launchDarkly'
import { getLastUpdatedForDisplay, latestDate } from '../helpers'

async function getUseStoredActionDatesFlag(
    launchDarkly: LDService,
    email: string
): Promise<boolean> {
    const flagValue = await launchDarkly.getFeatureFlag({
        key: email,
        flag: 'use-stored-contract-action-dates',
    })
    return flagValue === true
}

const parseContracts = (
    contractsWithHistory: ContractOrErrorArrayType,
    span?: Span
): ContractType[] => {
    const parsedContracts: ContractType[] = []
    const errorParseContracts: string[] = []
    contractsWithHistory.forEach((parsed) => {
        if (parsed.contract instanceof Error) {
            errorParseContracts.push(
                `${parsed.contractID}: ${parsed.contract.message}`
            )
        } else {
            parsedContracts.push(parsed.contract)
        }
    })

    if (errorParseContracts.length > 0) {
        const errMessage = `Failed to parse the following contracts:\n${errorParseContracts.join(
            '\n'
        )}`
        logError('indexContractsResolver', errMessage)
        recordResolverError(span, errMessage)
    }

    return parsedContracts
}

const getLatestContractOverrideDate = (contract: ContractType) =>
    latestDate(
        contract.contractOverrides?.map((override) => override.createdAt) ?? []
    )

const formatContracts = (
    results: ContractType[],
    updatedWithin?: number | null,
    statusesToExclude?: ConsolidatedContractStatus[] | null
) => {
    let contracts: ContractType[] = results
    if (statusesToExclude) {
        contracts = contracts.filter((contract: ContractType) => {
            return !statusesToExclude?.includes(contract.consolidatedStatus)
        })
    }
    if (updatedWithin) {
        const now = new Date()
        const cutoff = new Date(now.getTime() - updatedWithin * 1000)

        contracts = contracts.filter((contract: ContractType) => {
            // Legacy updatedWithin predates stored lastActionDate. Include
            // override rows explicitly so submitted-data corrections are not
            // filtered out just because the base contract revision is older.
            const lastUpdated = latestDate([
                getLastUpdatedForDisplay(contract),
                getLatestContractOverrideDate(contract),
            ])
            if (!lastUpdated) return false
            return lastUpdated.getTime() > cutoff.getTime()
        })
    }
    const edges = contracts.map((contract) => {
        return {
            node: {
                ...contract,
            },
        }
    })

    return { totalCount: edges.length, edges }
}

/**
 * Formats contracts for CMS/Admin when the use-stored-contract-action-dates
 * flag is on.
 *
 * @param results Parsed contracts to return.
 * @param statusesToExclude Optional consolidated statuses to remove from the result.
 */
const formatContractsWithStoredActionDates = (
    results: ContractType[],
    statusesToExclude?: ConsolidatedContractStatus[] | null
) => {
    let contracts: ContractType[] = results
    if (statusesToExclude) {
        contracts = contracts.filter((contract: ContractType) => {
            return !statusesToExclude?.includes(contract.consolidatedStatus)
        })
    }
    const edges = contracts.map((contract) => {
        return {
            node: {
                ...contract,
            },
        }
    })

    return { totalCount: edges.length, edges }
}

/**
 * Formats contracts for state users sorted by the DB lastActionDate date
 * when use-stored-contract-action-dates flag is on. State users take account of
 * the last updatedAt date for a draftRevision
 *
 * @param results Parsed contracts scoped to the user's state.
 * @param updatedWithin Optional age cutoff in seconds, applied against the latest of lastActionDate or draftRevision.updatedAt.
 */
const formatStateContractsWithStoredActionDates = (
    results: ContractType[],
    updatedWithin?: number | null
) => {
    let contracts: ContractType[] = results
    if (updatedWithin) {
        const now = new Date()
        const cutoff = new Date(now.getTime() - updatedWithin * 1000)

        contracts = contracts.filter((contract: ContractType) => {
            const lastUpdated = latestDate([
                contract.lastActionDate,
                contract.draftRevision?.updatedAt,
            ])
            if (!lastUpdated) return false
            return lastUpdated.getTime() > cutoff.getTime()
        })
    }
    const edges = contracts.map((contract) => {
        return {
            node: {
                ...contract,
            },
        }
    })

    return { totalCount: edges.length, edges }
}

const buildFilterStoredActionDate = (
    requestedAt: Date,
    updatedWithin: number
) => {
    return new Date(requestedAt.getTime() - updatedWithin * 1000)
}

export function indexContractsResolver(
    store: Store,
    launchDarkly: LDService
): QueryResolvers['indexContracts'] {
    return async (_parent, { input }, context) => {
        const { user } = context
        // Anchor the updatedWithin window once, as early as possible — before
        // the LaunchDarkly fetch and the DB query below — so request-processing
        // latency doesn't push the cutoff later than the user intended. This one
        // timestamp feeds both the DB filter and the in-memory filter.
        const requestedAt = new Date()

        return withResolverSpan(
            context,
            'indexContracts',
            {
                'mcreview.updated_within': input?.updatedWithin ?? 0,
                'mcreview.statuses_to_exclude_count':
                    input?.statusesToExclude?.length ?? 0,
            },
            async (span) => {
                setResolverDetails(span, user)

                if (!canRead(context)) {
                    const errMessage = `OAuth client does not have read permissions`
                    logResolverError('indexContracts', errMessage, context)
                    throw createForbiddenError(errMessage)
                }

                const useStoredActionDates = await getUseStoredActionDatesFlag(
                    launchDarkly,
                    context.user.email
                )

                // State users need draft updates in addition to stored submitted-action freshness.
                if (isStateUser(user)) {
                    const contractsWithHistory =
                        await store.findAllContractsWithHistoryByState(
                            user.stateCode
                        )

                    if (contractsWithHistory instanceof Error) {
                        const errMessage = `Issue finding contracts with history by stateCode: ${user.stateCode}. Message: ${contractsWithHistory.message}`
                        logResolverError('indexContracts', errMessage, context)

                        if (contractsWithHistory instanceof NotFoundError) {
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

                    const parsedContracts = parseContracts(
                        contractsWithHistory,
                        span
                    )

                    logResolverSuccess(
                        context.oauthClient
                            ? 'indexContracts - oauthClient'
                            : 'indexContracts',
                        context
                    )

                    // fetching contract will include the lastActionDate already, we just need to take account of
                    // draftRevision.updatedAt vs lastActionDate for state users.
                    if (useStoredActionDates) {
                        return formatStateContractsWithStoredActionDates(
                            parsedContracts
                        )
                    }

                    return formatContracts(parsedContracts)
                }

                // CMS/Admin users do not need draft freshness, so the flagged path can
                // push updatedWithin into the DB using the stored lastActionDate.
                if (hasAdminPermissions(user) || hasCMSPermissions(user)) {
                    const cleanedStatuses =
                        input?.statusesToExclude?.filter(
                            (s): s is ConsolidatedContractStatus => s != null
                        ) ?? null

                    if (useStoredActionDates) {
                        // calculate date to filter lastActionDate in the db using current date and the updatedWithin
                        const filterLastActionDateAfter = input?.updatedWithin
                            ? buildFilterStoredActionDate(
                                  requestedAt,
                                  input.updatedWithin
                              )
                            : undefined

                        // With DB stored lastActionDate, we do not need the legacy code triggered by skipFindingLatest
                        // param.
                        const contractsWithHistory =
                            await store.findAllContractsWithHistoryBySubmitInfo(
                                false,
                                true,
                                filterLastActionDateAfter
                            )

                        if (contractsWithHistory instanceof Error) {
                            const errMessage = `Issue finding contracts with history by submit info. Message: ${contractsWithHistory.message}`
                            logResolverError(
                                'indexContracts',
                                errMessage,
                                context
                            )

                            if (contractsWithHistory instanceof NotFoundError) {
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

                        const parsedContracts = parseContracts(
                            contractsWithHistory,
                            span
                        )

                        logResolverSuccess(
                            context.oauthClient
                                ? 'indexContracts - oauthClient'
                                : 'indexContracts',
                            context
                        )

                        return formatContractsWithStoredActionDates(
                            parsedContracts,
                            cleanedStatuses
                        )
                    }

                    // Legacy path uses skipFindingLatest to parse extra data in order to calculate the last updated date.
                    const skipFindingLatest = !!input?.updatedWithin
                    const contractsWithHistory =
                        await store.findAllContractsWithHistoryBySubmitInfo(
                            false,
                            skipFindingLatest
                        )

                    if (contractsWithHistory instanceof Error) {
                        const errMessage = `Issue finding contracts with history by submit info. Message: ${contractsWithHistory.message}`
                        logResolverError('indexContracts', errMessage, context)

                        if (contractsWithHistory instanceof NotFoundError) {
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
                    logResolverSuccess(
                        context.oauthClient
                            ? 'indexContracts - oauthClient'
                            : 'indexContracts',
                        context
                    )

                    const parsedContracts = parseContracts(
                        contractsWithHistory,
                        span
                    )
                    return formatContracts(
                        parsedContracts,
                        input?.updatedWithin,
                        cleanedStatuses
                    )
                }

                const authInfo = !!context.oauthClient
                const errMsg = authInfo
                    ? `OAuth client not authorized to fetch contract data`
                    : 'user not authorized to fetch state data'
                logResolverError('indexContracts', errMsg, context)
                throw createForbiddenError(errMsg)
            }
        )
    }
}

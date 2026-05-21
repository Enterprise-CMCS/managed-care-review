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
import { canRead } from '../../authorization/oauthAuthorization'
import { getLastUpdatedForDisplay } from '../helpers'

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
            const lastUpdated = getLastUpdatedForDisplay(contract)
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

export function indexContractsResolver(
    store: Store
): QueryResolvers['indexContracts'] {
    return async (_parent, { input }, context) => {
        const { user } = context

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
                    return formatContracts(parsedContracts)
                } else if (hasAdminPermissions(user) || hasCMSPermissions(user)) {
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
                    const cleanedStatuses =
                        input?.statusesToExclude?.filter(
                            (s): s is ConsolidatedContractStatus => s != null
                        ) ?? null
                    return formatContracts(
                        parsedContracts,
                        input?.updatedWithin,
                        cleanedStatuses
                    )
                } else {
                    const authInfo = !!context.oauthClient
                    const errMsg = authInfo
                        ? `OAuth client not authorized to fetch contract data`
                        : 'user not authorized to fetch state data'
                    logResolverError('indexContracts', errMsg, context)
                    throw createForbiddenError(errMsg)
                }
            }
        )
    }
}

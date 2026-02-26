import type { Span } from '@opentelemetry/api'
import { createForbiddenError } from '../errorUtils'
import {
    isStateUser,
    hasAdminPermissions,
    hasCMSPermissions,
} from '../../domain-models'
import type { ContractType } from '../../domain-models'
import type { QueryResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import type { Store } from '../../postgres'
import { NotFoundError } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { GraphQLError } from 'graphql/index'
import type { ContractOrErrorArrayType } from '../../postgres/contractAndRates/findAllContractsWithHistoryByState'
import {
    canRead,
    getAuthContextInfo,
} from '../../authorization/oauthAuthorization'
import { getLastUpdatedForDisplay } from '../helpers'
import type { ConsolidatedContractStatus } from '../../gen/gqlClient'

const parseContracts = (
    contractsWithHistory: ContractOrErrorArrayType,
    span?: Span
): ContractType[] => {
    // separate valid contracts and errors
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

    // log all contracts that failed parsing to otel.
    if (errorParseContracts.length > 0) {
        const errMessage = `Failed to parse the following contracts:\n${errorParseContracts.join(
            '\n'
        )}`
        logError('indexContractsResolver', errMessage)
        setErrorAttributesOnActiveSpan(errMessage, span)
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
        const cutoff = new Date(now.getTime() - updatedWithin! * 1000)

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
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('indexContracts', {}, ctx)
        setResolverDetailsOnActiveSpan('indexContracts', user, span)

        // Check OAuth client read permissions
        if (!canRead(context)) {
            const errMessage = `OAuth client does not have read permissions`
            logError('indexContracts', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createForbiddenError(errMessage)
        }

        // Log OAuth client access for audit trail
        if (context.oauthClient) {
            logSuccess('indexContracts')
        }

        // Authorization check (same for both OAuth clients and regular users)
        if (isStateUser(user)) {
            const contractsWithHistory =
                await store.findAllContractsWithHistoryByState(user.stateCode)

            if (contractsWithHistory instanceof Error) {
                const errMessage = `Issue finding contracts with history by stateCode: ${user.stateCode}. Message: ${contractsWithHistory.message}`
                logError('indexContracts', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)

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
            logSuccess('indexContracts')
            setSuccessAttributesOnActiveSpan(span)
            const parsedContracts = parseContracts(contractsWithHistory, span)
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
                logError('indexContracts', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)

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
            logSuccess('indexContracts')
            setSuccessAttributesOnActiveSpan(span)
            let contracts: any = contractsWithHistory

            const parsedContracts = parseContracts(contracts, span)
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
            const authInfo = getAuthContextInfo(context)
            const errMsg = authInfo.isOAuthClient
                ? `OAuth client not authorized to fetch contract data`
                : 'user not authorized to fetch state data'
            logError('indexContracts', errMsg)
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw createForbiddenError(errMsg)
        }
    }
}

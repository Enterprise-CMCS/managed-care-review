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
    isReadOnlyUser,
    isStateUser,
} from '../../domain-models'
import { NotFoundError } from '../../postgres'
import type { QueryResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { logError, logResolverError } from '../../logger'
import { GraphQLError } from 'graphql'
import type { StrippedContractType } from '../../domain-models'
import type { StrippedContractOrErrorArrayType } from '../../postgres/contractAndRates/findAllContractsStripped'

const validateAndReturnContracts = (
    results: StrippedContractOrErrorArrayType,
    span?: Span
): StrippedContractType[] => {
    const parsedContracts: StrippedContractType[] = []
    const errorParseContracts: string[] = []
    results.forEach((parsed) => {
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
        logError('indexContractsStripped', errMessage)
        recordResolverError(span, errMessage)
    }
    return parsedContracts
}

export function indexContractsStripped(
    store: Store
): QueryResolvers['indexContractsStripped'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'indexContractsStripped',
            {
                'mcreview.contract_ids_count': input?.contractIDs?.length ?? 0,
                ...(input?.stateCode
                    ? { 'mcreview.state_code': input.stateCode }
                    : {}),
            },
            async (span) => {
                setResolverDetails(span, user)

                const adminPermissions = hasAdminPermissions(user)
                const cmsUser = hasCMSPermissions(user)
                const stateUser = isStateUser(user)
                const readOnlyUser = isReadOnlyUser(user)

                if (adminPermissions || cmsUser || stateUser || readOnlyUser) {
                    let contractsWithHistory
                    if (stateUser) {
                        contractsWithHistory =
                            await store.findAllContractsStripped({
                                stateCode: user.stateCode,
                                contractIDs: input?.contractIDs ?? undefined,
                                includeDrafts: true,
                            })
                    } else {
                        contractsWithHistory =
                            await store.findAllContractsStripped({
                                stateCode: input?.stateCode ?? undefined,
                                contractIDs: input?.contractIDs ?? undefined,
                            })
                    }
                    if (contractsWithHistory instanceof Error) {
                        const errMessage = `Issue finding contracts: ${contractsWithHistory.message}`
                        logResolverError(
                            'indexContractsStripped',
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
                    const contracts: StrippedContractType[] =
                        validateAndReturnContracts(contractsWithHistory, span)
                    const edges: object[] = []
                    if (stateUser) {
                        contracts.forEach((contract) => {
                            if (user.stateCode === contract.stateCode) {
                                edges.push({
                                    node: {
                                        ...contract,
                                    },
                                })
                            }
                        })
                    } else {
                        contracts.forEach((contract) => {
                            edges.push({
                                node: {
                                    ...contract,
                                },
                            })
                        })
                    }

                    return { totalCount: edges.length, edges }
                }

                const errMsg =
                    'user not authorized to fetch contract reviews data'
                logResolverError('indexContractsStripped', errMsg, context)
                throw createForbiddenError(errMsg)
            }
        )
    }
}

import { createForbiddenError } from '../errorUtils'
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
import { NotFoundError } from '../../postgres/postgresErrors'
import type { QueryResolvers } from '../../gen/gqlServer'
import type { Store } from '../../postgres'
import { logError, logResolverError } from '../../logger'
import { GraphQLError } from 'graphql'
import type { StrippedContractType } from '../../domain-models/contractAndRates/contractTypes'
import type { StrippedContractOrErrorArrayType } from '../../postgres/contractAndRates/findAllContractsStripped'

const validateAndReturnContracts = (
    results: StrippedContractOrErrorArrayType,
    span?: Span
): StrippedContractType[] => {
    // separate valid contracts and errors
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

    // log all contracts that failed
    if (errorParseContracts.length > 0) {
        const errMessage = `Failed to parse the following contracts:\n${errorParseContracts.join(
            '\n'
        )}`
        logError('indexContractsStripped', errMessage)
        setErrorAttributesOnActiveSpan(errMessage, span)
    }
    return parsedContracts
}

export function indexContractsStripped(
    store: Store
): QueryResolvers['indexContractsStripped'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('indexContractsStripped', {}, ctx)
        setResolverDetailsOnActiveSpan('indexContractsStripped', user, span)

        const adminPermissions = hasAdminPermissions(user)
        const cmsUser = hasCMSPermissions(user)
        const stateUser = isStateUser(user)

        if (adminPermissions || cmsUser || stateUser) {
            let contractsWithHistory
            if (stateUser) {
                contractsWithHistory = await store.findAllContractsStripped({
                    stateCode: user.stateCode,
                    contractIDs: input?.contractIDs ?? undefined,
                    includeDrafts: true,
                })
            } else {
                contractsWithHistory = await store.findAllContractsStripped({
                    stateCode: input?.stateCode ?? undefined,
                    contractIDs: input?.contractIDs ?? undefined,
                })
            }
            if (contractsWithHistory instanceof Error) {
                const errMessage = `Issue finding contracts: ${contractsWithHistory.message}`
                logResolverError('indexContractsStripped', errMessage, context)
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

            setSuccessAttributesOnActiveSpan(span)
            return { totalCount: edges.length, edges }
        } else {
            const errMsg = 'user not authorized to fetch contract reviews data'
            logResolverError('indexContractsStripped', errMsg, context)
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw createForbiddenError(errMsg)
        }
    }
}

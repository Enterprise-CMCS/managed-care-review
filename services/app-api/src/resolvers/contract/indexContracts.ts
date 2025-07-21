import type { Span } from '@opentelemetry/api'
import { ForbiddenError } from 'apollo-server-lambda'
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

const formatContracts = (results: ContractType[]) => {
    const contracts: ContractType[] = results

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
    return async (_parent, _args, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('indexContracts', {}, ctx)
        setResolverDetailsOnActiveSpan('indexContracts', user, span)

        // Check OAuth client read permissions
        if (!canRead(context)) {
            const errMessage = `OAuth client does not have read permissions`
            logError('indexContracts', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new ForbiddenError(errMessage)
        }

        // Log OAuth client access for audit trail
        if (context.oauthClient?.isOAuthClient) {
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
            const contractsWithHistory =
                await store.findAllContractsWithHistoryBySubmitInfo(false)

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
            const parsedContracts = parseContracts(contractsWithHistory, span)

            return formatContracts(parsedContracts)
        } else {
            const authInfo = getAuthContextInfo(context)
            const errMsg = authInfo.isOAuthClient
                ? `OAuth client not authorized to fetch contract data`
                : 'user not authorized to fetch state data'
            logError('indexContracts', errMsg)
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw new ForbiddenError(errMsg)
        }
    }
}

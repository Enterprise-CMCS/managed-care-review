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
import { performance,  PerformanceObserver} from 'perf_hooks'

const perfObserver = new PerformanceObserver((items) => {
  items.getEntries().forEach((entry) => {
    console.log(entry)
  })
})

perfObserver.observe({ entryTypes: ["measure"], buffered: true })
performance.measure('Start to Now');

const parseContracts = (
    contractsWithHistory: ContractOrErrorArrayType,
    span?: Span
): ContractType[] => {
    // performance.measure('beginParseContract to Now', 'beginParseContract');
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
    // performance.mark('finishParseContract');
    // performance.measure('beginParseContract to finishParseContract', 'beginParseContract', 'finishParseContract');
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

// performance.measure('Start to Now');

// performance.mark('A');
export function indexContractsResolver(
    store: Store
): QueryResolvers['indexContracts'] {
    return async (_parent, _args, context) => {
        // performance.measure('A to Now', 'A');
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('indexContracts', {}, ctx)
        setResolverDetailsOnActiveSpan('indexContracts', user, span)
        // performance.measure('beginParseContract to Now', 'beginParseContract');

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
            performance.mark('beginParseContract');
            
            const contractsWithHistory =
                await store.findAllContractsWithHistoryBySubmitInfo()
                performance.mark('finishParseContract');
                performance.measure('beginParseContract to finishParseContract', 'beginParseContract', 'finishParseContract');
            if (contractsWithHistory instanceof Error) {
                const errMessage = `Issue finding contracts with history by submit info. Message: ${contractsWithHistory.message} AWESOME`
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
            const errMsg = 'user not authorized to fetch state data'
            logError('indexContracts', errMsg)
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw new ForbiddenError(errMsg)
        }
    }
}

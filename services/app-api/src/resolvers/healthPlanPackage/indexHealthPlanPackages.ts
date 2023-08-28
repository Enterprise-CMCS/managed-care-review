import type { Span } from '@opentelemetry/api'
import { ForbiddenError } from 'apollo-server-lambda'
import type { HealthPlanPackageType } from '../../domain-models'
import {
    isStateUser,
    isCMSUser,
    isAdminUser,
    convertContractToUnlockedHealthPlanPackage,
} from '../../domain-models'
import { isHelpdeskUser } from '../../domain-models/user'
import type { QueryResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import type { Store, StoreError } from '../../postgres'
import { isStoreError, NotFoundError } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import type { LDService } from '../../launchDarkly/launchDarkly'
import type { ContractOrErrorArrayType } from '../../postgres/contractAndRates'
import type { ContractType } from '../../domain-models/contractAndRates'
import { GraphQLError } from 'graphql/index'

const validateAndReturnHealthPlanPackages = (
    results: HealthPlanPackageType[] | StoreError,
    span?: Span
) => {
    if (isStoreError(results)) {
        const errMessage = `Issue indexing packages of type ${results.code}. Message: ${results.message}`
        logError('indexHealthPlanPackages', errMessage)
        setErrorAttributesOnActiveSpan(errMessage, span)
        throw new Error(errMessage)
    }

    const packages: HealthPlanPackageType[] = results

    const edges = packages.map((sub) => {
        return {
            node: {
                ...sub,
            },
        }
    })

    logSuccess('indexHealthPlanPackages')
    setSuccessAttributesOnActiveSpan(span)
    return { totalCount: edges.length, edges }
}

const validateContractsAndConvert = (
    contractsWithHistory: ContractOrErrorArrayType,
    span?: Span
): HealthPlanPackageType[] => {
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
        logError('indexHealthPlanPackagesResolver', errMessage)
        setErrorAttributesOnActiveSpan(errMessage, span)
    }

    // convert contract type to health plan package type and filter out failures
    const convertedContracts: HealthPlanPackageType[] = []
    const errorConvertContracts: string[] = []
    parsedContracts.forEach((contract) => {
        const parsedContract =
            convertContractToUnlockedHealthPlanPackage(contract)
        if (parsedContract instanceof Error) {
            errorConvertContracts.push(
                `${contract.id}: ${parsedContract.message}`
            )
        } else {
            convertedContracts.push(parsedContract)
        }
    })

    // log all contracts that failed converting
    if (errorConvertContracts.length > 0) {
        const errMessage = `Failed to covert the following contracts to health plan packages:\n${errorConvertContracts.join(
            '\n'
        )}`
        logError('indexHealthPlanPackagesResolver', errMessage)
        setErrorAttributesOnActiveSpan(errMessage, span)
    }

    return convertedContracts
}

export function indexHealthPlanPackagesResolver(
    store: Store,
    launchDarkly: LDService
): QueryResolvers['indexHealthPlanPackages'] {
    return async (_parent, _args, context) => {
        const { user, span } = context
        setResolverDetailsOnActiveSpan('fetchHealthPlanPackage', user, span)

        const ratesDatabaseRefactor = await launchDarkly.getFeatureFlag(
            context,
            'rates-db-refactor'
        )

        if (isStateUser(user)) {
            let results: StoreError | HealthPlanPackageType[] = []
            if (ratesDatabaseRefactor) {
                const contractsWithHistory =
                    await store.findAllContractsWithHistoryByState(
                        user.stateCode
                    )

                if (contractsWithHistory instanceof Error) {
                    const errMessage = `Issue finding contracts with history by stateCode: ${user.stateCode}. Message: ${contractsWithHistory.message}`
                    logError('fetchHealthPlanPackage', errMessage)
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

                results = validateContractsAndConvert(contractsWithHistory)
            } else {
                results = await store.findAllHealthPlanPackagesByState(
                    user.stateCode
                )
            }

            return validateAndReturnHealthPlanPackages(results, span)
        } else if (
            isCMSUser(user) ||
            isAdminUser(user) ||
            isHelpdeskUser(user)
        ) {
            let results: StoreError | HealthPlanPackageType[] = []
            if (ratesDatabaseRefactor) {
                const contractsWithHistory =
                    await store.findAllContractsWithHistoryBySubmitInfo()

                if (contractsWithHistory instanceof Error) {
                    const errMessage = `Issue finding contracts with history by submit info. Message: ${contractsWithHistory.message}`
                    logError('fetchHealthPlanPackage', errMessage)
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

                results = validateContractsAndConvert(contractsWithHistory)
            } else {
                results = await store.findAllHealthPlanPackagesBySubmittedAt()
            }

            return validateAndReturnHealthPlanPackages(results, span)
        } else {
            const errMsg = 'user not authorized to fetch state data'
            logError('indexHealthPlanPackages', errMsg)
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw new ForbiddenError(errMsg)
        }
    }
}

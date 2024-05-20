import type { Span } from '@opentelemetry/api'
import { ForbiddenError } from 'apollo-server-lambda'
import type { HealthPlanPackageType } from '../../domain-models'
import {
    isStateUser,
    isCMSUser,
    isAdminUser,
    isBusinessOwnerUser,
} from '../../domain-models'
import { isHelpdeskUser } from '../../domain-models/user'
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
import { validateContractsAndConvert } from './contractAndRates/resolverHelpers'

const validateAndReturnHealthPlanPackages = (
    results: HealthPlanPackageType[],
    span?: Span
) => {
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

export function indexHealthPlanPackagesResolver(
    store: Store
): QueryResolvers['indexHealthPlanPackages'] {
    return async (_parent, _args, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('indexHealthPlanPackages', {}, ctx)
        setResolverDetailsOnActiveSpan('indexHealthPlanPackages', user, span)

        if (isStateUser(user)) {
            const contractsWithHistory =
                await store.findAllContractsWithHistoryByState(user.stateCode)

            if (contractsWithHistory instanceof Error) {
                const errMessage = `Issue finding contracts with history by stateCode: ${user.stateCode}. Message: ${contractsWithHistory.message}`
                logError('indexHealthPlanPackages', errMessage)
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

            const results = validateContractsAndConvert(contractsWithHistory)

            return validateAndReturnHealthPlanPackages(results, span)
        } else if (
            isCMSUser(user) ||
            isAdminUser(user) ||
            isHelpdeskUser(user) ||
            isBusinessOwnerUser(user)
        ) {
            const contractsWithHistory =
                await store.findAllContractsWithHistoryBySubmitInfo()

            if (contractsWithHistory instanceof Error) {
                const errMessage = `Issue finding contracts with history by submit info. Message: ${contractsWithHistory.message}`
                logError('indexHealthPlanPackages', errMessage)
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

            const results = validateContractsAndConvert(contractsWithHistory)

            return validateAndReturnHealthPlanPackages(results, span)
        } else {
            const errMsg = 'user not authorized to fetch state data'
            logError('indexHealthPlanPackages', errMsg)
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw new ForbiddenError(errMsg)
        }
    }
}

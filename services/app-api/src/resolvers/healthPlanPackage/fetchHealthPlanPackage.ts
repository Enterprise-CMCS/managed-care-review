import { ForbiddenError } from 'apollo-server-lambda'
import type { HealthPlanPackageType } from '../../domain-models'
import {
    isCMSUser,
    isStateUser,
    isAdminUser,
    packageStatus,
    convertContractWithRatesToUnlockedHPP,
    isBusinessOwnerUser,
} from '../../domain-models'
import { isHelpdeskUser } from '../../domain-models/user'
import type { QueryResolvers, State } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import type { Store } from '../../postgres'
import { isStoreError } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import type { LDService } from '../../launchDarkly/launchDarkly'
import { GraphQLError } from 'graphql/index'
import { NotFoundError } from '../../postgres'

export function fetchHealthPlanPackageResolver(
    store: Store,
    launchDarkly: LDService
): QueryResolvers['fetchHealthPlanPackage'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context
        setResolverDetailsOnActiveSpan('fetchHealthPlanPackage', user, span)

        const ratesDatabaseRefactor = await launchDarkly.getFeatureFlag(
            context,
            'rates-db-refactor'
        )

        let pkg: HealthPlanPackageType

        // Here is where we flag finding health plan
        if (ratesDatabaseRefactor) {
            // Fetch the full contract
            const contractWithHistory = await store.findContractWithHistory(
                input.pkgID
            )

            if (contractWithHistory instanceof Error) {
                const errMessage = `Issue finding a contract with history with id ${input.pkgID}. Message: ${contractWithHistory.message}`
                logError('fetchHealthPlanPackage', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)

                if (contractWithHistory instanceof NotFoundError) {
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

            const convertedPkg =
                convertContractWithRatesToUnlockedHPP(contractWithHistory)

            if (convertedPkg instanceof Error) {
                const errMessage = `Issue converting contract. Message: ${convertedPkg.message}`
                logError('fetchHealthPlanPackage', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'PROTO_DECODE_ERROR',
                    },
                })
            }

            pkg = convertedPkg
        } else {
            const result = await store.findHealthPlanPackage(input.pkgID)

            if (isStoreError(result)) {
                const errMessage = `Issue finding a package of type ${result.code}. Message: ${result.message}`
                logError('fetchHealthPlanPackage', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new Error(errMessage)
            }

            if (result === undefined) {
                const errMessage = `Issue finding a package with id ${input.pkgID}. Message: Result was undefined.`
                logError('fetchHealthPlanPackage', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'NOT_FOUND',
                        cause: 'DB_ERROR',
                    },
                })
            }

            pkg = result
        }

        // Authorization CMS users can view, state users can only view if the state matches
        if (isStateUser(user)) {
            const stateFromCurrentUser: State['code'] = user.stateCode
            if (pkg.stateCode !== stateFromCurrentUser) {
                logError(
                    'fetchHealthPlanPackage',
                    'user not authorized to fetch data from a different state'
                )
                setErrorAttributesOnActiveSpan(
                    'user not authorized to fetch data from a different state',
                    span
                )
                throw new ForbiddenError(
                    'user not authorized to fetch data from a different state'
                )
            }
        } else if (
            isCMSUser(user) ||
            isAdminUser(user) ||
            isHelpdeskUser(user) ||
            isBusinessOwnerUser(user)
        ) {
            if (packageStatus(pkg) === 'DRAFT') {
                logError(
                    'fetchHealthPlanPackage',
                    'user not authorized to fetch a draft'
                )
                setErrorAttributesOnActiveSpan(
                    'user not authorized to fetch a draft',
                    span
                )
                throw new ForbiddenError('user not authorized to fetch a draft')
            }
        } else {
            logError('fetchHealthPlanPackage', 'unknown user type')
            setErrorAttributesOnActiveSpan('unknown user type', span)
            throw new ForbiddenError(`unknown user type`)
        }

        logSuccess('fetchHealthPlanPackage')
        setSuccessAttributesOnActiveSpan(span)
        return { pkg }
    }
}

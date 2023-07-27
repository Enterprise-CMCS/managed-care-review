import { ForbiddenError } from 'apollo-server-lambda'
import {
    isCMSUser,
    isStateUser,
    isAdminUser,
    HealthPlanPackageType,
    packageStatus,
    convertContractToUnlockedHealthPlanPackage,
} from '../../domain-models'
import { isHelpdeskUser } from '../../domain-models/user'
import { QueryResolvers, State } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import { isStoreError, Store, StoreError } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { LDService } from '../../launchDarkly/launchDarkly'
import { GraphQLError } from 'graphql/index'

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

        let pkg: HealthPlanPackageType = <HealthPlanPackageType>{}

        // Here is where we flag finding health plan
        if (ratesDatabaseRefactor) {
            // Health plans can be in two states Draft and Submitted, and we have 2 postgres functions for each.
            // findContractWithHistory gets all submitted revisions and findDraftContract gets just the one draft revision
            // We don't have function that gets all revisions including draft. So we have to call both functions when a
            // contract is DRAFT.
            const contractWithHistory = await store.findContractWithHistory(
                input.pkgID
            )

            if (isStoreError(contractWithHistory)) {
                const errMessage = `Issue finding a package with id ${input.pkgID}. Message: ${contractWithHistory.message}`
                logError('fetchHealthPlanPackage', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)

                if (contractWithHistory?.code === 'NOT_FOUND_ERROR') {
                    throw new GraphQLError(errMessage, {
                        extensions: { code: 'NOT_FOUND' },
                    })
                }

                throw new Error(errMessage)
            }

            if (contractWithHistory instanceof Error) {
                const errMessage = `Issue finding a package with id ${input.pkgID}. Message: ${contractWithHistory.message}`
                logError('fetchHealthPlanPackage', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'DB_ERROR',
                    },
                })
            }

            if (contractWithHistory.status === 'DRAFT') {
                const draftRevision = await store.findDraftContract(input.pkgID)
                if (draftRevision instanceof Error) {
                    // If draft returns undefined we error because a draft submission should always have a draft revision.
                    const errMessage = `Issue finding a package with id ${input.pkgID}. Message: ${draftRevision.message}`
                    logError('fetchHealthPlanPackage', errMessage)
                    setErrorAttributesOnActiveSpan(errMessage, span)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                if (draftRevision === undefined) {
                    const errMessage = `Issue finding a package with id ${input.pkgID}. Message: Result was undefined.`
                    logError('fetchHealthPlanPackage', errMessage)
                    setErrorAttributesOnActiveSpan(errMessage, span)
                    throw new GraphQLError(errMessage, {
                        extensions: { code: 'NOT_FOUND' },
                    })
                }

                // Pushing in the draft revision, so it would be first in the array of revisions.
                contractWithHistory.revisions.push(draftRevision)
            }

            const convertedPkg =
                convertContractToUnlockedHealthPlanPackage(contractWithHistory)

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
            const result = (await store.findHealthPlanPackage(input.pkgID)) as
                | HealthPlanPackageType
                | StoreError
            if (isStoreError(result)) {
                const errMessage = `Issue finding a package of type ${result.code}. Message: ${result.message}`
                logError('fetchHealthPlanPackage', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new Error(errMessage)
            }

            pkg = result
        }

        if (pkg === undefined) {
            const errMessage = `Issue finding a package with id ${input.pkgID}. Message: Result was undefined.`
            logError('fetchHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: { code: 'NOT_FOUND' },
            })
        }

        // Authorization CMS users can view, state users can only view if the state matches
        if (isStateUser(context.user)) {
            const stateFromCurrentUser: State['code'] = context.user.stateCode
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
            isCMSUser(context.user) ||
            isAdminUser(context.user) ||
            isHelpdeskUser(context.user)
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

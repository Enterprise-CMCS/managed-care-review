import { ForbiddenError } from 'apollo-server-lambda'
import {
    isCMSUser,
    isStateUser,
    isAdminUser,
    HealthPlanPackageType,
    packageStatus,
} from '../../domain-models'
import { isHelpdeskUser } from '../../domain-models/user'
import { QueryResolvers, State } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import { isStoreError, Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'

export function fetchHealthPlanPackageResolver(
    store: Store
): QueryResolvers['fetchHealthPlanPackage'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context
        setResolverDetailsOnActiveSpan('fetchHealthPlanPackage', user, span)
        // fetch from the store
        const result = await store.findHealthPlanPackage(input.pkgID)

        if (isStoreError(result)) {
            const errMessage = `Issue finding a package of type ${result.code}. Message: ${result.message}`
            logError('fetchHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        if (result === undefined) {
            const errMessage = `Issue finding a package with id ${input.pkgID}. Message: Result was undefined `
            logError('fetchHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            return {
                pkg: undefined,
            }
        }

        const pkg: HealthPlanPackageType = result

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
                    'CMS user not authorized to fetch a draft'
                )
                setErrorAttributesOnActiveSpan(
                    'CMS user not authorized to fetch a draft',
                    span
                )
                throw new ForbiddenError(
                    'CMS user not authorized to fetch a draft'
                )
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

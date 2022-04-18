import { ForbiddenError } from 'apollo-server-lambda'
import {
    isStateUser,
    HealthPlanPackageType,
} from '../../app-web/src/common-code/domain-models'
import { QueryResolvers } from '../gen/gqlServer'
import { logError, logSuccess } from '../logger'
import { isStoreError, Store } from '../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from './attributeHelper'

export function indexHealthPlanPackagesResolver(
    store: Store
): QueryResolvers['indexHealthPlanPackages'] {
    return async (_parent, _args, context) => {
        // This resolver is only callable by state users
        const { user, span } = context
        setResolverDetailsOnActiveSpan('fetchHealthPlanPackage', user, span)
        if (!isStateUser(user)) {
            const errMsg = 'user not authorized to fetch state data'
            logError('indexHealthPlanPackages', errMsg)
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw new ForbiddenError(errMsg)
        }

        // fetch from the store
        const results = await store.findAllHealthPlanPackages(user.state_code)

        if (isStoreError(results)) {
            const errMessage = `Issue finding packages of type ${results.code}. Message: ${results.message}`
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
}

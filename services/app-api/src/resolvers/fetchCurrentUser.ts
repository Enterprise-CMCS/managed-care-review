import { QueryResolvers } from '../gen/gqlServer'
import { logSuccess, logError } from '../logger'
import {
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
    setErrorAttributesOnActiveSpan,
} from './attributeHelper'
import { featureFlags } from '../../../app-web/src/common-code/featureFlags'

export function fetchCurrentUserResolver(): QueryResolvers['fetchCurrentUser'] {
    return async (_parent, _args, context) => {
        const { ld, user, span } = context
        // if the LD flag is enabled, fetchCurrentUser will return an error
        await ld?.waitForInitialization()
        const gqlErrors = await ld?.variation(
            featureFlags.API_GRAPHQL_ERRORS,
            {
                key: context.user.email,
            },
            false
        )

        if (gqlErrors) {
            const errMessage = `API_GRAPHQL_ERRORS flag is enabled for user ${context.user.email}`
            setErrorAttributesOnActiveSpan(errMessage, span)
            logError('fetchCurrentUser', errMessage)
            throw new Error(errMessage)
        }

        setResolverDetailsOnActiveSpan('fetchCurrentUser', user, span)
        setSuccessAttributesOnActiveSpan(span)
        logSuccess('fetchCurrentUser')
        return context.user
    }
}

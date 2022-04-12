import { ApolloError, ForbiddenError } from 'apollo-server-lambda'
import {
    isStateUser,
    HealthPlanFormDataType,
} from '../../app-web/src/common-code/domain-models'
import { QueryResolvers } from '../gen/gqlServer'
import { logError, logSuccess } from '../logger'
import { isStoreError, Store } from '../postgres'
import {
    setResolverDetailsOnActiveSpan,
    setErrorAttributesOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from './attributeHelper'

export function indexSubmissionsResolver(
    store: Store
): QueryResolvers['indexSubmissions'] {
    return async (_parent, _args, context) => {
        const { user, span } = context
        setResolverDetailsOnActiveSpan('indexSubmissions', user, span)

        // This resolver is only callable by state users
        if (!isStateUser(context.user)) {
            logError(
                'indexSubmissions',
                'user not authorized to fetch state data'
            )
            setErrorAttributesOnActiveSpan(
                'user not authorized to fetch state data',
                span
            )
            throw new ForbiddenError('user not authorized to fetch state data')
        }

        // fetch from the store
        const result = await store.findAllSubmissions(context.user.state_code)

        if (isStoreError(result)) {
            if (result.code === 'WRONG_STATUS') {
                logError('indexSubmissions', 'FormData is not Unlocked')
                setErrorAttributesOnActiveSpan('FormData is not Unlocked', span)
                throw new ApolloError(
                    `FormData is not Unlocked`,
                    'WRONG_STATUS',
                    {
                        argumentName: 'submissionID',
                    }
                )
            }

            const errMessage = `Issue finding a draft submission of type ${result.code}. Message: ${result.message}`
            logError('indexSubmissions', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        const submissions: HealthPlanFormDataType[] = result

        const edges = submissions.map((sub) => {
            return {
                node: sub,
            }
        })

        logSuccess('indexSubmissions')
        setSuccessAttributesOnActiveSpan(span)
        return { totalCount: edges.length, edges }
    }
}

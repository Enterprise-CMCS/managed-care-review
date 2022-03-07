import { ApolloError, ForbiddenError } from 'apollo-server-lambda'
import {
    isStateUser,
    SubmissionUnionType,
} from '../../app-web/src/common-code/domain-models'
import { QueryResolvers } from '../gen/gqlServer'
import { logError, logSuccess } from '../logger'
import { isStoreError, Store } from '../postgres'

export function indexSubmissionsResolver(
    store: Store
): QueryResolvers['indexSubmissions'] {
    return async (_parent, _args, context) => {
        const { span } = context
        console.log("SPANININDEX", span)
        // This resolver is only callable by state users
        if (!isStateUser(context.user)) {
            logError(
                'indexSubmissions',
                'user not authorized to fetch state data'
            )
            span?.setAttribute('indexSubmissions.error', JSON.stringify(logError))
            span?.addEvent('indexSubmissions unauthorized user')
            throw new ForbiddenError('user not authorized to fetch state data')
        }

        // fetch from the store
        const result = await store.findAllSubmissions(context.user.state_code)

        if (isStoreError(result)) {
            if (result.code === 'WRONG_STATUS') {
                logError(
                    'indexSubmissions',
                    'Submission is not a DraftSubmission'
                )
                span?.setAttribute('indexSubmissions.error', JSON.stringify(logError))
                span?.addEvent('indexSubmissions wrong status')
                throw new ApolloError(
                    `Submission is not a DraftSubmission`,
                    'WRONG_STATUS',
                    {
                        argumentName: 'submissionID',
                    }
                )
            }

            const errMessage = `Issue finding a draft submission of type ${result.code}. Message: ${result.message}`
            logError('indexSubmissions', errMessage)
            span?.setAttribute('indexSubmissions.error', errMessage)
            span?.addEvent(`indexSubmissions ${errMessage}`)
            throw new Error(errMessage)
        }

        const submissions: SubmissionUnionType[] = result

        const edges = submissions.map((sub) => {
            return {
                node: sub,
            }
        })

        logSuccess('indexSubmissions')
        span?.setAttribute('indexSubmissions.success', JSON.stringify(submissions))
        span?.addEvent('indexSubmissions otel success')
        console.log("SPANSUCCESS", span)
        return { totalCount: edges.length, edges }
    }
}

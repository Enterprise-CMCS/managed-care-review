import { ApolloError, ForbiddenError } from 'apollo-server-lambda'
import {
    isStateUser,
    SubmissionUnionType,
} from '../../app-web/src/common-code/domain-models'
import { QueryResolvers } from '../gen/gqlServer'
import { isStoreError, Store } from '../postgres'

export function indexSubmissionsResolver(
    store: Store
): QueryResolvers['indexSubmissions'] {
    return async (_parent, _args, context) => {
        // This resolver is only callable by state users
        if (!isStateUser(context.user)) {
            console.error({
                message: 'indexSubmissions failed',
                operation: 'indexSubmissions',
                status: 'FAILURE',
                error: 'user not authorized to fetch state data',
            })
            throw new ForbiddenError('user not authorized to fetch state data')
        }

        // fetch from the store
        const result = await store.findAllSubmissions(context.user.state_code)

        if (isStoreError(result)) {
            if (result.code === 'WRONG_STATUS') {
                console.error({
                    message: 'indexSubmissions failed',
                    operation: 'indexSubmissions',
                    status: 'FAILURE',
                    error: 'user not authorized to fetch state data',
                })
                throw new ApolloError(
                    `Submission is not a DraftSubmission`,
                    'WRONG_STATUS',
                    {
                        argumentName: 'submissionID',
                    }
                )
            }
            console.error({
                message: 'indexSubmissions failed',
                operation: 'indexSubmissions',
                status: 'FAILURE',
                error: result,
            })
            throw new Error(
                `Issue finding a draft submission of type ${result.code}. Message: ${result.message}`
            )
        }

        const submissions: SubmissionUnionType[] = result

        const edges = submissions.map((sub) => {
            return {
                node: sub,
            }
        })

        console.info({
            message: 'indexSubmissions succeeded',
            operation: 'indexSubmissions',
            status: 'SUCCESS',
        })
        return { totalCount: edges.length, edges }
    }
}

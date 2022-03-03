import { ApolloError, ForbiddenError } from 'apollo-server-lambda'
import {
    isStateUser,
    Submission2Type
} from '../../app-web/src/common-code/domain-models'
import { QueryResolvers } from '../gen/gqlServer'
import { logError, logSuccess } from '../logger'
import { isStoreError, Store} from '../postgres'

export function indexSubmissions2Resolver(
    store: Store
): QueryResolvers['indexSubmissions2'] {
    return async (_parent, _args, context) => {
        // This resolver is only callable by state users
        if (!isStateUser(context.user)) {
            logError(
                'indexSubmissions',
                'user not authorized to fetch state data'
            )
            throw new ForbiddenError('user not authorized to fetch state data')
        }

        // fetch from the store
        const results = await store.findAllSubmissionsWithRevisions(context.user.state_code)

        if (isStoreError(results)) {
            if (results.code === 'WRONG_STATUS') {
                logError(
                    'indexSubmissions',
                    'Submission is not a DraftSubmission'
                )
                throw new ApolloError(
                    `Submission is not a DraftSubmission`,
                    'WRONG_STATUS',
                    {
                        argumentName: 'submissionID',
                    }
                )
            }

            const errMessage = `Issue finding a draft submission of type ${results.code}. Message: ${results.message}`
            logError('indexSubmissions2', errMessage)
            throw new Error(errMessage)
        }

        const submissions: Submission2Type[] = results

        const edges = submissions.map((sub) => {
            return {
                node: {
                    ...sub,
            },
            }
        })

        logSuccess('indexSubmissions2')
        return { totalCount: edges.length, edges }
    }
}

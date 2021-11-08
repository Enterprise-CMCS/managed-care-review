import { ApolloError, ForbiddenError } from 'apollo-server-lambda'
import { isStoreError, Store } from '../store/index'
import { QueryResolvers } from '../gen/gqlServer'

import {
    SubmissionUnionType,
    isStateUser,
} from '../../app-web/src/common-code/domain-models'

export function indexSubmissionsResolver(
    store: Store
): QueryResolvers['indexSubmissions'] {
    return async (_parent, _args, context) => {
        // This resolver is only callable by state users
        if (!isStateUser(context.user)) {
            throw new ForbiddenError('user not authorized to fetch state data')
        }

        // fetch from the store
        const result = await store.findAllSubmissions(context.user.state_code)

        if (isStoreError(result)) {
            if (result.code === 'WRONG_STATUS') {
                throw new ApolloError(
                    `Submission is not a DraftSubmission`,
                    'WRONG_STATUS',
                    {
                        argumentName: 'submissionID',
                    }
                )
            }
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

        return { totalCount: edges.length, edges }
    }
}

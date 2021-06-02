import { ForbiddenError, ApolloError } from 'apollo-server-lambda'
import { isStoreError, Store } from '../store/index'
import { QueryResolvers, State } from '../gen/gqlServer'
import { StateSubmissionType } from '../../app-web/src/common-code/domain-models'

export function fetchStateSubmissionResolver(
    store: Store
): QueryResolvers['fetchStateSubmission'] {
    return async (_parent, { input }, context) => {
        // fetch from the store
        const result = await store.findStateSubmission(input.submissionID)

        if (isStoreError(result)) {
            console.log('Error finding a submission', result)
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

        if (result === undefined) {
            return {
                submission: undefined,
            }
        }

        const draft: StateSubmissionType = result

        // Authorization
        const stateFromCurrentUser: State['code'] = context.user.state_code
        if (draft.stateCode !== stateFromCurrentUser) {
            throw new ForbiddenError(
                'user not authorized to fetch data from a different state'
            )
        }

        return { submission: draft }
    }
}

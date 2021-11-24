import { ApolloError, ForbiddenError } from 'apollo-server-lambda'
import {
    isCMSUser,
    isStateUser,
    StateSubmissionType,
} from '../../app-web/src/common-code/domain-models'
import { QueryResolvers, State } from '../gen/gqlServer'
import { isStoreError, Store } from '../postgres'

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
                    `Submission is not a StateSubmission`,
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

        // Authorization CMS users can view, state users can only view if the state matches
        if (isStateUser(context.user)) {
            const stateFromCurrentUser: State['code'] = context.user.state_code
            if (draft.stateCode !== stateFromCurrentUser) {
                throw new ForbiddenError(
                    'user not authorized to fetch data from a different state'
                )
            }
        } else if (isCMSUser(context.user)) {
            true // CMS users have access, no error to throw here, but I want to have it in the if tree so we don't forget something.
        } else {
            console.log('Error: Unknown User Type: ', context.user)
            throw new ForbiddenError(`unknown user type`)
        }

        return { submission: draft }
    }
}

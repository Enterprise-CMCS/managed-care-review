import { ApolloError, ForbiddenError } from 'apollo-server-lambda'
import {
    DraftSubmissionType,
    isStateUser,
} from '../../app-web/src/common-code/domain-models'
import { QueryResolvers, State } from '../gen/gqlServer'
import { isStoreError, Store } from '../postgres'

export function fetchDraftSubmissionResolver(
    store: Store
): QueryResolvers['fetchDraftSubmission'] {
    return async (_parent, { input }, context) => {
        // This resolver is only callable by state users
        if (!isStateUser(context.user)) {
            console.error({
                message: 'fetchDraftSubmission failed',
                operation: 'fetchDraftSubmission',
                status: 'FAILURE',
                error: 'user not authorized to fetch state data',
            })
            throw new ForbiddenError('user not authorized to fetch state data')
        }

        // fetch from the store
        const result = await store.findDraftSubmission(input.submissionID)

        if (isStoreError(result)) {
            if (result.code === 'WRONG_STATUS') {
                console.error({
                    message: 'fetchDraftSubmission failed',
                    operation: 'fetchDraftSubmission',
                    status: 'FAILURE',
                    error: 'Submission is not a DraftSubmission',
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
                message: 'fetchDraftSubmission failed',
                operation: 'fetchDraftSubmission',
                status: 'FAILURE',
                error: result,
            })
            throw new Error(
                `Issue finding a draft submission of type ${result.code}. Message: ${result.message}`
            )
        }

        if (result === undefined) {
            return {
                draftSubmission: undefined,
            }
        }

        const draft: DraftSubmissionType = result

        // Authorization
        const stateFromCurrentUser: State['code'] = context.user.state_code
        if (draft.stateCode !== stateFromCurrentUser) {
            console.error({
                message: 'fetchDraftSubmission failed',
                operation: 'fetchDraftSubmission',
                status: 'FAILURE',
                error: 'user not authorized to fetch data from a different state',
            })
            throw new ForbiddenError(
                'user not authorized to fetch data from a different state'
            )
        }

        console.info({
            message: 'fetchDraftSubmission succeeded',
            operation: 'fetchDraftSubmission',
            status: 'SUCCESS',
        })

        return { draftSubmission: draft }
    }
}

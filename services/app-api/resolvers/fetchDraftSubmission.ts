import { ForbiddenError } from 'apollo-server-lambda'

import { isStoreError, Store } from '../store/index'

import { QueryResolvers, State } from '../gen/gqlServer'

import { DraftSubmissionType } from '../../app-web/src/common-code/domain-models'

export function fetchDraftSubmissionResolver(
    store: Store
): QueryResolvers['fetchDraftSubmission'] {
    return async (_parent, { input }, context) => {
        // fetch from the store
        const result = await store.findDraftSubmission(input.submissionID)

        if (isStoreError(result)) {
            console.log('Error finding a submission', result)
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
            throw new ForbiddenError(
                'user not authorized to fetch data from a different state'
            )
        }

        return { draftSubmission: draft }
    }
}

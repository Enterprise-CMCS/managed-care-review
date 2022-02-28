import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import {
    DraftSubmissionType, isCMSUser, StateSubmissionType
} from '../../app-web/src/common-code/domain-models'
import { Emailer } from '../emailer'
import { MutationResolvers } from '../gen/gqlServer'
import { logError, logSuccess } from '../logger'
import { isStoreError, Store } from '../postgres'

// unlock takes a state submission and casts it into a draft submission
// Since draft submission is a strict subset of submitted submission, this can't error today.
function unlock(submission: StateSubmissionType
): DraftSubmissionType {

    const draft: DraftSubmissionType = {
        ...submission,
        status: 'DRAFT',
    }
    // this method does persist the submittedAt field onto the draft, but typescript won't let
    // us access it so that's fine. 

    return draft
}

// unlockStateSubmissionResolver is a state machine transition for Submission,
// transforming it from a DraftSubmission to a StateSubmission
export function unlockStateSubmissionResolver(
    store: Store,
    _emailer: Emailer
): MutationResolvers['unlockStateSubmission'] {
    return async (_parent, { input }, context) => {

        const { user } = context
        // This resolver is only callable by CMS users
        if (!isCMSUser(user)) {
            logError(
                'unlockStateSubmission',
                'user not authorized to unlock submission'
            )
            throw new ForbiddenError('user not authorized to unlock submission')
        }

        // fetch from the store
        const result = await store.findStateSubmission(input.submissionID)

        if (isStoreError(result)) {
            const errMessage = `Issue finding a state submission of type ${result.code}. Message: ${result.message}`
            logError('unlockStateSubmission', errMessage)

            if (result.code === 'WRONG_STATUS') {
                throw new UserInputError('Attempted to unlock submission with wrong status')
            }
            throw new Error(errMessage)
        }

        if (result === undefined) {
            const errMessage = `A submission must exist to be unlocked: ${input.submissionID}`
            logError('unlockStateSubmission', errMessage)
            throw new UserInputError(errMessage, {
                argumentName: 'submissionID',
            })
        }

        const submission: StateSubmissionType = result

        const draft: DraftSubmissionType = unlock(submission)

        // Create a new revision with this draft in it
        const revisionResult = await store.insertNewRevision(input.submissionID, draft)

        // const updateResult = await store.updateStateSubmission(stateSubmission)
        if (isStoreError(revisionResult)) {
            const errMessage = `Issue unlocking a state submission of type ${revisionResult.code}. Message: ${revisionResult.message}`
            logError('unlockStateSubmission', errMessage)
            throw new Error(errMessage)
        }

        logSuccess('unlockStateSubmission')

        return { submission: revisionResult }

    }
}

import { UserInputError, ForbiddenError } from 'apollo-server-lambda'

import { isStoreError, Store } from '../store/index'

import { MutationResolvers, State } from '../gen/gqlServer'

import { DraftSubmissionType } from '../../app-web/src/common-code/domain-models'

// TODO: potential refactor: pull out database interactions into /datasources createDraftSubmission as per apollo server docs
export function updateDraftSubmissionResolver(
    store: Store
): MutationResolvers['updateDraftSubmission'] {
    return async (_parent, { input }, context) => {
        // fetch the current submission, put the updated stuff on it?
        const result = await store.findDraftSubmission(input.submissionID)
        if (isStoreError(result)) {
            console.log('Error finding a submission for update', result)
            throw new Error(
                `Issue finding a draft submission of type ${result.code}. Message: ${result.message}`
            )
        }

        if (result === undefined) {
            throw new UserInputError(
                `No submission found to update with that ID: ${input.submissionID}`,
                {
                    argumentName: 'submissionID',
                }
            )
        }
        const initialDraft: DraftSubmissionType = result

        // Authorize the update
        const stateFromCurrentUser: State['code'] = context.user.state_code
        if (initialDraft.stateCode !== stateFromCurrentUser) {
            throw new ForbiddenError(
                'user not authorized to fetch data from a different state'
            )
        }

        // Validate the programID
        const program = store.findProgram(
            stateFromCurrentUser,
            input.draftSubmission.programId
        )

        if (program === undefined) {
            throw new UserInputError(
                `The program id ${input.draftSubmission.programId} does not exist in state ${stateFromCurrentUser}`,
                {
                    argumentName: 'programID',
                }
            )
        }

        const draft: any = Object.assign(initialDraft, input.draftSubmission)
        // TODO "applyChanges" fn
        draft.programID = draft.programId

        const updateResult = await store.updateDraftSubmission(draft)

        if (isStoreError(updateResult)) {
            console.log(
                `Issue updating a draft submission of type ${updateResult.code}. Message: ${updateResult.message}`
            )
            throw new Error(
                `Issue updating a draft submission of type ${updateResult.code}. Message: ${updateResult.message}`
            )
        }

        const updatedDraft: DraftSubmissionType = updateResult

        return {
            draftSubmission: updatedDraft,
        }
    }
}

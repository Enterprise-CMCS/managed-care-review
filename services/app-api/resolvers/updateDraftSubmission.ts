import { UserInputError, ForbiddenError } from 'apollo-server-lambda'

import { isStoreError, Store } from '../store/index'

import {
    MutationResolvers,
    State,
    DraftSubmissionUpdates,
} from '../gen/gqlServer'

import { DraftSubmissionType } from '../../app-web/src/common-code/domain-models'

// This MUTATES the passed in draft, overwriting all the current fields with the updated fields
export function applyUpdates(
    draft: DraftSubmissionType,
    updates: DraftSubmissionUpdates
): void {
    const capitationRatesUpdates = updates.contractAmendmentInfo
        ?.capitationRatesAmendedInfo
        ? {
              reason:
                  updates.contractAmendmentInfo.capitationRatesAmendedInfo
                      .reason ?? undefined,

              otherReason:
                  updates.contractAmendmentInfo.capitationRatesAmendedInfo
                      .otherReason ?? undefined,
          }
        : undefined

    const amendmentInfoUpdates = updates.contractAmendmentInfo
        ? {
              itemsBeingAmended:
                  updates.contractAmendmentInfo.itemsBeingAmended,
              otherItemBeingAmended:
                  updates.contractAmendmentInfo.otherItemBeingAmended ??
                  undefined,
              capitationRatesAmendedInfo: capitationRatesUpdates,
              relatedToCovid19:
                  updates.contractAmendmentInfo.relatedToCovid19 ?? undefined,
              relatedToVaccination:
                  updates.contractAmendmentInfo.relatedToVaccination ??
                  undefined,
          }
        : undefined

    draft.programID = updates.programID
    draft.submissionType = updates.submissionType
    draft.submissionDescription = updates.submissionDescription
    draft.documents = updates.documents
    draft.contractType = updates.contractType ?? undefined
    draft.contractDateStart = updates.contractDateStart ?? undefined
    draft.contractDateEnd = updates.contractDateEnd ?? undefined
    draft.managedCareEntities = updates.managedCareEntities
    draft.federalAuthorities = updates.federalAuthorities
    draft.contractAmendmentInfo = amendmentInfoUpdates
}

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
        const draft: DraftSubmissionType = result

        // Authorize the update
        const stateFromCurrentUser: State['code'] = context.user.state_code
        if (draft.stateCode !== stateFromCurrentUser) {
            throw new ForbiddenError(
                'user not authorized to fetch data from a different state'
            )
        }

        // Validate the programID
        const program = store.findProgram(
            stateFromCurrentUser,
            input.draftSubmissionUpdates.programID
        )

        if (program === undefined) {
            throw new UserInputError(
                `The program id ${input.draftSubmissionUpdates.programID} does not exist in state ${stateFromCurrentUser}`,
                {
                    argumentName: 'programID',
                }
            )
        }

        // apply the updates to the draft
        applyUpdates(draft, input.draftSubmissionUpdates)

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

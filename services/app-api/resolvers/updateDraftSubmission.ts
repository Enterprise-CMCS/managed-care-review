import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import {
    DraftSubmissionType,
    isStateUser,
} from '../../app-web/src/common-code/domain-models'
import {
    DraftSubmissionUpdates,
    MutationResolvers,
    State,
} from '../gen/gqlServer'
import { logError, logSuccess } from '../logger'
import { isStoreError, Store } from '../postgres'
import { pluralize } from '../../app-web/src/common-code/formatters'

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

    const rateAmendmentUpdates = updates.rateAmendmentInfo
        ? {
              effectiveDateStart:
                  updates.rateAmendmentInfo.effectiveDateStart ?? undefined,
              effectiveDateEnd:
                  updates.rateAmendmentInfo.effectiveDateEnd ?? undefined,
          }
        : undefined

    const actuaryContactsUpdates = updates.actuaryContacts.map(
        (actuaryContact) => {
            return {
                name: actuaryContact.name,
                titleRole: actuaryContact.titleRole,
                email: actuaryContact.email,
                actuarialFirm: actuaryContact.actuarialFirm ?? undefined,
                actuarialFirmOther:
                    actuaryContact.actuarialFirmOther ?? undefined,
            }
        }
    )

    draft.programIDs = updates.programIDs
    draft.submissionType = updates.submissionType
    draft.submissionDescription = updates.submissionDescription
    draft.documents = updates.documents

    draft.stateContacts = updates.stateContacts
    draft.actuaryContacts = actuaryContactsUpdates
    draft.actuaryCommunicationPreference =
        updates.actuaryCommunicationPreference ?? undefined

    draft.contractType = updates.contractType ?? undefined
    draft.contractExecutionStatus = updates.contractExecutionStatus ?? undefined
    draft.contractDocuments = updates.contractDocuments ?? []
    draft.contractDateStart = updates.contractDateStart ?? undefined
    draft.contractDateEnd = updates.contractDateEnd ?? undefined
    draft.managedCareEntities = updates.managedCareEntities
    draft.federalAuthorities = updates.federalAuthorities
    draft.contractAmendmentInfo = amendmentInfoUpdates

    draft.rateType = updates.rateType ?? undefined
    draft.rateDocuments = updates.rateDocuments ?? []
    draft.rateDateStart = updates.rateDateStart ?? undefined
    draft.rateDateEnd = updates.rateDateEnd ?? undefined
    draft.rateDateCertified = updates.rateDateCertified ?? undefined
    draft.rateAmendmentInfo = rateAmendmentUpdates
}

export function updateDraftSubmissionResolver(
    store: Store
): MutationResolvers['updateDraftSubmission'] {
    return async (_parent, { input }, context) => {
        // This resolver is only callable by state users
        if (!isStateUser(context.user)) {
            logError(
                'updateDraftSubmission',
                'user not authorized to modify state data'
            )
            throw new ForbiddenError('user not authorized to modify state data')
        }

        // fetch the current submission, put the updated stuff on it?
        const result = await store.findDraftSubmission(input.submissionID)
        if (isStoreError(result)) {
            const errMessage = `Issue finding a draft submission of type ${result.code}. Message: ${result.message}`
            logError('updateDraftSubmission', errMessage)
            throw new Error(errMessage)
        }

        if (result === undefined) {
            const errMessage = `No submission found to update with that ID: ${input.submissionID}`
            logError('updateDraftSubmission', errMessage)
            throw new UserInputError(errMessage, {
                argumentName: 'submissionID',
            })
        }
        const draft: DraftSubmissionType = result

        // Authorize the update
        const stateFromCurrentUser: State['code'] = context.user.state_code
        if (draft.stateCode !== stateFromCurrentUser) {
            logError(
                'updateDraftSubmission',
                'user not authorized to fetch data from a different state'
            )
            throw new ForbiddenError(
                'user not authorized to fetch data from a different state'
            )
        }

        // Validate the programIDs
        const program = store.findPrograms(
            stateFromCurrentUser,
            input.draftSubmissionUpdates.programIDs
        )

        if (program === undefined) {
            const count = input.draftSubmissionUpdates.programIDs.length
            const errMessage = `The program ${(pluralize('id', count))} ${input.draftSubmissionUpdates.programIDs.join(', ')} ${(pluralize('does', count))} not exist in state ${stateFromCurrentUser}`
            logError('updateDraftSubmission', errMessage)
            throw new UserInputError(errMessage, {
                argumentName: 'programIDs',
            })
        }

        // apply the updates to the draft
        applyUpdates(draft, input.draftSubmissionUpdates)

        const updateResult = await store.updateDraftSubmission(draft)
        if (isStoreError(updateResult)) {
            const errMessage = `Issue updating a draft submission of type ${updateResult.code}. Message: ${updateResult.message}`
            logError('updateDraftSubmission', errMessage)
            throw new Error(errMessage)
        }
        const updatedDraft: DraftSubmissionType = updateResult

        logSuccess('updateDraftSubmission')
        return {
            draftSubmission: updatedDraft,
        }
    }
}

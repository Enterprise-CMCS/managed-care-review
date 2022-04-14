import { UnlockedHealthPlanFormDataType } from '../../common-code/domain-models'
import { DraftSubmissionUpdates } from '../../gen/gqlClient'

export function applyUpdates(
    draft: UnlockedHealthPlanFormDataType,
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

import {
    formatActuaryContactsForForm,
    formatAddtlActuaryContactsForForm,
    formatDocumentsForForm,
    formatDocumentsForGQL,
    formatForForm,
    formatFormDateForGQL,
} from '../../../../formHelpers/formatters'
import {
    Rate,
    RateFormData,
    UpdateContractRateInput,
} from '../../../../gen/gqlClient'
import { S3ClientT } from '../../../../s3'
import { type FormikRateForm } from './RateDetailsV2'

// generateUpdatedRates takes the Formik RateForm list used for multi-rates and prepares for contract with rates update mutation
// ensure we link, create, and update the proper rates
const generateUpdatedRates = (
    newRateForms: FormikRateForm[]
): UpdateContractRateInput[] => {
    const updatedRates: UpdateContractRateInput[] = newRateForms.map((form) => {
        const { id, ...rateFormData } = form
        const isLinkedRate = form.ratePreviouslySubmitted === 'YES'
        return {
            formData: isLinkedRate
                ? undefined
                : convertRateFormToGQLRateFormData(rateFormData),
            rateID: id,
            type: isLinkedRate ? 'LINK' : !id ? 'CREATE' : 'UPDATE',
        }
    })

    return updatedRates
}

// convert from FormikRateForm to GQL RateFormData used in API
const convertRateFormToGQLRateFormData = (
    rateForm: FormikRateForm
): RateFormData => {
    return {
        // intentionally do not map backend calculated fields on submit such status and rateCertificationName
        rateType: rateForm.rateType,
        rateCapitationType: rateForm.rateCapitationType,
        rateDocuments: formatDocumentsForGQL(rateForm.rateDocuments),
        supportingDocuments: formatDocumentsForGQL(
            rateForm.supportingDocuments
        ),
        rateDateStart: formatFormDateForGQL(rateForm.rateDateStart),
        rateDateEnd: formatFormDateForGQL(rateForm.rateDateEnd),
        rateDateCertified: formatFormDateForGQL(rateForm.rateDateCertified),
        amendmentEffectiveDateStart: formatFormDateForGQL(
            rateForm.effectiveDateStart
        ),
        amendmentEffectiveDateEnd: formatFormDateForGQL(
            rateForm.effectiveDateEnd
        ),
        rateProgramIDs: rateForm.rateProgramIDs,
        certifyingActuaryContacts: rateForm.actuaryContacts,
        addtlActuaryContacts: rateForm.addtlActuaryContacts,
        actuaryCommunicationPreference: rateForm.actuaryCommunicationPreference ?? undefined,
        packagesWithSharedRateCerts: rateForm.packagesWithSharedRateCerts,
    }
}
// Convert from GQL Rate to FormikRateForm object used in the form
// if rate is not passed in, return an empty RateForm // we need to pass in the  s3 handler because 3 urls generated client-side
// useLatestSubmission means to pull the latest submitted info rather than the draft info
const convertGQLRateToRateForm = (getKey: S3ClientT['getKey'], rate?: Rate, parentContractID?: string): FormikRateForm => {
    const handleAsLinkedRate = rate && rate.parentContractID !== parentContractID // TODO: Make this a more sophisticated check for child-rates
    const rateRev = handleAsLinkedRate ? rate?.revisions[0] : rate?.draftRevision
    const rateForm = rateRev?.formData
    return {
        id: rate?.id,
        status: rate?.status,
        rateCertificationName: rateForm?.rateCertificationName ?? undefined,
        rateType: rateForm?.rateType,
        rateCapitationType: rateForm?.rateCapitationType,
        rateDateStart: formatForForm(rateForm?.rateDateStart),
        rateDateEnd: formatForForm(rateForm?.rateDateEnd),
        rateDateCertified: formatForForm(rateForm?.rateDateCertified),
        effectiveDateStart: formatForForm(
            rateForm?.amendmentEffectiveDateStart
        ),
        effectiveDateEnd: formatForForm(rateForm?.amendmentEffectiveDateEnd),
        rateProgramIDs: rateForm?.rateProgramIDs ?? [],
        rateDocuments: formatDocumentsForForm({
            documents: rateForm?.rateDocuments,
            getKey: getKey,
        }),
        supportingDocuments: formatDocumentsForForm({
            documents: rateForm?.supportingDocuments,
            getKey: getKey,
        }),
        actuaryContacts: formatActuaryContactsForForm(
            rateForm?.certifyingActuaryContacts
        ),
        addtlActuaryContacts: formatAddtlActuaryContactsForForm(
            rateForm?.certifyingActuaryContacts
        ),
        actuaryCommunicationPreference:
            rateForm?.actuaryCommunicationPreference?? undefined,
        packagesWithSharedRateCerts:
            rateForm?.packagesWithSharedRateCerts ?? [],
        ratePreviouslySubmitted: handleAsLinkedRate? 'YES' : rateForm ? 'NO' : undefined
    }
}

export {
    convertGQLRateToRateForm,
    convertRateFormToGQLRateFormData,
    generateUpdatedRates
}

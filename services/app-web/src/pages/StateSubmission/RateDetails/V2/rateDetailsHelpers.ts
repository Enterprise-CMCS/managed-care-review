import {
    formatActuaryContactsForForm,
    formatDocumentsForForm,
    formatDocumentsForGQL,
    formatForForm,
    formatFormDateForGQL,
} from '../../../../formHelpers/formatters'
import {
    HealthPlanPackageStatus,
    Rate,
    RateFormData,
    UpdateContractRateInput,
} from '../../../../gen/gqlClient'
import { S3ClientT } from '../../../../s3'
import { type FormikRateForm } from './RateDetailsV2'

// Right now we figure out if this is a linked rate by referencing the status. We know a rate is linked when its locked.
const isLinkedRate = (status?: HealthPlanPackageStatus): boolean =>  status && (status === 'SUBMITTED' || status === 'RESUBMITTED')? true: false

// generateUpdatedRates takes the Formik RateForm list used for multi-rates and prepares for contract with rates update mutation
// ensure we link, create, and update the proper rates
const generateUpdatedRates = (
    newRateForms: FormikRateForm[]
): UpdateContractRateInput[] => {
    const updatedRates: UpdateContractRateInput[] = newRateForms.map((form) => {
        const { id, status, ...rateFormData } = form
        return {
            formData: isLinkedRate(status)
                ? undefined
                : convertRateFormToGQLRateFormData(rateFormData),
            rateID: id,
            type: isLinkedRate(status) ? 'LINK' : !id ? 'CREATE' : 'UPDATE',
        }
    })

    return updatedRates
}

// convert from FormikRateForm to GQL RateFormData used in API
const convertRateFormToGQLRateFormData = (
    rateForm: FormikRateForm
): RateFormData => {
    return {
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
        actuaryCommunicationPreference: rateForm.actuaryCommunicationPreference,
        packagesWithSharedRateCerts: rateForm.packagesWithSharedRateCerts,
    }
}
// Convert from GQL Rate to FormikRateForm object used in the form
// if rate is not passed in, return an empty RateForm // we need to pass in the  s3 handler because 3 urls generated client-side
const convertGQLRateToRateForm = (getKey: S3ClientT['getKey'], rate?: Rate): FormikRateForm => {
    const rateRev = rate?.draftRevision ?? undefined
    const rateForm = rateRev?.formData
    const handleAsLinkedRate = rate?.id && isLinkedRate(rate.status)
    return {
        id: rate?.id,
        status: rate?.status,
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
        addtlActuaryContacts: formatActuaryContactsForForm(
            rateForm?.certifyingActuaryContacts
        ),
        actuaryCommunicationPreference:
            rateForm?.actuaryCommunicationPreference,
        packagesWithSharedRateCerts:
            rateForm?.packagesWithSharedRateCerts ?? [],
        linkedRates: handleAsLinkedRate? [{
            rateId: rate.id,
            rateName: rateForm?.rateCertificationName ?? 'Unknown Rate'
        }]:[],
        ratePreviouslySubmitted: handleAsLinkedRate? 'YES' : 'NO'
    }
}

export {
    convertGQLRateToRateForm,
    convertRateFormToGQLRateFormData,
    generateUpdatedRates,
}

import {
    formatActuaryContactsForForm,
    formatAddtlActuaryContactsForForm,
    formatDocumentsForForm,
    formatDocumentsForGQL,
    formatForForm,
    formatFormDateForGQL,
} from '../../../formHelpers/formatters'
import {
    ActuaryContact,
    HealthPlanPackageStatus,
    Rate,
    RateFormData, RateFormDataInput,
    RateRevision,
    UpdateContractRateInput,
} from '../../../gen/gqlClient'
import { S3ClientT } from '../../../s3'
import { type FormikRateForm } from './V2/RateDetailsV2'

// generateUpdatedRates takes the Formik RateForm list used for multi-rates and prepares for contract with rates update mutation
// ensure we link, create, and update the proper rates
const generateUpdatedRates = (
    newRateForms: FormikRateForm[],
    dsnpPopulated?: Boolean | null
): UpdateContractRateInput[] => {
    const updatedRates: UpdateContractRateInput[] = newRateForms.map((form) => {
        const { id, ...rateFormData } = form
        const isLinkedRate = form.ratePreviouslySubmitted === 'YES'
        return {
            formData: isLinkedRate
                ? undefined
                : convertRateFormToGQLRateFormData(rateFormData, dsnpPopulated),
            rateID: id,
            type: isLinkedRate ? 'LINK' : !id ? 'CREATE' : 'UPDATE',
        }
    })

    return updatedRates
}

// convert from FormikRateForm to GQL RateFormData used in API
const convertRateFormToGQLRateFormData = (
    rateForm: FormikRateForm,
    dsnpPopulated?: Boolean | null
): RateFormDataInput => {
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
        rateMedicaidPopulations: dsnpPopulated ? rateForm.rateMedicaidPopulations : [],
        deprecatedRateProgramIDs: [],
        certifyingActuaryContacts: rateForm.actuaryContacts,
        addtlActuaryContacts: rateForm.addtlActuaryContacts,
        actuaryCommunicationPreference: rateForm.actuaryCommunicationPreference ?? undefined,
    }
}

const isRatePartiallyFilled = (rate: RateFormData): boolean => {
    const hasActuaryContacts = (actuaries: ActuaryContact[]): boolean => actuaries.some(actuary => (
            actuary.id || actuary.name || actuary.titleRole || actuary.actuarialFirm || actuary.email
        ))

    return Boolean(rate.rateDocuments.length ||
        rate.supportingDocuments.length ||
        rate.rateProgramIDs.length ||
        rate.rateMedicaidPopulations ||
        rate.rateType ||
        rate.rateCapitationType ||
        hasActuaryContacts(rate.certifyingActuaryContacts) ||
        hasActuaryContacts(rate.addtlActuaryContacts) ||
        rate.actuaryCommunicationPreference)
}

type RateRevisionWithoutContracts = Omit<RateRevision, "contractRevisions">

// This is a narrower type than just using Rate that allows for the fact that we are calling indexRates without including contractRevisions
interface RateWithoutContractData {
    parentContractID: string
    draftRevision?: RateRevisionWithoutContracts | null,
    revisions: RateRevisionWithoutContracts[],
    id: string,
    initiallySubmittedAt?: Date,
    status: HealthPlanPackageStatus,
}

// Convert from GQL Rate to FormikRateForm object used in the form
// if rate is not passed in, return an empty RateForm // we need to pass in the  s3 handler because 3 urls generated client-side
// useLatestSubmission means to pull the latest submitted info rather than the draft info
const convertIndexRatesGQLRateToRateForm = (getKey: S3ClientT['getKey'], rate?: RateWithoutContractData, parentContractID?: string): FormikRateForm => {
    const handleAsLinkedRate = rate && rate.parentContractID !== parentContractID // TODO: Make this a more sophisticated check for child-rates
    const rateRev = handleAsLinkedRate ? rate?.revisions[0] : rate?.draftRevision
    const rateForm = rateRev?.formData

    // isFilledIn is used for determining if the rateForm should be saved in the case of the yes/no question for was
    // this rate included in another submission fillable Fields includes only fields that aren't auto populated on
    // initial yes/no selection, like id and rateName
    const isFilledIn = rateForm && isRatePartiallyFilled(rateForm)

    return {
        id: rate?.id,
        status: rate?.status,
        rateCertificationName: rateForm?.rateCertificationName ?? undefined,
        rateType: rateForm?.rateType ?? undefined,
        rateCapitationType: rateForm?.rateCapitationType ?? undefined,
        rateDateStart: formatForForm(rateForm?.rateDateStart),
        rateDateEnd: formatForForm(rateForm?.rateDateEnd),
        rateDateCertified: formatForForm(rateForm?.rateDateCertified),
        effectiveDateStart: formatForForm(
            rateForm?.amendmentEffectiveDateStart
        ),
        effectiveDateEnd: formatForForm(rateForm?.amendmentEffectiveDateEnd),
        rateProgramIDs: rateForm?.rateProgramIDs ?? [],
        rateMedicaidPopulations: rateForm?.rateMedicaidPopulations ?? [],
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
            rateForm?.addtlActuaryContacts
        ),
        actuaryCommunicationPreference:
            rateForm?.actuaryCommunicationPreference ?? undefined,
        packagesWithSharedRateCerts:
            rateForm?.packagesWithSharedRateCerts ?? [],
        ratePreviouslySubmitted: handleAsLinkedRate? 'YES' : isFilledIn ? 'NO' : undefined,
        initiallySubmittedAt: rate?.initiallySubmittedAt,
        linkRateSelect: handleAsLinkedRate && rate?.id ? 'true' : undefined
    }
}

// Convert from GQL Rate to FormikRateForm object used in the form
// if rate is not passed in, return an empty RateForm // we need to pass in the  s3 handler because 3 urls generated client-side
// useLatestSubmission means to pull the latest submitted info rather than the draft info
const convertGQLRateToRateForm = (getKey: S3ClientT['getKey'], rate?: Rate, parentContractID?: string): FormikRateForm => {
    const handleAsLinkedRate = rate && rate.parentContractID !== parentContractID // TODO: Make this a more sophisticated check for child-rates
    const rateRev = handleAsLinkedRate ? rate?.revisions[0] : rate?.draftRevision
    const rateForm = rateRev?.formData
    // isFilledIn is used for determining if the rateForm should be saved in the case of the yes/no question for was
    // this rate included in another submission fillable Fields includes only fields that aren't auto populated on
    // initial yes/no selection, like id and rateName
    const isFilledIn = rateForm && isRatePartiallyFilled(rateForm)

    return {
        id: rate?.id,
        status: rate?.status,
        rateCertificationName: rateForm?.rateCertificationName ?? undefined,
        rateType: rateForm?.rateType ?? undefined,
        rateCapitationType: rateForm?.rateCapitationType ?? undefined,
        rateDateStart: formatForForm(rateForm?.rateDateStart),
        rateDateEnd: formatForForm(rateForm?.rateDateEnd),
        rateDateCertified: formatForForm(rateForm?.rateDateCertified),
        effectiveDateStart: formatForForm(
            rateForm?.amendmentEffectiveDateStart
        ),
        effectiveDateEnd: formatForForm(rateForm?.amendmentEffectiveDateEnd),
        rateProgramIDs: rateForm?.rateProgramIDs ?? [],
        rateMedicaidPopulations: rateForm?.rateMedicaidPopulations,
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
            rateForm?.addtlActuaryContacts
        ),
        actuaryCommunicationPreference:
            rateForm?.actuaryCommunicationPreference ?? undefined,
        packagesWithSharedRateCerts:
            rateForm?.packagesWithSharedRateCerts ?? [],
        ratePreviouslySubmitted: handleAsLinkedRate? 'YES' : isFilledIn ? 'NO' : undefined,
        initiallySubmittedAt: rate?.initiallySubmittedAt,
        linkRateSelect: handleAsLinkedRate && rate?.id ? 'true' : undefined
    }
}

export {
    convertGQLRateToRateForm,
    convertIndexRatesGQLRateToRateForm,
    convertRateFormToGQLRateFormData,
    generateUpdatedRates,
    isRatePartiallyFilled
}

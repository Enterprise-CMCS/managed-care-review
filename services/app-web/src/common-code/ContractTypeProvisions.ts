import {
    ModifiedProvisionsAmendmentRecord,
    ModifiedProvisionsBaseContractRecord,
    ModifiedProvisionsCHIPRecord,
} from '../constants/modifiedProvisions'
import { Contract, UnlockedContract } from '../gen/gqlClient'
import {
    CHIPProvisionType,
    MedicaidBaseProvisionType,
    MedicaidAmendmentProvisionType,
    provisionCHIPKeys,
    modifiedProvisionMedicaidBaseKeys,
    modifiedProvisionMedicaidAmendmentKeys,
    GeneralizedProvisionType,
    isCHIPProvision,
    isMedicaidAmendmentProvision,
    isMedicaidBaseProvision,
} from './healthPlanFormDataType/ModifiedProvisions'
import {
    isBaseContract,
    isCHIPOnly,
    isContractAmendment,
    isContractWithProvisions,
} from './ContractType'
import { getLastContractSubmission } from '../gqlHelpers/contractsAndRates'

/*
    Each provision key represents a Yes/No question asked on Contract Details. 
    This is a set of helper functions that each take in a submission and return provisions related data.

    There are currently three distrinct variants of the provisions: 
    1. For CHIP amendment
    2. For non CHIP base contract
    3. For non CHIP contract amendment

    See also ModifiedProvisions.ts
*/

// Returns the list of provision keys that apply for given submission variant
const generateApplicableProvisionsList = (
    draftSubmission: Contract | UnlockedContract
):
    | CHIPProvisionType[]
    | MedicaidBaseProvisionType[]
    | MedicaidAmendmentProvisionType[] => {
    if (isCHIPOnly(draftSubmission)) {
        return isContractAmendment(draftSubmission)
            ? (provisionCHIPKeys as unknown as CHIPProvisionType[])
            : [] // there are no applicable provisions for CHIP base contract
    } else if (isBaseContract(draftSubmission)) {
        return modifiedProvisionMedicaidBaseKeys as unknown as MedicaidBaseProvisionType[]
    } else {
        return modifiedProvisionMedicaidAmendmentKeys as unknown as MedicaidAmendmentProvisionType[]
    }
}

// Returns user-friendly label text for the provision based on the given submission variant
const generateProvisionLabel = (
    draftSubmission: Contract | UnlockedContract,
    provision: GeneralizedProvisionType
): string => {
    if (isCHIPOnly(draftSubmission) && isCHIPProvision(provision)) {
        return ModifiedProvisionsCHIPRecord[provision]
    } else if (
        isBaseContract(draftSubmission) &&
        isMedicaidBaseProvision(provision)
    ) {
        return ModifiedProvisionsBaseContractRecord[provision]
    } else if (
        isContractAmendment(draftSubmission) &&
        isMedicaidAmendmentProvision(provision)
    ) {
        return ModifiedProvisionsAmendmentRecord[provision]
    } else {
        console.warn('Coding Error: This is a fallback case and is unexpected.')
        return 'Invalid Provision'
    }
}

/* 
    Returns two lists of provisions keys sorted by whether they are set true/false
    This function also quietly discard keys from the submission's own provisions list that are not valid for the current variant. 
    That functionality needed for unlocked contracts which can be edited in a non-linear fashion)
*/
const sortModifiedProvisions = (
    contract: Contract | UnlockedContract
): [GeneralizedProvisionType[], GeneralizedProvisionType[]] => {
    const contractFormData = contract.draftRevision?.formData || getLastContractSubmission(contract)?.contractRevision.formData
    const initialProvisions = {
        inLieuServicesAndSettings: contractFormData?.inLieuServicesAndSettings,
        modifiedBenefitsProvided: contractFormData?.modifiedBenefitsProvided,
        modifiedGeoAreaServed: contractFormData?.modifiedGeoAreaServed,
        modifiedMedicaidBeneficiaries: contractFormData?.modifiedMedicaidBeneficiaries,
        modifiedRiskSharingStrategy: contractFormData?.modifiedRiskSharingStrategy,
        modifiedIncentiveArrangements: contractFormData?.modifiedIncentiveArrangements,
        modifiedWitholdAgreements: contractFormData?.modifiedWitholdAgreements,
        modifiedStateDirectedPayments: contractFormData?.modifiedStateDirectedPayments,
        modifiedPassThroughPayments: contractFormData?.modifiedPassThroughPayments,
        modifiedPaymentsForMentalDiseaseInstitutions: contractFormData?.modifiedPaymentsForMentalDiseaseInstitutions,
        modifiedMedicalLossRatioStandards: contractFormData?.modifiedMedicalLossRatioStandards,
        modifiedOtherFinancialPaymentIncentive: contractFormData?.modifiedOtherFinancialPaymentIncentive,
        modifiedEnrollmentProcess: contractFormData?.modifiedEnrollmentProcess,
        modifiedGrevienceAndAppeal: contractFormData?.modifiedGrevienceAndAppeal,
        modifiedNetworkAdequacyStandards: contractFormData?.modifiedNetworkAdequacyStandards,
        modifiedLengthOfContract: contractFormData?.modifiedLengthOfContract,
        modifiedNonRiskPaymentArrangements: contractFormData?.modifiedNonRiskPaymentArrangements,
        statutoryRegulatoryAttestation: contractFormData?.statutoryRegulatoryAttestation,
        statutoryRegulatoryAttestationDescription: contractFormData?.statutoryRegulatoryAttestationDescription
    }
    const hasInitialProvisions = Object.values(initialProvisions).some((val) => val !== undefined)
    const modifiedProvisions: GeneralizedProvisionType[] = []
    const unmodifiedProvisions: GeneralizedProvisionType[] = []

    if (hasInitialProvisions && isContractWithProvisions(contract)) {
        const applicableProvisions =
            generateApplicableProvisionsList(contract)

        for (const provisionKey of applicableProvisions) {
            const value = initialProvisions[provisionKey]
            if (value === true) {
                modifiedProvisions.push(provisionKey)
            } else if (value === false) {
                unmodifiedProvisions.push(provisionKey)
            }
        }
    }

    return [modifiedProvisions, unmodifiedProvisions]
}

/*
    Returns boolean for whether a submission variant is missing required provisions
    This is used to determine if we display the missing data warning on review and submit  
*/
const isMissingProvisions = (contract: Contract | UnlockedContract): boolean => {
    const requiredProvisions = generateApplicableProvisionsList(contract)
    const [modifiedProvisions, unmodifiedProvisions] =
        sortModifiedProvisions(contract)

    return (
        modifiedProvisions.length + unmodifiedProvisions.length <
        requiredProvisions.length
    )
}

/*
    Returns lang string dictionary for variant
*/
const getProvisionDictionary = (
    contract: Contract | UnlockedContract
):
    | typeof ModifiedProvisionsCHIPRecord
    | typeof ModifiedProvisionsBaseContractRecord
    | typeof ModifiedProvisionsAmendmentRecord => {
    if (isCHIPOnly(contract)) {
        return ModifiedProvisionsCHIPRecord
    } else if (isBaseContract(contract)) {
        return ModifiedProvisionsBaseContractRecord
    } else {
        return ModifiedProvisionsAmendmentRecord
    }
}
export {
    getProvisionDictionary,
    sortModifiedProvisions,
    generateApplicableProvisionsList,
    generateProvisionLabel,
    isMissingProvisions,
}

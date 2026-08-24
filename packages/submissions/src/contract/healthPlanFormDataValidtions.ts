import {
    Contract,
    ContractFormData,
    ContractRevision,
    UnlockedContract,
} from '../gen/gqlClient'
import { getLastContractSubmission } from './contractHelpers'
import {
    CHIPProvisionType,
    GeneralizedProvisionType,
    MedicaidAmendmentProvisionType,
    MedicaidBaseProvisionType,
    modifiedProvisionMedicaidAmendmentKeys,
    provisionCHIPKeys,
    modifiedProvisionMedicaidBaseKeys,
} from './ModifiedProvisions'

import {
    ModifiedProvisionsCHIPRecord,
    ModifiedProvisionsAmendmentRecord,
    ModifiedProvisionsBaseContractRecord,
} from './healthPlanFormDataConstants'

const getContractRev = (
    contract: Contract | UnlockedContract
): ContractRevision | undefined => {
    if (contract.draftRevision) {
        return contract.draftRevision
    } else {
        return getLastContractSubmission(contract)?.contractRevision
    }
}
const isContractOnly = (contract: Contract | UnlockedContract): boolean => {
    const contractRev = getContractRev(contract)
    return contractRev?.formData?.submissionType === 'CONTRACT_ONLY'
}

const isBaseContract = (contract: Contract | UnlockedContract): boolean => {
    const contractRev = getContractRev(contract)
    return contractRev?.formData?.contractType === 'BASE'
}

const isContractAmendment = (
    contract: Contract | UnlockedContract
): boolean => {
    const contractRev = getContractRev(contract)
    return contractRev?.formData?.contractType === 'AMENDMENT'
}

const isCHIPOnly = (contract: Contract | UnlockedContract): boolean => {
    const contractRev = getContractRev(contract)
    return contractRev?.formData?.populationCovered === 'CHIP'
}

const isContractAndRates = (contract: Contract | UnlockedContract): boolean => {
    const contractRev = getContractRev(contract)
    return contractRev?.formData?.submissionType === 'CONTRACT_AND_RATES'
}

const isContractWithProvisions = (
    contract: Contract | UnlockedContract
): boolean =>
    isContractAmendment(contract) ||
    (isBaseContract(contract) && !isCHIPOnly(contract))

const isSubmitted = (contract: Contract | UnlockedContract): boolean =>
    contract.status === 'SUBMITTED'

const isCHIPProvision = (
    provision: CHIPProvisionType | GeneralizedProvisionType
): provision is CHIPProvisionType => {
    return provisionCHIPKeys.includes(provision as CHIPProvisionType)
}

const isMedicaidBaseProvision = (
    provision: MedicaidBaseProvisionType | GeneralizedProvisionType
): provision is MedicaidBaseProvisionType => {
    return modifiedProvisionMedicaidBaseKeys.includes(
        provision as MedicaidBaseProvisionType
    )
}

const isMedicaidAmendmentProvision = (
    provision: MedicaidAmendmentProvisionType | GeneralizedProvisionType
): provision is MedicaidAmendmentProvisionType => {
    return modifiedProvisionMedicaidAmendmentKeys.includes(
        provision as MedicaidAmendmentProvisionType
    )
}

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
    formData: ContractFormData
):
    | CHIPProvisionType[]
    | MedicaidBaseProvisionType[]
    | MedicaidAmendmentProvisionType[] => {
    const chipOnly = formData.populationCovered === 'CHIP'
    const contractAmendment = formData.contractType === 'AMENDMENT'
    const baseContract = formData.contractType === 'BASE'

    if (chipOnly) {
        return contractAmendment
            ? (provisionCHIPKeys as unknown as CHIPProvisionType[])
            : [] // there are no applicable provisions for CHIP base contract
    } else if (baseContract) {
        return modifiedProvisionMedicaidBaseKeys as unknown as MedicaidBaseProvisionType[]
    } else {
        return modifiedProvisionMedicaidAmendmentKeys as unknown as MedicaidAmendmentProvisionType[]
    }
}

// Returns user-friendly label text for the provision based on the given submission variant
const generateProvisionLabel = (
    formData: ContractFormData,
    provision: GeneralizedProvisionType
): string => {
    const isChipOnly = formData.populationCovered === 'CHIP'
    const isBaseContract = formData.contractType === 'BASE'
    const isContractAmendment = formData.contractType === 'AMENDMENT'

    if (isChipOnly && isCHIPProvision(provision)) {
        return ModifiedProvisionsCHIPRecord[provision]
    } else if (isBaseContract && isMedicaidBaseProvision(provision)) {
        return ModifiedProvisionsBaseContractRecord[provision]
    } else if (isContractAmendment && isMedicaidAmendmentProvision(provision)) {
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
    formData: ContractFormData
): [GeneralizedProvisionType[], GeneralizedProvisionType[]] => {
    const initialProvisions = {
        inLieuServicesAndSettings: formData.inLieuServicesAndSettings,
        modifiedBenefitsProvided: formData.modifiedBenefitsProvided,
        modifiedGeoAreaServed: formData.modifiedGeoAreaServed,
        modifiedMedicaidBeneficiaries:
            formData.modifiedMedicaidBeneficiaries,
        modifiedRiskSharingStrategy:
            formData.modifiedRiskSharingStrategy,
        modifiedIncentiveArrangements:
            formData.modifiedIncentiveArrangements,
        modifiedWitholdAgreements: formData.modifiedWitholdAgreements,
        modifiedStateDirectedPayments:
            formData.modifiedStateDirectedPayments,
        modifiedPassThroughPayments:
            formData.modifiedPassThroughPayments,
        modifiedPaymentsForMentalDiseaseInstitutions:
            formData.modifiedPaymentsForMentalDiseaseInstitutions,
        modifiedMedicalLossRatioStandards:
            formData.modifiedMedicalLossRatioStandards,
        modifiedOtherFinancialPaymentIncentive:
            formData.modifiedOtherFinancialPaymentIncentive,
        modifiedEnrollmentProcess: formData.modifiedEnrollmentProcess,
        modifiedGrevienceAndAppeal:
            formData.modifiedGrevienceAndAppeal,
        modifiedNetworkAdequacyStandards:
            formData.modifiedNetworkAdequacyStandards,
        modifiedLengthOfContract: formData.modifiedLengthOfContract,
        modifiedNonRiskPaymentArrangements:
            formData.modifiedNonRiskPaymentArrangements,
        statutoryRegulatoryAttestation:
            formData.statutoryRegulatoryAttestation,
        statutoryRegulatoryAttestationDescription:
            formData.statutoryRegulatoryAttestationDescription,
    }
    const hasInitialProvisions = Object.values(initialProvisions).some(
        (val) => val !== undefined
    )
    const modifiedProvisions: GeneralizedProvisionType[] = []
    const unmodifiedProvisions: GeneralizedProvisionType[] = []

    const isContractWithProvisions =
        formData.contractType === 'AMENDMENT' ||
        (formData.contractType === 'BASE' &&
            formData.populationCovered !== 'CHIP')

    if (hasInitialProvisions && isContractWithProvisions) {
        const applicableProvisions = generateApplicableProvisionsList(formData)

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
const isMissingProvisions = (
    formData: ContractFormData
): boolean => {
    const requiredProvisions = generateApplicableProvisionsList(formData)
    const [modifiedProvisions, unmodifiedProvisions] =
        sortModifiedProvisions(formData)

    return (
        modifiedProvisions.length + unmodifiedProvisions.length <
        requiredProvisions.length
    )
}

/**
 * Returns a review determination for a HEALTH_PLAN submission based on form data.
 *
 * @param formData - formData of the HEALTH_PLAN submission
 * @returns {true} - HEALTH_PLAN submission is subject to review
 * @returns {false} - HEALTH_PLAN submission is not subject to review (CHIP-only)
 */
const healthPlanReviewDetermination = (formData: ContractFormData): boolean => {
    const isChipOnly = formData.populationCovered === 'CHIP'
    return !isChipOnly
}

/*
    Returns lang string dictionary for variant
*/
const getProvisionDictionary = (
    formData: ContractFormData
):
    | typeof ModifiedProvisionsCHIPRecord
    | typeof ModifiedProvisionsBaseContractRecord
    | typeof ModifiedProvisionsAmendmentRecord => {
    if (formData.populationCovered === 'CHIP') {
        return ModifiedProvisionsCHIPRecord
    } else if (formData.contractType === 'BASE') {
        return ModifiedProvisionsBaseContractRecord
    } else {
        return ModifiedProvisionsAmendmentRecord
    }
}

export {
    isContractWithProvisions,
    isBaseContract,
    isContractAmendment,
    isCHIPOnly,
    isContractOnly,
    isContractAndRates,
    isSubmitted,
    isCHIPProvision,
    isMedicaidBaseProvision,
    isMedicaidAmendmentProvision,
    getProvisionDictionary,
    sortModifiedProvisions,
    generateApplicableProvisionsList,
    generateProvisionLabel,
    isMissingProvisions,
    healthPlanReviewDetermination,
}

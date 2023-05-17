import { ModifiedProvisionsAmendmentRecord, ModifiedProvisionsBaseContractRecord, ModifiedProvisionsCHIPRecord } from "../../constants"
import { HealthPlanFormDataType } from "./HealthPlanFormDataType"
import { isBaseContract, isCHIPOnly, isContractAmendment, isContractWithProvisions } from "./healthPlanFormData"

/*
    Each provision key represents a Yes/No question asked on Contract Details.

    There are currently three distrinct variants of the provisions questions: 
    1. For CHIP amendment
    2. For non CHIP base contract
    3. For non CHIP contract amendment
    

    These distinct provisions lists also have their own text string records, since citations and copy may change.
    
    This file includes a generalized type to reference all possible provisions keys.
    There are also a series of constants, types, and functions for narrowing into specific variants.
    
    Order matters in this file for keys arrays - we iterate through the list to generate yes/no provision radio buttons in order.
    Stakeholders want questions in specific order.
*/

const  generalizedProvisionKeys = [
    // 'inLieuServicesAndSettings',
    'modifiedBenefitsProvided',
    'modifiedGeoAreaServed',
    'modifiedMedicaidBeneficiaries',
    'modifiedEnrollmentProcess',
    'modifiedRiskSharingStrategy',
    'modifiedIncentiveArrangements',
    'modifiedWitholdAgreements',
    'modifiedStateDirectedPayments',
    'modifiedPassThroughPayments',
    'modifiedPaymentsForMentalDiseaseInstitutions',
    'modifiedMedicalLossRatioStandards',
    'modifiedOtherFinancialPaymentIncentive',
    'modifiedGrevienceAndAppeal',
    'modifiedNetworkAdequacyStandards',
    'modifiedLengthOfContract',
    'modifiedNonRiskPaymentArrangements',
] as const

type GeneralizedProvisionType = (typeof  generalizedProvisionKeys)[number]
type GeneralizedModifiedProvisions = {
    [K in (typeof generalizedProvisionKeys)[number]]: boolean
} 

/*
    CHIP only logic
    Relevant for amendments that have population covered of CHIP.
*/
const excludedProvisionsForCHIP = [
    // 'inLieuServicesAndSettings',
    'modifiedRiskSharingStrategy',
    'modifiedIncentiveArrangements',
    'modifiedWitholdAgreements',
    'modifiedStateDirectedPayments',
    'modifiedPassThroughPayments',
    'modifiedPaymentsForMentalDiseaseInstitutions',
    'modifiedOtherFinancialPaymentIncentive',
] as const

type CHIPExcludedProvisionType = (typeof excludedProvisionsForCHIP)[number]
type CHIPValidProvisionType = Exclude<GeneralizedProvisionType, CHIPExcludedProvisionType>

type CHIPModifiedProvisions = Omit<
    GeneralizedModifiedProvisions,
    CHIPExcludedProvisionType
> // form data type that requires all of the keys

function isCHIPProvision(
    provision: CHIPValidProvisionType | GeneralizedProvisionType
): provision is CHIPValidProvisionType {
    return !excludedProvisionsForCHIP.includes(
        provision as CHIPExcludedProvisionType
    )
}
const allowedProvisionKeysForCHIP =  generalizedProvisionKeys.filter((p) =>
    isCHIPProvision(p)
) as CHIPValidProvisionType[] // type coercion to narrow return type, we already used a type guard earlier so feel can feel confident

/*
   Medicaid base contract logic
   Relevant for base contracts that have population covered of Medicaid or Medicaid and CHIP.
*/

const modifiedProvisionMedicaidBaseKeys = [
    // 'inLieuServicesAndSettings',
    'modifiedRiskSharingStrategy',
    'modifiedIncentiveArrangements',
    'modifiedWitholdAgreements',
    'modifiedStateDirectedPayments',
    'modifiedPassThroughPayments',
    'modifiedPaymentsForMentalDiseaseInstitutions',
    'modifiedNonRiskPaymentArrangements',
] as const

type MedicaidBaseProvisionType = (typeof modifiedProvisionMedicaidBaseKeys)[number]

type ModifiedProvisionsMedicaidBase = {
    [K in MedicaidBaseProvisionType]: boolean
}

function isMedicaidBaseProvision(
    provision: MedicaidBaseProvisionType | GeneralizedProvisionType
): provision is MedicaidBaseProvisionType {
    return generalizedProvisionKeys.includes(
        provision as MedicaidBaseProvisionType 
    )
}

/*
   Medicaid contract amendment logic.
   Relevant for amendments that have population covered of Medicaid or Medicaid and CHIP.
*/
const modifiedProvisionMedicaidAmendmentKeys = [
    'modifiedBenefitsProvided',
    'modifiedGeoAreaServed',
    'modifiedMedicaidBeneficiaries',
    'modifiedRiskSharingStrategy',
    'modifiedIncentiveArrangements',
    'modifiedWitholdAgreements',
    'modifiedStateDirectedPayments',
    'modifiedPassThroughPayments',
    'modifiedPaymentsForMentalDiseaseInstitutions',
    'modifiedMedicalLossRatioStandards',
    'modifiedOtherFinancialPaymentIncentive',
    'modifiedEnrollmentProcess',
    'modifiedGrevienceAndAppeal',
    'modifiedNetworkAdequacyStandards',
    'modifiedLengthOfContract',
    'modifiedNonRiskPaymentArrangements',
] as const

type ProvisionTypeMedicaidAmendment =
    (typeof modifiedProvisionMedicaidAmendmentKeys)[number]

type ModifiedProvisionsMedicaidAmendment = {
    [K in ProvisionTypeMedicaidAmendment]: boolean
}

function isMedicaidAmendmentProvision(
    provision: ProvisionTypeMedicaidAmendment | GeneralizedProvisionType
): provision is ProvisionTypeMedicaidAmendment {
    return generalizedProvisionKeys.includes(
        provision as ProvisionTypeMedicaidAmendment
    )
}


/*
    Helper functions

    These functions all take in a submission (which could be in any state) and return data relevant for specific varianst. 
*/

// Returns sublist of provisions that apply for given submission variant
const generateApplicableProvisionsList = (draftSubmission: HealthPlanFormDataType): CHIPValidProvisionType[]|  MedicaidBaseProvisionType[]|ProvisionTypeMedicaidAmendment[] => {
    if (isCHIPOnly(draftSubmission)) {
       return isContractAmendment(draftSubmission)? allowedProvisionKeysForCHIP: []
    } else if (isBaseContract(draftSubmission)){
       return  modifiedProvisionMedicaidBaseKeys  as unknown as MedicaidBaseProvisionType[]
    } else {
     return  modifiedProvisionMedicaidAmendmentKeys as  unknown as ProvisionTypeMedicaidAmendment[]
    }
}

// Returns specific label text for the provision based on the given submission variant
const generateProvisionLabel = (draftSubmission: HealthPlanFormDataType, provision: GeneralizedProvisionType): string => {
           if (isCHIPOnly(draftSubmission) && isCHIPProvision(provision)) {
               return ModifiedProvisionsCHIPRecord[
                   provision
               ]

           } else if (isBaseContract(draftSubmission) && isMedicaidBaseProvision(provision)) {
               return ModifiedProvisionsBaseContractRecord[
                   provision
               ]
           } else if (isContractAmendment(draftSubmission) && isMedicaidAmendmentProvision(provision)) {
               return ModifiedProvisionsAmendmentRecord[
                   provision
               ]
           } else { 
           console.warn('Coding Error: This is a fallback case and is unexpected.')
           return 'Invalid Provision' 
   }
       
}

// Returns two lists of provisions keys sorted by whether they are set true/false for display on contract details
// Discards keys from submission (initialProvisions) that are not valid for variant (applicableProvisions)
const sortModifiedProvisions = (
   submission: HealthPlanFormDataType
): [GeneralizedProvisionType[], GeneralizedProvisionType[]] => {
   const initialProvisions = submission.contractAmendmentInfo?.modifiedProvisions
   const modifiedProvisions: GeneralizedProvisionType[] = []
   const unmodifiedProvisions: GeneralizedProvisionType[] = []

   if (initialProvisions && isContractWithProvisions(submission)) {
       const applicableProvisions = generateApplicableProvisionsList(submission)
  
       for (const provisionKey of applicableProvisions) {
           const value = initialProvisions[provisionKey]
           if (value === true) {
               modifiedProvisions.push(provisionKey)
           } else if (value === false) {
               unmodifiedProvisions.push(provisionKey)
           } else {
               break;
           }
       }
   }

   return [modifiedProvisions, unmodifiedProvisions]
}

export type {
    ModifiedProvisionsMedicaidAmendment,
    ModifiedProvisionsMedicaidBase,
    CHIPModifiedProvisions,
    GeneralizedProvisionType,
    GeneralizedModifiedProvisions,
    ProvisionTypeMedicaidAmendment,
}

export {
    generalizedProvisionKeys,
    modifiedProvisionMedicaidBaseKeys,
    modifiedProvisionMedicaidAmendmentKeys,
    excludedProvisionsForCHIP,
    allowedProvisionKeysForCHIP,
    isCHIPProvision,
    isMedicaidAmendmentProvision,
    isMedicaidBaseProvision,
    generateProvisionLabel,
    generateApplicableProvisionsList,
    sortModifiedProvisions
}

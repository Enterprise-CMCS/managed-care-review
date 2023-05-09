// Order matters- we iterate through the list to generate questions and stakeholders want questions in specific order
const modifiedProvisionKeys = [
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

type ProvisionType = (typeof modifiedProvisionKeys)[number]

type ModifiedProvisions = {
    [K in (typeof modifiedProvisionKeys)[number]]: boolean
} // form data type that requires all of the keys

/*
    CHIP only logic
    CHIP provisions are a smaller subset of the provisions required for other contracts. They do not include the risk related provisions.
*/
const excludedProvisionsForCHIP = [
    'modifiedRiskSharingStrategy',
    'modifiedIncentiveArrangements',
    'modifiedWitholdAgreements',
    'modifiedStateDirectedPayments',
    'modifiedPassThroughPayments',
    'modifiedPaymentsForMentalDiseaseInstitutions',
    'modifiedOtherFinancialPaymentIncentive',
] as const

type CHIPExcludedProvisionType = (typeof excludedProvisionsForCHIP)[number]
type CHIPValidProvisionType = Exclude<ProvisionType, CHIPExcludedProvisionType>

type CHIPModifiedProvisions = Omit<
    ModifiedProvisions,
    CHIPExcludedProvisionType
> // form data type that requires all of the keys

function isCHIPProvision(
    provision: CHIPValidProvisionType | ProvisionType
): provision is CHIPValidProvisionType {
    return !excludedProvisionsForCHIP.includes(
        provision as CHIPExcludedProvisionType
    )
}
const allowedProvisionKeysForCHIP = modifiedProvisionKeys.filter((p) =>
    isCHIPProvision(p)
) as CHIPValidProvisionType[] // type coercion to narrow return type, we already used a type guard earlier so feel can feel confident

export type { ModifiedProvisions, CHIPModifiedProvisions, ProvisionType }

export {
    modifiedProvisionKeys,
    excludedProvisionsForCHIP,
    allowedProvisionKeysForCHIP,
    isCHIPProvision,
}

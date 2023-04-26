type ModifiedProvisions = {
    [K in (typeof modifiedProvisionKeys)[number]]: boolean
} // constructs a type that requires all of the below keys

const modifiedProvisionKeys = [
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

type ProvisionType = (typeof modifiedProvisionKeys)[number]

const excludedProvisionsForCHIP: ProvisionType[] = [
    'modifiedRiskSharingStrategy',
    'modifiedIncentiveArrangements',
    'modifiedWitholdAgreements',
    'modifiedStateDirectedPayments',
    'modifiedPassThroughPayments',
    'modifiedPaymentsForMentalDiseaseInstitutions',
    'modifiedOtherFinancialPaymentIncentive',
]

const allowedProvisionsForCHIP = modifiedProvisionKeys.filter(
    (p) => !excludedProvisionsForCHIP.includes(p)
)

export type { ModifiedProvisions, ProvisionType }

export {
    modifiedProvisionKeys,
    excludedProvisionsForCHIP,
    allowedProvisionsForCHIP,
}

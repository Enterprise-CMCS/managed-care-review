import {
    mockBaseContract,
    mockContractAndRatesDraft,
} from '../../testHelpers/apolloMocks'
import {
    GeneralizedModifiedProvisions,
    sortModifiedProvisions,
} from './ModifiedProvisions'

describe('sortModifiedProvisions', () => {
    it('sorts amended provisions correctly for medicaid amendment', () => {
        const amendedItems: GeneralizedModifiedProvisions = {
            inLieuServicesAndSettings: false,
            modifiedBenefitsProvided: true,
            modifiedGeoAreaServed: false,
            modifiedMedicaidBeneficiaries: true,
            modifiedRiskSharingStrategy: true,
            modifiedIncentiveArrangements: false,
            modifiedWitholdAgreements: false,
            modifiedStateDirectedPayments: false,
            modifiedPassThroughPayments: true,
            modifiedPaymentsForMentalDiseaseInstitutions: true,
            modifiedMedicalLossRatioStandards: true,
            modifiedOtherFinancialPaymentIncentive: false,
            modifiedEnrollmentProcess: true,
            modifiedGrevienceAndAppeal: true,
            modifiedNetworkAdequacyStandards: true,
            modifiedLengthOfContract: false,
            modifiedNonRiskPaymentArrangements: true,
        }

        const submission = mockContractAndRatesDraft({
            contractAmendmentInfo: { modifiedProvisions: amendedItems },
        })

        const [mod, unmod] = sortModifiedProvisions(submission)

        expect(mod).toEqual([
            'modifiedBenefitsProvided',
            'modifiedMedicaidBeneficiaries',
            'modifiedRiskSharingStrategy',
            'modifiedPassThroughPayments',
            'modifiedPaymentsForMentalDiseaseInstitutions',
            'modifiedMedicalLossRatioStandards',
            'modifiedEnrollmentProcess',
            'modifiedGrevienceAndAppeal',
            'modifiedNetworkAdequacyStandards',
            'modifiedNonRiskPaymentArrangements',
        ])
        expect(unmod).toEqual([
            'inLieuServicesAndSettings',
            'modifiedGeoAreaServed',
            'modifiedIncentiveArrangements',
            'modifiedWitholdAgreements',
            'modifiedStateDirectedPayments',
            'modifiedOtherFinancialPaymentIncentive',
            'modifiedLengthOfContract',
        ])
    })

    it('sorts amended provisions correctly for medicaid base contract', () => {
        const amendedItems: GeneralizedModifiedProvisions = {
            inLieuServicesAndSettings: true,
            modifiedBenefitsProvided: true,
            modifiedGeoAreaServed: false,
            modifiedMedicaidBeneficiaries: true,
            modifiedRiskSharingStrategy: true,
            modifiedIncentiveArrangements: false,
            modifiedWitholdAgreements: false,
            modifiedStateDirectedPayments: false,
            modifiedPassThroughPayments: true,
            modifiedPaymentsForMentalDiseaseInstitutions: true,
            modifiedMedicalLossRatioStandards: true,
            modifiedOtherFinancialPaymentIncentive: false,
            modifiedEnrollmentProcess: true,
            modifiedGrevienceAndAppeal: true,
            modifiedNetworkAdequacyStandards: true,
            modifiedLengthOfContract: false,
            modifiedNonRiskPaymentArrangements: true,
        }

        const submission = mockBaseContract({
            contractAmendmentInfo: { modifiedProvisions: amendedItems },
        })

        const [mod, unmod] = sortModifiedProvisions(submission)

        expect(mod).toEqual([
            'inLieuServicesAndSettings',
            'modifiedRiskSharingStrategy',
            'modifiedPassThroughPayments',
            'modifiedPaymentsForMentalDiseaseInstitutions',
            'modifiedNonRiskPaymentArrangements',
        ])
        expect(unmod).toEqual([
            'modifiedIncentiveArrangements',
            'modifiedWitholdAgreements',
            'modifiedStateDirectedPayments',
        ])
    })

    it('sorts amended provisions correctly and removes risk provisions from unmodified list for CHIP amendment', () => {
        const amendedItems: GeneralizedModifiedProvisions = {
            inLieuServicesAndSettings: false,
            modifiedBenefitsProvided: true,
            modifiedGeoAreaServed: false,
            modifiedMedicaidBeneficiaries: true,
            modifiedRiskSharingStrategy: false,
            modifiedIncentiveArrangements: false,
            modifiedWitholdAgreements: false,
            modifiedStateDirectedPayments: false,
            modifiedPassThroughPayments: false,
            modifiedPaymentsForMentalDiseaseInstitutions: false,
            modifiedMedicalLossRatioStandards: true,
            modifiedOtherFinancialPaymentIncentive: false,
            modifiedEnrollmentProcess: true,
            modifiedGrevienceAndAppeal: true,
            modifiedNetworkAdequacyStandards: true,
            modifiedLengthOfContract: false,
            modifiedNonRiskPaymentArrangements: true,
        }
        const submission = mockContractAndRatesDraft({
            populationCovered: 'CHIP',
            contractAmendmentInfo: { modifiedProvisions: amendedItems },
        })

        const [mod, unmod] = sortModifiedProvisions(submission)

        expect(mod).toEqual([
            'modifiedBenefitsProvided',
            'modifiedMedicaidBeneficiaries',
            'modifiedEnrollmentProcess',
            'modifiedMedicalLossRatioStandards',
            'modifiedGrevienceAndAppeal',
            'modifiedNetworkAdequacyStandards',
            'modifiedNonRiskPaymentArrangements',
        ])
        expect(unmod).toEqual([
            'modifiedGeoAreaServed',
            'modifiedLengthOfContract',
        ])
    })

    it('sorts amended provisions correctly even if provisions are missing', () => {
        const amendedItems: Partial<GeneralizedModifiedProvisions> = {
            inLieuServicesAndSettings: false,
            modifiedIncentiveArrangements: true,
        }

        const submission = mockContractAndRatesDraft({
            contractAmendmentInfo: { modifiedProvisions: amendedItems },
        })

        const [mod, unmod] = sortModifiedProvisions(submission)

        expect(mod).toEqual(['modifiedIncentiveArrangements'])
        expect(unmod).toEqual(['inLieuServicesAndSettings'])
    })
})

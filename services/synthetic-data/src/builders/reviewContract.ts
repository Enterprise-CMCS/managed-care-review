import type {
    ContractDraftRevisionFormDataInput,
    CreateContractInput,
} from '../gen/gqlClient'
import type { UploadedDocument } from '../client/uploadClient'

export const reviewSmokeScenarioKey = 'review-smoke-v1'

export function reviewSmokeMarker(seed: string): string {
    return `[SYNTHETIC:${reviewSmokeScenarioKey}:contract-only:${seed}]`
}

export function buildReviewCreateContractInput(
    seed: string,
    programId: string
): CreateContractInput {
    return {
        contractSubmissionType: 'HEALTH_PLAN',
        contractType: 'BASE',
        managedCareEntities: ['MCO'],
        populationCovered: 'MEDICAID',
        programIDs: [programId],
        riskBasedContract: false,
        submissionDescription: reviewSmokeMarker(seed),
        submissionType: 'CONTRACT_ONLY',
    }
}

export function buildReviewContractFormData(
    seed: string,
    programId: string,
    uploadedDocument: UploadedDocument
): ContractDraftRevisionFormDataInput {
    return {
        programIDs: [programId],
        populationCovered: 'MEDICAID',
        submissionType: 'CONTRACT_ONLY',
        riskBasedContract: false,
        submissionDescription: reviewSmokeMarker(seed),
        stateContacts: [
            {
                givenName: 'Synthetic',
                familyName: 'Contact',
                titleRole: 'Review environment test data',
                email: 'synthetic.state.contact@example.com',
            },
        ],
        supportingDocuments: [],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDocuments: [
            {
                name: uploadedDocument.name,
                s3URL: uploadedDocument.s3URL,
                sha256: uploadedDocument.sha256,
            },
        ],
        contractDateStart: '2026-01-01',
        contractDateEnd: '2026-12-31',
        managedCareEntities: ['MCO'],
        federalAuthorities: ['STATE_PLAN'],
        dsnpContract: false,
        inLieuServicesAndSettings: true,
        modifiedBenefitsProvided: true,
        modifiedGeoAreaServed: true,
        modifiedMedicaidBeneficiaries: true,
        modifiedRiskSharingStrategy: true,
        modifiedIncentiveArrangements: true,
        modifiedWitholdAgreements: true,
        modifiedStateDirectedPayments: true,
        modifiedPassThroughPayments: false,
        modifiedPaymentsForMentalDiseaseInstitutions: false,
        modifiedMedicalLossRatioStandards: false,
        modifiedOtherFinancialPaymentIncentive: false,
        modifiedEnrollmentProcess: false,
        modifiedGrevienceAndAppeal: false,
        modifiedNetworkAdequacyStandards: true,
        modifiedLengthOfContract: true,
        modifiedNonRiskPaymentArrangements: true,
        statutoryRegulatoryAttestation: false,
        statutoryRegulatoryAttestationDescription: 'Synthetic test data',
    }
}

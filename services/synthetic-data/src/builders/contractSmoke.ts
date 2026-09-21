import type {
    ContractDraftRevisionFormDataInput,
    CreateContractInput,
} from '../gen/gqlClient'
import type { UploadedDocument } from '../client/uploadClient'

export const contractSmokeScenarioKey = 'contract-submit-smoke-v1'

export function contractSmokeMarker(seed: string): string {
    return `[SYNTHETIC:${contractSmokeScenarioKey}:contract-only:${seed}]`
}

export function buildSyntheticContractCreateInput(
    marker: string,
    programId: string
): CreateContractInput {
    return {
        contractSubmissionType: 'HEALTH_PLAN',
        contractType: 'BASE',
        managedCareEntities: ['MCO'],
        populationCovered: 'MEDICAID',
        programIDs: [programId],
        riskBasedContract: false,
        submissionDescription: marker,
        submissionType: 'CONTRACT_ONLY',
    }
}

export function buildContractSmokeCreateContractInput(
    seed: string,
    programId: string
): CreateContractInput {
    return buildSyntheticContractCreateInput(
        contractSmokeMarker(seed),
        programId
    )
}

export function buildSyntheticContractFormData(
    marker: string,
    programId: string,
    contractDocument: UploadedDocument,
    supportingDocuments: ReadonlyArray<UploadedDocument> = []
): ContractDraftRevisionFormDataInput {
    const toDocumentInput = (document: UploadedDocument) => ({
        name: document.name,
        s3URL: document.s3URL,
        sha256: document.sha256,
    })

    return {
        programIDs: [programId],
        populationCovered: 'MEDICAID',
        submissionType: 'CONTRACT_ONLY',
        riskBasedContract: false,
        submissionDescription: marker,
        stateContacts: [
            {
                givenName: 'Synthetic',
                familyName: 'Contact',
                titleRole: 'Synthetic test data',
                email: 'synthetic.state.contact@example.com',
            },
        ],
        supportingDocuments: supportingDocuments.map(toDocumentInput),
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDocuments: [toDocumentInput(contractDocument)],
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

// Complete, intentionally fixed form data for the contract-submit smoke path.
// The seed identifies the run; it does not currently vary field values.
export function buildContractSmokeFormData(
    seed: string,
    programId: string,
    uploadedDocument: UploadedDocument
): ContractDraftRevisionFormDataInput {
    return buildSyntheticContractFormData(
        contractSmokeMarker(seed),
        programId,
        uploadedDocument
    )
}

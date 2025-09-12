import type { ContractDraftRevisionFormDataInput } from '../gen/gqlServer'
import { must } from './assertionHelpers'
import { findStatePrograms } from '../postgres'
import { defaultFloridaProgram } from './gqlHelpers'
// This mock is used for Graphql Input types
const mockGqlContractDraftRevisionFormDataInput = (
    stateCode?: string,
    formDataInput?: Partial<ContractDraftRevisionFormDataInput>
): ContractDraftRevisionFormDataInput => {
    const programs = stateCode
        ? [must(findStatePrograms(stateCode))[0]]
        : [defaultFloridaProgram()]
    const programIDs = programs.map((program) => program.id)

    return {
        programIDs: [programIDs[0]],
        populationCovered: 'MEDICAID',
        submissionType: 'CONTRACT_ONLY',
        riskBasedContract: true,
        submissionDescription: 'Updated submission',
        stateContacts: [
            {
                name: 'statecontact',
                titleRole: 'thestatestofcontacts',
                email: 'statemcstate@examepl.com',
            },
        ],
        contractDocuments: [
            {
                name: 'contractDocument1.pdf',
                s3URL: 's3://bucketname/key/contractDocument1.pdf',
                sha256: 'needs-to-be-there',
                dateAdded: new Date('01/02/2024'),
            },
        ],
        supportingDocuments: [
            {
                name: 'supportingDocument11.pdf',
                s3URL: 's3://bucketname/key/supportingDocument11.pdf',
                sha256: 'needs-to-be-there',
                dateAdded: new Date('01/02/2024'),
            },
        ],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDateStart: '2025-06-01',
        contractDateEnd: '2026-06-01',
        managedCareEntities: ['MCO'],
        federalAuthorities: ['BENCHMARK'],
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
        statutoryRegulatoryAttestation: true,
        statutoryRegulatoryAttestationDescription:
            'Hi, I should be gone after update.',
        ...formDataInput,
    }
}

export { mockGqlContractDraftRevisionFormDataInput }

import { validateContractDraftRevisionInput, parseContract } from './dataValidatorHelpers'
import {
    mockGqlContractDraftRevisionFormDataInput,
    must,
} from '../../testHelpers'
import type { ContractDraftRevisionFormDataInput } from '../../gen/gqlServer'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { NewPostgresStore } from '../../postgres'
import type { ContractType } from './contractTypes'
import { mockContractRevision } from '../../testHelpers'
describe('validateContractDraftRevisionInput', () => {
    it('Validates input form data and removes statutoryRegulatoryAttestationDescription', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const stateCode = 'FL'
        const formData = {
            ...mockGqlContractDraftRevisionFormDataInput(stateCode),
            contractDateStart: new Date(2025, 5, 1),
            contractDateEnd: new Date(2026, 4, 30),
            statutoryRegulatoryAttestation: true,
            statutoryRegulatoryAttestationDescription:
                'Hi, I should be gone after validation.',
            stateContacts: [
                {
                    name: 'Bill',
                    titleRole: 'A Title',
                    email: '', // Accepts empty string because users can save as draft with incomplete data.
                },
            ],
        }

        const expectedResult = {
            ...formData,
            statutoryRegulatoryAttestation: true,
            statutoryRegulatoryAttestationDescription: undefined,
        }

        const validatedFormData = must(
            validateContractDraftRevisionInput(
                formData,
                stateCode,
                postgresStore,
                {
                    '438-attestation': true,
                }
            )
        )

        expect(validatedFormData).toEqual(expectedResult)
    })
    it('converts fields that are null to undefined', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const stateCode = 'FL'
        const formData = {
            ...mockGqlContractDraftRevisionFormDataInput(stateCode),
            stateContacts: [
                {
                    name: 'Bill',
                    titleRole: 'A Title',
                    email: '', // Accepts empty string because users can save as draft with incomplete data.
                },
            ],
            submissionDescription: null,
            contractType: null,
            riskBasedContract: null,
            contractDateStart: null,
            contractDateEnd: null,
            contractExecutionStatus: null,
            inLieuServicesAndSettings: null,
            modifiedBenefitsProvided: null,
            modifiedGeoAreaServed: null,
            modifiedMedicaidBeneficiaries: null,
            modifiedRiskSharingStrategy: null,
            modifiedIncentiveArrangements: null,
            modifiedWitholdAgreements: null,
            modifiedStateDirectedPayments: null,
            modifiedPassThroughPayments: null,
            modifiedPaymentsForMentalDiseaseInstitutions: null,
            modifiedMedicalLossRatioStandards: null,
            modifiedOtherFinancialPaymentIncentive: null,
            modifiedEnrollmentProcess: null,
            modifiedGrevienceAndAppeal: null,
            modifiedNetworkAdequacyStandards: null,
            modifiedLengthOfContract: null,
            modifiedNonRiskPaymentArrangements: null,
            statutoryRegulatoryAttestation: null,
            statutoryRegulatoryAttestationDescription: null,
        }

        const expectedResult = {
            ...formData,
            submissionDescription: undefined,
            contractType: undefined,
            riskBasedContract: undefined,
            contractDateStart: undefined,
            contractDateEnd: undefined,
            contractExecutionStatus: undefined,
            inLieuServicesAndSettings: undefined,
            modifiedBenefitsProvided: undefined,
            modifiedGeoAreaServed: undefined,
            modifiedMedicaidBeneficiaries: undefined,
            modifiedRiskSharingStrategy: undefined,
            modifiedIncentiveArrangements: undefined,
            modifiedWitholdAgreements: undefined,
            modifiedStateDirectedPayments: undefined,
            modifiedPassThroughPayments: undefined,
            modifiedPaymentsForMentalDiseaseInstitutions: undefined,
            modifiedMedicalLossRatioStandards: undefined,
            modifiedOtherFinancialPaymentIncentive: undefined,
            modifiedEnrollmentProcess: undefined,
            modifiedGrevienceAndAppeal: undefined,
            modifiedNetworkAdequacyStandards: undefined,
            modifiedLengthOfContract: undefined,
            modifiedNonRiskPaymentArrangements: undefined,
            statutoryRegulatoryAttestation: undefined,
            statutoryRegulatoryAttestationDescription: undefined,
        }

        const validatedFormData = must(
            validateContractDraftRevisionInput(
                formData,
                stateCode,
                postgresStore,
                {
                    '438-attestation': true,
                }
            )
        )

        expect(validatedFormData).toEqual(expectedResult)
    })
    it('Returns error for invalid data', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const stateCode = 'FL'
        const formData: ContractDraftRevisionFormDataInput = {
            ...mockGqlContractDraftRevisionFormDataInput(stateCode),
            contractDateStart: new Date(2025, 5, 1),
            contractDateEnd: new Date(2026, 4, 30),
            statutoryRegulatoryAttestation: false,
            statutoryRegulatoryAttestationDescription: undefined,
            stateContacts: [
                {
                    name: 'Bill',
                    titleRole: 'A Title',
                    email: 'abc123@gmail',
                },
            ],
            programIDs: [
                'imNotAValidProgramID',
                '83d0e9d9-6592-439a-b46c-3235e8192fa0',
            ],
            submissionType: 'CONTRACT_AND_RATES',
            populationCovered: 'CHIP',
        }

        const validatedFormData = validateContractDraftRevisionInput(
            formData,
            stateCode,
            postgresStore,
            { '438-attestation': true }
        )

        if (!(validatedFormData instanceof Error)) {
            throw new Error(
                'Unexpected error: Was expecting validateContractDraftRevisionInput to return and error'
            )
        }

        expect(validatedFormData.message).toContain('Invalid email')
        expect(validatedFormData.message).toContain(
            `Program(s) in [${formData.programIDs}] are not valid ${stateCode} programs`
        )
        expect(validatedFormData.message).toContain(
            `populationCoveredSchema of CHIP cannot be submissionType of CONTRACT_AND_RATES`
        )
    })
})

// describe('parseContract', () => {
//     it('return error if invalid form data', async () => {
//         const formData = {
//             ...mockGqlContractDraftRevisionFormDataInput(stateCode),
//             stateContacts: [
//                 {
//                     name: 'Bill',
//                     titleRole: 'A Title',
//                     email: '', // Accepts empty string because users can save as draft with incomplete data.
//                 },
//             ],
//             submissionDescription: null,
//             contractType: null,
//             riskBasedContract: null,
//             contractDateStart: null,
//             contractDateEnd: null,
//             contractExecutionStatus: null,
//             inLieuServicesAndSettings: null,
//             modifiedBenefitsProvided: null,
//             modifiedGeoAreaServed: null,
//             modifiedMedicaidBeneficiaries: null,
//             modifiedRiskSharingStrategy: null,
//             modifiedIncentiveArrangements: null,
//             modifiedWitholdAgreements: null,
//             modifiedStateDirectedPayments: null,
//             modifiedPassThroughPayments: null,
//             modifiedPaymentsForMentalDiseaseInstitutions: null,
//             modifiedMedicalLossRatioStandards: null,
//             modifiedOtherFinancialPaymentIncentive: null,
//             modifiedEnrollmentProcess: null,
//             modifiedGrevienceAndAppeal: null,
//             modifiedNetworkAdequacyStandards: null,
//             modifiedLengthOfContract: null,
//             modifiedNonRiskPaymentArrangements: null,
//             statutoryRegulatoryAttestation: null,
//             statutoryRegulatoryAttestationDescription: null,
//         }

//         const expectedResult = {
//             ...formData,
//             submissionDescription: undefined,
//             contractType: undefined,
//             riskBasedContract: undefined,
//             contractDateStart: undefined,
//             contractDateEnd: undefined,
//             contractExecutionStatus: undefined,
//             inLieuServicesAndSettings: undefined,
//             modifiedBenefitsProvided: undefined,
//             modifiedGeoAreaServed: undefined,
//             modifiedMedicaidBeneficiaries: undefined,
//             modifiedRiskSharingStrategy: undefined,
//             modifiedIncentiveArrangements: undefined,
//             modifiedWitholdAgreements: undefined,
//             modifiedStateDirectedPayments: undefined,
//             modifiedPassThroughPayments: undefined,
//             modifiedPaymentsForMentalDiseaseInstitutions: undefined,
//             modifiedMedicalLossRatioStandards: undefined,
//             modifiedOtherFinancialPaymentIncentive: undefined,
//             modifiedEnrollmentProcess: undefined,
//             modifiedGrevienceAndAppeal: undefined,
//             modifiedNetworkAdequacyStandards: undefined,
//             modifiedLengthOfContract: undefined,
//             modifiedNonRiskPaymentArrangements: undefined,
//             statutoryRegulatoryAttestation: undefined,
//             statutoryRegulatoryAttestationDescription: undefined,
//         }

//         const validatedFormData = must(
//             validateContractDraftRevisionInput(
//                 formData,
//                 stateCode,
//                 postgresStore,
//                 {
//                     '438-attestation': true,
//                 }
//             )
//         )

//         expect(validatedFormData).toEqual(expectedResult)
//     })
// })

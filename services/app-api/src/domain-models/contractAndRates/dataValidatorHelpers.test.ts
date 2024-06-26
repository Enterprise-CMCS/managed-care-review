import { validateContractDraftRevisionInput } from './dataValidatorHelpers'
import {
    mockGqlContractDraftRevisionFormDataInput,
    mockGQLContractDraftRevisionInput,
    must,
} from '../../testHelpers'
import type { ContractDraftRevisionFormDataInput } from '../../gen/gqlServer'

describe('validateContractDraftRevisionInput', () => {
    it('Validates input form data and removes statutoryRegulatoryAttestationDescription', () => {
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

        const draftRevisionInput = mockGQLContractDraftRevisionInput(
            {
                formData: formData,
            },
            stateCode
        )

        const validatedFormData = must(
            validateContractDraftRevisionInput(draftRevisionInput, stateCode, {
                '438-attestation': true,
            })
        )

        expect(validatedFormData).toEqual(expectedResult)
    })
    it('converts fields that are null to undefined', () => {
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

        const draftRevisionInput = mockGQLContractDraftRevisionInput(
            {
                formData: formData,
            },
            stateCode
        )

        const validatedFormData = must(
            validateContractDraftRevisionInput(draftRevisionInput, stateCode, {
                '438-attestation': true,
            })
        )

        expect(validatedFormData).toEqual(expectedResult)
    })
    it('Returns error for invalid data', () => {
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
            programIDs: ['imNotAValidProgramID'],
            submissionType: 'CONTRACT_AND_RATES',
            populationCovered: 'CHIP',
        }

        const draftRevisionInput = mockGQLContractDraftRevisionInput(
            {
                formData: formData,
            },
            stateCode
        )

        const validatedFormData = validateContractDraftRevisionInput(
            draftRevisionInput,
            stateCode,
            { '438-attestation': true }
        )

        if (!(validatedFormData instanceof Error)) {
            throw new Error(
                'Unexpected error: Was expecting validateContractDraftRevisionInput to return and error'
            )
        }

        expect(validatedFormData.message).toContain('Invalid email')
        expect(validatedFormData.message).toContain(
            `programIDs are invalid for the state ${stateCode}`
        )
        expect(validatedFormData.message).toContain(
            `populationCoveredSchema of CHIP cannot be submissionType of CONTRACT_AND_RATES`
        )
    })
})

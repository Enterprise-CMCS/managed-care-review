import { validateContractDraftRevisionInput } from './dataValidatorHelpers'
import {
    mockGqlContractDraftRevisionFormDataInput,
    mockGQLContractDraftRevisionInput,
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
        }

        const expectedResult = {
            success: true,
            data: {
                ...formData,
                statutoryRegulatoryAttestation: true,
                statutoryRegulatoryAttestationDescription: undefined,
            },
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

        const expectedResult = {
            success: false,
            error: expect.arrayContaining([]),
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

        expect(validatedFormData).toEqual(
            expect.objectContaining(expectedResult)
        )
        expect(validatedFormData.error?.message).toContain(
            'statutoryRegulatoryAttestationDescription must be defined when statutoryRegulatoryAttestation is false'
        )
        expect(validatedFormData.error?.message).toContain('Invalid email')
        expect(validatedFormData.error?.message).toContain(
            `programIDs are invalid for the state ${stateCode}`
        )
        expect(validatedFormData.error?.message).toContain(
            `populationCoveredSchema of CHIP cannot be submissionType of CONTRACT_AND_RATES`
        )
    })
})

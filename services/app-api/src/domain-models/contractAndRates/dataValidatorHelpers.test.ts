import { validateContractDraftRevisionFormDataInput } from './dataValidatorHelpers'
import { mockGqlContractDraftRevisionFormDataInput } from '../../testHelpers'

describe('validateContractDraftRevisionFormDataInput', () => {
    it('Validates input form data and removes statutoryRegulatoryAttestationDescription', () => {
        const formData = {
            ...mockGqlContractDraftRevisionFormDataInput(),
            contractDateStart: new Date(2025, 5, 1),
            contractDateEnd: new Date(2026, 4, 30),
            statutoryRegulatoryAttestation: true,
            statutoryRegulatoryAttestationDescription:
                'Hi, I should be gone after update.',
        }

        const expectedResult = {
            success: true,
            data: {
                ...formData,
                statutoryRegulatoryAttestation: true,
                statutoryRegulatoryAttestationDescription: undefined,
            },
        }

        const validatedFormData = validateContractDraftRevisionFormDataInput(
            formData,
            { '438-attestation': true }
        )

        expect(validatedFormData).toEqual(expectedResult)
    })
    it('Returns error for invalid data', () => {
        const formData = {
            ...mockGqlContractDraftRevisionFormDataInput(),
            contractDateStart: new Date(2025, 5, 1),
            contractDateEnd: new Date(2026, 4, 30),
            statutoryRegulatoryAttestation: false,
            statutoryRegulatoryAttestationDescription: undefined,
        }

        const expectedResult = {
            success: false,
            error: expect.arrayContaining([]),
        }

        const validatedFormData = validateContractDraftRevisionFormDataInput(
            formData,
            { '438-attestation': true }
        )

        expect(validatedFormData).toEqual(expectedResult)
        expect(validatedFormData.error?.message).toContain(
            'statutoryRegulatoryAttestationDescription must be defined when statutoryRegulatoryAttestation is false'
        )
    })
})

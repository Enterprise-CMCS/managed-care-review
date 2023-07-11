import {
    contractFormDataToDomainModel,
    ContractFormDataType,
} from './prismaToDomainModel'

describe('prismaToDomainModel', () => {
    it('contractFormDataToDomainModel correctly adds document categories to each document', () => {
        const formData: ContractFormDataType = {
            id: 'formDataID',
            contractID: 'contractRevisionID',
            submitInfoID: 'submitInfoID',
            unlockInfoID: 'unlockInfoID',
            createdAt: new Date(),
            updatedAt: new Date(),
            programIDs: ['Program'],
            populationCovered: 'MEDICAID' as const,
            submissionType: 'CONTRACT_ONLY' as const,
            riskBasedContract: false,
            submissionDescription: 'Test',
            stateContacts: [],
            addtlActuaryContacts: [],
            addtlActuaryCommunicationPreference: 'OACT_TO_ACTUARY',
            supportingDocuments: [
                {
                    id: 'contractSupportingDocID',
                    contractRevisionID: 'contractRevisionID',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    name: 'contract supporting doc',
                    s3URL: 'fakeS3URL',
                    sha256: '2342fwlkdmwvw',
                },
                {
                    id: 'contractSupportingDocID2',
                    contractRevisionID: 'contractRevisionID',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    name: 'contract supporting doc 2',
                    s3URL: 'fakeS3URL',
                    sha256: '45662342fwlkdmwvw',
                },
            ],
            contractType: 'BASE',
            contractExecutionStatus: 'EXECUTED',
            contractDocuments: [
                {
                    id: 'contractDocID',
                    contractRevisionID: 'contractRevisionID',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    name: 'contract doc',
                    s3URL: 'fakeS3URL',
                    sha256: '8984234fwlkdmwvw',
                },
            ],
            contractDateStart: new Date(Date.UTC(2025, 5, 1)),
            contractDateEnd: new Date(Date.UTC(2026, 4, 30)),
            managedCareEntities: ['MCO'],
            federalAuthorities: ['STATE_PLAN' as const],
            modifiedBenefitsProvided: false,
            modifiedGeoAreaServed: false,
            modifiedMedicaidBeneficiaries: false,
            modifiedRiskSharingStrategy: false,
            modifiedIncentiveArrangements: false,
            modifiedWitholdAgreements: false,
            modifiedStateDirectedPayments: false,
            modifiedPassThroughPayments: false,
            modifiedPaymentsForMentalDiseaseInstitutions: false,
            modifiedMedicalLossRatioStandards: false,
            modifiedOtherFinancialPaymentIncentive: false,
            modifiedEnrollmentProcess: false,
            modifiedGrevienceAndAppeal: false,
            modifiedNetworkAdequacyStandards: true,
            modifiedLengthOfContract: true,
            modifiedNonRiskPaymentArrangements: null,
            inLieuServicesAndSettings: null,
        }

        const domainFormData = contractFormDataToDomainModel(formData)

        expect(domainFormData).toEqual(
            expect.objectContaining({
                supportingDocuments: expect.arrayContaining([
                    expect.objectContaining({
                        name: 'contract supporting doc',
                        s3URL: 'fakeS3URL',
                        sha256: '2342fwlkdmwvw',
                        documentCategories: expect.arrayContaining([
                            'CONTRACT_RELATED',
                        ]),
                    }),
                    expect.objectContaining({
                        name: 'contract supporting doc 2',
                        s3URL: 'fakeS3URL',
                        sha256: '45662342fwlkdmwvw',
                        documentCategories: expect.arrayContaining([
                            'CONTRACT_RELATED',
                        ]),
                    }),
                ]),
                contractDocuments: expect.arrayContaining([
                    expect.objectContaining({
                        name: 'contract doc',
                        s3URL: 'fakeS3URL',
                        sha256: '8984234fwlkdmwvw',
                        documentCategories: expect.arrayContaining([
                            'CONTRACT',
                        ]),
                    }),
                ]),
            })
        )
    })
})

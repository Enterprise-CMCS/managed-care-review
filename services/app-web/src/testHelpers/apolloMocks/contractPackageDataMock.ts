import { mockMNState } from '../../common-code/healthPlanFormDataMocks/healthPlanFormData'
import { Contract } from '../../gen/gqlClient'

// Assemble versions of Contract data (with or without rates) for jest testing. Intended for use with related GQL Moc file.
function mockContractPackageDraft(
    partial?: Partial<Contract>
): Contract {
    return {
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-123',
        stateCode: 'MN',
        state: mockMNState(),
        stateNumber: 5,
        draftRevision: {
            id: '123',
            createdAt: new Date(),
            updatedAt: new Date(),
            contractName: 'MCR-0005-alvhalfhdsalf',
            formData: {
                programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                populationCovered: 'MEDICAID',
                submissionType: 'CONTRACT_AND_RATES',
                riskBasedContract: true,
                submissionDescription: 'A real submission',
                supportingDocuments: [],
                stateContacts: [
                    {
                        name: 'State Contact 1',
                        titleRole: 'Test State Contact 1',
                        email: 'actuarycontact1@test.com',
                    },
                ],
                contractType: 'AMENDMENT',
                contractExecutionStatus: 'EXECUTED',
                contractDocuments: [
                    {
                        s3URL: 's3://bucketname/one-two/one-two.png',
                        sha256: 'fakesha',
                        name: 'one two',
                    },
                ],
                contractDateStart: new Date('01/01/2023'),
                contractDateEnd: new Date('12/31/2023'),
                managedCareEntities: ['MCO'],
                federalAuthorities: ['STATE_PLAN'],
                inLieuServicesAndSettings: true,
                modifiedBenefitsProvided: true,
                modifiedGeoAreaServed: false,
                modifiedMedicaidBeneficiaries: true,
                modifiedRiskSharingStrategy: true,
                modifiedIncentiveArrangements: false,
                modifiedWitholdAgreements: false,
                modifiedStateDirectedPayments: true,
                modifiedPassThroughPayments: true,
                modifiedPaymentsForMentalDiseaseInstitutions: false,
                modifiedMedicalLossRatioStandards: true,
                modifiedOtherFinancialPaymentIncentive: false,
                modifiedEnrollmentProcess: true,
                modifiedGrevienceAndAppeal: false,
                modifiedNetworkAdequacyStandards: true,
                modifiedLengthOfContract: false,
                modifiedNonRiskPaymentArrangements: true,
                statutoryRegulatoryAttestation: true,
                statutoryRegulatoryAttestationDescription: "everything meets regulatory attestation"
            }
        },

        draftRates: [
            {
                id: '123',
                createdAt: new Date(),
                updatedAt: new Date(),
                status: 'DRAFT',
                stateCode: 'MN',
                revisions: [],
                state: mockMNState(),
                stateNumber: 5,
                draftRevision: {
                    id: '123',
                    contractRevisions: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    formData: {
                        rateType: 'AMENDMENT',
                        rateCapitationType: 'RATE_CELL',
                        rateDocuments: [
                            {
                                s3URL: 's3://bucketname/key/rate',
                                sha256: 'fakesha',
                                name: 'rate',
                            },
                        ],
                        supportingDocuments: [],
                        rateDateStart: new Date(),
                        rateDateEnd: new Date(),
                        rateDateCertified: new Date(),
                        amendmentEffectiveDateStart: new Date(),
                        amendmentEffectiveDateEnd: new Date(),
                        rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                        certifyingActuaryContacts: [
                            {
                                actuarialFirm: 'DELOITTE',
                                name: 'Actuary Contact 1',
                                titleRole: 'Test Actuary Contact 1',
                                email: 'actuarycontact1@test.com',
                            },
                        ],
                        addtlActuaryContacts: [
                            {
                                actuarialFirm: 'DELOITTE',
                                name: 'Actuary Contact 1',
                                titleRole: 'Test Actuary Contact 1',
                                email: 'additionalactuarycontact1@test.com',
                            },
                        ],
                        actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                        packagesWithSharedRateCerts: [],
                    }
                }

            },
        ],
        packageSubmissions: [],
        ...partial,
    }
}

function mockContractPackageSubmitted(
    partial?: Partial<Contract>
): Contract {
    return {
        status: 'SUBMITTED',
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-123',
        stateCode: 'MN',
        state: mockMNState(),
        stateNumber: 5,
        packageSubmissions: [{
            cause: 'CONTRACT_SUBMISSION',
            submitInfo: {
                updatedAt: new Date(),
                updatedBy: 'example@state.com',
                updatedReason: 'contract submit'
            },
            submittedRevisions: [],
            contractRevision: {
                createdAt: new Date('01/01/2024'),
                updatedAt: new Date('12/31/2024'),
                id: '123',
                formData: {
                    programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                    populationCovered: 'MEDICAID',
                    submissionType: 'CONTRACT_AND_RATES',
                    riskBasedContract: true,
                    submissionDescription: 'A real submission',
                    supportingDocuments: [],
                    stateContacts: [],
                    contractType: 'AMENDMENT',
                    contractExecutionStatus: 'EXECUTED',
                    contractDocuments: [
                        {
                            s3URL: 's3://bucketname/key/contract',
                            sha256: 'fakesha',
                            name: 'contract',
                        },
                    ],
                    contractDateStart: new Date(),
                    contractDateEnd: new Date(),
                    managedCareEntities: ['MCO'],
                    federalAuthorities: ['STATE_PLAN'],
                    inLieuServicesAndSettings: true,
                    modifiedBenefitsProvided: true,
                    modifiedGeoAreaServed: false,
                    modifiedMedicaidBeneficiaries: true,
                    modifiedRiskSharingStrategy: true,
                    modifiedIncentiveArrangements: false,
                    modifiedWitholdAgreements: false,
                    modifiedStateDirectedPayments: true,
                    modifiedPassThroughPayments: true,
                    modifiedPaymentsForMentalDiseaseInstitutions: false,
                    modifiedMedicalLossRatioStandards: true,
                    modifiedOtherFinancialPaymentIncentive: false,
                    modifiedEnrollmentProcess: true,
                    modifiedGrevienceAndAppeal: false,
                    modifiedNetworkAdequacyStandards: true,
                    modifiedLengthOfContract: false,
                    modifiedNonRiskPaymentArrangements: true,
                    statutoryRegulatoryAttestation: true,
                    statutoryRegulatoryAttestationDescription: "everything meets regulatory attestation"
                }
            },
            rateRevisions: [
                {
                    id: '1234',
                    createdAt: new Date('01/01/2023'),
                    updatedAt: new Date('01/01/2023'),
                    contractRevisions: [],
                    formData: {
                        rateType: 'AMENDMENT',
                        rateCapitationType: 'RATE_CELL',
                        rateDocuments: [
                            {
                                s3URL: 's3://bucketname/key/rate',
                                sha256: 'fakesha',
                                name: 'rate',
                            },
                        ],
                        supportingDocuments: [],
                        rateDateStart: new Date(),
                        rateDateEnd: new Date(),
                        rateDateCertified: new Date(),
                        amendmentEffectiveDateStart: new Date(),
                        amendmentEffectiveDateEnd: new Date(),
                        rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                        certifyingActuaryContacts: [
                            {
                                actuarialFirm: 'DELOITTE',
                                name: 'Actuary Contact 1',
                                titleRole: 'Test Actuary Contact 1',
                                email: 'actuarycontact1@test.com',
                            },
                        ],
                        addtlActuaryContacts: [
                            {
                                actuarialFirm: 'DELOITTE',
                                name: 'Actuary Contact 1',
                                titleRole: 'Test Actuary Contact 1',
                                email: 'actuarycontact1@test.com',
                            },
                        ],
                        actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                        packagesWithSharedRateCerts: []
                    }
                },
            ],
        }],
        ...partial,
    }
}

export { mockContractPackageDraft, mockContractPackageSubmitted }

import { mockMNState } from '../../common-code/healthPlanFormDataMocks/healthPlanFormData'
import { Contract, ContractFormData } from '../../gen/gqlClient'

// Assemble versions of Contract data (with or without rates) for jest testing. Intended for use with related GQL Moc file.
function mockContractPackageDraft(
    partial?: Partial<Contract>
): Contract {
    return {
        __typename: 'Contract',
        initiallySubmittedAt: undefined,
        status: 'DRAFT',
        createdAt: new Date('01/01/24'),
        updatedAt: new Date(),
        id: 'test-abc-123',
        stateCode: 'MN',
        state: mockMNState(),
        stateNumber: 5,
        draftRevision: {
            __typename: 'ContractRevision',
            submitInfo: undefined,
            unlockInfo: undefined,
            id: '123',
            createdAt: new Date(),
            updatedAt: new Date(),
            contractName: 'MCR-0005-alvhalfhdsalf',
            formData: mockContractFormData(partial?.draftRevision?.formData)
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
                                name: 'rate certification',
                                dateAdded: new Date('01/13/2024')
                            },
                        ],
                        supportingDocuments: [
                            {
                                s3URL: 's3://bucketname/key/ratesupporting1',
                                sha256: 'fakesha',
                                name: 'rateSupporting1',
                                dateAdded: new Date('01/15/2024')
                            },
                            {
                                s3URL: 's3://bucketname/key/rateSupporting2',
                                sha256: 'fakesha',
                                name: 'rateSupporting2',
                                dateAdded: new Date('01/13/2024')
                            },
                        ],
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
function mockContractWithLinkedRateDraft(
    partial?: Partial<Contract>
): Contract {
    return {
        __typename: 'Contract',
        initiallySubmittedAt: undefined,
        status: 'DRAFT',
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-123',
        stateCode: 'MN',
        state: mockMNState(),
        stateNumber: 5,
        draftRevision: {
            __typename: 'ContractRevision',
            submitInfo: undefined,
            unlockInfo: undefined,
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
                        dateAdded: new Date()
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
                status: 'SUBMITTED',
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
                                dateAdded: new Date()
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
function mockContractPackageUnlocked(
    partial?: Partial<Contract>
): Contract {
    return {
        __typename: 'Contract',
        initiallySubmittedAt: undefined,
        status: 'UNLOCKED',
        createdAt: new Date('01/01/24'),
        updatedAt: new Date(),
        id: 'test-abc-123',
        stateCode: 'MN',
        state: mockMNState(),
        stateNumber: 5,
        draftRevision: {
            __typename: 'ContractRevision',
            submitInfo: undefined,
            unlockInfo: undefined,
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
                supportingDocuments: [
                    {
                        s3URL: 's3://bucketname/key/contractsupporting1',
                        sha256: 'fakesha',
                        name: 'contractSupporting1',
                        dateAdded: new Date('01/15/2024')
                    },
                    {
                        s3URL: 's3://bucketname/key/contractSupporting2',
                        sha256: 'fakesha',
                        name: 'contractSupporting2',
                        dateAdded: new Date('01/13/2024')
                    },
                ],
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
                        name: 'contract document',
                        dateAdded: new Date('01/01/2024')
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
                                name: 'rate certification',
                                dateAdded: new Date('01/13/2024')
                            },
                        ],
                        supportingDocuments: [
                            {
                                s3URL: 's3://bucketname/key/ratesupporting1',
                                sha256: 'fakesha',
                                name: 'rateSupporting1',
                                dateAdded: new Date('01/15/2024')
                            },
                            {
                                s3URL: 's3://bucketname/key/rateSupporting2',
                                sha256: 'fakesha',
                                name: 'rateSupporting2',
                                dateAdded: new Date('01/13/2024')
                            },
                        ],
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
        packageSubmissions: [{
            cause: 'CONTRACT_SUBMISSION',
            submitInfo: {
                updatedAt: new Date('12/31/2023'),
                updatedBy: 'example@state.com',
                updatedReason: 'contract submit'
            },
            submittedRevisions: [],
            contractRevision: {
                contractName: 'MCR-MN-0005-SNBC',
                createdAt: new Date('01/01/2023'),
                updatedAt: new Date('12/31/2023'),
                id: '123',
                formData: {
                    programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                    populationCovered: 'MEDICAID',
                    submissionType: 'CONTRACT_AND_RATES',
                    riskBasedContract: true,
                    submissionDescription: 'A real submission',
                    supportingDocuments: [
                        {
                            s3URL: 's3://bucketname/key/contractsupporting1',
                            sha256: 'fakesha',
                            name: 'contractSupporting1',
                            dateAdded: new Date('01/15/2023')
                        },
                        {
                            s3URL: 's3://bucketname/key/contractSupporting2',
                            sha256: 'fakesha',
                            name: 'contractSupporting2',
                            dateAdded: new Date('01/13/2023')
                        },
                    ],
                    stateContacts: [],
                    contractType: 'AMENDMENT',
                    contractExecutionStatus: 'EXECUTED',
                    contractDocuments: [
                        {
                            s3URL: 's3://bucketname/key/contract',
                            sha256: 'fakesha',
                            name: 'contract',
                            dateAdded: new Date('01/01/2023')
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
                                dateAdded: new Date('01/01/2023')
                            },
                        ],
                        supportingDocuments: [
                            {
                                s3URL: 's3://bucketname/key/rateSupporting1',
                                sha256: 'fakesha',
                                name: 'rate supporting 1',
                                dateAdded: new Date('01/15/2023')
                            },
                            {
                                s3URL: 's3://bucketname/key/rateSupporting1',
                                sha256: 'fakesha',
                                name: 'rate supporting 2',
                                dateAdded: new Date('01/15/2023')
                            },
                        ],
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
                contractName: 'MCR-MN-0005-SNBC',
                createdAt: new Date('01/01/2024'),
                updatedAt: new Date('12/31/2024'),
                id: '123',
                formData: {
                    programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                    populationCovered: 'MEDICAID',
                    submissionType: 'CONTRACT_AND_RATES',
                    riskBasedContract: true,
                    submissionDescription: 'A real submission',
                    supportingDocuments: [
                        {
                            s3URL: 's3://bucketname/key/contractsupporting1',
                            sha256: 'fakesha',
                            name: 'contractSupporting1',
                            dateAdded: new Date('01/15/2024')
                        },
                        {
                            s3URL: 's3://bucketname/key/contractSupporting2',
                            sha256: 'fakesha',
                            name: 'contractSupporting2',
                            dateAdded: new Date('01/13/2024')
                        },
                    ],
                    stateContacts: [],
                    contractType: 'AMENDMENT',
                    contractExecutionStatus: 'EXECUTED',
                    contractDocuments: [
                        {
                            s3URL: 's3://bucketname/key/contract',
                            sha256: 'fakesha',
                            name: 'contract',
                            dateAdded: new Date('01/01/2024')
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
                                dateAdded: new Date('01/01/2023')
                            },
                        ],
                        supportingDocuments: [
                            {
                                s3URL: 's3://bucketname/key/rateSupporting1',
                                sha256: 'fakesha',
                                name: 'rate supporting 1',
                                dateAdded: new Date('01/15/2023')
                            },
                            {
                                s3URL: 's3://bucketname/key/rateSupporting1',
                                sha256: 'fakesha',
                                name: 'rate supporting 2',
                                dateAdded: new Date('01/15/2023')
                            },
                        ],
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

function mockContractFormData( partial?: Partial<ContractFormData>): ContractFormData {
    return {
        programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
        populationCovered: 'MEDICAID',
        submissionType: 'CONTRACT_AND_RATES',
        riskBasedContract: true,
        submissionDescription: 'A real submission',
        supportingDocuments: [
            {
                s3URL: 's3://bucketname/key/contractsupporting1',
                sha256: 'fakesha',
                name: 'contractSupporting1',
                dateAdded: new Date('01/15/2024')
            },
            {
                s3URL: 's3://bucketname/key/contractSupporting2',
                sha256: 'fakesha',
                name: 'contractSupporting2',
                dateAdded: new Date('01/13/2024')
            },
        ],
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
                name: 'contract document',
                dateAdded: new Date('01/01/2024')
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
        statutoryRegulatoryAttestationDescription: "everything meets regulatory attestation",
        ...partial
    }
}

export { mockContractPackageDraft, mockContractPackageSubmitted, mockContractWithLinkedRateDraft, mockContractPackageUnlocked, mockContractFormData}

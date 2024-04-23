import { mockMNState } from '../../common-code/healthPlanFormDataMocks/healthPlanFormData'
import { Contract } from '../../gen/gqlClient'

// Assemble versions of Contract data (with or without rates) for jest testing. Intended for use with related GQL Moc file.
function mockContractPackageDraft(
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
        mccrsID: undefined,
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
                status: 'DRAFT',
                stateCode: 'MN',
                revisions: [],
                state: mockMNState(),
                stateNumber: 5,
                parentContractID: 'test-abc-123',
                draftRevision: {
                    id: '123',
                    rateID: '456',
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
        mccrsID: undefined,
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
            // a linked, unlocked, rate.
            {
                id: 'rate-123',
                createdAt: new Date(),
                updatedAt: new Date(),
                status: 'UNLOCKED',
                stateCode: 'MN',
                state: mockMNState(),
                stateNumber: 5,
                parentContractID: 'some-other-contract-id',
                draftRevision: {
                    id: '123',
                    rateID: 'rate-123',
                    contractRevisions: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    submitInfo: undefined,
                    unlockInfo: undefined,
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
                        rateDateStart: new Date('2020-02-02'),
                        rateDateEnd: new Date('2021-02-02'),
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
                },
                revisions: [{
                    id: '456',
                    rateID: 'rate-123',
                    contractRevisions: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    submitInfo: undefined,
                    unlockInfo: undefined,
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
                        rateDateStart: new Date('2020-01-01'),
                        rateDateEnd: new Date('2021-01-01'),
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
                }]
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
        initiallySubmittedAt: new Date(),
        id: 'test-abc-123',
        stateCode: 'MN',
        state: mockMNState(),
        stateNumber: 5,
        mccrsID: undefined,
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
                submitInfo: {
                    updatedAt: new Date(),
                    updatedBy: 'example@state.com',
                    updatedReason: 'contract submit'
                },
                unlockInfo: undefined,
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
                            dateAdded: new Date('2022-05-12T21:13:20.420Z')
                        },
                        {
                            s3URL: 's3://bucketname/key/contract',
                            sha256: 'fakesha',
                            name: 'contract',
                            dateAdded: new Date('2022-04-12T21:13:20.420Z')
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
                    rateID: '456',
                    createdAt: new Date('01/01/2023'),
                    updatedAt: new Date('01/01/2023'),
                    submitInfo: {
                        updatedAt: new Date(),
                        updatedBy: 'example@state.com',
                        updatedReason: 'contract submit'
                    },
                    contractRevisions: [],
                    formData: {
                        rateType: 'AMENDMENT',
                        rateCapitationType: 'RATE_CELL',
                        rateDocuments: [
                            {
                                s3URL: 's3://bucketname/key/rate',
                                sha256: 'fakesha',
                                name: 'rate',
                                dateAdded: new Date('2022-03-12T21:13:20.420Z')
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

function mockContractPackageUnlocked(
    partial?: Partial<Contract>
): Contract {
    return {
        status: 'UNLOCKED',
        createdAt: new Date(),
        updatedAt: new Date(),
        initiallySubmittedAt: new Date(),
        id: 'test-abc-123',
        stateCode: 'MN',
        state: mockMNState(),
        stateNumber: 5,
        mccrsID: '1234',
        draftRevision: {
            __typename: 'ContractRevision',
            submitInfo: undefined,
            unlockInfo: {
                updatedAt: new Date(),
                updatedBy: 'soandso@example.com',
                updatedReason: 'unlocked for a test',
            },
            id: '123',
            createdAt: new Date(),
            updatedAt: new Date(),
            contractName: 'MCR-MN-0005-SNBC',
            formData: {
                programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                populationCovered: 'MEDICAID',
                submissionType: 'CONTRACT_AND_RATES',
                riskBasedContract: true,
                submissionDescription: 'An updated submission',
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
                contractDateStart: new Date('02/02/2023'),
                contractDateEnd: new Date('02/02/2024'),
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
                parentContractID: 'test-abc-123',
                draftRevision: {
                    id: '123',
                    rateID: '456',
                    contractRevisions: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    unlockInfo: {
                        updatedAt: new Date(),
                        updatedBy: 'soandso@example.com',
                        updatedReason: 'unlocked for a test',
                    },
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
                        rateDateStart: new Date('2020-02-02'),
                        rateDateEnd: new Date('2021-02-02'),
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
                updatedAt: new Date('01/01/2024'),
                updatedBy: 'example@state.com',
                updatedReason: 'initial submission'
            },
            submittedRevisions: [
                {
                    contractName: 'MCR-MN-0005-SNBC',
                    createdAt: new Date('01/01/2024'),
                    updatedAt: new Date('12/31/2024'),
                    submitInfo: {
                        updatedAt: new Date('01/01/2024'),
                        updatedBy: 'example@state.com',
                        updatedReason: 'initial submission'
                    },
                    unlockInfo: {
                        updatedAt: new Date('01/01/2024'),
                        updatedBy: 'example@state.com',
                        updatedReason: 'unlocked for a test'
                    },
                    id: '123',
                    formData: {
                        programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                        populationCovered: 'MEDICAID',
                        submissionType: 'CONTRACT_AND_RATES',
                        riskBasedContract: true,
                        submissionDescription: 'An initial submission',
                        supportingDocuments: [],
                        stateContacts: [],
                        contractType: 'AMENDMENT',
                        contractExecutionStatus: 'EXECUTED',
                        contractDocuments: [
                            {
                                s3URL: 's3://bucketname/key/contract',
                                sha256: 'fakesha',
                                name: 'contract',
                                dateAdded: new Date()
                            },
                        ],
                        contractDateStart: new Date('01/01/2023'),
                        contractDateEnd: new Date('01/01/2024'),
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
                }
            ],
            contractRevision: {
                contractName: 'MCR-MN-0005-SNBC',
                createdAt: new Date('01/01/2024'),
                updatedAt: new Date('12/31/2024'),
                submitInfo: {
                    updatedAt: new Date('01/01/2024'),
                    updatedBy: 'example@state.com',
                    updatedReason: 'initial submission'
                },
                unlockInfo: {
                    updatedAt: new Date('01/01/2024'),
                    updatedBy: 'example@state.com',
                    updatedReason: 'unlocked'
                },
                id: '123',
                formData: {
                    programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                    populationCovered: 'MEDICAID',
                    submissionType: 'CONTRACT_AND_RATES',
                    riskBasedContract: true,
                    submissionDescription: 'An initial submission',
                    supportingDocuments: [],
                    stateContacts: [],
                    contractType: 'AMENDMENT',
                    contractExecutionStatus: 'EXECUTED',
                    contractDocuments: [
                        {
                            s3URL: 's3://bucketname/key/contract',
                            sha256: 'fakesha',
                            name: 'contract',
                            dateAdded: new Date()
                        },
                    ],
                    contractDateStart: new Date('01/01/2023'),
                    contractDateEnd: new Date('01/01/2024'),
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
                    rateID: '456',
                    createdAt: new Date('01/01/2023'),
                    updatedAt: new Date('01/01/2023'),
                    submitInfo: {
                        updatedAt: new Date('01/01/2024'),
                        updatedBy: 'example@state.com',
                        updatedReason: 'initial submission'
                    },
                    contractRevisions: [],
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
                        rateDateStart: new Date('2020-01-01'),
                        rateDateEnd: new Date('2021-01-01'),
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

export { mockContractPackageDraft, mockContractPackageSubmitted, mockContractWithLinkedRateDraft, mockContractPackageUnlocked }

import { mockMNState } from '../../common-code/healthPlanFormDataMocks/healthPlanFormData'
import { Contract, ContractFormData, ContractRevision, RateRevision } from '../../gen/gqlClient'


function mockContractRevision(name?: string, partial?: Partial<ContractRevision>): ContractRevision {
    name = name || '1'
    return {
        __typename: 'ContractRevision',
        contractName: 'MCR-MN-0005-SNBC',
        createdAt: new Date('01/01/2024'),
        updatedAt: new Date('12/31/2024'),
        id: `123${name}`,
        submitInfo: {
            updatedAt: new Date(`2024-02-17T03:2${name}:00`),
            updatedBy: 'example@state.com',
            updatedReason: 'contract submit'
        },
        unlockInfo: {
            updatedAt: new Date(),
            updatedBy: 'example@state.com',
            updatedReason: 'contract unlock'
        },
        formData: {
            __typename: 'ContractFormData',
            programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
            populationCovered: 'MEDICAID',
            submissionType: 'CONTRACT_AND_RATES',
            riskBasedContract: true,
            submissionDescription: `Submission ${name}`,
            supportingDocuments: [
                {
                    s3URL: `s3://bucketname/key/contractsupporting${name}1`,
                    sha256: 'fakesha',
                    name: `contractSupporting${name}1`,
                    dateAdded: new Date('01/15/2024')
                },
                {
                    s3URL: `s3://bucketname/key/contractsupporting${name}2`,
                    sha256: 'fakesha',
                    name: `contractSupporting${name}2`,
                    dateAdded: new Date('01/13/2024')
                },
            ],
            stateContacts: [],
            contractType: 'AMENDMENT',
            contractExecutionStatus: 'EXECUTED',
            contractDocuments: [
                {
                    s3URL: `s3://bucketname/key/contract${name}`,
                    sha256: 'fakesha',
                    name: `contract${name}`,
                    dateAdded: new Date('2024-02-17')
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
        },
        ...partial
    }
}

function mockRateRevision(name?: string, partial?: Partial<RateRevision>): RateRevision {
    name = name || '1'
    return {
        __typename: 'RateRevision',
        id: `1234${name}`,
        rateID: '123',
        createdAt: new Date('01/01/2023'),
        updatedAt: new Date('01/01/2023'),
        submitInfo: {
            updatedAt: new Date(),
            updatedBy: 'example@state.com',
            updatedReason: 'contract submit'
        },
        unlockInfo: {
            updatedAt: new Date(),
            updatedBy: 'example@state.com',
            updatedReason: 'contract unlock'
        },
        contractRevisions: [],
        formData: {
            __typename: 'RateFormData',
            rateType: 'AMENDMENT',
            rateCapitationType: 'RATE_CELL',
            rateCertificationName: 'fooname',
            rateDocuments: [
                {
                    s3URL: 's3://bucketname/key/rate',
                    sha256: 'fakesha',
                    name: `rate${name} doc`,
                    dateAdded: new Date('01/01/2023')
                },
            ],
            supportingDocuments: [
                {
                    s3URL: 's3://bucketname/key/rateSupporting1',
                    sha256: 'fakesha',
                    name: `rate supporting ${name}1`,
                    dateAdded: new Date('01/15/2023')
                },
                {
                    s3URL: 's3://bucketname/key/rateSupporting1',
                    sha256: 'fakesha',
                    name: `rate supporting ${name}2`,
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
                    id: null,
                    actuarialFirmOther: null,
                    actuarialFirm: 'DELOITTE',
                    name: `Actuary Contact ${name}`,
                    titleRole: `Test Actuary Contact ${name}`,
                    email: 'actuarycontact1@test.com',
                },
            ],
            addtlActuaryContacts: [
                {
                    id: null,
                    actuarialFirmOther: null,
                    actuarialFirm: 'DELOITTE',
                    name: `Additional Actuary Contact ${name}`,
                    titleRole: 'Test Actuary Contact 1',
                    email: 'actuarycontact1@test.com',
                },
            ],
            actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
            packagesWithSharedRateCerts: []
        }
    }
}


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
        mccrsID: undefined,
        draftRevision: {
            __typename: 'ContractRevision',
            submitInfo: undefined,
            unlockInfo: undefined,
            id: '123',
            createdAt: new Date(),
            updatedAt: new Date(),
            contractName: 'MCR-0005-alvhalfhdsalfee',
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
                                id: null,
                                actuarialFirmOther: null,
                                actuarialFirm: 'DELOITTE',
                                name: 'Actuary Contact 1',
                                titleRole: 'Test Actuary Contact 1',
                                email: 'actuarycontact1@test.com',
                            },
                        ],
                        addtlActuaryContacts: [
                            {
                                id: null,
                                actuarialFirmOther: null,
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
            contractName: 'MCR-0005-alvhalfhdsalfss',
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
        __typename: 'Contract',
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-123',
        stateCode: 'MN',
        state: mockMNState(),
        stateNumber: 5,
        packageSubmissions: [{
            cause: 'CONTRACT_SUBMISSION',
            __typename: 'ContractPackageSubmission',
            submitInfo: {
                updatedAt: new Date('12/18/2023'),
                updatedBy: 'example@state.com',
                updatedReason: 'contract submit'
            },
            submittedRevisions: [],
            contractRevision: {
                contractName: 'MCR-MN-0005-SNBC',
                createdAt: new Date('01/01/2024'),
                updatedAt: new Date('12/31/2024'),
                id: '123',
                submitInfo: {
                    updatedAt: new Date(),
                    updatedBy: 'example@state.com',
                    updatedReason: 'contract submit'
                },
                unlockInfo: undefined,
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
                    rateID: '123',
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

function mockContractPackageSubmittedWithRevisions(
    partial?: Partial<Contract>
): Contract {
    return {
        __typename: 'Contract',
        status: 'SUBMITTED',
        createdAt: new Date(),
        updatedAt: new Date(),
        initiallySubmittedAt: '2024-01-01',
        mccrsID: null,
        id: 'test-abc-123',
        stateCode: 'MN',
        state: mockMNState(),
        stateNumber: 5,
        draftRevision: null,
        draftRates: null,
        packageSubmissions: [
            {
                __typename: 'ContractPackageSubmission',
                cause: 'CONTRACT_SUBMISSION',
                submitInfo: {
                    __typename: 'UpdateInformation',
                    updatedAt: '2024-03-03',
                    updatedBy: 'example@state.com',
                    updatedReason: 'submit 3'
                },
                submittedRevisions: [
                    mockContractRevision('3'),
                ],
                contractRevision: mockContractRevision('3'),
                rateRevisions: [
                    mockRateRevision('3'),
                ],
            },
            {
                __typename: 'ContractPackageSubmission',
                cause: 'CONTRACT_SUBMISSION',
                submitInfo: {
                    __typename: 'UpdateInformation',
                    updatedAt: '2024-02-02',
                    updatedBy: 'example@state.com',
                    updatedReason: 'submit 2'
                },
                submittedRevisions: [
                    mockContractRevision('2'),
                ],
                contractRevision: mockContractRevision('2'),
                rateRevisions: [
                    mockRateRevision('2'),
                ],
            },
            {
                __typename: 'ContractPackageSubmission',
                cause: 'CONTRACT_SUBMISSION',
                submitInfo: {
                    __typename: 'UpdateInformation',
                    updatedAt: '2024-01-01',
                    updatedBy: 'example@state.com',
                    updatedReason: 'submit 1'
                },
                submittedRevisions: [
                    mockContractRevision('1'),
                ],
                contractRevision: mockContractRevision('1'),
                rateRevisions: [
                    mockRateRevision('1'),
                ],
            },
        ],
        ...partial,
    }
}

function mockContractPackageUnlocked(
    partial?: Partial<Contract>
): Contract {
    return {
        status: 'UNLOCKED',
        __typename: 'Contract',
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
                updatedBy: 'cms@example.com',
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
                        dateAdded: new Date('02/02/2023')
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
                        updatedBy: 'cms@example.com',
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
                                dateAdded: new Date('03/02/2023')
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
                        packagesWithSharedRateCerts: [ {
                            packageName: 'testABC1',
                            packageId: 'test-abc-1',
                        },]
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

export { 
    mockContractPackageDraft, 
    mockContractPackageSubmitted, 
    mockContractWithLinkedRateDraft, 
    mockContractPackageUnlocked, 
    mockContractFormData, 
    mockContractPackageSubmittedWithRevisions,
}


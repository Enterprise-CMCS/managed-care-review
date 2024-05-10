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

// this package has val-like data - different versions have different descriptions and programs and package names
function mockContractPackageWithDifferentProgramsInRevisions (): Contract {
   return{ "id": "e670adsfdfadsfc", "status": "RESUBMITTED", "createdAt": "2024-05-07T19:44:53.732Z", "updatedAt": "2024-05-07T19:44:53.732Z", "initiallySubmittedAt": "2024-05-07", "stateCode": "FL", "mccrsID": null, "state": { "code": "FL", "name": "Florida", "programs": [{ "id": "712277fb-f43f-4eb5-98c5-6c6a97509201", "name": "NEMT", "fullName": "Non-Emergency Medical Transportation", "__typename": "Program" }, { "id": "037af66b-81eb-4472-8b80-01edf17d12d9", "name": "PCCMe", "fullName": "Healthy Start MomCare Network, Inc.", "__typename": "Program" }, { "id": "5c10fe9f-bec9-416f-a20c-718b152ad633", "name": "MMA", "fullName": "Managed Medical Assistance Program", "__typename": "Program" }, { "id": "3b8d8fa1-1fa6-4504-9c5b-ef522877fe1e", "name": "LTC", "fullName": "Long-term Care Program", "__typename": "Program" }, { "id": "08d114c2-0c01-4a1a-b8ff-e2b79336672d", "name": "Dental", "fullName": "Prepaid Dental Health Program", "__typename": "Program" }], "__typename": "State" }, "stateNumber": 221, "__typename": "Contract", "draftRevision": null, "draftRates": null,
    "packageSubmissions": [{ "cause": "CONTRACT_SUBMISSION", "submitInfo": { "updatedAt": "2024-05-08T17:42:52.696Z", "updatedBy": "mc-review-team@truss.works", "updatedReason": "testing 4100", "__typename": "UpdateInformation" }, "submittedRevisions": [{ "id": "a334b516-f219-47ac-aedf-97c93b18d7d6", "createdAt": "2024-05-07T19:49:36.173Z", "updatedAt": "2024-05-08T17:42:52.696Z", "contractName": "MCR-FL-0221-DENTAL", "submitInfo": { "updatedAt": "2024-05-08T17:42:52.696Z", "updatedBy": "team@example.com", "updatedReason": "testing 4100", "__typename": "UpdateInformation" }, "unlockInfo": { "updatedAt": "2024-05-07T19:49:36.175Z", "updatedBy": "team@example.com", "updatedReason": "test", "__typename": "UpdateInformation" }, "formData": { "programIDs": ["08d114c2-0c01-4a1a-b8ff-e2b79336672d"], "populationCovered": "CHIP", "submissionType": "CONTRACT_ONLY", "riskBasedContract": true, "submissionDescription": "This amendment revises calendar year (CY) 2019 capitation rates, adds new language concerning capitation payments related to a program no longer authorized by law, and changes the requirement that the MCO pay or deny clean paper claims within thirty (30), rather than twenty-one (21) calendar days of receipt.", "stateContacts": [{ "name": "Raymond Holt", "titleRole": "test", "email": "kaleigh@example.com", "__typename": "StateContact" }], "supportingDocuments": [{ "name": "State User Manual - MC-Review - January 2024.pdf", "s3URL": "s3://uploads-val-uploads-798659716464/b88e8dd1-f4f1-4d39-8591-645b64a15e27.pdf/State User Manual - MC-Review - January 2024.pdf", "sha256": "74f6efc997e4524aa7eb52f75b7f595c91cf7f4420dc9c8a995d98b470494540", "dateAdded": "2024-05-08", "__typename": "GenericDocument" }], "contractType": "BASE", "contractExecutionStatus": "EXECUTED", "contractDocuments": [{ "name": "Test document.pdf", "s3URL": "s3://uploads-val-uploads-798659716464/63f44255-e82a-4156-996c-876a1ca86768.pdf/Test document.pdf", "sha256": "66b53218e2e32b046a354cf78a604fcd24825b3958044c6de53ea1b2b3ed6cf9", "dateAdded": "2024-05-08", "__typename": "GenericDocument" }], "contractDateStart": "2024-07-01", "contractDateEnd": "2025-06-30", "managedCareEntities": ["MCO"], "federalAuthorities": ["WAIVER_1115"], "inLieuServicesAndSettings": null, "modifiedBenefitsProvided": null, "modifiedGeoAreaServed": null, "modifiedMedicaidBeneficiaries": null, "modifiedRiskSharingStrategy": null, "modifiedIncentiveArrangements": null, "modifiedWitholdAgreements": null, "modifiedStateDirectedPayments": null, "modifiedPassThroughPayments": null, "modifiedPaymentsForMentalDiseaseInstitutions": null, "modifiedMedicalLossRatioStandards": null, "modifiedOtherFinancialPaymentIncentive": null, "modifiedEnrollmentProcess": null, "modifiedGrevienceAndAppeal": null, "modifiedNetworkAdequacyStandards": null, "modifiedLengthOfContract": null, "modifiedNonRiskPaymentArrangements": null, "__typename": "ContractFormData" }, "__typename": "ContractRevision" }], "contractRevision": { "id": "a334b516-f219-47ac-aedf-97c93b18d7d6", "createdAt": "2024-05-07T19:49:36.173Z", "updatedAt": "2024-05-08T17:42:52.696Z", "contractName": "MCR-FL-0221-DENTAL", "submitInfo": { "updatedAt": "2024-05-08T17:42:52.696Z", "updatedBy": "team@example.com", "updatedReason": "testing 4100", "__typename": "UpdateInformation" }, "unlockInfo": { "updatedAt": "2024-05-07T19:49:36.175Z", "updatedBy": "team@example.com", "updatedReason": "test", "__typename": "UpdateInformation" }, "formData": { "programIDs": ["08d114c2-0c01-4a1a-b8ff-e2b79336672d"], "populationCovered": "CHIP", "submissionType": "CONTRACT_ONLY", "riskBasedContract": true, "submissionDescription": "This amendment revises calendar year (CY) 2019 capitation rates, adds new language concerning capitation payments related to a program no longer authorized by law, and changes the requirement that the MCO pay or deny clean paper claims within thirty (30), rather than twenty-one (21) calendar days of receipt.", "stateContacts": [{ "name": "Raymond Holt", "titleRole": "test", "email": "kaleigh@example.com", "__typename": "StateContact" }], "supportingDocuments": [{ "name": "State User Manual - MC-Review - January 2024.pdf", "s3URL": "s3://uploads-val-uploads-798659716464/b88e8dd1-f4f1-4d39-8591-645b64a15e27.pdf/State User Manual - MC-Review - January 2024.pdf", "sha256": "74f6efc997e4524aa7eb52f75b7f595c91cf7f4420dc9c8a995d98b470494540", "dateAdded": "2024-05-08", "__typename": "GenericDocument" }], "contractType": "BASE", "contractExecutionStatus": "EXECUTED", "contractDocuments": [{ "name": "Test document.pdf", "s3URL": "s3://uploads-val-uploads-798659716464/63f44255-e82a-4156-996c-876a1ca86768.pdf/Test document.pdf", "sha256": "66b53218e2e32b046a354cf78a604fcd24825b3958044c6de53ea1b2b3ed6cf9", "dateAdded": "2024-05-07", "__typename": "GenericDocument" }], "contractDateStart": "2024-07-01", "contractDateEnd": "2025-06-30", "managedCareEntities": ["MCO"], "federalAuthorities": ["WAIVER_1115"], "inLieuServicesAndSettings": null, "modifiedBenefitsProvided": null, "modifiedGeoAreaServed": null, "modifiedMedicaidBeneficiaries": null, "modifiedRiskSharingStrategy": null, "modifiedIncentiveArrangements": null, "modifiedWitholdAgreements": null, "modifiedStateDirectedPayments": null, "modifiedPassThroughPayments": null, "modifiedPaymentsForMentalDiseaseInstitutions": null, "modifiedMedicalLossRatioStandards": null, "modifiedOtherFinancialPaymentIncentive": null, "modifiedEnrollmentProcess": null, "modifiedGrevienceAndAppeal": null, "modifiedNetworkAdequacyStandards": null, "modifiedLengthOfContract": null, "modifiedNonRiskPaymentArrangements": null, "__typename": "ContractFormData" }, "__typename": "ContractRevision" }, "rateRevisions": [], "__typename": "ContractPackageSubmission" }, { "cause": "CONTRACT_SUBMISSION", "submitInfo": { "updatedAt": "2024-05-07T19:46:19.376Z", "updatedBy": "team@example.com", "updatedReason": "Initial submission", "__typename": "UpdateInformation" }, "submittedRevisions": [{ "id": "5e124160-8ac5-4d6f-9733-c5e8723c5af6", "createdAt": "2024-05-07T19:44:53.732Z", "updatedAt": "2024-05-07T19:46:19.377Z", "contractName": "MCR-FL-0221-PCCME", "submitInfo": { "updatedAt": "2024-05-07T19:46:19.376Z", "updatedBy": "team@example.com", "updatedReason": "Initial submission", "__typename": "UpdateInformation" }, "unlockInfo": null, "formData": { "programIDs": ["037af66b-81eb-4472-8b80-01edf17d12d9"], "populationCovered": "CHIP", "submissionType": "CONTRACT_ONLY", "riskBasedContract": true, "submissionDescription": "test", "stateContacts": [{ "name": "Raymond Holt", "titleRole": "test", "email": "kaleigh@example.com", "__typename": "StateContact" }], "supportingDocuments": [], "contractType": "BASE", "contractExecutionStatus": "EXECUTED", "contractDocuments": [{ "name": "Test document.pdf", "s3URL": "s3://uploads-val-uploads-798659716464/63f44255-e82a-4156-996c-876a1ca86768.pdf/Test document.pdf", "sha256": "66b53218e2e32b046a354cf78a604fcd24825b3958044c6de53ea1b2b3ed6cf9", "dateAdded": "2024-05-07", "__typename": "GenericDocument" }], "contractDateStart": "2024-07-01", "contractDateEnd": "2025-06-30", "managedCareEntities": ["MCO"], "federalAuthorities": ["WAIVER_1115"], "inLieuServicesAndSettings": null, "modifiedBenefitsProvided": null, "modifiedGeoAreaServed": null, "modifiedMedicaidBeneficiaries": null, "modifiedRiskSharingStrategy": null, "modifiedIncentiveArrangements": null, "modifiedWitholdAgreements": null, "modifiedStateDirectedPayments": null, "modifiedPassThroughPayments": null, "modifiedPaymentsForMentalDiseaseInstitutions": null, "modifiedMedicalLossRatioStandards": null, "modifiedOtherFinancialPaymentIncentive": null, "modifiedEnrollmentProcess": null, "modifiedGrevienceAndAppeal": null, "modifiedNetworkAdequacyStandards": null, "modifiedLengthOfContract": null, "modifiedNonRiskPaymentArrangements": null, "__typename": "ContractFormData" }, "__typename": "ContractRevision" }], "contractRevision": { "id": "5e124160-8ac5-4d6f-9733-c5e8723c5af6", "createdAt": "2024-05-07T19:44:53.732Z", "updatedAt": "2024-05-07T19:46:19.377Z", "contractName": "MCR-FL-0221-PCCME", "submitInfo": { "updatedAt": "2024-05-07T19:46:19.376Z", "updatedBy": "team@example.com", "updatedReason": "Initial submission", "__typename": "UpdateInformation" }, "unlockInfo": null, "formData": { "programIDs": ["037af66b-81eb-4472-8b80-01edf17d12d9"], "populationCovered": "CHIP", "submissionType": "CONTRACT_ONLY", "riskBasedContract": true, "submissionDescription": "test", "stateContacts": [{ "name": "Raymond Holt", "titleRole": "test", "email": "kaleigh@example.com", "__typename": "StateContact" }], "supportingDocuments": [], "contractType": "BASE", "contractExecutionStatus": "EXECUTED", "contractDocuments": [{ "name": "Test document.pdf", "s3URL": "s3://uploads-val-uploads-798659716464/63f44255-e82a-4156-996c-876a1ca86768.pdf/Test document.pdf", "sha256": "66b53218e2e32b046a354cf78a604fcd24825b3958044c6de53ea1b2b3ed6cf9", "dateAdded": "2024-05-07", "__typename": "GenericDocument" }], "contractDateStart": "2024-07-01", "contractDateEnd": "2025-06-30", "managedCareEntities": ["MCO"], "federalAuthorities": ["WAIVER_1115"], "inLieuServicesAndSettings": null, "modifiedBenefitsProvided": null, "modifiedGeoAreaServed": null, "modifiedMedicaidBeneficiaries": null, "modifiedRiskSharingStrategy": null, "modifiedIncentiveArrangements": null, "modifiedWitholdAgreements": null, "modifiedStateDirectedPayments": null, "modifiedPassThroughPayments": null, "modifiedPaymentsForMentalDiseaseInstitutions": null, "modifiedMedicalLossRatioStandards": null, "modifiedOtherFinancialPaymentIncentive": null, "modifiedEnrollmentProcess": null, "modifiedGrevienceAndAppeal": null, "modifiedNetworkAdequacyStandards": null, "modifiedLengthOfContract": null, "modifiedNonRiskPaymentArrangements": null, "__typename": "ContractFormData" }, "__typename": "ContractRevision" }, "rateRevisions": [], "__typename": "ContractPackageSubmission" }] }

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
    mockContractPackageWithDifferentProgramsInRevisions
}


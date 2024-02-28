/*
    Mock different health plan form data that match frontend types.
    These helper functions allow us to compose together different proto form data to serialize and then attach in our health plan package GQL queries/ mutations
    See HealthPlanPackageGQLMock` file for usage

    Future refactors - it seems like we are starting to also add these types of mocks in common-code/healthPlanFormDataMocks.
    We may be able to move these mocks in that file as well.
*/

import dayjs from 'dayjs'
import {
    basicLockedHealthPlanFormData,
    basicHealthPlanFormData,
    unlockedWithALittleBitOfEverything,
} from '../../common-code/healthPlanFormDataMocks'

import {
    HealthPlanFormDataType,
    LockedHealthPlanFormDataType,
    SubmissionDocument,
    UnlockedHealthPlanFormDataType,
} from '../../common-code/healthPlanFormDataType'
import {
    domainToBase64,
    protoToBase64,
} from '../../common-code/proto/healthPlanFormDataProto'
import { HealthPlanPackage, UpdateInformation, Contract, Rate } from '../../gen/gqlClient'
import { mockMNState } from './stateMock'

function mockDraft(
    partial?: Partial<UnlockedHealthPlanFormDataType>
): UnlockedHealthPlanFormDataType {
    return {
        status: 'DRAFT',
        stateNumber: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-123',
        stateCode: 'MN',
        programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
        populationCovered: 'MEDICAID',
        submissionType: 'CONTRACT_ONLY',
        riskBasedContract: false,
        submissionDescription: 'A real submission',
        documents: [],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDocuments: [],
        contractDateStart: new Date(),
        contractDateEnd: dayjs().add(2, 'days').toDate(),
        contractAmendmentInfo: undefined,
        managedCareEntities: [],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateInfos: [],
        stateContacts: [],
        addtlActuaryContacts: [],
        addtlActuaryCommunicationPreference: undefined,
        statutoryRegulatoryAttestation: false,
        statutoryRegulatoryAttestationDescription: 'No compliance',
        ...partial,
    }
}

function mockBaseContract(
    partial?: Partial<UnlockedHealthPlanFormDataType>
): UnlockedHealthPlanFormDataType {
    return {
        status: 'DRAFT',
        stateNumber: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-123',
        stateCode: 'MN',
        programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
        populationCovered: 'MEDICAID',
        submissionType: 'CONTRACT_ONLY',
        riskBasedContract: true,
        submissionDescription: 'A real submission',
        documents: [],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDocuments: [],
        contractDateStart: new Date(),
        contractDateEnd: new Date(),
        contractAmendmentInfo: {
            modifiedProvisions: {
                modifiedRiskSharingStrategy: true,
                modifiedIncentiveArrangements: false,
                modifiedWitholdAgreements: false,
                modifiedStateDirectedPayments: true,
                modifiedPassThroughPayments: true,
                modifiedPaymentsForMentalDiseaseInstitutions: false,
                modifiedNonRiskPaymentArrangements: true,
            },
        },
        managedCareEntities: [],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateInfos: [
            {
                rateType: 'NEW',
                rateCapitationType: 'RATE_CELL',
                rateDocuments: [],
                supportingDocuments: [],
                rateDateStart: new Date(),
                rateDateEnd: new Date(),
                rateDateCertified: new Date(),
                rateAmendmentInfo: undefined,
                actuaryContacts: [],
                packagesWithSharedRateCerts: [],
            },
        ],
        stateContacts: [
            {
                name: 'Test Person',
                titleRole: 'A Role',
                email: 'test@test.com',
            },
        ],
        addtlActuaryContacts: [],
        addtlActuaryCommunicationPreference: undefined,
        statutoryRegulatoryAttestation: false,
        statutoryRegulatoryAttestationDescription: 'No compliance',
        ...partial,
    }
}

function mockContractAndRatesDraftV2(
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
            formData: {
                programIDs: ['pmap'],
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
                                email: 'actuarycontact1@test.com',
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

function mockContractAndRatesSubmittedV2(
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
                id: '123',
                formData: {
                    programIDs: ['pmap'],
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

function mockContractAndRatesDraft(
    partial?: Partial<UnlockedHealthPlanFormDataType>
): UnlockedHealthPlanFormDataType {
    return {
        status: 'DRAFT',
        stateNumber: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-123',
        stateCode: 'MN',
        programIDs: ['pmap'],
        populationCovered: 'MEDICAID',
        submissionType: 'CONTRACT_AND_RATES',
        riskBasedContract: true,
        submissionDescription: 'A real submission',
        documents: [],
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
        contractAmendmentInfo: {
            modifiedProvisions: {
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
            },
        },
        managedCareEntities: ['MCO'],
        federalAuthorities: ['STATE_PLAN'],
        rateInfos: [
            {
                rateType: 'AMENDMENT',
                rateCapitationType: 'RATE_CELL',
                rateDocuments: [],
                supportingDocuments: [],
                rateDateStart: new Date(),
                rateDateEnd: new Date(),
                rateDateCertified: new Date(),
                rateAmendmentInfo: {
                    effectiveDateStart: new Date(),
                    effectiveDateEnd: new Date(),
                },
                rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                actuaryContacts: [
                    {
                        actuarialFirm: 'DELOITTE',
                        name: 'Actuary Contact 1',
                        titleRole: 'Test Actuary Contact 1',
                        email: 'actuarycontact1@test.com',
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
        ],
        stateContacts: [
            {
                name: 'State Contact 1',
                titleRole: 'Test State Contact 1',
                email: 'statecontact1@test.com',
            },
            {
                name: 'State Contact 2',
                titleRole: 'Test State Contact 2',
                email: 'statecontact2@test.com',
            },
        ],
        addtlActuaryContacts: [
            {
                actuarialFirm: 'DELOITTE',
                name: 'Additional Actuary Contact',
                titleRole: 'Test Actuary Contact',
                email: 'additionalactuarycontact1@test.com',
            },
        ],
        addtlActuaryCommunicationPreference: 'OACT_TO_ACTUARY',
        statutoryRegulatoryAttestation: false,
        statutoryRegulatoryAttestationDescription: 'No compliance',
        ...partial,
    }
}

function mockStateSubmission(): LockedHealthPlanFormDataType {
    return {
        status: 'SUBMITTED',
        stateNumber: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-125',
        stateCode: 'MN',
        programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
        populationCovered: 'MEDICAID',
        submissionType: 'CONTRACT_AND_RATES',
        riskBasedContract: true,
        submissionDescription: 'A submitted submission',
        submittedAt: new Date(),
        documents: [
            {
                s3URL: 's3://bucketname/key/supporting-documents',
                sha256: 'fakesha',
                name: 'supporting documents',
            },
        ],
        contractType: 'BASE',
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
        contractAmendmentInfo: {
            modifiedProvisions: {
                inLieuServicesAndSettings: true,
                modifiedRiskSharingStrategy: false,
                modifiedIncentiveArrangements: false,
                modifiedWitholdAgreements: false,
                modifiedStateDirectedPayments: true,
                modifiedPassThroughPayments: false,
                modifiedPaymentsForMentalDiseaseInstitutions: false,
                modifiedNonRiskPaymentArrangements: true,
                modifiedBenefitsProvided: true,
                modifiedEnrollmentProcess: true,
                modifiedMedicaidBeneficiaries: true,
                modifiedGeoAreaServed: true,
                modifiedGrevienceAndAppeal: true,
                modifiedLengthOfContract: true,
                modifiedNetworkAdequacyStandards: true,
                modifiedMedicalLossRatioStandards: true,
                modifiedOtherFinancialPaymentIncentive: true,
            },
        },
        managedCareEntities: ['PAHP'],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateInfos: [
            {
                rateType: 'NEW',
                rateCapitationType: 'RATE_CELL',
                rateDocuments: [
                    {
                        s3URL: 's3://bucketname/key/rate',
                        sha256: 'fakesha',
                        name: 'rate',
                    },
                ],
                supportingDocuments: [
                    {
                        s3URL: 's3://bucketname/key/supporting-documents',
                        sha256: 'fakesha',
                        name: 'supporting documents',
                    },
                ],
                rateDateStart: new Date(),
                rateDateEnd: new Date(),
                rateDateCertified: new Date(),
                rateAmendmentInfo: undefined,
                rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                actuaryContacts: [
                    {
                        actuarialFirm: 'DELOITTE',
                        name: 'Actuary Contact 1',
                        titleRole: 'Test Actuary Contact 1',
                        email: 'actuarycontact1@test.com',
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
        ],
        stateContacts: [
            {
                name: 'Test Person',
                titleRole: 'A Role',
                email: 'test@test.com',
            },
        ],
        addtlActuaryContacts: [],
        addtlActuaryCommunicationPreference: undefined,
        statutoryRegulatoryAttestation: false,
        statutoryRegulatoryAttestationDescription: 'No compliance',
    }
}

function mockStateSubmissionContractAmendment(): LockedHealthPlanFormDataType {
    return {
        status: 'SUBMITTED',
        stateNumber: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'test-abc-125',
        stateCode: 'MN',
        programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
        populationCovered: 'MEDICAID',
        submissionType: 'CONTRACT_AND_RATES',
        riskBasedContract: true,
        submissionDescription: 'A submitted submission',
        submittedAt: new Date(),
        documents: [
            {
                s3URL: 's3://bucketname/key/supporting-documents',
                sha256: 'fakesha',
                name: 'supporting documents',
            },
        ],
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
        contractAmendmentInfo: {
            modifiedProvisions: {
                inLieuServicesAndSettings: false,
                modifiedBenefitsProvided: true,
                modifiedGeoAreaServed: false,
                modifiedMedicaidBeneficiaries: true,
                modifiedRiskSharingStrategy: true,
                modifiedIncentiveArrangements: true,
                modifiedWitholdAgreements: false,
                modifiedStateDirectedPayments: false,
                modifiedPassThroughPayments: true,
                modifiedPaymentsForMentalDiseaseInstitutions: true,
                modifiedMedicalLossRatioStandards: true,
                modifiedOtherFinancialPaymentIncentive: false,
                modifiedEnrollmentProcess: true,
                modifiedGrevienceAndAppeal: false,
                modifiedNetworkAdequacyStandards: true,
                modifiedLengthOfContract: false,
                modifiedNonRiskPaymentArrangements: true,
            },
        },
        managedCareEntities: ['PCCM'],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateInfos: [
            {
                rateType: 'NEW',
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
                rateAmendmentInfo: undefined,
                rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                actuaryContacts: [
                    {
                        actuarialFirm: 'DELOITTE',
                        name: 'Actuary Contact 1',
                        titleRole: 'Test Actuary Contact 1',
                        email: 'actuarycontact1@test.com',
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
        ],
        stateContacts: [
            {
                name: 'Test Person',
                titleRole: 'A Role',
                email: 'test@test.com',
            },
        ],
        addtlActuaryContacts: [],
        addtlActuaryCommunicationPreference: undefined,
        statutoryRegulatoryAttestation: false,
        statutoryRegulatoryAttestationDescription: 'No compliance',
    }
}

function mockDraftHealthPlanPackage(
    submissionData?: Partial<UnlockedHealthPlanFormDataType>
): HealthPlanPackage {
    const submission = { ...basicHealthPlanFormData(), ...submissionData }
    const b64 = domainToBase64(submission)

    return {
        __typename: 'HealthPlanPackage',
        id: 'test-id-123',
        status: 'DRAFT',
        initiallySubmittedAt: '2022-01-01',
        stateCode: 'MN',
        state: mockMNState(),
        revisions: [
            {
                node: {
                    id: 'revision1',
                    unlockInfo: null,
                    createdAt: '2019-01-01',
                    submitInfo: null,
                    formDataProto: b64,
                },
            },
        ],
    }
}

function mockSubmittedHealthPlanPackage(
    submissionData?: Partial<
        UnlockedHealthPlanFormDataType | LockedHealthPlanFormDataType
    >,
    submitInfo?: Partial<UpdateInformation>
): HealthPlanPackage {
    // get a submitted DomainModel submission
    // turn it into proto
    const submission = {
        ...basicLockedHealthPlanFormData(),
        ...submissionData,
    } as HealthPlanFormDataType
    const b64 = domainToBase64(submission)

    return {
        id: 'test-id-123',
        status: 'SUBMITTED',
        initiallySubmittedAt: '2022-01-02',
        stateCode: 'MN',
        mccrsID: null,
        state: mockMNState(),
        revisions: [
            {
                node: {
                    id: 'revision1',
                    createdAt: new Date('2021-01-01'),
                    unlockInfo: null,
                    submitInfo: {
                        updatedAt: new Date('2021-01-02'),
                        updatedBy: 'test@example.com',
                        updatedReason: 'Initial submit',
                        ...submitInfo,
                    },
                    formDataProto: b64,
                },
            },
        ],
    }
}

function mockSubmittedHealthPlanPackageWithRevisions(): HealthPlanPackage {
    // get a submitted DomainModel submission
    // turn it into proto
    const submission = basicLockedHealthPlanFormData()
    const b64 = domainToBase64(submission)

    return {
        id: 'test-id-123',
        status: 'RESUBMITTED',
        initiallySubmittedAt: '2022-01-01',
        stateCode: 'MN',
        state: mockMNState(),
        revisions: [
            {
                node: {
                    id: 'sd596de8-852d-4e42-ab0a-c9c9bf78c3c1',
                    unlockInfo: {
                        updatedAt: '2022-03-25T01:18:44.663Z',
                        updatedBy: 'zuko@example.com',
                        updatedReason: 'Latest unlock',
                    },
                    submitInfo: {
                        updatedAt: '2022-03-25T01:19:46.154Z',
                        updatedBy: 'aang@example.com',
                        updatedReason: 'Should be latest resubmission',
                        __typename: 'UpdateInformation',
                    },
                    createdAt: '2022-03-25T01:18:44.665Z',
                    formDataProto: b64,
                },
            },
            {
                node: {
                    id: '26596de8-852d-4e42-bb0a-c9c9bf78c3de',
                    unlockInfo: {
                        updatedAt: '2022-03-24T01:18:44.663Z',
                        updatedBy: 'zuko@example.com',
                        updatedReason: 'testing stuff',
                    },
                    submitInfo: {
                        updatedAt: '2022-03-24T01:19:46.154Z',
                        updatedBy: 'aang@example.com',
                        updatedReason: 'Placeholder resubmission reason',
                    },
                    createdAt: '2022-03-24T01:18:44.665Z',
                    formDataProto: b64,
                },
            },
            {
                node: {
                    id: 'e048cdcf-5b19-4acb-8ead-d7dc2fd6cd30',
                    unlockInfo: null,
                    submitInfo: {
                        updatedAt: '2022-03-23T02:08:52.259Z',
                        updatedBy: 'aang@example.com',
                        updatedReason: 'Initial submission',
                    },
                    createdAt: '2022-03-23T02:08:14.241Z',
                    formDataProto: b64,
                },
            },
        ],
    }
}

function mockUnlockedHealthPlanPackage(
    submissionData?: Partial<UnlockedHealthPlanFormDataType>,
    unlockInfo?: Partial<UpdateInformation>
): HealthPlanPackage {
    const submission = {
        ...unlockedWithALittleBitOfEverything(),
        ...submissionData,
    }
    const b64 = domainToBase64(submission)
    const b64Previous = domainToBase64({
        ...unlockedWithALittleBitOfEverything(),
    })

    return {
        id: 'test-id-123',
        status: 'UNLOCKED',
        initiallySubmittedAt: '2020-01-01',
        stateCode: 'MN',
        mccrsID: null,
        state: mockMNState(),
        revisions: [
            {
                node: {
                    id: 'revision3',
                    createdAt: new Date(),
                    unlockInfo: {
                        updatedAt: new Date(),
                        updatedBy: 'bob@dmas.mn.gov',
                        updatedReason: 'Test unlock reason',
                        ...unlockInfo,
                    },
                    submitInfo: null,
                    formDataProto: b64,
                },
            },
            {
                node: {
                    id: 'revision2',
                    createdAt: new Date('2020-07-01'),
                    unlockInfo: {
                        updatedAt: new Date('2020-08-01'),
                        updatedBy: 'bob@dmas.mn.gov',
                        updatedReason: 'Test unlock reason',
                        ...unlockInfo,
                    },
                    submitInfo: {
                        updatedAt: new Date('2020-07-15'),
                        updatedBy: 'bob@dmas.mn.gov',
                        updatedReason: 'Second Submit',
                    },
                    formDataProto: b64Previous,
                },
            },
            {
                node: {
                    id: 'revision1',
                    createdAt: new Date('2020-01-01'),
                    unlockInfo: null,
                    submitInfo: {
                        updatedAt: new Date('2021-01-02'),
                        updatedBy: 'test@example.com',
                        updatedReason: 'Initial submit',
                    },
                    formDataProto: b64Previous,
                },
            },
        ],
    }
}

function mockUnlockedHealthPlanPackageWithOldProtos(
    unlockedWithOldProto: Buffer
): HealthPlanPackage {
    // other mocks take a submission and convert it to a proto, but here we pass in a proto
    const b64 = protoToBase64(unlockedWithOldProto)

    return {
        id: 'test-id-123',
        status: 'UNLOCKED',
        initiallySubmittedAt: '2020-01-01',
        stateCode: 'MN',
        state: mockMNState(),
        revisions: [
            {
                node: {
                    id: 'revision3',
                    createdAt: new Date('2020-09-01'),
                    unlockInfo: {
                        updatedAt: new Date('2020-09-02'),
                        updatedBy: 'bob@dmas.mn.gov',
                        updatedReason: 'Test unlock reason',
                    },
                    submitInfo: null,
                    formDataProto: b64,
                },
            },
            {
                node: {
                    id: 'revision2',
                    createdAt: new Date('2020-07-01'),
                    unlockInfo: {
                        updatedAt: new Date('2020-08-01'),
                        updatedBy: 'bob@dmas.mn.gov',
                        updatedReason: 'Test unlock reason',
                    },
                    submitInfo: {
                        updatedAt: new Date('2020-07-15'),
                        updatedBy: 'bob@dmas.mn.gov',
                        updatedReason: 'Second Submit',
                    },
                    formDataProto: b64,
                },
            },
            {
                node: {
                    id: 'revision1',
                    createdAt: new Date('2020-01-01'),
                    unlockInfo: null,
                    submitInfo: {
                        updatedAt: new Date('2021-01-02'),
                        updatedBy: 'test@example.com',
                        updatedReason: 'Initial submit',
                    },
                    formDataProto: b64,
                },
            },
        ],
    }
}

function mockUnlockedHealthPlanPackageWithDocuments(): HealthPlanPackage {
    // SETUP
    // for this test we want to have a package with a few different revisions
    // with different documents setup.
    const docs1: SubmissionDocument[] = [
        {
            s3URL: 's3://bucketname/one-one/one-one.png',
            sha256: 'fakesha',
            name: 'one one',
        },
        {
            s3URL: 's3://bucketname/one-two/one-two.png',
            sha256: 'fakesha',
            name: 'one two',
        },
        {
            s3URL: 's3://bucketname/one-three/one-three.png',
            sha256: 'fakesha',
            name: 'one three',
        },
    ]
    const docs2: SubmissionDocument[] = [
        {
            s3URL: 's3://bucketname/one-two/one-two.png',
            sha256: 'fakesha',
            name: 'one two',
        },
        {
            s3URL: 's3://bucketname/one-three/one-three.png',
            sha256: 'fakesha',
            name: 'one three',
        },
        {
            s3URL: 's3://bucketname/two-one/two-one.png',
            sha256: 'fakesha',
            name: 'two one',
        },
    ]
    const docs3: SubmissionDocument[] = [
        {
            s3URL: 's3://bucketname/one-two/one-two.png',
            sha256: 'fakesha',
            name: 'one two',
        },
        {
            s3URL: 's3://bucketname/two-one/two-one.png',
            sha256: 'fakesha',
            name: 'two one',
        },
        {
            s3URL: 's3://bucketname/three-one/three-one.png',
            sha256: 'fakesha',
            name: 'three one',
        },
    ]

    const baseFormData = basicLockedHealthPlanFormData()
    baseFormData.documents = docs1
    const b64one = domainToBase64(baseFormData)

    baseFormData.documents = docs2
    const b64two = domainToBase64(baseFormData)

    const unlockedFormData = basicHealthPlanFormData()
    unlockedFormData.documents = docs3
    const b64three = domainToBase64(unlockedFormData)

    // set our form data for each of these revisions.
    const testPackage = mockUnlockedHealthPlanPackage()
    testPackage.revisions[2].node.formDataProto = b64one
    testPackage.revisions[1].node.formDataProto = b64two
    testPackage.revisions[0].node.formDataProto = b64three

    return testPackage
}

export {
    mockContractAndRatesDraft,
    mockContractAndRatesDraftV2,
    mockContractAndRatesSubmittedV2,
    mockStateSubmission,
    mockBaseContract,
    mockDraft,
    mockStateSubmissionContractAmendment,
    mockDraftHealthPlanPackage,
    mockSubmittedHealthPlanPackage,
    mockUnlockedHealthPlanPackageWithDocuments,
    mockUnlockedHealthPlanPackageWithOldProtos,
    mockSubmittedHealthPlanPackageWithRevisions,
    mockUnlockedHealthPlanPackage,
}

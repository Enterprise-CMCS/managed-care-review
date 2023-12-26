import {
    UnlockedHealthPlanFormDataType,
    LockedHealthPlanFormDataType,
    ProgramArgType,
} from '../healthPlanFormDataType'

type State = {
    code: string
    name: string
    programs: ProgramArgType[]
}
export function mockMNState(): State {
    return {
        name: 'Minnesota',
        programs: [
            {
                id: 'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                fullName: 'Special Needs Basic Care',
                name: 'SNBC',
            },
            {
                id: 'd95394e5-44d1-45df-8151-1cc1ee66f100',
                fullName: 'Prepaid Medical Assistance Program',
                name: 'PMAP',
            },
            {
                id: 'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
                fullName: 'Minnesota Senior Care Plus ',
                name: 'MSC+',
            },
            {
                id: '3fd36500-bf2c-47bc-80e8-e7aa417184c5',
                fullName: 'Minnesota Senior Health Options',
                name: 'MSHO',
            },
        ],
        code: 'MN',
    }
}

function newHealthPlanFormData(): UnlockedHealthPlanFormDataType {
    return {
        createdAt: new Date(Date.UTC(2021, 4, 10)),
        updatedAt: new Date(),
        status: 'DRAFT',
        stateNumber: 5,
        id: 'test-abc-123',
        stateCode: 'MN',
        populationCovered: 'MEDICAID',
        programIDs: [mockMNState().programs[0].id],
        submissionType: 'CONTRACT_AND_RATES',
        riskBasedContract: true,
        submissionDescription: 'A real submission',
        documents: [],
        contractDocuments: [],
        rateInfos: [],
        managedCareEntities: [],
        federalAuthorities: [],
        stateContacts: [],
        addtlActuaryContacts: [],
        statutoryRegulatoryAttestation: true,
    }
}

function basicHealthPlanFormData(): UnlockedHealthPlanFormDataType {
    return {
        createdAt: new Date(Date.UTC(2021, 4, 10)),
        updatedAt: new Date(),
        status: 'DRAFT',
        stateNumber: 5,
        id: 'test-abc-123',
        stateCode: 'MN',
        populationCovered: 'MEDICAID',
        programIDs: [mockMNState().programs[0].id],
        submissionType: 'CONTRACT_AND_RATES',
        riskBasedContract: true,
        submissionDescription: 'A real submission',
        documents: [],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDateStart: new Date(Date.UTC(2021, 4, 22)),
        contractDateEnd: new Date(Date.UTC(2022, 4, 21)),
        contractDocuments: [],
        rateInfos: [],
        managedCareEntities: [],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        stateContacts: [],
        addtlActuaryContacts: [],
        statutoryRegulatoryAttestation: true,
    }
}

function contractOnly(): UnlockedHealthPlanFormDataType {
    return {
        createdAt: new Date(Date.UTC(2021, 4, 10)),
        updatedAt: new Date(),
        status: 'DRAFT',
        stateNumber: 5,
        id: 'test-abc-123',
        stateCode: 'MN',
        populationCovered: 'MEDICAID',
        programIDs: [mockMNState().programs[0].id],
        submissionType: 'CONTRACT_ONLY',
        riskBasedContract: false,
        submissionDescription: 'A real submission',
        documents: [],
        contractDocuments: [],
        rateInfos: [],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDateStart: new Date(Date.UTC(2021, 4, 22)),
        contractDateEnd: new Date(Date.UTC(2022, 4, 21)),
        managedCareEntities: [],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        stateContacts: [],
        addtlActuaryContacts: [],
        statutoryRegulatoryAttestation: true,
    }
}

function contractAmendedOnly(): UnlockedHealthPlanFormDataType {
    return {
        createdAt: new Date(Date.UTC(2021, 4, 10)),
        updatedAt: new Date(),
        status: 'DRAFT',
        stateNumber: 5,
        id: 'test-abc-123',
        stateCode: 'MN',
        populationCovered: 'MEDICAID',
        programIDs: [mockMNState().programs[0].id],
        submissionType: 'CONTRACT_ONLY',
        riskBasedContract: false,
        submissionDescription: 'A real submission',
        documents: [],
        contractDocuments: [],
        rateInfos: [],
        contractType: 'AMENDMENT',
        contractExecutionStatus: 'EXECUTED',
        contractDateStart: new Date(Date.UTC(2021, 4, 22)),
        contractDateEnd: new Date(Date.UTC(2022, 4, 21)),
        managedCareEntities: [],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        stateContacts: [],
        addtlActuaryContacts: [],
        contractAmendmentInfo: {
            modifiedProvisions: {
                inLieuServicesAndSettings: false,
                modifiedBenefitsProvided: true,
                modifiedGeoAreaServed: false,
                modifiedMedicaidBeneficiaries: true,
                modifiedRiskSharingStrategy: true,
                modifiedIncentiveArrangements: false,
                modifiedWitholdAgreements: false,
                modifiedStateDirectedPayments: false,
                modifiedPassThroughPayments: false,
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
        statutoryRegulatoryAttestation: false,
        statutoryRegulatoryAttestationDescription: 'No compliance',
    }
}

function unlockedWithContacts(): UnlockedHealthPlanFormDataType {
    return {
        createdAt: new Date(Date.UTC(2021, 4, 10)),
        updatedAt: new Date(),
        status: 'DRAFT',
        stateNumber: 5,
        id: 'test-abc-123',
        stateCode: 'MN',
        populationCovered: 'MEDICAID',
        programIDs: [mockMNState().programs[0].id],
        submissionType: 'CONTRACT_AND_RATES',
        riskBasedContract: true,
        submissionDescription: 'A real submission',
        documents: [],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDateStart: new Date(Date.UTC(2021, 4, 22)),
        contractDateEnd: new Date(Date.UTC(2022, 4, 21)),
        contractDocuments: [],
        rateInfos: [
            {
                id: 'test-rate-certification-one',
                rateType: 'AMENDMENT',
                rateCapitationType: 'RATE_CELL',
                rateDateStart: new Date(Date.UTC(2021, 4, 22)),
                rateDateEnd: new Date(Date.UTC(2022, 3, 29)),
                rateDateCertified: new Date(Date.UTC(2021, 4, 23)),
                rateAmendmentInfo: {
                    effectiveDateStart: new Date(Date.UTC(2022, 5, 21)),
                    effectiveDateEnd: new Date(Date.UTC(2022, 9, 21)),
                },
                rateProgramIDs: [mockMNState().programs[0].id],
                rateCertificationName:
                    'MCR-MN-0005-SNBC-RATE-20220621-20221021-AMENDMENT-20210523',
                rateDocuments: [],
                supportingDocuments: [],
                actuaryContacts: [
                    {
                        name: 'foo bar',
                        titleRole: 'manager',
                        email: 'soandso@example.com',
                        actuarialFirm: 'OTHER' as const,
                        actuarialFirmOther: 'ACME',
                    },
                    {
                        name: 'Fine Bab',
                        titleRole: 'supervisor',
                        email: 'lodar@example.com',
                        actuarialFirm: 'MERCER' as const,
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
        ],
        managedCareEntities: [],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        stateContacts: [
            {
                name: 'foo bar',
                titleRole: 'manager',
                email: 'soandso@example.com',
            },
            {
                name: 'Fine Bab',
                titleRole: 'supervisor',
                email: 'lodar@example.com',
            },
        ],
        addtlActuaryContacts: [
            {
                name: 'foo bar',
                titleRole: 'manager',
                email: 'soandso@example.com',
                actuarialFirm: 'OTHER' as const,
                actuarialFirmOther: 'ACME',
            },
            {
                name: 'Fine Bab',
                titleRole: 'supervisor',
                email: 'lodar@example.com',
                actuarialFirm: 'MERCER' as const,
            },
        ],
        addtlActuaryCommunicationPreference: 'OACT_TO_ACTUARY',
        statutoryRegulatoryAttestation: false,
        statutoryRegulatoryAttestationDescription: 'No compliance',
    }
}

function unlockedWithDocuments(): UnlockedHealthPlanFormDataType {
    return {
        createdAt: new Date(Date.UTC(2021, 4, 10)),
        updatedAt: new Date(),
        status: 'DRAFT',
        stateNumber: 5,
        id: 'test-abc-123',
        stateCode: 'MN',
        populationCovered: 'MEDICAID',
        programIDs: [mockMNState().programs[0].id],
        submissionType: 'CONTRACT_AND_RATES',
        riskBasedContract: true,
        submissionDescription: 'A real submission',
        documents: [
            {
                s3URL: 's3://bucketname/key/foo.png',
                name: 'contract doc',
                sha256: 'fakesha',
            },
            {
                s3URL: 's3://bucketname/key/foo.png',
                name: 'rates and contract addendum doc',
                sha256: 'fakesha',
            },
        ],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDateStart: new Date(Date.UTC(2021, 4, 22)),
        contractDateEnd: new Date(Date.UTC(2022, 4, 21)),
        contractDocuments: [
            {
                s3URL: 's3://bucketname/key/foo.png',
                name: 'contract doc',
                sha256: 'fakesha',
            },
        ],
        rateInfos: [
            {
                id: 'test-rate-certification-one',
                rateType: 'AMENDMENT',
                rateCapitationType: 'RATE_CELL',
                rateDateStart: new Date(Date.UTC(2021, 4, 22)),
                rateDateEnd: new Date(Date.UTC(2022, 3, 29)),
                rateDateCertified: new Date(Date.UTC(2021, 4, 23)),
                rateAmendmentInfo: {
                    effectiveDateStart: new Date(Date.UTC(2022, 5, 21)),
                    effectiveDateEnd: new Date(Date.UTC(2022, 9, 21)),
                },
                rateProgramIDs: [mockMNState().programs[0].id],
                rateCertificationName:
                    'MCR-MN-0005-SNBC-RATE-20220621-20221021-AMENDMENT-20210523',
                rateDocuments: [
                    {
                        s3URL: 's3://bucketname/key/foo.png',
                        name: 'Rates certification',
                        sha256: 'fakesha',
                    },
                ],
                supportingDocuments: [],
                actuaryContacts: [
                    {
                        name: 'foo bar',
                        titleRole: 'manager',
                        email: 'soandso@example.com',
                        actuarialFirm: 'OTHER' as const,
                        actuarialFirmOther: 'ACME',
                    },
                    {
                        name: 'Fine Bab',
                        titleRole: 'supervisor',
                        email: 'lodar@example.com',
                        actuarialFirm: 'MERCER' as const,
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
        ],
        managedCareEntities: [],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        stateContacts: [
            {
                name: 'foo bar',
                titleRole: 'manager',
                email: 'soandso@example.com',
            },
            {
                name: 'Fine Bab',
                titleRole: 'supervisor',
                email: 'lodar@example.com',
            },
        ],
        addtlActuaryContacts: [
            {
                name: 'foo bar',
                titleRole: 'manager',
                email: 'soandso@example.com',
                actuarialFirm: 'OTHER' as const,
                actuarialFirmOther: 'ACME',
            },
            {
                name: 'Fine Bab',
                titleRole: 'supervisor',
                email: 'lodar@example.com',
                actuarialFirm: 'MERCER' as const,
            },
        ],
        addtlActuaryCommunicationPreference: 'OACT_TO_ACTUARY',
        statutoryRegulatoryAttestation: false,
        statutoryRegulatoryAttestationDescription: 'No compliance',
    }
}

function unlockedWithFullRates(): UnlockedHealthPlanFormDataType {
    return {
        createdAt: new Date(Date.UTC(2021, 4, 10)),
        updatedAt: new Date(),
        status: 'DRAFT',
        stateNumber: 5,
        id: 'test-abc-123',
        stateCode: 'MN',
        populationCovered: 'MEDICAID',
        programIDs: [mockMNState().programs[0].id],
        submissionType: 'CONTRACT_AND_RATES',
        riskBasedContract: true,
        submissionDescription: 'A real submission',
        documents: [
            {
                s3URL: 's3://bucketname/key/foo.png',
                name: 'contract doc',
                sha256: 'fakesha',
            },
            {
                s3URL: 's3://bucketname/key/foo.png',
                name: 'rates and contract addendum doc',
                sha256: 'fakesha',
            },
        ],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDateStart: new Date(Date.UTC(2021, 4, 22)),
        contractDateEnd: new Date(Date.UTC(2022, 4, 21)),
        contractDocuments: [],
        managedCareEntities: ['PIHP'],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateInfos: [
            {
                id: 'test-rate-certification-one',
                rateType: 'AMENDMENT',
                rateCapitationType: 'RATE_CELL',
                rateDateStart: new Date(Date.UTC(2021, 4, 22)),
                rateDateEnd: new Date(Date.UTC(2022, 3, 29)),
                rateDateCertified: new Date(Date.UTC(2021, 4, 23)),
                rateAmendmentInfo: {
                    effectiveDateStart: new Date(Date.UTC(2022, 5, 21)),
                    effectiveDateEnd: new Date(Date.UTC(2022, 9, 21)),
                },
                rateProgramIDs: [mockMNState().programs[0].id],
                rateCertificationName:
                    'MCR-MN-0005-SNBC-RATE-20220621-20221021-AMENDMENT-20210523',
                rateDocuments: [
                    {
                        s3URL: 's3://bucketname/key/foo.png',
                        name: 'Rates certification',
                        sha256: 'fakesha',
                    },
                ],
                supportingDocuments: [],
                actuaryContacts: [
                    {
                        name: 'foo bar',
                        titleRole: 'manager',
                        email: 'soandso@example.com',
                        actuarialFirm: 'OTHER' as const,
                        actuarialFirmOther: 'ACME',
                    },
                    {
                        name: 'Fine Bab',
                        titleRole: 'supervisor',
                        email: 'lodar@example.com',
                        actuarialFirm: 'MERCER' as const,
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
        ],
        stateContacts: [
            {
                name: 'foo bar',
                titleRole: 'manager',
                email: 'soandso@example.com',
            },
            {
                name: 'Fine Bab',
                titleRole: 'supervisor',
                email: 'lodar@example.com',
            },
        ],
        addtlActuaryContacts: [
            {
                name: 'foo bar',
                titleRole: 'manager',
                email: 'soandso@example.com',
                actuarialFirm: 'OTHER' as const,
                actuarialFirmOther: 'ACME',
            },
            {
                name: 'Fine Bab',
                titleRole: 'supervisor',
                email: 'lodar@example.com',
                actuarialFirm: 'MERCER' as const,
            },
        ],
        addtlActuaryCommunicationPreference: 'OACT_TO_ACTUARY',
        statutoryRegulatoryAttestation: false,
        statutoryRegulatoryAttestationDescription: 'No compliance',
    }
}

function unlockedWithFullContracts(): UnlockedHealthPlanFormDataType {
    return {
        createdAt: new Date(Date.UTC(2021, 4, 10)),
        updatedAt: new Date(),
        status: 'DRAFT',
        stateNumber: 5,
        id: 'test-abc-123',
        stateCode: 'MN',
        populationCovered: 'MEDICAID',
        programIDs: [mockMNState().programs[0].id],
        submissionType: 'CONTRACT_AND_RATES',
        riskBasedContract: true,
        submissionDescription: 'A real submission',
        documents: [
            {
                s3URL: 's3://bucketname/key/foo.png',
                name: 'contract doc',
                sha256: 'fakesha',
            },
            {
                s3URL: 's3://bucketname/key/foo.png',
                name: 'rates and contract addendum doc',
                sha256: 'fakesha',
            },
        ],
        contractType: 'AMENDMENT',
        contractExecutionStatus: 'UNEXECUTED',
        contractDateStart: new Date(Date.UTC(2021, 4, 22)),
        contractDateEnd: new Date(Date.UTC(2022, 4, 21)),
        contractDocuments: [
            {
                s3URL: 's3://bucketname/key/foo.png',
                name: 'contract doc',
                sha256: 'fakesha',
            },
        ],
        contractAmendmentInfo: {
            modifiedProvisions: {
                inLieuServicesAndSettings: true,
                modifiedBenefitsProvided: true,
                modifiedGeoAreaServed: true,
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
                modifiedNetworkAdequacyStandards: false,
                modifiedLengthOfContract: false,
                modifiedNonRiskPaymentArrangements: false,
            },
        },
        managedCareEntities: ['PIHP'],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateInfos: [
            {
                id: 'test-rate-certification-one',
                rateType: 'AMENDMENT',
                rateCapitationType: 'RATE_RANGE',
                rateDateStart: new Date(Date.UTC(2021, 4, 22)),
                rateDateEnd: new Date(Date.UTC(2022, 3, 29)),
                rateDateCertified: new Date(Date.UTC(2021, 4, 23)),
                rateAmendmentInfo: {
                    effectiveDateStart: new Date(Date.UTC(2022, 5, 21)),
                    effectiveDateEnd: new Date(Date.UTC(2022, 9, 21)),
                },
                rateProgramIDs: [mockMNState().programs[0].id],
                rateCertificationName:
                    'MCR-MN-0005-SNBC-RATE-20220621-20221021-AMENDMENT-20210523',
                rateDocuments: [
                    {
                        s3URL: 's3://bucketname/key/foo.png',
                        name: 'Rates certification',
                        sha256: 'fakesha',
                    },
                ],
                supportingDocuments: [],
                actuaryContacts: [
                    {
                        name: 'foo bar',
                        titleRole: 'manager',
                        email: 'soandso@example.com',
                        actuarialFirm: 'OTHER' as const,
                        actuarialFirmOther: 'ACME',
                    },
                    {
                        name: 'Fine Bab',
                        titleRole: 'supervisor',
                        email: 'lodar@example.com',
                        actuarialFirm: 'MERCER' as const,
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
        ],
        stateContacts: [
            {
                name: 'foo bar',
                titleRole: 'manager',
                email: 'soandso@example.com',
            },
            {
                name: 'Fine Bab',
                titleRole: 'supervisor',
                email: 'lodar@example.com',
            },
        ],
        addtlActuaryContacts: [
            {
                name: 'foo bar',
                titleRole: 'manager',
                email: 'soandso@example.com',
                actuarialFirm: 'OTHER' as const,
                actuarialFirmOther: 'ACME',
            },
            {
                name: 'Fine Bab',
                titleRole: 'supervisor',
                email: 'lodar@example.com',
                actuarialFirm: 'MERCER' as const,
            },
        ],
        addtlActuaryCommunicationPreference: 'OACT_TO_ACTUARY',
        statutoryRegulatoryAttestation: false,
        statutoryRegulatoryAttestationDescription: 'No compliance',
    }
}

function unlockedWithALittleBitOfEverything(): UnlockedHealthPlanFormDataType {
    return {
        id: 'test-abc-123',
        createdAt: new Date(Date.UTC(2021, 4, 10)),
        updatedAt: new Date(Date.UTC(2021, 4, 13)),
        status: 'DRAFT',
        stateCode: 'MN',
        stateNumber: 5,
        populationCovered: 'MEDICAID',
        programIDs: [
            mockMNState().programs[0].id,
            mockMNState().programs[1].id,
            mockMNState().programs[2].id,
        ],
        submissionType: 'CONTRACT_AND_RATES',
        riskBasedContract: true,
        submissionDescription: 'A real submission',
        documents: [
            {
                s3URL: 's3://bucketname/key/foo.png',
                name: 'contract doc',
                sha256: 'fakesha',
            },
        ],
        contractType: 'AMENDMENT',
        contractExecutionStatus: 'UNEXECUTED',
        contractDateStart: new Date(Date.UTC(2021, 4, 22)),
        contractDateEnd: new Date(Date.UTC(2022, 4, 21)),
        contractDocuments: [
            {
                s3URL: 's3://bucketname/key/foo.png',
                name: 'contract doc',
                sha256: 'fakesha',
            },
        ],
        contractAmendmentInfo: {
            modifiedProvisions: {
                inLieuServicesAndSettings: false,
                modifiedBenefitsProvided: false,
                modifiedGeoAreaServed: false,
                modifiedMedicaidBeneficiaries: true,
                modifiedRiskSharingStrategy: true,
                modifiedIncentiveArrangements: false,
                modifiedWitholdAgreements: false,
                modifiedStateDirectedPayments: true,
                modifiedPassThroughPayments: true,
                modifiedPaymentsForMentalDiseaseInstitutions: true,
                modifiedMedicalLossRatioStandards: true,
                modifiedOtherFinancialPaymentIncentive: false,
                modifiedEnrollmentProcess: false,
                modifiedGrevienceAndAppeal: false,
                modifiedNetworkAdequacyStandards: true,
                modifiedLengthOfContract: false,
                modifiedNonRiskPaymentArrangements: true,
            },
        },
        managedCareEntities: ['PIHP', 'PCCM'],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateInfos: [
            {
                id: 'test-rate-certification-one',
                rateType: 'AMENDMENT',
                rateCapitationType: 'RATE_CELL',
                rateDocuments: [
                    {
                        s3URL: 's3://bucketname/key/foo.png',
                        name: 'rates cert 1',
                        sha256: 'fakesha',
                    },
                    {
                        s3URL: 's3://bucketname/key/foo.png',
                        name: 'rates cert 2',
                        sha256: 'fakesha',
                    },
                ],
                supportingDocuments: [],
                rateDateStart: new Date(Date.UTC(2021, 4, 22)),
                rateDateEnd: new Date(Date.UTC(2022, 3, 29)),
                rateDateCertified: new Date(Date.UTC(2021, 4, 23)),
                rateAmendmentInfo: {
                    effectiveDateStart: new Date(Date.UTC(2022, 5, 21)),
                    effectiveDateEnd: new Date(Date.UTC(2022, 9, 21)),
                },
                rateProgramIDs: [mockMNState().programs[0].id],
                rateCertificationName:
                    'MCR-MN-0005-SNBC-RATE-20220621-20221021-AMENDMENT-20210523',
                actuaryContacts: [
                    {
                        name: 'foo bar',
                        titleRole: 'manager',
                        email: 'soandso@example.com',
                        actuarialFirm: 'OTHER' as const,
                        actuarialFirmOther: 'ACME',
                    },
                    {
                        name: 'Fine Bab',
                        titleRole: 'supervisor',
                        email: 'lodar@example.com',
                        actuarialFirm: 'MERCER' as const,
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
        ],
        stateContacts: [
            {
                name: 'foo bar',
                titleRole: 'manager',
                email: 'soandso@example.com',
            },
            {
                name: 'Fine Bab',
                titleRole: 'supervisor',
                email: 'lodar@example.com',
            },
        ],
        addtlActuaryContacts: [
            {
                name: 'foo bar',
                titleRole: 'manager',
                email: 'soandso@example.com',
                actuarialFirm: 'OTHER' as const,
                actuarialFirmOther: 'ACME',
            },
            {
                name: 'Fine Bab',
                titleRole: 'supervisor',
                email: 'lodar@example.com',
                actuarialFirm: 'MERCER' as const,
            },
        ],
        addtlActuaryCommunicationPreference: 'OACT_TO_ACTUARY',
        statutoryRegulatoryAttestation: false,
        statutoryRegulatoryAttestationDescription: 'No compliance',
    }
}

function basicLockedHealthPlanFormData(): LockedHealthPlanFormDataType {
    return {
        createdAt: new Date(Date.UTC(2021, 4, 10)),
        updatedAt: new Date(),
        submittedAt: new Date(),
        status: 'SUBMITTED',
        stateNumber: 5,
        id: 'test-abc-123',
        stateCode: 'MN',
        populationCovered: 'MEDICAID',
        programIDs: [mockMNState().programs[0].id],
        submissionType: 'CONTRACT_ONLY',
        riskBasedContract: false,
        submissionDescription: 'A real submission',
        documents: [],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDateStart: new Date(Date.UTC(2021, 4, 22)),
        contractDateEnd: new Date(Date.UTC(2022, 4, 21)),
        contractDocuments: [
            {
                s3URL: 's3://bucketname/key/foo.png',
                name: 'contract doc',
                sha256: 'fakesha',
            },
        ],
        managedCareEntities: ['PIHP'],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        stateContacts: [
            {
                name: 'Some Body',
                email: 's@example.com',
                titleRole: 'Manager',
            },
        ],
        addtlActuaryContacts: [],
        rateInfos: [],
        statutoryRegulatoryAttestation: false,
        statutoryRegulatoryAttestationDescription: 'No compliance',
    }
}

export {
    newHealthPlanFormData,
    basicHealthPlanFormData,
    contractOnly,
    contractAmendedOnly,
    unlockedWithContacts,
    unlockedWithDocuments,
    unlockedWithFullRates,
    unlockedWithFullContracts,
    unlockedWithALittleBitOfEverything,
    basicLockedHealthPlanFormData,
}

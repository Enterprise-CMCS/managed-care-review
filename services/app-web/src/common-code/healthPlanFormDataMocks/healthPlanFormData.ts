import {
    UnlockedHealthPlanFormDataType,
    LockedHealthPlanFormDataType,
} from '../healthPlanFormDataType'

function newHealthPlanFormData(): UnlockedHealthPlanFormDataType {
    return {
        createdAt: new Date(Date.UTC(2021, 4, 10)),
        updatedAt: new Date(),
        status: 'DRAFT',
        stateNumber: 5,
        id: 'test-abc-123',
        stateCode: 'MN',
        programIDs: ['snbc'],
        submissionType: 'CONTRACT_AND_RATES',
        submissionDescription: 'A real submission',
        documents: [],
        contractDocuments: [],
        rateDocuments: [],
        rateProgramIDs: [],
        managedCareEntities: [],
        federalAuthorities: [],
        stateContacts: [],
        actuaryContacts: [],
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
        programIDs: ['snbc'],
        submissionType: 'CONTRACT_AND_RATES',
        submissionDescription: 'A real submission',
        documents: [],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDateStart: new Date(Date.UTC(2021, 4, 22)),
        contractDateEnd: new Date(Date.UTC(2022, 4, 21)),
        contractDocuments: [],
        rateDocuments: [],
        rateProgramIDs: [],
        managedCareEntities: [],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        stateContacts: [],
        actuaryContacts: [],
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
        programIDs: ['snbc'],
        submissionType: 'CONTRACT_ONLY',
        submissionDescription: 'A real submission',
        documents: [],
        contractDocuments: [],
        rateDocuments: [],
        rateProgramIDs: [],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDateStart: new Date(Date.UTC(2021, 4, 22)),
        contractDateEnd: new Date(Date.UTC(2022, 4, 21)),
        managedCareEntities: [],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        stateContacts: [],
        actuaryContacts: [],
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
        programIDs: ['snbc'],
        submissionType: 'CONTRACT_ONLY',
        submissionDescription: 'A real submission',
        documents: [],
        contractDocuments: [],
        rateDocuments: [],
        rateProgramIDs: [],
        contractType: 'AMENDMENT',
        contractExecutionStatus: 'EXECUTED',
        contractDateStart: new Date(Date.UTC(2021, 4, 22)),
        contractDateEnd: new Date(Date.UTC(2022, 4, 21)),
        managedCareEntities: [],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        stateContacts: [],
        actuaryContacts: [],
        contractAmendmentInfo: {
            modifiedProvisions: {
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
        programIDs: ['snbc'],
        submissionType: 'CONTRACT_AND_RATES',
        submissionDescription: 'A real submission',
        documents: [],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDateStart: new Date(Date.UTC(2021, 4, 22)),
        contractDateEnd: new Date(Date.UTC(2022, 4, 21)),
        contractDocuments: [],
        rateDocuments: [],
        rateProgramIDs: [],
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
        programIDs: ['snbc'],
        submissionType: 'CONTRACT_AND_RATES',
        submissionDescription: 'A real submission',
        documents: [
            {
                s3URL: 's3://bucketname/key/foo.png',
                name: 'contract doc',
                documentCategories: ['CONTRACT_RELATED'],
            },
            {
                s3URL: 's3://bucketname/key/foo.png',
                name: 'rates and contract addendum doc',
                documentCategories: ['CONTRACT_RELATED', 'RATES_RELATED'],
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
                documentCategories: ['CONTRACT'],
            },
        ],
        rateDocuments: [],
        rateProgramIDs: [],
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
        programIDs: ['snbc'],
        submissionType: 'CONTRACT_AND_RATES',
        submissionDescription: 'A real submission',
        documents: [
            {
                s3URL: 's3://bucketname/key/foo.png',
                name: 'contract doc',
                documentCategories: ['CONTRACT_RELATED'],
            },
            {
                s3URL: 's3://bucketname/key/foo.png',
                name: 'rates and contract addendum doc',
                documentCategories: ['CONTRACT_RELATED', 'RATES_RELATED'],
            },
        ],
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDateStart: new Date(Date.UTC(2021, 4, 22)),
        contractDateEnd: new Date(Date.UTC(2022, 4, 21)),
        contractDocuments: [],
        rateDocuments: [],
        managedCareEntities: ['PIHP'],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateType: 'AMENDMENT',
        rateCapitationType: 'RATE_CELL',
        rateDateStart: new Date(Date.UTC(2021, 4, 22)),
        rateDateEnd: new Date(Date.UTC(2022, 3, 29)),
        rateDateCertified: new Date(Date.UTC(2021, 4, 23)),
        rateAmendmentInfo: {
            effectiveDateStart: new Date(Date.UTC(2022, 5, 21)),
            effectiveDateEnd: new Date(Date.UTC(2022, 9, 21)),
        },
        rateProgramIDs: ['snbc'],
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
        programIDs: ['snbc'],
        submissionType: 'CONTRACT_AND_RATES',
        submissionDescription: 'A real submission',
        documents: [
            {
                s3URL: 's3://bucketname/key/foo.png',
                name: 'contract doc',
                documentCategories: ['CONTRACT_RELATED'],
            },
            {
                s3URL: 's3://bucketname/key/foo.png',
                name: 'rates and contract addendum doc',
                documentCategories: ['CONTRACT_RELATED', 'RATES_RELATED'],
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
                documentCategories: ['CONTRACT'],
            },
        ],
        rateDocuments: [
            {
                s3URL: 's3://bucketname/key/foo.png',
                name: 'Rates certification',
                documentCategories: ['RATES'],
            },
        ],
        contractAmendmentInfo: {
            modifiedProvisions: {
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
        rateType: 'AMENDMENT',
        rateCapitationType: 'RATE_RANGE',
        rateDateStart: new Date(Date.UTC(2021, 4, 22)),
        rateDateEnd: new Date(Date.UTC(2022, 3, 29)),
        rateDateCertified: new Date(Date.UTC(2021, 4, 23)),
        rateAmendmentInfo: {
            effectiveDateStart: new Date(Date.UTC(2022, 5, 21)),
            effectiveDateEnd: new Date(Date.UTC(2022, 9, 21)),
        },
        rateProgramIDs: ['snbc'],
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
    }
}

function unlockedWithALittleBitOfEverything(): UnlockedHealthPlanFormDataType {
    return {
        id: 'test-abc-123',
        createdAt: new Date(Date.UTC(2021, 4, 10)),
        updatedAt: new Date(),
        status: 'DRAFT',
        stateCode: 'MN',
        stateNumber: 5,
        programIDs: ['snbc'],
        submissionType: 'CONTRACT_AND_RATES',
        submissionDescription: 'A real submission',
        documents: [
            {
                s3URL: 's3://bucketname/key/foo.png',
                name: 'contract doc',
                documentCategories: ['CONTRACT_RELATED'],
            },
        ],
        contractType: 'AMENDMENT',
        contractExecutionStatus: 'UNEXECUTED',
        contractDateStart: new Date(Date.UTC(2021, 4, 22)),
        contractDateEnd: new Date(Date.UTC(2022, 4, 21)),
        contractDocuments: [],
        contractAmendmentInfo: {
            modifiedProvisions: {
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
        rateType: 'AMENDMENT',
        rateCapitationType: 'RATE_CELL',
        rateDocuments: [
            {
                s3URL: 's3://bucketname/key/foo.png',
                name: 'rates cert 1',
                documentCategories: ['RATES_RELATED'],
            },
            {
                s3URL: 's3://bucketname/key/foo.png',
                name: 'rates cert 2',
                documentCategories: ['RATES_RELATED'],
            },
        ],
        rateDateStart: new Date(Date.UTC(2021, 4, 22)),
        rateDateEnd: new Date(Date.UTC(2022, 3, 29)),
        rateDateCertified: new Date(Date.UTC(2021, 4, 23)),
        rateAmendmentInfo: {
            effectiveDateStart: new Date(Date.UTC(2022, 5, 21)),
            effectiveDateEnd: new Date(Date.UTC(2022, 9, 21)),
        },
        rateProgramIDs: ['snbc'],
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
        programIDs: ['snbc'],
        submissionType: 'CONTRACT_ONLY',
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
                documentCategories: ['CONTRACT'],
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
        actuaryContacts: [
            {
                name: 'Anne Acturay',
                email: 'aa@example.com',
                titleRole: 'Deputy',
                actuarialFirm: 'STATE_IN_HOUSE',
            },
        ],
        rateDocuments: [],
        rateProgramIDs: [],
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

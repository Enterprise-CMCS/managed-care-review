import {
    UnlockedHealthPlanFormDataType,
    LockedHealthPlanFormDataType,
    CalendarDate,
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
        contractDateStart: '2021-04-22' as CalendarDate,
        contractDateEnd: '2022-04-21' as CalendarDate,
        contractDocuments: [],
        rateDocuments: [],
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
        contractType: 'BASE',
        contractExecutionStatus: 'EXECUTED',
        contractDateStart: '2021-04-22' as CalendarDate,
        contractDateEnd: '2022-04-21' as CalendarDate,
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
        contractType: 'AMENDMENT',
        contractExecutionStatus: 'EXECUTED',
        contractDateStart: '2021-04-22' as CalendarDate,
        contractDateEnd: '2022-04-21' as CalendarDate,
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
        contractDateStart: '2021-04-22' as CalendarDate,
        contractDateEnd: '2022-04-21' as CalendarDate,
        contractDocuments: [],
        rateDocuments: [],
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
        contractDateStart: '2021-04-22' as CalendarDate,
        contractDateEnd: '2022-04-21' as CalendarDate,
        contractDocuments: [
            {
                s3URL: 's3://bucketname/key/foo.png',
                name: 'contract doc',
                documentCategories: ['CONTRACT'],
            },
        ],
        rateDocuments: [],
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
        contractDateStart: '2021-04-22' as CalendarDate,
        contractDateEnd: '2022-04-21' as CalendarDate,
        contractDocuments: [],
        rateDocuments: [],
        managedCareEntities: ['PIHP'],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateType: 'AMENDMENT',
        rateCapitationType: 'RATE_CELL',
        rateDateStart: '2021-04-22' as CalendarDate,
        rateDateEnd: '2022-03-29' as CalendarDate,
        rateDateCertified: '2021-04-23' as CalendarDate,
        rateAmendmentInfo: {
            effectiveDateStart: '2022-05-21' as CalendarDate,
            effectiveDateEnd: '2022-09-21' as CalendarDate,
        },
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
        contractDateStart: '2021-04-22' as CalendarDate,
        contractDateEnd: '2022-04-21' as CalendarDate,
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
        rateDateStart: '2021-04-22' as CalendarDate,
        rateDateEnd: '2022-03-29' as CalendarDate,
        rateDateCertified: '2021-04-23' as CalendarDate,
        rateAmendmentInfo: {
            effectiveDateStart: '2022-05-21' as CalendarDate,
            effectiveDateEnd: '2022-09-21' as CalendarDate,
        },
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
        contractDateStart: '2021-04-22' as CalendarDate,
        contractDateEnd: '2022-04-21' as CalendarDate,
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
        rateDateStart: '2021-04-22' as CalendarDate,
        rateDateEnd: '2022-03-29' as CalendarDate,
        rateDateCertified: '2021-04-23' as CalendarDate,
        rateAmendmentInfo: {
            effectiveDateStart: '2022-05-21' as CalendarDate,
            effectiveDateEnd: '2022-09-21' as CalendarDate,
        },
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
        contractDateStart: '2021-04-22' as CalendarDate,
        contractDateEnd: '2022-04-21' as CalendarDate,
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

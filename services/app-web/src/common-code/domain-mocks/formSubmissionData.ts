import { DraftSubmissionType, StateSubmissionType } from "../domain-models"

function newSubmission(): DraftSubmissionType {
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

function basicSubmission(): DraftSubmissionType {
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
        managedCareEntities: [],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        stateContacts: [],
        actuaryContacts: [],
    }
}

function contractOnly(): DraftSubmissionType {
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
        contractDateStart: new Date(Date.UTC(2021, 4, 22)),
        contractDateEnd: new Date(Date.UTC(2022, 4, 21)),
        managedCareEntities: [],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        stateContacts: [],
        actuaryContacts: [],
    }
}

function draftWithContacts(): DraftSubmissionType {
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

function draftWithDocuments(): DraftSubmissionType {
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

function draftWithFullRates(): DraftSubmissionType {
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
        rateDateStart: new Date(Date.UTC(2021, 4, 22)),
        rateDateEnd: new Date(Date.UTC(2022, 3, 29)),
        rateDateCertified: new Date(Date.UTC(2021, 4, 23)),
        rateAmendmentInfo: {
            effectiveDateStart: new Date(Date.UTC(2022, 5, 21)),
            effectiveDateEnd: new Date(Date.UTC(2022, 9, 21)),
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

function draftWithFullContracts(): DraftSubmissionType {
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
            itemsBeingAmended: [
                'ENROLLEE_ACCESS',
                'GEO_AREA_SERVED',
                'CAPITATION_RATES',
                'OTHER',
            ],
            otherItemBeingAmended: 'OTHERAMEND',
            capitationRatesAmendedInfo: {
                reason: 'OTHER',
                otherReason: 'somethingelse',
            },
            relatedToCovid19: true,
            relatedToVaccination: false,
        },
        managedCareEntities: ['PIHP'],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateType: 'AMENDMENT',
        rateDateStart: new Date(Date.UTC(2021, 4, 22)),
        rateDateEnd: new Date(Date.UTC(2022, 3, 29)),
        rateDateCertified: new Date(Date.UTC(2021, 4, 23)),
        rateAmendmentInfo: {
            effectiveDateStart: new Date(Date.UTC(2022, 5, 21)),
            effectiveDateEnd: new Date(Date.UTC(2022, 9, 21)),
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

function draftWithALittleBitOfEverything(): DraftSubmissionType {
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
            itemsBeingAmended: [
                'ENROLLEE_ACCESS',
                'GEO_AREA_SERVED',
                'CAPITATION_RATES',
                'OTHER',
            ],
            otherItemBeingAmended: 'OTHERAMEND',
            capitationRatesAmendedInfo: {
                reason: 'OTHER',
                otherReason: 'somethingelse',
            },
            relatedToCovid19: true,
            relatedToVaccination: false,
        },
        managedCareEntities: ['PIHP', 'PCCM'],
        federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
        rateType: 'AMENDMENT',
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

function basicStateSubmission(): StateSubmissionType {
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
        contractExecutionStatus: 'EXECUTED'
    }
}

export {
    newSubmission,
    basicSubmission,
    contractOnly,
    draftWithContacts,
    draftWithDocuments,
    draftWithFullRates,
    draftWithFullContracts,
    draftWithALittleBitOfEverything,
    basicStateSubmission,
}

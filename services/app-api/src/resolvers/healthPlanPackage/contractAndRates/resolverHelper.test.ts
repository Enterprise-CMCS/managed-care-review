import { mockInsertRateArgs } from '../../../testHelpers/rateDataMocks'
import {
    isEqualData,
    convertHealthPlanPackageRatesToDomain,
} from './resolverHelpers'
import type { UnlockedHealthPlanFormDataType } from '../../../../../app-web/src/common-code/healthPlanFormDataType'
import { must } from '../../../testHelpers'
import type { RateFormDataType } from '../../../domain-models/contractAndRates'

describe('isEqualRateData', () => {
    const rateDataTestCases = [
        {
            rateDataOne: mockInsertRateArgs({
                rateCapitationType: 'RATE_RANGE',
                rateDocuments: [
                    {
                        name: 'Rate 1 Doc',
                        s3URL: 'fakeS3URL1',
                        sha256: 'someShaForRateDoc1',
                    },
                ],
                rateDateStart: new Date(Date.UTC(2024, 5, 1)),
                rateDateEnd: new Date(Date.UTC(2025, 5, 1)),
                certifyingActuaryContacts: [
                    {
                        name: 'Actuary Contact 1',
                        titleRole: 'Title',
                        email: 'statecontact1@example.com',
                        actuarialFirm: 'MERCER',
                    },
                ],
            }),
            rateDataTwo: mockInsertRateArgs({
                rateCapitationType: 'RATE_RANGE',
                rateDocuments: [
                    {
                        name: 'Rate 1 Doc',
                        s3URL: 'fakeS3URL1',
                        sha256: 'someShaForRateDoc1',
                    },
                ],
                rateDateStart: new Date(Date.UTC(2024, 5, 1)),
                rateDateEnd: new Date(Date.UTC(2025, 5, 1)),
                certifyingActuaryContacts: [
                    {
                        name: 'Actuary Contact 1',
                        titleRole: 'Title',
                        email: 'statecontact1@example.com',
                        actuarialFirm: 'MERCER',
                    },
                ],
            }),
            expectedResult: true,
        },
        {
            rateDataOne: mockInsertRateArgs({
                rateCapitationType: 'RATE_RANGE',
                rateDocuments: [
                    {
                        name: 'Rate 1 Doc',
                        s3URL: 'fakeS3URL1',
                        sha256: 'someShaForRateDoc1',
                    },
                ],
                rateDateStart: new Date(Date.UTC(2024, 5, 1)),
                rateDateEnd: new Date(Date.UTC(2025, 5, 1)),
                certifyingActuaryContacts: [],
            }),
            rateDataTwo: mockInsertRateArgs({
                rateCapitationType: 'RATE_RANGE',
                rateDocuments: [
                    {
                        name: 'Rate 1 Doc',
                        s3URL: 'fakeS3URL1----2',
                        sha256: 'someShaForRateDoc1',
                    },
                ],
                rateDateStart: new Date(Date.UTC(2024, 5, 1)),
                rateDateEnd: new Date(Date.UTC(2025, 5, 1)),
                certifyingActuaryContacts: [
                    {
                        name: 'Actuary Contact 1',
                        titleRole: 'Title',
                        email: 'statecontact1@example.com',
                        actuarialFirm: 'OPTUMAS',
                    },
                ],
            }),
            expectedResult: false,
        },
        {
            rateDataOne: mockInsertRateArgs({
                rateCapitationType: 'RATE_RANGE',
                rateDocuments: [
                    {
                        name: 'Rate 1 Doc',
                        s3URL: 'fakeS3URL1',
                        sha256: 'someShaForRateDoc1',
                    },
                ],
                rateDateStart: new Date(Date.UTC(2024, 5, 1)),
                rateDateEnd: new Date(Date.UTC(2025, 5, 1)),
                certifyingActuaryContacts: [],
                rateProgramIDs: undefined,
            }),
            rateDataTwo: {},
            expectedResult: false,
        },
    ]

    test.each(rateDataTestCases)(
        'isEqualRateData with tests data returns: $expectedResult',
        ({ rateDataOne, rateDataTwo, expectedResult }) => {
            expect(isEqualData(rateDataOne, rateDataTwo)).toEqual(
                expectedResult
            )
        }
    )
})

describe('convertHealthPlanPackageRatesToDomain', () => {
    test('it converts a HHP rate to domain rate without errors', async () => {
        // create a contract with rate
        const unlockedHPP: UnlockedHealthPlanFormDataType = {
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
            contractDocuments: [],
            contractDateStart: new Date(),
            contractDateEnd: new Date(),
            managedCareEntities: ['MCO'],
            federalAuthorities: ['STATE_PLAN'],
            rateInfos: [
                {
                    rateType: 'AMENDMENT',
                    rateCapitationType: 'RATE_CELL',
                    rateDocuments: [
                        {
                            s3URL: 's3://bucketname/key/rate',
                            name: 'rate',
                            sha256: 'fakesha',
                        },
                    ],
                    supportingDocuments: [],
                    rateDateStart: new Date(Date.UTC(2024, 5, 1)),
                    rateDateEnd: new Date(Date.UTC(2025, 5, 1)),
                    rateDateCertified: new Date(Date.UTC(2024, 5, 1)),
                    rateAmendmentInfo: {
                        effectiveDateStart: new Date(Date.UTC(2026, 5, 1)),
                        effectiveDateEnd: new Date(Date.UTC(2027, 5, 1)),
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
                {
                    rateType: 'NEW',
                    rateCapitationType: 'RATE_CELL',
                    rateDocuments: [],
                    supportingDocuments: [
                        {
                            s3URL: 's3://bucketname/key/supporting-documents',
                            name: 'supporting documents',
                            sha256: 'supportingDocsSha',
                        },
                    ],
                    rateDateStart: new Date(Date.UTC(2024, 5, 1)),
                    rateDateEnd: new Date(Date.UTC(2025, 5, 1)),
                    rateDateCertified: new Date(Date.UTC(2025, 5, 1)),
                    rateAmendmentInfo: {
                        effectiveDateStart: new Date(Date.UTC(2026, 5, 1)),
                        effectiveDateEnd: new Date(Date.UTC(2027, 5, 1)),
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
                    packagesWithSharedRateCerts: [
                        {
                            packageName: 'testABC1',
                            packageId: 'test-abc-1',
                        },
                        {
                            packageName: undefined,
                            packageId: 'test-abc-2',
                        },
                        {
                            packageName: 'testABC3',
                            packageId: undefined,
                        },
                    ],
                },
            ],
            stateContacts: [],
            addtlActuaryCommunicationPreference: 'OACT_TO_ACTUARY',
            addtlActuaryContacts: [
                {
                    actuarialFirm: 'DELOITTE',
                    name: 'Additional Actuary Contact',
                    titleRole: 'Test Actuary Contact',
                    email: 'additionalactuarycontact1@test.com',
                },
            ],
            statutoryRegulatoryAttestation: false,
            statutoryRegulatoryAttestationDescription: 'No compliance',
        }

        const expectDomainRates: RateFormDataType[] = [
            {
                rateType: 'AMENDMENT',
                rateCapitationType: 'RATE_CELL',
                rateDocuments: [
                    {
                        s3URL: 's3://bucketname/key/rate',
                        name: 'rate',
                        sha256: 'fakesha',
                    },
                ],
                supportingDocuments: [],
                rateDateStart: new Date(Date.UTC(2024, 5, 1)),
                rateDateEnd: new Date(Date.UTC(2025, 5, 1)),
                rateDateCertified: new Date(Date.UTC(2024, 5, 1)),
                amendmentEffectiveDateStart: new Date(Date.UTC(2026, 5, 1)),
                amendmentEffectiveDateEnd: new Date(Date.UTC(2027, 5, 1)),
                rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                certifyingActuaryContacts: [
                    {
                        actuarialFirm: 'DELOITTE',
                        name: 'Actuary Contact 1',
                        titleRole: 'Test Actuary Contact 1',
                        email: 'actuarycontact1@test.com',
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
                // Additional actuaries from package should be in each rate now.
                addtlActuaryContacts: [
                    {
                        actuarialFirm: 'DELOITTE',
                        name: 'Additional Actuary Contact',
                        titleRole: 'Test Actuary Contact',
                        email: 'additionalactuarycontact1@test.com',
                    },
                ],
            },
            {
                rateType: 'NEW',
                rateCapitationType: 'RATE_CELL',
                rateDocuments: [],
                supportingDocuments: [
                    {
                        s3URL: 's3://bucketname/key/supporting-documents',
                        name: 'supporting documents',
                        sha256: 'supportingDocsSha',
                    },
                ],
                rateDateStart: new Date(Date.UTC(2024, 5, 1)),
                rateDateEnd: new Date(Date.UTC(2025, 5, 1)),
                rateDateCertified: new Date(Date.UTC(2025, 5, 1)),
                amendmentEffectiveDateStart: new Date(Date.UTC(2026, 5, 1)),
                amendmentEffectiveDateEnd: new Date(Date.UTC(2027, 5, 1)),
                rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                certifyingActuaryContacts: [
                    {
                        actuarialFirm: 'DELOITTE',
                        name: 'Actuary Contact 1',
                        titleRole: 'Test Actuary Contact 1',
                        email: 'actuarycontact1@test.com',
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [
                    {
                        packageId: 'test-abc-1',
                        packageName: 'testABC1',
                    },
                    {
                        packageId: 'test-abc-2',
                        packageName: '',
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
            },
        ]

        // convert it to a domain
        const convertedRates = must(
            await convertHealthPlanPackageRatesToDomain(unlockedHPP)
        )

        // expect convertedRates to match expected data
        expect(convertedRates).toEqual(expectDomainRates)
    })
})

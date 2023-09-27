import {
    mockDraft,
    mockStateSubmission,
    mockContractAndRatesDraft,
    mockMNState,
    mockStateSubmissionContractAmendment,
} from '../../testHelpers/apolloMocks'
import {
    convertRateSupportingDocs,
    generateRateName,
    hasValidSupportingDocumentCategories,
    HealthPlanFormDataType,
    isValidAndCurrentLockedHealthPlanFormData,
    LockedHealthPlanFormDataType,
    packageName,
    removeRatesData,
    UnlockedHealthPlanFormDataType,
} from '.'
import {
    hasValidContract,
    hasValidDocuments,
    hasValidRates,
    isContractOnly,
    isContractAndRates,
    isLockedHealthPlanFormData,
    isUnlockedHealthPlanFormData,
} from './'
import { basicHealthPlanFormData } from '../healthPlanFormDataMocks'

describe('submission type assertions', () => {
    test.each([
        [mockStateSubmission(), true],
        [mockStateSubmissionContractAmendment(), true],
        [{ ...mockStateSubmission(), contractType: undefined }, false],
        [
            { ...mockStateSubmission(), contractExecutionStatus: undefined },
            false,
        ],
        [{ ...mockStateSubmission(), contractDateStart: undefined }, false],
        [{ ...mockStateSubmission(), contractDateEnd: undefined }, false],
        [{ ...mockStateSubmission(), managedCareEntities: [] }, false],
        [{ ...mockStateSubmission(), federalAuthorities: [] }, false],
        [
            {
                ...mockStateSubmissionContractAmendment(),
                contractAmendmentInfo: { modifiedGeoAreaServed: true },
            },
            false,
        ],
    ])(
        'hasValidContract evaluates as expected',
        (submission, expectedResponse) => {
            // type coercion to allow us to test
            expect(
                hasValidContract(
                    submission as unknown as LockedHealthPlanFormDataType
                )
            ).toEqual(expectedResponse)
        }
    )

    test.each([
        [mockStateSubmission(), true],
        [
            {
                ...mockStateSubmission(),
                documents: [
                    {
                        name: 'A.pdf',
                        s3URL: 's3://local-uploads/1644167870842-A.pdf/A.pdf',
                        documentCategories: [],
                    },
                ],
            },
            false,
        ],
        [
            {
                ...mockStateSubmission(),
                documents: [
                    {
                        name: 'A.pdf',
                        s3URL: 's3://local-uploads/1644167870842-A.pdf/A.pdf',
                        documentCategories: ['RATES_RELATED'],
                    },
                ],
                submissionType: 'CONTRACT_ONLY',
            },
            false,
        ],
        [
            {
                ...mockStateSubmission(),
                documents: [
                    {
                        name: 'A.pdf',
                        s3URL: 's3://local-uploads/1644167870842-A.pdf/A.pdf',
                        documentCategories: ['CONTRACT_RELATED'],
                    },
                ],
                submissionType: 'CONTRACT_ONLY',
            },
            true,
        ],
        [
            {
                ...mockStateSubmission(),
                documents: [
                    {
                        name: 'A.pdf',
                        s3URL: 's3://local-uploads/1644167870842-A.pdf/A.pdf',
                        documentCategories: ['RATES_RELATED'],
                    },
                ],
                submissionType: 'CONTRACT_AND_RATES',
            },
            true,
        ],
        [
            {
                ...mockStateSubmission(),
                documents: [
                    {
                        name: 'A.pdf',
                        s3URL: 's3://local-uploads/1644167870842-A.pdf/A.pdf',
                        documentCategories: ['RATES_RELATED'],
                    },
                    {
                        name: 'B.pdf',
                        s3URL: 's3://local-uploads/1644167870842-B.pdf/B.pdf',
                        documentCategories: ['CONTRACT_RELATED'],
                    },
                ],
                submissionType: 'CONTRACT_ONLY',
            },
            false,
        ],
        [
            {
                ...mockStateSubmission(),
                documents: [
                    {
                        name: 'A.pdf',
                        s3URL: 's3://local-uploads/1644167870842-A.pdf/A.pdf',
                        documentCategories: ['CONTRACT_RELATED'],
                    },
                    {
                        name: 'B.pdf',
                        s3URL: 's3://local-uploads/1644167870842-B.pdf/B.pdf',
                        documentCategories: ['CONTRACT_RELATED'],
                    },
                ],
                submissionType: 'CONTRACT_ONLY',
            },
            true,
        ],
    ])(
        'hasValidSupportingDocumentCategories evaluates as expected',
        (submission, expectedResponse) => {
            // type coercion to allow us to test
            expect(
                hasValidSupportingDocumentCategories(
                    submission as unknown as LockedHealthPlanFormDataType
                )
            ).toEqual(expectedResponse)
        }
    )

    test.each([
        [mockStateSubmission(), true],
        [{ ...mockStateSubmission(), documents: [] }, true],
        [
            {
                ...mockStateSubmission(),
                submissionType: 'CONTRACT_ONLY',
                rateInfos: [
                    {
                        rateType: 'NEW',
                        rateCapitationType: 'RATE_CELL',
                        rateDocuments: [
                            {
                                s3URL: 's3://bucketname/key/rate',
                                name: 'rate',
                                documentCategories: ['RATES' as const],
                            },
                        ],
                        rateDateStart: new Date(),
                        rateDateEnd: new Date(),
                        rateDateCertified: new Date(),
                        rateAmendmentInfo: undefined,
                        rateProgramIDs: [
                            'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                        ],
                    },
                ],
            },
            true,
        ],
        [{ ...mockStateSubmission(), contractDocuments: [] }, false],
        [
            {
                ...mockStateSubmission(),
                submissionType: 'CONTRACT_AND_RATES',
                rateInfos: [
                    {
                        rateDocuments: [],
                        supportingDocuments: [],
                    },
                ],
                rateDocuments: [],
                supportingDocuments: [],
            },
            false,
        ],
    ])(
        'hasValidDocuments evaluates as expected',
        (submission, expectedResponse) => {
            // type coercion to allow us to test
            expect(
                hasValidDocuments(
                    submission as unknown as LockedHealthPlanFormDataType
                )
            ).toEqual(expectedResponse)
        }
    )

    test.each([
        [mockStateSubmission(), true],
        [mockContractAndRatesDraft(), true],
        [
            {
                ...mockStateSubmission(),
                rateInfos: [
                    {
                        ...mockStateSubmission().rateInfos[0],
                        actuaryContacts: [
                            {
                                actuarialFirm: 'OTHER' as const,
                                name: 'Actuary Contact 1',
                                titleRole: 'Test Actuary Contact 1',
                                email: 'actuarycontact1@test.com',
                            },
                        ],
                    },
                ],
            },
            false,
        ],
        [
            {
                ...mockStateSubmission(),
                rateInfos: [
                    {
                        ...mockStateSubmission().rateInfos[0],
                        actuaryContacts: [],
                    },
                ],
            },
            false,
        ],
        [
            {
                ...mockStateSubmission(),
                rateInfos: [
                    {
                        ...mockStateSubmission().rateInfos[0],
                        rateProgramIDs: [],
                    },
                ],
            },
            false,
        ],
        [
            {
                ...mockStateSubmission(),
                rateInfos: [
                    {
                        rateType: undefined,
                    },
                ],
            },
            false,
        ],
        [
            {
                ...mockStateSubmission(),
                rateInfos: [
                    {
                        ...mockStateSubmission().rateInfos[0],
                        rateDateStart: undefined,
                    },
                ],
            },
            false,
        ],
        [
            {
                ...mockStateSubmission(),
                rateInfos: [
                    {
                        ...mockStateSubmission().rateInfos[0],
                        rateDateEnd: undefined,
                    },
                ],
            },
            false,
        ],
        [
            {
                ...mockStateSubmission(),
                rateInfos: [
                    {
                        ...mockStateSubmission().rateInfos[0],
                        rateDateCertified: undefined,
                    },
                ],
            },
            false,
        ],
        [
            {
                ...mockStateSubmission(),
                rateInfos: [
                    {
                        ...mockStateSubmission().rateInfos[0],
                        rateType: 'AMENDMENT',
                        rateAmendmentInfo: undefined,
                    },
                ],
            },
            false,
        ],
        [
            {
                ...mockStateSubmission(),
                rateInfos: [
                    {
                        ...mockStateSubmission().rateInfos[0],
                        rateType: 'AMENDMENT',
                        rateAmendmentInfo: {
                            effectiveDateStart: new Date(),
                        },
                    },
                ],
            },
            false,
        ],
    ])(
        'hasValidRates evaluates as expected',
        (submission, expectedResponse) => {
            // type coercion to allow us to test
            expect(
                hasValidRates(
                    submission as unknown as LockedHealthPlanFormDataType
                )
            ).toEqual(expectedResponse)
        }
    )

    test.each([
        [{ ...mockStateSubmission(), submissionType: 'CONTRACT_ONLY' }, true],
        [
            {
                ...mockStateSubmission(),
                submissionType: 'CONTRACT_AND_RATES',
            },
            false,
        ],
    ])(
        'isContractOnly evaluates as expected',
        (submission, expectedResponse) => {
            // type coercion to allow us to test
            expect(
                isContractOnly(
                    submission as unknown as LockedHealthPlanFormDataType
                )
            ).toEqual(expectedResponse)
        }
    )

    test.each([
        [
            { ...mockStateSubmission(), submissionType: 'CONTRACT_AND_RATES' },
            true,
        ],
        [
            {
                ...mockStateSubmission(),
                submissionType: 'CONTRACT_ONLY',
            },
            false,
        ],
    ])(
        'isContractAndRates evaluates as expected',
        (submission, expectedResponse) => {
            // type coercion to allow us to test
            expect(
                isContractAndRates(
                    submission as unknown as LockedHealthPlanFormDataType
                )
            ).toEqual(expectedResponse)
        }
    )

    test.each([
        [{ ...mockDraft(), status: 'DRAFT' }, true],
        [{ ...mockContractAndRatesDraft(), status: 'DRAFT' }, true],
        [mockStateSubmission(), false],
    ])(
        'isUnlockedHealthPlanFormData evaluates as expected',
        (submission, expectedResponse) => {
            // type coercion to allow us to test
            expect(isUnlockedHealthPlanFormData(submission)).toEqual(
                expectedResponse
            )
        }
    )
    test.each([
        [{ ...mockStateSubmission(), status: 'SUBMITTED' }, true],
        [
            {
                ...mockStateSubmission(),
                status: 'SUBMITTED',
            },
            true,
        ],
        [
            {
                ...mockStateSubmission(),
                status: 'SUBMITTED',
                submissionType: 'CONTRACT_ONLY',
            },
            true,
        ],

        [{ ...mockStateSubmission(), contractType: undefined }, true],
        [
            { ...mockStateSubmission(), contractExecutionStatus: undefined },
            true,
        ],
        [mockDraft(), false],
        [mockContractAndRatesDraft(), false],
    ])(
        'isValidAndCurrentLockedHealthPlanFormData evaluates as expected',
        (submission, expectedResponse) => {
            // type coercion to allow us to test
            expect(isLockedHealthPlanFormData(submission)).toEqual(
                expectedResponse
            )
        }
    )

    test.each([
        [{ ...mockStateSubmission(), status: 'SUBMITTED' }, true],
        [
            {
                ...mockStateSubmission(),
                status: 'SUBMITTED',
                contractDocuments: [],
            },
            false,
        ],
        [
            {
                ...mockStateSubmission(),
                status: 'SUBMITTED',
                submissionType: 'CONTRACT_ONLY',
            },
            false,
        ],
        [
            {
                ...mockStateSubmission(),
                status: 'SUBMITTED',
                riskBasedContract: undefined,
            },
            false,
        ],
        [
            {
                ...mockStateSubmission(),
                status: 'SUBMITTED',
                submissionType: 'CONTRACT_AND_RATES',
                rateInfos: [
                    {
                        rateDocuments: [],
                        supportingDocuments: [],
                    },
                ],
            },
            false,
        ],
        [{ ...mockStateSubmission(), contractType: undefined }, false],
        [
            { ...mockStateSubmission(), contractExecutionStatus: undefined },
            false,
        ],
        [mockDraft(), false],
        [mockContractAndRatesDraft(), false],
    ])(
        'isValidAndCurrentLockedHealthPlanFormData evaluates as expected',
        (submission, expectedResponse) => {
            // type coercion to allow us to test
            expect(
                isValidAndCurrentLockedHealthPlanFormData(submission)
            ).toEqual(expectedResponse)
        }
    )

    test.each([
        [['foo-bar', 'baz-bin'], 'MCR-MN-0005-UNKNOWNPROGRAM-UNKNOWNPROGRAM'],
        [['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'], 'MCR-MN-0005-SNBC'],
        [
            [
                'd95394e5-44d1-45df-8151-1cc1ee66f100',
                'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
            ],
            'MCR-MN-0005-MSC+-PMAP',
        ],
        [
            [
                'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
                'd95394e5-44d1-45df-8151-1cc1ee66f100',
            ],
            'MCR-MN-0005-MSC+-PMAP',
        ],
        [
            ['3fd36500-bf2c-47bc-80e8-e7aa417184c5', 'baz-bin'],
            'MCR-MN-0005-MSHO-UNKNOWNPROGRAM',
        ],
        [
            [
                'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                'd95394e5-44d1-45df-8151-1cc1ee66f100',
                'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
            ],
            'MCR-MN-0005-MSC+-PMAP-SNBC',
        ],
    ])('submission name is correct', (programIDs, expectedName) => {
        const programs = mockMNState().programs
        const sub = basicHealthPlanFormData()
        sub.programIDs = programIDs

        expect(packageName(sub, programs)).toBe(expectedName)
    })

    const mockContractAndRateSub = mockContractAndRatesDraft()

    const rateNameTestArray: {
        submission: HealthPlanFormDataType
        testDescription: string
        expectedName: string
    }[] = [
        {
            submission: {
                ...mockContractAndRateSub,
                rateInfos: [
                    {
                        rateType: 'AMENDMENT',
                        rateDateStart: new Date('2021/04/22'),
                        rateDateEnd: new Date('2022/03/29'),
                        rateDateCertified: new Date('2021/05/23'),
                        rateAmendmentInfo: {
                            effectiveDateStart: new Date('2022/05/21'),
                            effectiveDateEnd: new Date('2022/09/21'),
                        },
                        rateDocuments: [],
                        supportingDocuments: [],
                        rateProgramIDs: [
                            'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                        ],
                        actuaryContacts: [],
                        packagesWithSharedRateCerts: [],
                    },
                ],
            },
            testDescription: 'Amendment rate test',
            expectedName:
                'MCR-MN-0005-SNBC-RATE-20220521-20220921-AMENDMENT-20210523',
        },
        {
            submission: {
                ...mockContractAndRateSub,
                rateInfos: [
                    {
                        rateType: 'NEW',
                        rateDateStart: new Date('2021/04/22'),
                        rateDateEnd: new Date('2022/03/29'),
                        rateDateCertified: new Date('2021/04/22'),
                        rateDocuments: [],
                        supportingDocuments: [],
                        rateProgramIDs: [
                            'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                        ],
                        actuaryContacts: [],
                        packagesWithSharedRateCerts: [],
                    },
                ],
            },
            testDescription: 'New rate test',
            expectedName:
                'MCR-MN-0005-SNBC-RATE-20210422-20220329-CERTIFICATION-20210422',
        },
        {
            submission: {
                ...mockContractAndRateSub,
                rateInfos: [
                    {
                        rateType: 'NEW',
                        rateDateStart: new Date('2021/04/22'),
                        rateDateEnd: new Date('2022/03/29'),
                        rateDateCertified: new Date('2021/04/22'),
                        rateAmendmentInfo: {
                            effectiveDateStart: new Date('2022/05/21'),
                            effectiveDateEnd: new Date('2022/09/21'),
                        },
                        rateProgramIDs: [
                            'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                        ],
                        rateDocuments: [],
                        supportingDocuments: [],
                        actuaryContacts: [],
                        packagesWithSharedRateCerts: [],
                    },
                ],
            },
            testDescription: 'MN-NEW-WITH-AMENDMENT-DATES',
            expectedName:
                'MCR-MN-0005-SNBC-RATE-20210422-20220329-CERTIFICATION-20210422',
        },
        {
            submission: {
                ...mockContractAndRateSub,
                rateInfos: [
                    {
                        rateType: 'NEW',
                        rateDateStart: undefined,
                        rateDateEnd: undefined,
                        rateDateCertified: undefined,
                        rateAmendmentInfo: {
                            effectiveDateStart: new Date('2022/05/21'),
                            effectiveDateEnd: new Date('2022/09/21'),
                        },
                        rateProgramIDs: [
                            'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                        ],
                        rateDocuments: [],
                        supportingDocuments: [],
                        actuaryContacts: [],
                        packagesWithSharedRateCerts: [],
                    },
                ],
            },
            testDescription: 'New rate with no dates',
            expectedName: 'MCR-MN-0005-SNBC-RATE-CERTIFICATION',
        },
        {
            submission: {
                ...mockContractAndRateSub,
                rateInfos: [
                    {
                        rateType: 'AMENDMENT',
                        rateAmendmentInfo: {},
                        rateProgramIDs: [
                            'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                        ],
                        rateDocuments: [],
                        supportingDocuments: [],
                        actuaryContacts: [],
                        packagesWithSharedRateCerts: [],
                    },
                ],
            },
            testDescription: 'Amendment rate with no dates',
            expectedName: 'MCR-MN-0005-SNBC-RATE-AMENDMENT',
        },
        {
            submission: {
                ...mockContractAndRateSub,
                rateInfos: [
                    {
                        rateType: 'NEW',
                        rateDateStart: new Date('2021/04/22'),
                        rateDateEnd: undefined,
                        rateAmendmentInfo: {
                            effectiveDateStart: new Date('2022/05/21'),
                            effectiveDateEnd: new Date('2022/09/21'),
                        },
                        rateDateCertified: undefined,
                        rateProgramIDs: [
                            'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                        ],
                        rateDocuments: [],
                        supportingDocuments: [],
                        actuaryContacts: [],
                        packagesWithSharedRateCerts: [],
                    },
                ],
            },
            testDescription: 'New rate with imcomplete dates',
            expectedName: 'MCR-MN-0005-SNBC-RATE-20210422-CERTIFICATION',
        },
        {
            submission: {
                ...mockContractAndRateSub,
                rateInfos: [
                    {
                        rateType: 'AMENDMENT',
                        rateDateStart: new Date('2021/04/22'),
                        rateDateEnd: new Date('2022/03/29'),
                        rateAmendmentInfo: {
                            effectiveDateStart: new Date('2022/05/21'),
                        },
                        rateDocuments: [],
                        supportingDocuments: [],
                        rateProgramIDs: [
                            'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                        ],
                        actuaryContacts: [],
                        packagesWithSharedRateCerts: [],
                    },
                ],
            },
            testDescription: 'Incomplete amendment rate dates',
            expectedName: 'MCR-MN-0005-SNBC-RATE-20220521-AMENDMENT',
        },
        {
            submission: {
                ...mockContractAndRateSub,
                rateInfos: [
                    {
                        rateType: undefined,
                        rateDateStart: new Date('2021/04/22'),
                        rateDateEnd: new Date('2022/03/29'),
                        rateDateCertified: new Date('2021/05/23'),
                        rateAmendmentInfo: {
                            effectiveDateStart: new Date('2022/05/21'),
                            effectiveDateEnd: new Date('2022/09/21'),
                        },
                        rateDocuments: [],
                        supportingDocuments: [],
                        rateProgramIDs: [
                            'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                        ],
                        actuaryContacts: [],
                        packagesWithSharedRateCerts: [],
                    },
                ],
            },
            testDescription: 'Rate type not specified',
            expectedName: 'MCR-MN-0005-SNBC-RATE-20210422-20220329-20210523',
        },
        {
            submission: {
                ...mockContractAndRateSub,
                programIDs: [
                    'd95394e5-44d1-45df-8151-1cc1ee66f100',
                    'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
                ],
                rateInfos: [
                    {
                        rateType: 'NEW',
                        rateDateStart: new Date('2021/04/22'),
                        rateDateEnd: new Date('2022/03/29'),
                        rateDateCertified: new Date('2021/05/23'),
                        rateAmendmentInfo: {
                            effectiveDateStart: new Date('2022/05/21'),
                            effectiveDateEnd: new Date('2022/09/21'),
                        },
                        rateDocuments: [],
                        supportingDocuments: [],
                        rateProgramIDs: [],
                        actuaryContacts: [],
                        packagesWithSharedRateCerts: [],
                    },
                ],
            },
            testDescription:
                'Rate programs not specified should default to package programs',
            expectedName:
                'MCR-MN-0005-MSC+-PMAP-RATE-20210422-20220329-CERTIFICATION-20210523',
        },
    ]
    test.each(rateNameTestArray)(
        'Rate Name Test: $testDescription',
        ({ submission, expectedName }) => {
            const programs = mockMNState().programs
            expect(
                generateRateName(submission, submission.rateInfos[0], programs)
            ).toMatch(expectedName)
        }
    )

    const contractOnlyWithValidRateData: {
        submission: UnlockedHealthPlanFormDataType
        testDescription: string
        expectedResult: Partial<UnlockedHealthPlanFormDataType> | Error
    }[] = [
        {
            submission: {
                ...mockContractAndRateSub,
                documents: [
                    {
                        name: 'contract_supporting_that_applies_to_a_rate_also.pdf',
                        s3URL: 'fakeS3URL',
                        sha256: 'fakesha',
                        documentCategories: [
                            'CONTRACT_RELATED' as const,
                            'RATES_RELATED' as const,
                        ],
                    },
                    {
                        name: 'contract_supporting_that_applies_to_a_rate_also_2.pdf',
                        s3URL: 'fakeS3URL',
                        sha256: 'fakesha',
                        documentCategories: [
                            'RATES_RELATED' as const,
                            'CONTRACT_RELATED' as const,
                        ],
                    },
                    {
                        name: 'rate_only_supporting_doc.pdf',
                        s3URL: 'fakeS3URL',
                        sha256: 'fakesha',
                        documentCategories: ['RATES_RELATED' as const],
                    },
                ],
            },
            testDescription: 'With all valid rate data ',
            expectedResult: {
                addtlActuaryContacts: [],
                documents: [
                    {
                        name: 'contract_supporting_that_applies_to_a_rate_also.pdf',
                        s3URL: 'fakeS3URL',
                        sha256: 'fakesha',
                        documentCategories: ['CONTRACT_RELATED'],
                    },
                    {
                        name: 'contract_supporting_that_applies_to_a_rate_also_2.pdf',
                        s3URL: 'fakeS3URL',
                        sha256: 'fakesha',
                        documentCategories: ['CONTRACT_RELATED'],
                    },
                    {
                        name: 'rate_only_supporting_doc.pdf',
                        s3URL: 'fakeS3URL',
                        sha256: 'fakesha',
                        documentCategories: ['CONTRACT_RELATED'],
                    },
                ],
                rateInfos: [],
            },
        },
        {
            submission: {
                ...mockContractAndRateSub,
                documents: [
                    {
                        name: 'contract_supporting_that_applies_to_a_rate_also.pdf',
                        s3URL: 'fakeS3URL',
                        sha256: 'fakesha',
                        documentCategories: [
                            'RATES_RELATED' as const,
                            'CONTRACT_RELATED' as const,
                        ],
                    },
                    {
                        name: 'rate_only_supporting_doc.pdf',
                        s3URL: 'fakeS3URL',
                        sha256: 'fakesha',
                        documentCategories: ['RATES_RELATED' as const],
                    },
                ],
            },
            testDescription: 'With valid contract and rate related documents',
            expectedResult: {
                addtlActuaryContacts: [],
                documents: [
                    {
                        name: 'contract_supporting_that_applies_to_a_rate_also.pdf',
                        s3URL: 'fakeS3URL',
                        sha256: 'fakesha',
                        documentCategories: ['CONTRACT_RELATED' as const],
                    },
                    {
                        name: 'rate_only_supporting_doc.pdf',
                        s3URL: 'fakeS3URL',
                        sha256: 'fakesha',
                        documentCategories: ['CONTRACT_RELATED' as const],
                    },
                ],
                rateInfos: [],
            },
        },
        {
            submission: {
                ...mockContractAndRateSub,
                documents: [
                    {
                        name: 'rate_only_supporting_doc.pdf',
                        s3URL: 'fakeS3URL',
                        sha256: 'fakesha',
                        documentCategories: ['RATES_RELATED' as const],
                    },
                ],
            },
            testDescription: 'With only valid rate related documents',
            expectedResult: {
                addtlActuaryContacts: [],
                documents: [
                    {
                        name: 'rate_only_supporting_doc.pdf',
                        s3URL: 'fakeS3URL',
                        sha256: 'fakesha',
                        documentCategories: ['CONTRACT_RELATED'],
                    },
                ],
                rateInfos: [],
            },
        },
    ]
    test.each(contractOnlyWithValidRateData)(
        'Remove rates data on CONTRACT_ONLY submission: $testDescription',
        ({ submission, expectedResult }) => {
            expect(removeRatesData(submission)).toEqual(
                expect.objectContaining(expectedResult)
            )
        }
    )

    test('convertRateSupportingDocs does convert rate supporting documents to contract supporting', () => {
        const documents = [
            {
                name: 'contract_supporting_that_applies_to_a_rate_also.pdf',
                s3URL: 'fakeS3URL',
                sha256: 'fakesha',
                documentCategories: [
                    'CONTRACT_RELATED' as const,
                    'RATES_RELATED' as const,
                ],
            },
            {
                name: 'contract_supporting_that_applies_to_a_rate_also_2.pdf',
                s3URL: 'fakeS3URL',
                sha256: 'fakesha',
                documentCategories: [
                    'RATES_RELATED' as const,
                    'CONTRACT_RELATED' as const,
                ],
            },
            {
                name: 'contract_supporting_that_applies_to_a_rate_also_3.pdf',
                s3URL: 'fakeS3URL',
                sha256: 'fakesha',
                documentCategories: ['CONTRACT_RELATED' as const],
            },
            {
                name: 'rate_only_supporting_doc.pdf',
                s3URL: 'fakeS3URL',
                sha256: 'fakesha',
                documentCategories: ['RATES_RELATED' as const],
            },
        ]

        expect(convertRateSupportingDocs(documents)).toEqual([
            {
                name: 'contract_supporting_that_applies_to_a_rate_also.pdf',
                s3URL: 'fakeS3URL',
                sha256: 'fakesha',
                documentCategories: ['CONTRACT_RELATED'],
            },
            {
                name: 'contract_supporting_that_applies_to_a_rate_also_2.pdf',
                s3URL: 'fakeS3URL',
                sha256: 'fakesha',
                documentCategories: ['CONTRACT_RELATED'],
            },
            {
                name: 'contract_supporting_that_applies_to_a_rate_also_3.pdf',
                s3URL: 'fakeS3URL',
                sha256: 'fakesha',
                documentCategories: ['CONTRACT_RELATED'],
            },
            {
                name: 'rate_only_supporting_doc.pdf',
                s3URL: 'fakeS3URL',
                sha256: 'fakesha',
                documentCategories: ['CONTRACT_RELATED'],
            },
        ])
    })

    test('convertRateSupportingDocs throws error with CONTRACT or RATE documents', () => {
        const contractDocument = [
            {
                name: 'contract_certification.pdf',
                s3URL: 'fakeS3URL',
                sha256: 'fakesha',
                documentCategories: ['CONTRACT' as const],
            },
        ]

        const rateDocument = [
            {
                name: 'rates_certification.pdf',
                s3URL: 'fakeS3URL',
                sha256: 'fakesha',
                documentCategories: ['RATES' as const],
            },
        ]

        const mixedDocuments = [
            {
                name: 'contract_supporting_that_applies_to_a_rate_also.pdf',
                s3URL: 'fakeS3URL',
                sha256: 'fakesha',
                documentCategories: [
                    'CONTRACT_RELATED' as const,
                    'RATES_RELATED' as const,
                ],
            },
            {
                name: 'rates_certification.pdf',
                s3URL: 'fakeS3URL',
                sha256: 'fakesha',
                documentCategories: [
                    'RATES' as const,
                    'RATES_RELATED' as const,
                ],
            },
            {
                name: 'contract_certification.pdf',
                s3URL: 'fakeS3URL',
                sha256: 'fakesha',
                documentCategories: [
                    'CONTRACT' as const,
                    'CONTRACT_RELATED' as const,
                ],
            },
        ]
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        jest.spyOn(console, 'error').mockImplementation(() => {})

        expect(() => convertRateSupportingDocs(contractDocument)).toThrow()
        expect(() => convertRateSupportingDocs(rateDocument)).toThrow()
        expect(() => convertRateSupportingDocs(mixedDocuments)).toThrow()
        jest.clearAllMocks()
    })
})

import {
    mockDraft,
    mockStateSubmission,
    mockContractAndRatesDraft,
    mockMNState,
    mockStateSubmissionContractAmendment,
} from '../../testHelpers/apolloHelpers'
import {
    generateRateName,
    hasValidSupportingDocumentCategories,
    HealthPlanFormDataType,
    LockedHealthPlanFormDataType,
    packageName,
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
                rateDocuments: [],
            },
            true,
        ],
        [{ ...mockStateSubmission(), contractDocuments: [] }, false],
        [
            {
                ...mockStateSubmission(),
                submissionType: 'CONTRACT_AND_RATES',
                rateDocuments: [],
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
                rateType: undefined,
            },
            false,
        ],
        [
            {
                ...mockStateSubmission(),
                rateDateStart: undefined,
            },
            false,
        ],
        [
            {
                ...mockStateSubmission(),
                rateDateEnd: undefined,
            },
            false,
        ],
        [
            {
                ...mockStateSubmission(),
                rateDateCertified: undefined,
            },
            false,
        ],
        [
            {
                ...mockStateSubmission(),
                submissionType: 'CONTRACT_ONLY',
                rateDocuments: [],
            },
            false,
        ],
        [
            {
                ...mockStateSubmission(),
                rateType: 'AMENDMENT',
                rateAmendmentInfo: undefined,
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
                contractDocuments: [],
            },
            false,
        ],
        [
            {
                ...mockStateSubmission(),
                status: 'SUBMITTED',
                submissionType: 'CONTRACT_ONLY',
                rateDocuments: [],
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
        'isLockedHealthPlanFormData evaluates as expected',
        (submission, expectedResponse) => {
            // type coercion to allow us to test
            expect(isLockedHealthPlanFormData(submission)).toEqual(
                expectedResponse
            )
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
                rateType: 'AMENDMENT',
                rateDateStart: '2021-04-22',
                rateDateEnd: '2022-03-29',
                rateDateCertified: '2021-05-23',
                rateAmendmentInfo: {
                    effectiveDateStart: '2022-05-21',
                    effectiveDateEnd: '2022-09-21',
                },
                rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
            },
            testDescription: 'Amendment rate test',
            expectedName:
                'MCR-MN-0005-SNBC-RATE-20220521-20220921-AMENDMENT-20210523',
        },
        {
            submission: {
                ...mockContractAndRateSub,
                rateType: 'NEW',
                rateDateStart: '2021-04-22',
                rateDateEnd: '2022-03-29',
                rateDateCertified: '2021-04-22',
                rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
            },
            testDescription: 'New rate test',
            expectedName:
                'MCR-MN-0005-SNBC-RATE-20210422-20220329-CERTIFICATION-20210422',
        },
        {
            submission: {
                ...mockContractAndRateSub,
                rateType: 'NEW',
                rateDateStart: '2021-04-22',
                rateDateEnd: '2022-03-29',
                rateDateCertified: '2021-04-22',
                rateAmendmentInfo: {
                    effectiveDateStart: '2022-05-21',
                    effectiveDateEnd: '2022-09-21',
                },
                rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
            },
            testDescription: 'MN-NEW-WITH-AMENDMENT-DATES',
            expectedName:
                'MCR-MN-0005-SNBC-RATE-20210422-20220329-CERTIFICATION-20210422',
        },
        {
            submission: {
                ...mockContractAndRateSub,
                rateType: 'NEW',
                rateDateStart: undefined,
                rateDateEnd: undefined,
                rateDateCertified: undefined,
                rateAmendmentInfo: {
                    effectiveDateStart: '2022-05-21',
                    effectiveDateEnd: '2022-09-21',
                },
                rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
            },
            testDescription: 'New rate with no dates',
            expectedName: 'MCR-MN-0005-SNBC-RATE-CERTIFICATION',
        },
        {
            submission: {
                ...mockContractAndRateSub,
                rateType: 'AMENDMENT',
                rateAmendmentInfo: {},
                rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
            },
            testDescription: 'Amendment rate with no dates',
            expectedName: 'MCR-MN-0005-SNBC-RATE-AMENDMENT',
        },
        {
            submission: {
                ...mockContractAndRateSub,
                rateType: 'NEW',
                rateDateStart: '2021-04-22',
                rateDateEnd: undefined,
                rateAmendmentInfo: {
                    effectiveDateStart: '2022-05-21',
                    effectiveDateEnd: '2022-09-21',
                },
                rateDateCertified: undefined,
                rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
            },
            testDescription: 'New rate with imcomplete dates',
            expectedName: 'MCR-MN-0005-SNBC-RATE-20210422-CERTIFICATION',
        },
        {
            submission: {
                ...mockContractAndRateSub,
                rateType: 'AMENDMENT',
                rateDateStart: '2021-04-22',
                rateDateEnd: '2022-03-29',
                rateAmendmentInfo: {
                    effectiveDateStart: '2022-05-21',
                },
                rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
            },
            testDescription: 'Incomplete amendment rate dates',
            expectedName: 'MCR-MN-0005-SNBC-RATE-20220521-AMENDMENT',
        },
        {
            submission: {
                ...mockContractAndRateSub,
                rateType: undefined,
				rateDateStart: '2021-04-22',
                rateDateEnd: '2022-03-29',
                rateDateCertified: '2021-05-23',                    
                rateAmendmentInfo: {
    				effectiveDateStart: '2022-05-21',
                    effectiveDateEnd: '2022-09-21',
                },
                rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
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
                rateType: undefined,
                rateDateStart: '2021-04-22',
                rateDateEnd: '2022-03-29',
                rateDateCertified: '2021-05-23',
                rateAmendmentInfo: {
                    effectiveDateStart: '2022-05-21',
                    effectiveDateEnd: '2022-09-21',
                },
                rateProgramIDs: [],
            },
            testDescription:
                'Rate programs not specified should default to package programs',
            expectedName:
                'MCR-MN-0005-MSC+-PMAP-RATE-20210422-20220329-20210523',
        },
    ]

    test.each(rateNameTestArray)(
        'Rate Name Test: $testDescription',
        ({ submission, expectedName }) => {
            const programs = mockMNState().programs
            expect(generateRateName(submission, programs)).toMatch(expectedName)
        }
    )
})

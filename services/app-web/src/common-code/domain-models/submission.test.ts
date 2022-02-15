import {
    mockDraft,
    mockStateSubmission,
    mockContractAndRatesDraft,
} from '../../testHelpers/apolloHelpers'
import { hasValidSupportingDocumentCategories, StateSubmissionType } from '.'
import {
    hasValidContract,
    hasValidDocuments,
    hasValidRates,
    isContractOnly,
    isContractAndRates,
    isStateSubmission,
    isDraftSubmission,
} from './'

describe('submission type assertions', () => {
    test.each([
        [mockStateSubmission(), true],
        [{ ...mockStateSubmission(), contractType: undefined }, false],
        [{ ...mockStateSubmission(), contractDateStart: undefined }, false],
        [{ ...mockStateSubmission(), contractDateEnd: undefined }, false],
        [{ ...mockStateSubmission(), managedCareEntities: [] }, false],
        [{ ...mockStateSubmission(), federalAuthorities: [] }, false],
    ])(
        'hasValidContract evaluates as expected',
        (submission, expectedResponse) => {
            // type coercion to allow us to test
            expect(
                hasValidContract(submission as unknown as StateSubmissionType)
            ).toEqual(expectedResponse)
        }
    )

    test.each([
        [mockStateSubmission(), true],
        [
            { ...mockStateSubmission(), 
            documents: [
                {
                name: 'A.pdf',
                s3URL: 's3://local-uploads/1644167870842-A.pdf/A.pdf',
                documentCategories: []
                }
            ] }, 
        false],
        [
            { ...mockStateSubmission(), 
            documents: [
                {
                name: 'A.pdf',
                s3URL: 's3://local-uploads/1644167870842-A.pdf/A.pdf',
                documentCategories: ['RATES_RELATED']
                }
            ],
            submissionType: 'CONTRACT_ONLY' }, 
        false],
        [
            { ...mockStateSubmission(), 
            documents: [
                {
                name: 'A.pdf',
                s3URL: 's3://local-uploads/1644167870842-A.pdf/A.pdf',
                documentCategories: ['CONTRACT_RELATED']
                }
            ],
            submissionType: 'CONTRACT_ONLY' }, 
        true],
        [
            { ...mockStateSubmission(), 
            documents: [
                {
                    name: 'A.pdf',
                    s3URL: 's3://local-uploads/1644167870842-A.pdf/A.pdf',
                    documentCategories: ['RATES_RELATED']
                }
            ],
            submissionType: 'CONTRACT_AND_RATES' }, 
        true],
        [
            { ...mockStateSubmission(), 
            documents: [
                {
                    name: 'A.pdf',
                    s3URL: 's3://local-uploads/1644167870842-A.pdf/A.pdf',
                    documentCategories: ['RATES_RELATED']
                },
                {
                    name: 'B.pdf',
                    s3URL: 's3://local-uploads/1644167870842-B.pdf/B.pdf',
                    documentCategories: ['CONTRACT_RELATED']
                }
            ],
            submissionType: 'CONTRACT_ONLY' }, 
        false],
        [
            { ...mockStateSubmission(), 
            documents: [
                {
                    name: 'A.pdf',
                    s3URL: 's3://local-uploads/1644167870842-A.pdf/A.pdf',
                    documentCategories: ['CONTRACT_RELATED']
                },
                {
                    name: 'B.pdf',
                    s3URL: 's3://local-uploads/1644167870842-B.pdf/B.pdf',
                    documentCategories: ['CONTRACT_RELATED']
                }
            ],
            submissionType: 'CONTRACT_ONLY' }, 
        true],
    ])(
        'hasValidSupportingDocumentCategories evaluates as expected',
        (submission, expectedResponse) => {
            // type coercion to allow us to test
            expect(
                hasValidSupportingDocumentCategories(submission as unknown as StateSubmissionType)
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
                hasValidDocuments(submission as unknown as StateSubmissionType)
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
                hasValidRates(submission as unknown as StateSubmissionType)
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
                isContractOnly(submission as unknown as StateSubmissionType)
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
                isContractAndRates(submission as unknown as StateSubmissionType)
            ).toEqual(expectedResponse)
        }
    )

    test.each([
        [{ ...mockDraft(), status: 'DRAFT' }, true],
        [{ ...mockContractAndRatesDraft(), status: 'DRAFT' }, true],
        [mockStateSubmission(), false],
    ])(
        'isDraftSubmission evaluates as expected',
        (submission, expectedResponse) => {
            // type coercion to allow us to test
            expect(isDraftSubmission(submission)).toEqual(expectedResponse)
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
        [mockDraft(), false],
        [mockContractAndRatesDraft(), false],
    ])(
        'isStateSubmission evaluates as expected',
        (submission, expectedResponse) => {
            // type coercion to allow us to test
            expect(isStateSubmission(submission)).toEqual(expectedResponse)
        }
    )
})

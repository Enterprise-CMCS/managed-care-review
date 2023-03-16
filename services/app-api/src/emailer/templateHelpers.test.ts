import {
    CHIP_PROGRAMS_UUID,
    filterChipAndPRSubmissionReviewers,
    generateCMSReviewerEmails,
    includesChipPrograms,
} from './templateHelpers'
import { UnlockedHealthPlanFormDataType } from 'app-web/src/common-code/healthPlanFormDataType'
import {
    mockUnlockedContractAndRatesFormData,
    mockUnlockedContractOnlyFormData,
    testEmailConfig,
    testStateAnalystsEmails,
} from '../testHelpers/emailerHelpers'
import { EmailConfiguration, StateAnalystsEmails } from './emailer'

describe('templateHelpers', () => {
    const contractOnlyWithValidRateData: {
        submission: UnlockedHealthPlanFormDataType
        emailConfig: EmailConfiguration
        stateAnalystsEmails: StateAnalystsEmails
        testDescription: string
        expectedResult: string[] | Error
    }[] = [
        {
            submission: mockUnlockedContractOnlyFormData(),
            emailConfig: testEmailConfig,
            stateAnalystsEmails: testStateAnalystsEmails,
            testDescription: 'Contract only submission',
            expectedResult: [
                ...testEmailConfig.devReviewTeamEmails,
                ...testStateAnalystsEmails,
                ...testEmailConfig.dmcoEmails,
                ...testEmailConfig.dmcpEmails,
            ],
        },
        {
            submission: mockUnlockedContractAndRatesFormData(),
            emailConfig: testEmailConfig,
            stateAnalystsEmails: testStateAnalystsEmails,
            testDescription: 'Contract and rates submission',
            expectedResult: [
                ...testEmailConfig.devReviewTeamEmails,
                ...testStateAnalystsEmails,
                ...testEmailConfig.dmcoEmails,
                ...testEmailConfig.dmcpEmails,
                ...testEmailConfig.oactEmails,
            ],
        },
        {
            submission: mockUnlockedContractAndRatesFormData({
                stateCode: 'MS',
                programIDs: ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a'],
            }),
            emailConfig: testEmailConfig,
            stateAnalystsEmails: testStateAnalystsEmails,
            testDescription:
                'Submission with CHIP program specified for contract certification',
            expectedResult: [
                'devreview1@example.com',
                'devreview2@example.com',
                '"State Analyst 1" <StateAnalyst1@example.com>',
                '"State Analyst 2" <StateAnalyst2@example.com>',
                ...testEmailConfig.dmcoEmails,
            ],
        },
        {
            submission: mockUnlockedContractAndRatesFormData({
                stateCode: 'MS',
                rateInfos: [
                    {
                        rateType: 'NEW',
                        rateDocuments: [
                            {
                                s3URL: 'bar',
                                name: 'foo',
                                documentCategories: ['RATES' as const],
                            },
                        ],
                        rateDateStart: new Date(),
                        rateDateEnd: new Date(),
                        rateDateCertified: new Date(),
                        rateProgramIDs: [
                            '36c54daf-7611-4a15-8c3b-cdeb3fd7e25a',
                        ],
                        rateAmendmentInfo: undefined,
                        actuaryContacts: [
                            {
                                actuarialFirm: 'DELOITTE',
                                name: 'Actuary Contact 1',
                                titleRole: 'Test Actuary Contact 1',
                                email: 'actuarycontact1@example.com',
                            },
                        ],
                        actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                        packagesWithSharedRateCerts: [],
                    },
                ],
            }),
            emailConfig: testEmailConfig,
            stateAnalystsEmails: testStateAnalystsEmails,
            testDescription:
                'Submission with CHIP program specified for rate certification',
            expectedResult: [
                'devreview1@example.com',
                'devreview2@example.com',
                '"State Analyst 1" <StateAnalyst1@example.com>',
                '"State Analyst 2" <StateAnalyst2@example.com>',
                ...testEmailConfig.dmcoEmails,
            ],
        },
        {
            submission: mockUnlockedContractAndRatesFormData({
                stateCode: 'PR',
            }),
            emailConfig: testEmailConfig,
            stateAnalystsEmails: testStateAnalystsEmails,
            testDescription: 'Puerto Rico submission',
            expectedResult: [
                'devreview1@example.com',
                'devreview2@example.com',
                '"State Analyst 1" <StateAnalyst1@example.com>',
                '"State Analyst 2" <StateAnalyst2@example.com>',
                ...testEmailConfig.dmcoEmails,
            ],
        },
        {
            submission: mockUnlockedContractAndRatesFormData({
                submissionType: undefined,
            }),
            emailConfig: testEmailConfig,
            stateAnalystsEmails: testStateAnalystsEmails,
            testDescription: 'Error result.',
            expectedResult: new Error(
                `generateCMSReviewerEmails does not currently support submission type: undefined.`
            ),
        },
    ]
    test.each(contractOnlyWithValidRateData)(
        'Generate CMS Reviewer email: $testDescription',
        ({ submission, emailConfig, stateAnalystsEmails, expectedResult }) => {
            expect(
                generateCMSReviewerEmails(
                    emailConfig,
                    submission,
                    stateAnalystsEmails
                )
            ).toEqual(expect.objectContaining(expectedResult))
        }
    )

    test.each([
        {
            programIds: ['234-cfsdf-234324', CHIP_PROGRAMS_UUID['MS']],
            testDescription: 'valid CHIP ids in list',
            expectedResult: true,
        },
        {
            programIds: ['23432-df-123', 'not-chip'],
            testDescription: 'without CHIP ids in list',
            expectedResult: false,
        },
    ])(
        'includesChipPrograms: $testDescription',
        ({ programIds, expectedResult }) => {
            expect(includesChipPrograms(programIds)).toEqual(expectedResult)
        }
    )

    test.each([
        {
            reviewers: [
                'foo@example.com',
                testEmailConfig.oactEmails[0],
                'bar@example.com',
            ],
            config: testEmailConfig,
            testDescription: 'removes oact emails',
            expectedResult: ['foo@example.com', 'bar@example.com'],
        },
        {
            reviewers: [
                'Bobloblaw@example.com',
                'Lucille.Bluth@example.com',
                testEmailConfig.dmcpEmails[0],
            ],
            config: testEmailConfig,
            testDescription: 'removes dmcp emails',
            expectedResult: [
                'Bobloblaw@example.com',
                'Lucille.Bluth@example.com',
            ],
        },
        {
            reviewers: [
                'Bobloblaw@example.com',
                'Lucille.Bluth@example.com',
                testEmailConfig.dmcpEmails[0],
                testEmailConfig.dmcoEmails[0],
                testEmailConfig.oactEmails[0],
            ],
            config: testEmailConfig,
            testDescription:
                'does not remove dmco emails, they should get all emails',
            expectedResult: [
                'Bobloblaw@example.com',
                'Lucille.Bluth@example.com',
                testEmailConfig.dmcoEmails[0],
            ],
        },
    ])(
        'filterChipAndPRSubmissionReviewers: $testDescription',
        ({ reviewers, config, expectedResult }) => {
            expect(
                filterChipAndPRSubmissionReviewers(reviewers, config)
            ).toEqual(expectedResult)
        }
    )
})

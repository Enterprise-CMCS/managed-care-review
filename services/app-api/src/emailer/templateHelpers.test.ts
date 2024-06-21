import {
    filterChipAndPRSubmissionReviewers,
    findContractPrograms,
    generateCMSReviewerEmails,
    getQuestionRound,
    handleAsCHIPSubmission,
} from './templateHelpers'
import type { UnlockedHealthPlanFormDataType } from '../../../app-web/src/common-code/healthPlanFormDataType'
import {
    mockUnlockedContractAndRatesFormData,
    mockUnlockedContractOnlyFormData,
    mockContractRev,
    testEmailConfig,
    testStateAnalystsEmails,
    mockQuestionAndResponses,
} from '../testHelpers/emailerHelpers'
import type { EmailConfiguration, StateAnalystsEmails } from './emailer'
import type { ProgramType } from '../domain-models'

describe('generateCMSReviewerEmails', () => {
    const contractOnlyWithValidRateData: {
        submission: UnlockedHealthPlanFormDataType
        emailConfig: EmailConfiguration
        stateAnalystsEmails: StateAnalystsEmails
        testDescription: string
        expectedResult: string[] | Error
    }[] = [
        {
            submission: mockUnlockedContractOnlyFormData(),
            emailConfig: testEmailConfig(),
            stateAnalystsEmails: testStateAnalystsEmails,
            testDescription: 'contract only submission',
            expectedResult: [
                ...testEmailConfig().devReviewTeamEmails,
                ...testStateAnalystsEmails,
                ...testEmailConfig().dmcpSubmissionEmails,
            ],
        },
        {
            submission: mockUnlockedContractAndRatesFormData(),
            emailConfig: testEmailConfig(),
            stateAnalystsEmails: testStateAnalystsEmails,
            testDescription: 'contract and rates submission',
            expectedResult: [
                ...testEmailConfig().devReviewTeamEmails,
                ...testStateAnalystsEmails,
                ...testEmailConfig().dmcpSubmissionEmails,
                ...testEmailConfig().oactEmails,
            ],
        },
        {
            submission: mockUnlockedContractAndRatesFormData({
                stateCode: 'MS',
                programIDs: ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a'],
            }),
            emailConfig: testEmailConfig(),
            stateAnalystsEmails: testStateAnalystsEmails,
            testDescription:
                'submission with CHIP program specified for contract certification',
            expectedResult: [
                'devreview1@example.com',
                'devreview2@example.com',
                '"State Analyst 1" <StateAnalyst1@example.com>',
                '"State Analyst 2" <StateAnalyst2@example.com>',
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
                                s3URL: 's3://bucketname/key/test1',
                                name: 'foo',
                                sha256: 'fakesha',
                            },
                        ],
                        supportingDocuments: [],
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
            emailConfig: testEmailConfig(),
            stateAnalystsEmails: testStateAnalystsEmails,
            testDescription:
                'submission with CHIP program specified for rate certification',
            expectedResult: [
                'devreview1@example.com',
                'devreview2@example.com',
                '"State Analyst 1" <StateAnalyst1@example.com>',
                '"State Analyst 2" <StateAnalyst2@example.com>',
            ],
        },
        {
            submission: mockUnlockedContractAndRatesFormData({
                stateCode: 'PR',
            }),
            emailConfig: testEmailConfig(),
            stateAnalystsEmails: testStateAnalystsEmails,
            testDescription: 'Puerto Rico submission',
            expectedResult: [
                'devreview1@example.com',
                'devreview2@example.com',
                '"State Analyst 1" <StateAnalyst1@example.com>',
                '"State Analyst 2" <StateAnalyst2@example.com>',
            ],
        },
        {
            submission: mockUnlockedContractAndRatesFormData({
                submissionType: undefined,
            }),
            emailConfig: testEmailConfig(),
            stateAnalystsEmails: testStateAnalystsEmails,
            testDescription: 'error result.',
            expectedResult: new Error(
                `does not currently support submission type: undefined.`
            ),
        },
    ]
    test.each(contractOnlyWithValidRateData)(
        '$testDescription',
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
})

describe('handleAsCHIPSubmission', () => {
    test.each([
        {
            pkg: mockUnlockedContractAndRatesFormData({
                populationCovered: 'CHIP',
            }),
            testDescription: 'for valid CHIP submission',
            expectedResult: true,
        },
        {
            pkg: mockUnlockedContractAndRatesFormData({
                stateCode: 'MS',
                populationCovered: undefined,
                programIDs: ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a'],
            }),
            testDescription:
                'for MS submission with a CHIP associated ID for legacy reasons',
            expectedResult: true,
        },
        {
            pkg: mockUnlockedContractAndRatesFormData({
                stateCode: 'AZ',
                populationCovered: undefined,
            }),
            testDescription: 'for non MS submission with no population covered',
            expectedResult: false,
        },
        {
            pkg: mockUnlockedContractAndRatesFormData({
                populationCovered: 'MEDICAID',
            }),
            testDescription: 'for non CHIP submission',
            expectedResult: false,
        },
    ])('$testDescription', ({ pkg, expectedResult }) => {
        expect(handleAsCHIPSubmission(pkg)).toEqual(expectedResult)
    })
})

describe('filterChipAndPRSubmissionReviewers', () => {
    test.each([
        {
            reviewers: [
                'foo@example.com',
                testEmailConfig().oactEmails[0],
                'bar@example.com',
            ],
            config: testEmailConfig(),
            testDescription: 'removes oact emails',
            expectedResult: ['foo@example.com', 'bar@example.com'],
        },
        {
            reviewers: [
                'Bobloblaw@example.com',
                'Lucille.Bluth@example.com',
                testEmailConfig().dmcpSubmissionEmails[0],
            ],
            config: testEmailConfig(),
            testDescription: 'removes dmcp emails',
            expectedResult: [
                'Bobloblaw@example.com',
                'Lucille.Bluth@example.com',
            ],
        },
    ])('$testDescription', ({ reviewers, config, expectedResult }) => {
        expect(filterChipAndPRSubmissionReviewers(reviewers, config)).toEqual(
            expectedResult
        )
    })
})

describe('findContractPrograms', () => {
    test('successfully returns programs for a contract', async () => {
        const sub = mockContractRev()
        const statePrograms: [ProgramType] = [
            {
                id: 'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                name: 'CHIP',
                fullName: 'MN CHIP',
                isRateProgram: false,
            },
        ]

        const programs = findContractPrograms(sub, statePrograms)

        expect(programs).toEqual(statePrograms)
    })

    test('throws error if state and contract program ids do not match', async () => {
        const sub = mockContractRev()
        const statePrograms: [ProgramType] = [
            {
                id: 'unmatched-id',
                name: 'CHIP',
                fullName: 'MN CHIP',
                isRateProgram: false,
            },
        ]

        const result = findContractPrograms(sub, statePrograms)
        if (!(result instanceof Error)) {
            throw new Error('must be an error')
        }
        expect(result.message).toContain(
            "Can't find programs abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce from state MN"
        )
    })
})

describe('getQuestionRound', () => {
    test.each([
        {
            questions: [
                mockQuestionAndResponses({
                    id: 'target-question',
                    division: 'OACT',
                    createdAt: new Date('03/01/2024'),
                }),
                mockQuestionAndResponses({
                    division: 'DMCO',
                    createdAt: new Date('03/01/2024'),
                }),
                mockQuestionAndResponses({
                    division: 'OACT',
                    createdAt: new Date('02/01/2024'),
                }),
                mockQuestionAndResponses({
                    division: 'OACT',
                    createdAt: new Date('01/01/2024'),
                }),
            ],
            currentQuestion: mockQuestionAndResponses({
                id: 'target-question',
                division: 'OACT',
                createdAt: new Date('03/01/2024'),
            }),
            expectedResult: 3,
            testDescription: 'Gets correct round for latest question from OACT',
        },
        {
            questions: [
                mockQuestionAndResponses({
                    division: 'OACT',
                    createdAt: new Date('03/01/2024'),
                }),
                mockQuestionAndResponses({
                    division: 'DMCO',
                    createdAt: new Date('03/01/2024'),
                }),
                mockQuestionAndResponses({
                    id: 'target-question',
                    division: 'OACT',
                    createdAt: new Date('02/01/2024'),
                }),
                mockQuestionAndResponses({
                    division: 'OACT',
                    createdAt: new Date('01/01/2024'),
                }),
            ],
            currentQuestion: mockQuestionAndResponses({
                id: 'target-question',
                division: 'OACT',
                createdAt: new Date('03/01/2024'),
            }),
            expectedResult: 2,
            testDescription: 'Gets correct round for second question from OACT',
        },
        {
            questions: [
                mockQuestionAndResponses({
                    division: 'OACT',
                    createdAt: new Date('03/01/2024'),
                }),
                mockQuestionAndResponses({
                    division: 'DMCO',
                    createdAt: new Date('03/01/2024'),
                }),
                mockQuestionAndResponses({
                    id: 'target-question',
                    division: 'OACT',
                    createdAt: new Date('02/01/2024'),
                }),
                mockQuestionAndResponses({
                    division: 'OACT',
                    createdAt: new Date('01/01/2024'),
                }),
            ],
            currentQuestion: mockQuestionAndResponses({
                id: 'not-found-question',
                division: 'OACT',
                createdAt: new Date('03/01/2024'),
            }),
            expectedResult: new Error(
                'Error getting question round, current question index not found'
            ),
            testDescription:
                'Returns error if question is not found in questions',
        },
        {
            questions: [
                mockQuestionAndResponses({
                    division: 'OACT',
                    createdAt: new Date('03/01/2024'),
                }),
                mockQuestionAndResponses({
                    division: 'DMCO',
                    createdAt: new Date('03/01/2024'),
                }),
                mockQuestionAndResponses({
                    id: 'target-question',
                    division: 'OACT',
                    createdAt: new Date('02/01/2024'),
                }),
                mockQuestionAndResponses({
                    division: 'OACT',
                    createdAt: new Date('01/01/2024'),
                }),
            ],
            currentQuestion: mockQuestionAndResponses({
                id: 'not-found-question',
                division: 'DMCP',
                createdAt: new Date('03/01/2024'),
            }),
            expectedResult: new Error(
                'Error getting question round, current question not found'
            ),
            testDescription: 'Returns error if divison has no questions',
        },
    ])('$testDescription', ({ questions, currentQuestion, expectedResult }) => {
        expect(getQuestionRound(questions, currentQuestion)).toEqual(
            expectedResult
        )
    })
})

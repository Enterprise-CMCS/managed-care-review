import {
    filterChipAndPRSubmissionReviewers,
    findContractPrograms,
    getQuestionRound,
    handleAsCHIPSubmissionForContract,
    generateCMSReviewerEmailsForUnlockedContract,
} from './templateHelpers'
import {
    mockContractRev,
    testEmailConfig,
    testStateAnalystsEmails,
    mockQuestionAndResponses,
    mockUnlockedContract,
    mockRateRevision,
    mockRate,
    mockContract,
} from '../testHelpers/emailerHelpers'
import type { EmailConfiguration, StateAnalystsEmails } from './emailer'
import type { ProgramType, UnlockedContractType } from '../domain-models'

describe('generateCMSReviewerEmails', () => {
    const contract = mockUnlockedContract()
    contract.draftRevision.formData.riskBasedContract = true
    const contractOnlyWithValidRateData: {
        submission: UnlockedContractType
        emailConfig: EmailConfiguration
        stateAnalystsEmails: StateAnalystsEmails
        testDescription: string
        expectedResult: string[] | Error
    }[] = [
        {
            submission: contract,
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
            submission: contract,
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
            submission: mockUnlockedContract({
                stateCode: 'MS',
                draftRevision: {
                    ...mockContractRev({
                        contract: {
                            stateCode: 'MS',
                            stateNumber: 4,
                            id: 'test-contract-123',
                        },
                        formData: {
                            ...mockContractRev().formData,
                            programIDs: [
                                '36c54daf-7611-4a15-8c3b-cdeb3fd7e25a',
                            ],
                        },
                    }),
                },
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
            submission: mockUnlockedContract({
                stateCode: 'MS',
                draftRates: [
                    mockRate({
                        stateCode: 'MS',
                        revisions: [
                            mockRateRevision({
                                formData: {
                                    ...mockRateRevision().formData,
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
                                    certifyingActuaryContacts: [
                                        {
                                            actuarialFirm: 'DELOITTE',
                                            name: 'Actuary Contact 1',
                                            titleRole: 'Test Actuary Contact 1',
                                            email: 'actuarycontact1@example.com',
                                        },
                                    ],
                                    actuaryCommunicationPreference:
                                        'OACT_TO_ACTUARY',
                                },
                            }),
                        ],
                    }),
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
            submission: mockUnlockedContract({
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
            submission: mockUnlockedContract({
                draftRevision: {
                    ...mockContractRev(),
                    formData: {
                        ...mockContractRev().formData,
                        // @ts-ignore
                        submissionType: undefined,
                    },
                },
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
                generateCMSReviewerEmailsForUnlockedContract(
                    emailConfig,
                    submission,
                    stateAnalystsEmails
                )
            ).toEqual(expect.objectContaining(expectedResult))
        }
    )
})

describe('handleAsCHIPSubmission', () => {
    const defaultPackageSubmissions = mockContract().packageSubmissions
    test.each([
        {
            contract: mockContract({
                packageSubmissions: [
                    {
                        ...defaultPackageSubmissions[0],
                        contractRevision: {
                            ...mockContractRev(),
                            formData: {
                                ...mockContractRev().formData,
                                populationCovered: 'CHIP',
                            },
                        },
                    },
                ],
            }),
            testDescription: 'for valid CHIP submission',
            expectedResult: true,
        },
        {
            contract: mockContract({
                stateCode: 'MS',
                packageSubmissions: [
                    {
                        ...defaultPackageSubmissions[0],
                        contractRevision: {
                            ...mockContractRev(),
                            contract: {
                                stateCode: 'MS',
                                stateNumber: 4,
                                id: 'test-contract-123',
                            },
                            formData: {
                                ...mockContractRev().formData,
                                populationCovered: undefined,
                                programIDs: [
                                    '36c54daf-7611-4a15-8c3b-cdeb3fd7e25a',
                                ],
                            },
                        },
                    },
                ],
            }),
            testDescription:
                'for MS submission with a CHIP associated ID for legacy reasons',
            expectedResult: true,
        },
        {
            contract: mockContract({
                stateCode: 'AZ',
                packageSubmissions: [
                    {
                        ...defaultPackageSubmissions[0],
                        contractRevision: {
                            ...mockContractRev(),
                            contract: {
                                stateCode: 'AZ',
                                stateNumber: 4,
                                id: 'test-contract-123',
                            },
                            formData: {
                                ...mockContractRev().formData,
                                populationCovered: undefined,
                            },
                        },
                    },
                ],
            }),
            testDescription: 'for non MS submission with no population covered',
            expectedResult: false,
        },
        {
            contract: mockContract({
                packageSubmissions: [
                    {
                        ...defaultPackageSubmissions[0],
                        contractRevision: {
                            ...mockContractRev(),
                            formData: {
                                ...mockContractRev().formData,
                                populationCovered: 'MEDICAID',
                            },
                        },
                    },
                ],
            }),
            testDescription: 'for non CHIP submission',
            expectedResult: false,
        },
    ])('$testDescription', ({ contract, expectedResult }) => {
        const contractRev = contract.packageSubmissions[0].contractRevision
        const rateRevs = contract.packageSubmissions[0].rateRevisions
        expect(
            handleAsCHIPSubmissionForContract(contractRev, rateRevs)
        ).toEqual(expectedResult)
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
                    contractID: 'test-contract-id',
                    id: 'target-question',
                    division: 'OACT',
                    createdAt: new Date('03/01/2024'),
                }),
                mockQuestionAndResponses({
                    contractID: 'test-contract-id',
                    division: 'DMCO',
                    createdAt: new Date('03/01/2024'),
                }),
                mockQuestionAndResponses({
                    contractID: 'test-contract-id',
                    division: 'OACT',
                    createdAt: new Date('02/01/2024'),
                }),
                mockQuestionAndResponses({
                    contractID: 'test-contract-id',
                    division: 'OACT',
                    createdAt: new Date('01/01/2024'),
                }),
            ],
            currentQuestion: mockQuestionAndResponses({
                contractID: 'test-contract-id',
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
                    contractID: 'test-contract-id',
                    division: 'OACT',
                    createdAt: new Date('03/01/2024'),
                }),
                mockQuestionAndResponses({
                    contractID: 'test-contract-id',
                    division: 'DMCO',
                    createdAt: new Date('03/01/2024'),
                }),
                mockQuestionAndResponses({
                    contractID: 'test-contract-id',
                    id: 'target-question',
                    division: 'OACT',
                    createdAt: new Date('02/01/2024'),
                }),
                mockQuestionAndResponses({
                    contractID: 'test-contract-id',
                    division: 'OACT',
                    createdAt: new Date('01/01/2024'),
                }),
            ],
            currentQuestion: mockQuestionAndResponses({
                contractID: 'test-contract-id',
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
                    contractID: 'test-contract-id',
                    division: 'OACT',
                    createdAt: new Date('03/01/2024'),
                }),
                mockQuestionAndResponses({
                    contractID: 'test-contract-id',
                    division: 'DMCO',
                    createdAt: new Date('03/01/2024'),
                }),
                mockQuestionAndResponses({
                    contractID: 'test-contract-id',
                    id: 'target-question',
                    division: 'OACT',
                    createdAt: new Date('02/01/2024'),
                }),
                mockQuestionAndResponses({
                    contractID: 'test-contract-id',
                    division: 'OACT',
                    createdAt: new Date('01/01/2024'),
                }),
            ],
            currentQuestion: mockQuestionAndResponses({
                contractID: 'test-contract-id',
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
                    contractID: 'test-contract-id',
                    division: 'OACT',
                    createdAt: new Date('03/01/2024'),
                }),
                mockQuestionAndResponses({
                    contractID: 'test-contract-id',
                    division: 'DMCO',
                    createdAt: new Date('03/01/2024'),
                }),
                mockQuestionAndResponses({
                    contractID: 'test-contract-id',
                    id: 'target-question',
                    division: 'OACT',
                    createdAt: new Date('02/01/2024'),
                }),
                mockQuestionAndResponses({
                    contractID: 'test-contract-id',
                    division: 'OACT',
                    createdAt: new Date('01/01/2024'),
                }),
            ],
            currentQuestion: mockQuestionAndResponses({
                contractID: 'test-contract-id',
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

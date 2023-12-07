import {
    filterChipAndPRSubmissionReviewers,
    findContractPrograms,
    generateCMSReviewerEmails,
    handleAsCHIPSubmission,
} from './templateHelpers'
import type { UnlockedHealthPlanFormDataType } from '../../../app-web/src/common-code/healthPlanFormDataType'
import {
    mockUnlockedContractAndRatesFormData,
    mockUnlockedContractOnlyFormData,
    mockContractRev,
    testEmailConfig,
    testStateAnalystsEmails,
} from '../testHelpers/emailerHelpers'
import type { EmailConfiguration, StateAnalystsEmails } from './emailer'
import type { ProgramType } from '../domain-models'

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
            emailConfig: testEmailConfig(),
            stateAnalystsEmails: testStateAnalystsEmails,
            testDescription: 'Contract only submission',
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
            testDescription: 'Contract and rates submission',
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
                'Submission with CHIP program specified for contract certification',
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
                                s3URL: 'bar',
                                name: 'foo',
                                sha256: 'fakesha',
                                documentCategories: ['RATES' as const],
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
                'Submission with CHIP program specified for rate certification',
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
    ])(
        'handleAsCHIPSubmission: $testDescription',
        ({ pkg, expectedResult }) => {
            expect(handleAsCHIPSubmission(pkg)).toEqual(expectedResult)
        }
    )

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
    ])(
        'filterChipAndPRSubmissionReviewers: $testDescription',
        ({ reviewers, config, expectedResult }) => {
            expect(
                filterChipAndPRSubmissionReviewers(reviewers, config)
            ).toEqual(expectedResult)
        }
    )
    test('findContractPrograms successfully returns programs for a contract', async () => {
        const sub = mockContractRev()
        const statePrograms: [ProgramType] = [
            {
                id: 'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                name: 'CHIP',
                fullName: 'MN CHIP',
            },
        ]

        const programs = findContractPrograms(sub, statePrograms)

        expect(programs).toEqual(statePrograms)
    })

    test('findContractPrograms throws error if state and contract program ids do not match', async () => {
        const sub = mockContractRev()
        const statePrograms: [ProgramType] = [
            {
                id: 'unmatched-id',
                name: 'CHIP',
                fullName: 'MN CHIP',
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

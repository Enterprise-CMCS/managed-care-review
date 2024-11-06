import {
    testEmailConfig,
    mockRateQuestionAndResponses,
} from '../../testHelpers/emailerHelpers'
import type { RateQuestionType } from '../../domain-models'
import { sendRateQuestionResponseStateEmail } from './sendRateQuestionResponseStateEmail'
import type { RateType } from '../../domain-models'
import { testStateUser } from '../../testHelpers/userHelpers'
import {
    defaultFloridaProgram,
    defaultFloridaRateProgram,
} from '../../testHelpers/gqlHelpers'

describe('sendRateQuestionResponseStateEmail', () => {
    const testRate = (): RateType => ({
        id: 'test-rate',
        createdAt: new Date('2024-04-12'),
        updatedAt: new Date('2024-04-12'),
        status: 'SUBMITTED',
        stateCode: 'FL',
        parentContractID: 'parent-contract',
        stateNumber: 2,
        revisions: [],
        packageSubmissions: [
            {
                submitInfo: {
                    updatedAt: new Date('2024-04-12'),
                    updatedReason: 'initial submission',
                    updatedBy: testStateUser({
                        email: 'parent-contract-submitter@state.com',
                    }),
                },
                submittedRevisions: [],
                rateRevision: {
                    id: 'test-rate-revision',
                    rateID: 'test-rate',
                    submitInfo: {
                        updatedAt: new Date('2024-04-12'),
                        updatedReason: 'initial submission',
                        updatedBy: testStateUser({
                            email: 'parent-contract-submitter@state.com',
                        }),
                    },
                    createdAt: new Date('2024-04-12'),
                    updatedAt: new Date('2024-04-12'),
                    formData: {
                        rateType: 'NEW',
                        rateCapitationType: 'RATE_CELL',
                        rateDateStart: new Date('2024-01-01'),
                        rateDateEnd: new Date('2025-01-01'),
                        rateDateCertified: new Date('2024-01-02'),
                        rateCertificationName: 'test-rate-certification-name',
                        rateProgramIDs: [defaultFloridaRateProgram().id],
                        rateDocuments: [
                            {
                                s3URL: 's3://bucketname/key/test1',
                                name: 'ratedoc1.doc',
                                sha256: 'foobar',
                            },
                        ],
                        supportingDocuments: [],
                        certifyingActuaryContacts: [
                            {
                                name: 'Foo Person',
                                titleRole: 'Bar Job',
                                email: 'certifyingActuary@example.com',
                                actuarialFirm: 'GUIDEHOUSE',
                            },
                        ],
                        addtlActuaryContacts: [
                            {
                                name: 'Bar Person',
                                titleRole: 'Baz Job',
                                email: 'addtlActuaryContacts@example.com',
                                actuarialFirm: 'OTHER',
                                actuarialFirmOther: 'Some Firm',
                            },
                        ],
                        actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                    },
                },
                contractRevisions: [
                    {
                        id: 'parent-contract-revision',
                        contract: {
                            id: 'parent-contract',
                            stateCode: 'FL',
                            stateNumber: 1,
                        },
                        submitInfo: {
                            updatedAt: new Date('2024-04-12'),
                            updatedReason: 'initial submission',
                            updatedBy: testStateUser({
                                email: 'parent-contract-submitter@state.com',
                            }),
                        },
                        createdAt: new Date('2024-04-12'),
                        updatedAt: new Date('2024-04-12'),
                        formData: {
                            programIDs: [defaultFloridaProgram().id],
                            submissionDescription: 'submission description',
                            submissionType: 'CONTRACT_AND_RATES',
                            contractType: 'BASE',
                            contractExecutionStatus: 'EXECUTED',
                            contractDateStart: new Date('2024-01-01'),
                            contractDateEnd: new Date('2025-01-01'),
                            contractDocuments: [],
                            managedCareEntities: ['MCO'],
                            federalAuthorities: ['STATE_PLAN'],
                            populationCovered: 'MEDICAID',
                            supportingDocuments: [],
                            stateContacts: [
                                {
                                    name: 'parent-contract-state-contact',
                                    titleRole: 'state contact',
                                    email: 'parent-contract-state-contact-1@state.com',
                                },
                                {
                                    name: 'duplicate-state-contact',
                                    titleRole: 'state contact',
                                    email: 'duplicateContact@state-contact.com',
                                },
                                {
                                    name: 'duplicate-state-contact',
                                    titleRole: 'state contact',
                                    email: 'duplicateContact@state-contact.com',
                                },
                            ],
                        },
                    },
                    {
                        id: 'second-contract-revision',
                        contract: {
                            id: 'second-contract',
                            stateCode: 'FL',
                            stateNumber: 1,
                        },
                        submitInfo: {
                            updatedAt: new Date('2024-04-12'),
                            updatedReason: 'initial submission',
                            updatedBy: testStateUser({
                                email: 'second-contract-submitter@state.com',
                            }),
                        },
                        createdAt: new Date('2024-04-12'),
                        updatedAt: new Date('2024-04-12'),
                        formData: {
                            programIDs: [defaultFloridaProgram().id],
                            submissionDescription: 'submission description',
                            submissionType: 'CONTRACT_AND_RATES',
                            contractType: 'BASE',
                            contractExecutionStatus: 'EXECUTED',
                            contractDateStart: new Date('2024-01-01'),
                            contractDateEnd: new Date('2025-01-01'),
                            contractDocuments: [],
                            managedCareEntities: ['MCO'],
                            federalAuthorities: ['STATE_PLAN'],
                            populationCovered: 'MEDICAID',
                            supportingDocuments: [],
                            stateContacts: [
                                {
                                    name: 'second-contract-state-contact',
                                    titleRole: 'state contact',
                                    email: 'second-contract-state-contact-1@state.com',
                                },
                                {
                                    name: 'duplicate-state-contact',
                                    titleRole: 'state contact',
                                    email: 'duplicateContact@state-contact.com',
                                },
                                {
                                    name: 'duplicate-state-contact',
                                    titleRole: 'state contact',
                                    email: 'duplicateContact@state-contact.com',
                                },
                            ],
                        },
                    },
                ],
            },
        ],
        questions: {
            DMCOQuestions: {
                totalCount: 0,
                edges: [],
            },
            DMCPQuestions: {
                totalCount: 0,
                edges: [],
            },
            OACTQuestions: {
                totalCount: 0,
                edges: [],
            },
        },
    })

    const currentQuestion = (): RateQuestionType =>
        mockRateQuestionAndResponses({
            id: `test-question-id-4`,
            createdAt: new Date('01/05/2024'),
            rateID: testRate().id,
            division: 'DMCO',
        })

    const questions = (): RateQuestionType[] => [
        currentQuestion(),
        mockRateQuestionAndResponses({
            id: `test-question-id-1`,
            createdAt: new Date('01/01/2024'),
            rateID: testRate().id,
            division: 'DMCO',
        }),
    ]

    test('to addresses list includes submitter emails', async () => {
        const template = await sendRateQuestionResponseStateEmail(
            testRate(),
            testEmailConfig(),
            questions(),
            currentQuestion()
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([
                    'parent-contract-submitter@state.com',
                    'second-contract-submitter@state.com',
                ]),
            })
        )
    })
    test('to addresses list includes all state contacts on submission', async () => {
        const template = await sendRateQuestionResponseStateEmail(
            testRate(),
            testEmailConfig(),
            questions(),
            currentQuestion()
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([
                    'parent-contract-state-contact-1@state.com',
                    'duplicateContact@state-contact.com',
                    'second-contract-state-contact-1@state.com',
                    'certifyingActuary@example.com',
                    'addtlActuaryContacts@example.com',
                ]),
            })
        )
    })

    it('to addresses does not include actuaries when rate communication preference is OACT_TO_STATE', async () => {
        const rate = testRate()
        rate.packageSubmissions[0].rateRevision.formData.actuaryCommunicationPreference =
            'OACT_TO_STATE'
        const template = await sendRateQuestionResponseStateEmail(
            rate,
            testEmailConfig(),
            questions(),
            currentQuestion()
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).not.toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([
                    'certifyingActuary@example.com',
                    'addtlActuaryContacts@example.com',
                ]),
            })
        )
    })

    test('to addresses list does not include duplicate state receiver emails on submission', async () => {
        const template = await sendRateQuestionResponseStateEmail(
            testRate(),
            testEmailConfig(),
            questions(),
            currentQuestion()
        )

        if (template instanceof Error) {
            throw template
        }

        // filter out known duplicate emails
        const filterKnownDuplicateEmails = template.toAddresses.filter(
            (email) => email === 'duplicateContact@state-contact.com'
        )

        // expect only 1 of the duplicate emails in the toAddress
        expect(filterKnownDuplicateEmails).toHaveLength(1)
    })

    test('includes link to submission', async () => {
        const template = await sendRateQuestionResponseStateEmail(
            testRate(),
            testEmailConfig(),
            questions(),
            currentQuestion()
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringContaining('View response'),
                bodyHTML: expect.stringContaining(
                    `http://localhost/submissions/parent-contract/rates/test-rate/question-and-answer`
                ),
            })
        )
    })

    test('subject line is correct and clearly states submission was successful', async () => {
        const template = await sendRateQuestionResponseStateEmail(
            testRate(),
            testEmailConfig(),
            questions(),
            currentQuestion()
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                subject: expect.stringContaining(
                    `Response to DMCO rate questions was successfully submitted.`
                ),
            })
        )
    })

    test('includes expected data', async () => {
        const template = await sendRateQuestionResponseStateEmail(
            testRate(),
            testEmailConfig(),
            questions(),
            currentQuestion()
        )

        if (template instanceof Error) {
            throw template
        }

        // Includes correct division the response was sent to
        // Includes the correct round number for the response
        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringContaining(
                    'Response to DMCO rate questions was successfully submitted.'
                ),
            })
        )
        // Includes correct date response was submitted
        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringContaining('Date: 01/05/2024'),
            })
        )

        // includes information about what to do next
        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringContaining(
                    'Questions: You may receive additional questions from CMS as they conduct their reviews.'
                ),
            })
        )
    })

    test('renders overall email for a new response as expected', async () => {
        const template = await sendRateQuestionResponseStateEmail(
            testRate(),
            testEmailConfig(),
            questions(),
            currentQuestion()
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template.bodyHTML).toMatchSnapshot()
    })
})

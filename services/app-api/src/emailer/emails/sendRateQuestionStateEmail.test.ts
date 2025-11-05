import { testStateUser } from '../../testHelpers/userHelpers'
import {
    defaultFloridaProgram,
    defaultFloridaRateProgram,
} from '../../testHelpers/gqlHelpers'

import type { RateQuestionType } from '../../domain-models'
import { sendRateQuestionStateEmail } from './sendRateQuestionStateEmail'
import {
    mockRate,
    mockRateQuestionAndResponses,
    testEmailConfig,
} from '../../testHelpers/emailerHelpers'

describe('sendRateQuestionStateEmail', () => {
    const testRate = mockRate({
        id: 'test-rate',
        createdAt: new Date('2024-04-12'),
        updatedAt: new Date('2024-04-12'),
        parentContractID: 'parent-contract',
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
    })

    const currentQuestion = (): RateQuestionType =>
        mockRateQuestionAndResponses({
            id: 'dmco-rate-question-1',
            createdAt: new Date('2024-04-23'),
            rateID: testRate.id,
            division: 'DMCO',
            documents: [
                {
                    id: 'dmco-rate-question-1',
                    name: 'dmco-rate-question-1',
                    s3URL: 's3://bucketName/key/dmco-rate-question-1-doc',
                    downloadURL: 'https://fake-bucket.s3.amazonaws.com/test',
                },
            ],
            responses: [],
        })

    const contractSubmissionType = 'HEALTH_PLAN'

    it('to addresses list includes submitter emails', async () => {
        const template = await sendRateQuestionStateEmail(
            testRate,
            contractSubmissionType,
            testEmailConfig(),
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
    it('includes mmcratesetting in the ccAddress', async () => {
        const template = await sendRateQuestionStateEmail(
            testRate,
            contractSubmissionType,
            testEmailConfig(),
            currentQuestion()
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                ccAddresses: expect.arrayContaining([
                    ...testEmailConfig().dmcpSubmissionEmails,
                ]),
            })
        )
    })
    it('to addresses list includes all state contacts on all contracts submitted with rate', async () => {
        const template = await sendRateQuestionStateEmail(
            testRate,
            contractSubmissionType,
            testEmailConfig(),
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
        const rate = testRate
        rate.packageSubmissions[0].rateRevision.formData.actuaryCommunicationPreference =
            'OACT_TO_STATE'
        const template = await sendRateQuestionStateEmail(
            rate,
            contractSubmissionType,
            testEmailConfig(),
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
    it('to addresses list does not include duplicate emails', async () => {
        const template = await sendRateQuestionStateEmail(
            testRate,
            contractSubmissionType,
            testEmailConfig(),
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
    it('subject line is correct and clearly states submission is complete', async () => {
        const template = await sendRateQuestionStateEmail(
            testRate,
            contractSubmissionType,
            testEmailConfig(),
            currentQuestion()
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                subject: expect.stringContaining(
                    `New questions about test-rate-certification-name`
                ),
                bodyText: expect.stringContaining(
                    'test-rate-certification-name'
                ),
            })
        )
    })
    it('includes link to rate Q&A page', async () => {
        const template = await sendRateQuestionStateEmail(
            testRate,
            contractSubmissionType,
            testEmailConfig(),
            currentQuestion()
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringContaining(
                    'Open the submission in MC-Review to answer question'
                ),
                bodyHTML: expect.stringContaining(
                    `http://localhost/submissions/health-plan/parent-contract/rates/test-rate/question-and-answer`
                ),
            })
        )
    })
    it('includes expected data on the CMS analyst who sent the question', async () => {
        const template = await sendRateQuestionStateEmail(
            testRate,
            contractSubmissionType,
            testEmailConfig(),
            currentQuestion()
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringContaining(
                    'Sent by: Prince Zuko (DMCO)  zuko@example.com (zuko@example.com)'
                ),
            })
        )
        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringContaining('Date: 04/22/2024'),
            })
        )
    })
    it('renders overall email for a new rate question as expected', async () => {
        const template = await sendRateQuestionStateEmail(
            testRate,
            contractSubmissionType,
            testEmailConfig(),
            currentQuestion()
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringContaining(
                    'Sent by: Prince Zuko (DMCO)  zuko@example.com (zuko@example.com)'
                ),
            })
        )
        expect(template.bodyHTML).toMatchSnapshot()
    })
})

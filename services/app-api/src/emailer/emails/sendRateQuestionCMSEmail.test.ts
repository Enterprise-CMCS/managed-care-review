import {
    mockRateQuestionAndResponses,
    testEmailConfig,
    mockRate,
} from '../../testHelpers/emailerHelpers'
import { sendRateQuestionCMSEmail } from './sendRateQuestionCMSEmail'
import { getTestStateAnalystsEmails } from '../../testHelpers/parameterStoreHelpers'
import type { DivisionType, RateQuestionType } from '../../domain-models'

describe('sendRateQuestionCMSEmail', () => {
    const stateAnalysts = getTestStateAnalystsEmails('MN')

    const rate = mockRate()

    const currentQuestion = (division: DivisionType): RateQuestionType =>
        mockRateQuestionAndResponses({
            id: `test-question-id-4`,
            createdAt: new Date('01/05/2024'),
            rateID: rate.id,
            division: division,
        })

    const questions = (division: DivisionType): RateQuestionType[] => [
        mockRateQuestionAndResponses({
            id: `test-question-id-1`,
            createdAt: new Date('01/01/2024'),
            rateID: rate.id,
            division: division,
        }),
        currentQuestion(division),
    ]

    test('to addresses list only includes state analyst when a DMCO user submits a question', async () => {
        // Dev and DMCO are considered defaults for all automated emails
        const template = await sendRateQuestionCMSEmail(
            rate,
            stateAnalysts,
            testEmailConfig(),
            questions('DMCO'),
            currentQuestion('DMCO')
        )

        if (template instanceof Error) {
            throw template
        }

        // expected to include address
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([
                    ...stateAnalysts,
                    ...testEmailConfig().devReviewTeamEmails,
                    ...testEmailConfig().dmcoEmails,
                ]),
            })
        )

        // expected to not include addresses
        expect(template).toEqual(
            expect.not.objectContaining({
                toAddresses: expect.arrayContaining([
                    ...testEmailConfig().oactEmails,
                    ...testEmailConfig().dmcpReviewEmails,
                ]),
            })
        )
    })

    test('to addresses list includes state analyst and OACT group emails when an OACT user submits a question', async () => {
        const template = await sendRateQuestionCMSEmail(
            rate,
            stateAnalysts,
            testEmailConfig(),
            questions('OACT'),
            currentQuestion('OACT')
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([
                    ...stateAnalysts,
                    ...testEmailConfig().devReviewTeamEmails,
                    ...testEmailConfig().dmcoEmails,
                    ...testEmailConfig().oactEmails,
                ]),
            })
        )

        expect(template).toEqual(
            expect.not.objectContaining({
                toAddresses: expect.arrayContaining([
                    ...testEmailConfig().dmcpReviewEmails,
                ]),
            })
        )
    })

    test('to addresses list includes state analyst and DMCP group emails when a DMCP user submits a question', async () => {
        const template = await sendRateQuestionCMSEmail(
            rate,
            stateAnalysts,
            testEmailConfig(),
            questions('DMCP'),
            currentQuestion('DMCP')
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([
                    ...stateAnalysts,
                    ...testEmailConfig().devReviewTeamEmails,
                    ...testEmailConfig().dmcoEmails,
                    ...testEmailConfig().dmcpReviewEmails,
                ]),
            })
        )

        expect(template).toEqual(
            expect.not.objectContaining({
                toAddresses: expect.arrayContaining([
                    ...testEmailConfig().oactEmails,
                ]),
            })
        )
    })

    test('email contains correct question round', async () => {
        const currentQuestion = mockRateQuestionAndResponses({
            id: `test-question-id-4`,
            createdAt: new Date('01/06/2024'),
            rateID: rate.id,
            division: 'DMCO',
        })

        const questions = [
            currentQuestion,
            mockRateQuestionAndResponses({
                id: `test-question-id-3`,
                createdAt: new Date('01/01/2024'),
                rateID: rate.id,
                division: 'DMCO',
            }),
            mockRateQuestionAndResponses({
                id: `test-DMCP-question-id-1`,
                createdAt: new Date('01/01/2024'),
                rateID: rate.id,
                division: 'DMCP',
            }),
            mockRateQuestionAndResponses({
                id: `test-question-id-2`,
                createdAt: new Date('01/01/2024'),
                rateID: rate.id,
                division: 'DMCO',
            }),
            mockRateQuestionAndResponses({
                id: `test-OACT-question-id-1`,
                createdAt: new Date('01/01/2024'),
                rateID: rate.id,
                division: 'OACT',
            }),
            mockRateQuestionAndResponses({
                id: `test-question-id-1`,
                createdAt: new Date('01/01/2024'),
                rateID: rate.id,
                division: 'DMCO',
            }),
        ]

        const template = await sendRateQuestionCMSEmail(
            rate,
            stateAnalysts,
            testEmailConfig(),
            questions,
            currentQuestion
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringContaining('Round: 4'),
            })
        )
    })

    test('subject line is correct', async () => {
        const name =
            rate.packageSubmissions[0].rateRevision.formData
                .rateCertificationName
        const template = await sendRateQuestionCMSEmail(
            rate,
            stateAnalysts,
            testEmailConfig(),
            questions('DMCO'),
            currentQuestion('DMCO')
        )

        expect(template).toEqual(
            expect.objectContaining({
                subject: expect.stringContaining(`Questions sent for ${name}`),
                bodyText: expect.stringContaining(`${name}`),
            })
        )
    })

    test('includes link to the question response page', async () => {
        const template = await sendRateQuestionCMSEmail(
            rate,
            stateAnalysts,
            testEmailConfig(),
            questions('DMCO'),
            currentQuestion('DMCO')
        )

        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringMatching(/View rate Q&A/),
                bodyHTML: expect.stringContaining(
                    `http://localhost/rates/${rate.id}/question-and-answer`
                ),
            })
        )
    })

    test('includes expected data on the CMS analyst who sent the question', async () => {
        const template = await sendRateQuestionCMSEmail(
            rate,
            stateAnalysts,
            testEmailConfig(),
            questions('DMCO'),
            currentQuestion('DMCO')
        )

        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringContaining(
                    'Sent by: Prince Zuko (DMCO)  zuko@example.com (zuko@example.com)'
                ),
            })
        )
        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringContaining('Date: 01/04/2024'),
            })
        )
    })

    test('renders overall email for a new question as expected', async () => {
        const template = await sendRateQuestionCMSEmail(
            rate,
            stateAnalysts,
            testEmailConfig(),
            questions('DMCO'),
            currentQuestion('DMCO')
        )

        if (template instanceof Error) {
            console.error(template)
            return
        }

        expect(template.bodyHTML).toMatchSnapshot()
    })
})

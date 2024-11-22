import {
    mockRateQuestionAndResponses,
    testEmailConfig,
} from '../../testHelpers/emailerHelpers'
import { sendRateQuestionResponseCMSEmail } from './sendRateQuestionResponseCMSEmail'
import { mockRate } from '../../testHelpers/emailerHelpers'
import { getTestStateAnalystsEmails } from '../../testHelpers/parameterStoreHelpers'
import type { DivisionType, RateQuestionType } from '../../domain-models'

describe('sendRateQuestionResponseCMSEmail', () => {
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

    test('to addresses list only includes state analyst when a state user submits a response to a DMCO question', async () => {
        const template = await sendRateQuestionResponseCMSEmail(
            rate,
            stateAnalysts,
            testEmailConfig(),
            questions('DMCO'),
            currentQuestion('DMCO')
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining([
                    ...stateAnalysts,
                    ...testEmailConfig().devReviewTeamEmails,
                ]),
            })
        )

        expect(template).toEqual(
            expect.not.objectContaining({
                toAddresses: expect.arrayContaining([
                    ...testEmailConfig().oactEmails,
                    ...testEmailConfig().dmcpReviewEmails,
                ]),
            })
        )
    })

    test('to addresses list includes state analyst and OACT group emails when a state user submits a response to an OACT question', async () => {
        const template = await sendRateQuestionResponseCMSEmail(
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
                    ...testEmailConfig().oactEmails,
                ]),
            })
        )
    })

    test('to addresses list includes state analyst and DMCP group emails when a state user submits a response to a DMCP question', async () => {
        const template = await sendRateQuestionResponseCMSEmail(
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
                    ...testEmailConfig().dmcpReviewEmails,
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

        const template = await sendRateQuestionResponseCMSEmail(
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
        const template = await sendRateQuestionResponseCMSEmail(
            rate,
            stateAnalysts,
            testEmailConfig(),
            questions('DMCO'),
            currentQuestion('DMCO')
        )

        expect(template).toEqual(
            expect.objectContaining({
                subject: expect.stringContaining(`New Responses for ${name}`),
                bodyText: expect.stringContaining(`${name}`),
            })
        )
    })

    test('includes link to the question response page', async () => {
        const template = await sendRateQuestionResponseCMSEmail(
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

    test('includes expected data on the state user who sent the response', async () => {
        const template = await sendRateQuestionResponseCMSEmail(
            rate,
            stateAnalysts,
            testEmailConfig(),
            questions('DMCO'),
            currentQuestion('DMCO')
        )

        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringContaining(
                    'Submitted by: James Brown  james@example.com (james@example.com)'
                ),
            })
        )
        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringContaining(
                    'Questions sent on: 01/04/2024'
                ),
            })
        )
    })

    test('renders overall email for a new response as expected', async () => {
        const template = await sendRateQuestionResponseCMSEmail(
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

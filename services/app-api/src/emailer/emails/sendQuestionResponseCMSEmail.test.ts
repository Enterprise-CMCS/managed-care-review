import {
    mockContractRev,
    mockMNState,
    mockQuestionAndResponses,
    testEmailConfig,
} from '../../testHelpers/emailerHelpers'
import { getTestStateAnalystsEmails } from '../../testHelpers/parameterStoreHelpers'
import { testCMSUser } from '../../testHelpers/userHelpers'
import { sendQuestionResponseCMSEmail } from './sendQuestionResponseCMSEmail'

const stateAnalysts = getTestStateAnalystsEmails('FL')
const oactCMSUser = testCMSUser({
    givenName: 'Bob',
    familyName: 'Smith',
    divisionAssignment: 'OACT',
})
const dmcpUser = testCMSUser({
    givenName: 'Bob',
    familyName: 'Smith',
    divisionAssignment: 'DMCP',
})
const contractRev = mockContractRev()
contractRev.formData.riskBasedContract = true
const defaultMNStatePrograms = mockMNState().programs
const questions = [
    mockQuestionAndResponses({
        id: 'test-question-id-4',
        createdAt: new Date('02/03/2024'),
        contractID: contractRev.id,
        addedBy: oactCMSUser,
        division: 'OACT',
    }),
    mockQuestionAndResponses({
        id: 'test-question-id-3',
        createdAt: new Date('02/03/2024'),
        contractID: contractRev.id,
        addedBy: dmcpUser,
        division: 'DMCP',
    }),
    mockQuestionAndResponses({
        id: 'test-question-id-2',
        createdAt: new Date('02/03/2024'),
        contractID: contractRev.id,
        addedBy: dmcpUser,
        division: 'DMCO',
    }),
    mockQuestionAndResponses({
        id: 'test-question-id-1',
        createdAt: new Date('01/03/2024'),
        contractID: contractRev.id,
        addedBy: oactCMSUser,
        division: 'OACT',
    }),
]

test.each([
    {
        questions,
        currentQuestion: mockQuestionAndResponses({
            id: 'test-question-id-4',
            createdAt: new Date('02/03/2024'),
            contractID: contractRev.id,
            addedBy: oactCMSUser,
            division: 'OACT',
        }),
        expectedResult: [
            ...stateAnalysts,
            ...testEmailConfig().devReviewTeamEmails,
            ...testEmailConfig().oactEmails,
        ],
        testDescription: 'OACT Q&A response email contains correct recipients',
    },
    {
        questions,
        currentQuestion: mockQuestionAndResponses({
            id: 'test-question-id-3',
            createdAt: new Date('02/03/2024'),
            contractID: contractRev.id,
            addedBy: dmcpUser,
            division: 'DMCP',
        }),
        expectedResult: [
            ...stateAnalysts,
            ...testEmailConfig().devReviewTeamEmails,
            ...testEmailConfig().dmcpReviewEmails,
        ],
        testDescription: 'DMCP Q&A response email contains correct recipients',
    },
    {
        questions,
        currentQuestion: mockQuestionAndResponses({
            id: 'test-question-id-2',
            createdAt: new Date('02/03/2024'),
            contractID: contractRev.id,
            addedBy: dmcpUser,
            division: 'DMCO',
        }),
        expectedResult: [
            ...stateAnalysts,
            ...testEmailConfig().devReviewTeamEmails,
        ],
        testDescription: 'DMCO Q&A response email contains correct recipients',
    },
])(
    '$testDescription',
    async ({ questions, currentQuestion, expectedResult }) => {
        const result = await sendQuestionResponseCMSEmail(
            contractRev,
            testEmailConfig(),
            defaultMNStatePrograms,
            stateAnalysts,
            currentQuestion,
            questions
        )

        if (result instanceof Error) {
            throw new Error(`Unexpect error: ${result.message}`)
        }

        expect(result).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining(expectedResult),
            })
        )
    }
)

test('renders overall CMS email for a new state response as expected', async () => {
    const currentQuestion = questions[0]

    const result = await sendQuestionResponseCMSEmail(
        contractRev,
        testEmailConfig(),
        defaultMNStatePrograms,
        stateAnalysts,
        currentQuestion,
        questions
    )

    if (result instanceof Error) {
        throw new Error(`Unexpect error: ${result.message}`)
    }

    expect(result.bodyHTML).toMatchSnapshot()
})

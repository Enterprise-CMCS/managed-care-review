import {
    testEmailConfig,
    mockContractRev,
    mockMNState,
    mockQuestionAndResponses,
} from '../../testHelpers/emailerHelpers'
import type { CMSUserType, StateType, Question } from '../../domain-models'
import { packageName } from 'app-web/src/common-code/healthPlanFormDataType'
import { sendQuestionCMSEmail } from './index'
import { getTestStateAnalystsEmails } from '../../testHelpers/parameterStoreHelpers'

const stateAnalysts = getTestStateAnalystsEmails('FL')

const flState: StateType = {
    stateCode: 'FL',
    name: 'Florida',
}

const cmsUser: CMSUserType = {
    id: '1234',
    role: 'CMS_USER',
    divisionAssignment: 'DMCO',
    familyName: 'McDonald',
    givenName: 'Ronald',
    email: 'cms@email.com',
    stateAssignments: [flState],
}

const questions: Question[] = [
    mockQuestionAndResponses({
        id: 'test-question-id-1',
        addedBy: cmsUser,
        division: 'DMCO',
    }),
]

test('to addresses list only includes state analyst when a DMCO user submits a question', async () => {
    const sub = mockContractRev()
    const defaultStatePrograms = mockMNState().programs

    const template = await sendQuestionCMSEmail(
        sub,
        stateAnalysts,
        testEmailConfig(),
        defaultStatePrograms,
        questions
    )

    if (template instanceof Error) {
        throw template
    }

    expect(template).toEqual(
        expect.not.objectContaining({
            toAddresses: expect.arrayContaining([
                ...testEmailConfig().oactEmails,
                ...testEmailConfig().dmcpReviewEmails,
            ]),
        })
    )

    expect(template).toEqual(
        expect.objectContaining({
            toAddresses: expect.arrayContaining([...stateAnalysts]),
        })
    )
})

test('to addresses list includes state analyst and OACT group emails when an OACT user submits a question', async () => {
    const sub = mockContractRev()
    const defaultStatePrograms = mockMNState().programs
    const oactUser: CMSUserType = {
        ...cmsUser,
        divisionAssignment: 'OACT',
    }
    const questionsFromOACT: Question[] = [
        {
            ...questions[0],
            addedBy: oactUser,
        },
    ]
    const template = await sendQuestionCMSEmail(
        sub,
        stateAnalysts,
        testEmailConfig(),
        defaultStatePrograms,
        questionsFromOACT
    )

    if (template instanceof Error) {
        throw template
    }

    expect(template).toEqual(
        expect.objectContaining({
            toAddresses: expect.arrayContaining([
                ...stateAnalysts,
                ...testEmailConfig().oactEmails,
            ]),
        })
    )
})

test('to addresses list includes state analyst and DMCP group emails when a DMCP user submits a question', async () => {
    const sub = mockContractRev()
    const defaultStatePrograms = mockMNState().programs
    const dmcpUser: CMSUserType = {
        ...cmsUser,
        divisionAssignment: 'DMCP',
    }
    const questionsFromDMCP: Question[] = [
        {
            ...questions[0],
            addedBy: dmcpUser,
        },
    ]
    const template = await sendQuestionCMSEmail(
        sub,
        stateAnalysts,
        testEmailConfig(),
        defaultStatePrograms,
        questionsFromDMCP
    )

    if (template instanceof Error) {
        throw template
    }

    expect(template).toEqual(
        expect.objectContaining({
            toAddresses: expect.arrayContaining([
                ...stateAnalysts,
                ...testEmailConfig().dmcpReviewEmails,
            ]),
        })
    )
})

test('subject line is correct', async () => {
    const sub = mockContractRev()
    const defaultStatePrograms = mockMNState().programs
    const name = packageName(
        sub.contract.stateCode,
        sub.contract.stateNumber,
        sub.formData.programIDs,
        defaultStatePrograms
    )

    const template = await sendQuestionCMSEmail(
        sub,
        stateAnalysts,
        testEmailConfig(),
        defaultStatePrograms,
        questions
    )

    if (template instanceof Error) {
        throw template
    }

    expect(template).toEqual(
        expect.objectContaining({
            subject: expect.stringContaining(`Questions sent for ${name}`),
            bodyText: expect.stringContaining(`${name}`),
        })
    )
})

test('includes link to the question response page', async () => {
    const sub = mockContractRev()
    const defaultStatePrograms = mockMNState().programs
    const template = await sendQuestionCMSEmail(
        sub,
        stateAnalysts,
        testEmailConfig(),
        defaultStatePrograms,
        questions
    )

    if (template instanceof Error) {
        throw template
    }

    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringMatching(/View submission Q&A/),
            bodyHTML: expect.stringContaining(
                `http://localhost/submissions/${sub.contract.id}/question-and-answer`
            ),
        })
    )
})

test('includes expected data on the CMS analyst who sent the question', async () => {
    const sub = mockContractRev()
    const defaultStatePrograms = mockMNState().programs

    const template = await sendQuestionCMSEmail(
        sub,
        stateAnalysts,
        testEmailConfig(),
        defaultStatePrograms,
        questions
    )

    if (template instanceof Error) {
        throw template
    }

    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining(
                'Sent by: Ronald McDonald (DMCO)  cms@email.com (cms@email.com)'
            ),
        })
    )
    expect(template).toEqual(
        expect.objectContaining({
            bodyText: expect.stringContaining('Date: 01/01/2024'),
        })
    )
})

test('renders overall email for a new question as expected', async () => {
    const sub = mockContractRev()
    const defaultStatePrograms = mockMNState().programs
    const result = await sendQuestionCMSEmail(
        sub,
        stateAnalysts,
        testEmailConfig(),
        defaultStatePrograms,
        questions
    )

    if (result instanceof Error) {
        console.error(result)
        return
    }

    expect(result.bodyHTML).toMatchSnapshot()
})

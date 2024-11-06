import {
    createDBUsersWithFullData,
    testCMSUser,
} from '../../testHelpers/userHelpers'
import {
    constructTestPostgresServer,
    createTestRateQuestion,
    createTestRateQuestionResponse,
} from '../../testHelpers/gqlHelpers'
import { createAndSubmitTestContractWithRate } from '../../testHelpers/gqlContractHelpers'
import { assertAnError, assertAnErrorCode, must } from '../../testHelpers'
import { testEmailConfig, testEmailer } from '../../testHelpers/emailerHelpers'
import { getTestStateAnalystsEmails } from '../../testHelpers/parameterStoreHelpers'
// import { testLDService } from '../../testHelpers/launchDarklyHelpers'
// import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'

describe('createRateQuestionResponse', () => {
    const cmsUser = testCMSUser()
    beforeAll(async () => {
        //Inserting a new CMS user, with division assigned, in postgres in order to create the question to user relationship.
        await createDBUsersWithFullData([cmsUser])
    })

    it('returns question response data', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })
        const contractWithRate =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            contractWithRate.packageSubmissions[0].rateRevisions[0].rateID

        const rateQuestionResult = await createTestRateQuestion(
            cmsServer,
            rateID
        )
        const question = rateQuestionResult.data?.createRateQuestion.question

        const questionResponseResult = await createTestRateQuestionResponse(
            stateServer,
            question.id
        )
        const questionWithResponse =
            questionResponseResult.data?.createRateQuestionResponse.question

        expect(questionWithResponse).toEqual(
            expect.objectContaining({
                ...questionWithResponse,
                responses: expect.arrayContaining([
                    expect.objectContaining({
                        id: expect.any(String),
                        questionID: questionWithResponse.id,
                        addedBy: expect.objectContaining({
                            role: 'STATE_USER',
                        }),
                        documents: [
                            {
                                name: 'Test Question Response',
                                s3URL: 's3://bucketname/key/test1',
                                downloadURL:
                                    'https://fakes3.com/key?sekret=deadbeef',
                            },
                        ],
                    }),
                ]),
            })
        )
    })

    it('returns an error when attempting to create a response for a question that does not exist', async () => {
        const stateServer = await constructTestPostgresServer()
        const invalidID = 'Not-valid-rate-id'
        const questionResponseResult = await createTestRateQuestionResponse(
            stateServer,
            invalidID
        )
        expect(questionResponseResult).toBeDefined()
        expect(assertAnErrorCode(questionResponseResult)).toBe('BAD_USER_INPUT')
        expect(assertAnError(questionResponseResult).message).toBe(
            `Rate question with ID: ${invalidID} not found to attach response to`
        )
    })
    it('returns an error if a cms user attempts to create a response for a rate question', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })
        const contractWithRate =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            contractWithRate.packageSubmissions[0].rateRevisions[0].rateID

        const rateQuestionResult = await createTestRateQuestion(
            cmsServer,
            rateID
        )
        const question = rateQuestionResult.data?.createRateQuestion.question

        const questionResponseResult = await createTestRateQuestionResponse(
            cmsServer,
            question.id
        )

        expect(questionResponseResult.errors).toBeDefined()
        expect(assertAnErrorCode(questionResponseResult)).toBe('FORBIDDEN')
        expect(assertAnError(questionResponseResult).message).toBe(
            'user not authorized to create a question response'
        )
    })

    it('sends CMS email', async () => {
        const emailConfig = testEmailConfig()
        const mockEmailer = testEmailer(emailConfig)
        const oactCMS = testCMSUser({
            divisionAssignment: 'OACT' as const,
        })
        const stateServer = await constructTestPostgresServer({
            emailer: mockEmailer,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: oactCMS,
            },
            emailer: mockEmailer,
        })

        const submittedContractAndRate =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateRevision =
            submittedContractAndRate.packageSubmissions[0].rateRevisions[0]
        const rateID = rateRevision.rateID

        must(await createTestRateQuestion(cmsServer, rateID))

        const rateName = rateRevision.formData.rateCertificationName
        const stateAnalystsEmails = getTestStateAnalystsEmails(
            submittedContractAndRate.stateCode
        )
        const cmsRecipientEmails = [
            ...stateAnalystsEmails,
            ...emailConfig.devReviewTeamEmails,
            ...emailConfig.oactEmails,
        ]

        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            5, // New response CMS email notification is the fifth email
            expect.objectContaining({
                subject: expect.stringContaining(
                    `[LOCAL] New Responses for ${rateName}`
                ),
                sourceEmail: emailConfig.emailSource,
                toAddresses: expect.arrayContaining(
                    Array.from(cmsRecipientEmails)
                ),
                bodyText: expect.stringContaining(
                    `The state submitted responses to OACT's questions about ${rateName}`
                ),
                bodyHTML: expect.stringContaining(
                    `<a href="http://localhost/submissions/${rateID}/question-and-answers">View submission Q&A</a>`
                ),
            })
        )
    })
})

import {
    createDBUsersWithFullData,
    testCMSUser,
} from '../../testHelpers/userHelpers'
import {
    constructTestPostgresServer,
    createTestRateQuestion,
    createTestRateQuestionResponse,
    updateTestStateAssignments,
} from '../../testHelpers/gqlHelpers'
import { NewPostgresStore } from '../../postgres'
import { createAndSubmitTestContractWithRate } from '../../testHelpers/gqlContractHelpers'
import { assertAnError, assertAnErrorCode, must } from '../../testHelpers'
import { testEmailConfig, testEmailer } from '../../testHelpers/emailerHelpers'
import { getTestStateAnalystsEmails } from '../../testHelpers/parameterStoreHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'

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

    it('sends State email', async () => {
        const emailConfig = testEmailConfig()
        const mockEmailer = testEmailer(emailConfig)
        const stateServer = await constructTestPostgresServer({
            emailer: mockEmailer,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            emailer: mockEmailer,
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

        await createTestRateQuestionResponse(stateServer, question.id)

        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            5, // New response state email notification is the fifth email, if State email is before CMS email.
            expect.objectContaining({
                subject: expect.stringContaining(
                    `[LOCAL] Response to DMCO rate questions was successfully submitted.`
                ),
                sourceEmail: emailConfig.emailSource,
                bodyText: expect.stringContaining(
                    'Response to DMCO rate questions was successfully submitted.'
                ),
                bodyHTML: expect.stringContaining(
                    `<a href="http://localhost/submissions/${contractWithRate.id}/rates/${rateID}/question-and-answers">View response</a>`
                ),
            })
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

    it('send CMS email to state analysts from database', async () => {
        const ldService = testLDService({
            'read-write-state-assignments': true,
        })

        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)

        const config = testEmailConfig()
        const mockEmailer = testEmailer(config)
        //mock invoke email submit lambda
        const stateServer = await constructTestPostgresServer({
            store: postgresStore,
            ldService,
            emailer: mockEmailer,
        })
        const cmsServer = await constructTestPostgresServer({
            store: postgresStore,
            context: {
                user: cmsUser,
            },
            ldService,
        })

        // add some users to the db, assign them to the state
        const assignedUsers = [
            testCMSUser({
                givenName: 'Roku',
                email: 'roku@example.com',
            }),
            testCMSUser({
                givenName: 'Izumi',
                email: 'izumi@example.com',
            }),
        ]

        await createDBUsersWithFullData(assignedUsers)

        const assignedUserIDs = assignedUsers.map((u) => u.id)
        const assignedUserEmails = assignedUsers.map((u) => u.email)

        await updateTestStateAssignments(cmsServer, 'FL', assignedUserIDs)
        const submittedContractAndRate =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateRevision =
            submittedContractAndRate.packageSubmissions[0].rateRevisions[0]
        const rateID = rateRevision.rateID

        const rateQuestionResult = await createTestRateQuestion(
            cmsServer,
            rateID
        )
        const question = rateQuestionResult.data?.createRateQuestion.question

        const rateName = rateRevision.formData.rateCertificationName

        await createTestRateQuestionResponse(stateServer, question.id)

        const cmsEmails = [...config.devReviewTeamEmails, ...assignedUserEmails]

        // email subject line is correct for CMS email
        // email is sent to the state anaylsts since it
        // was submitted by a DCMO user
        // Mock emailer is called 4 times, twice for submit, twice for response,
        // first called to send the state email, then to CMS
        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            3,
            expect.objectContaining({
                subject: expect.stringContaining(
                    `[LOCAL] New Responses for ${rateName}`
                ),
                sourceEmail: config.emailSource,
                toAddresses: expect.arrayContaining(Array.from(cmsEmails)),
                bodyText: expect.stringContaining(
                    `The state submitted responses to DMCO's questions about ${rateName}`
                ),
                bodyHTML: expect.stringContaining(
                    `<a href="http://localhost/submissions/${rateID}/question-and-answers">View submission Q&A</a>`
                ),
            })
        )
    })
})

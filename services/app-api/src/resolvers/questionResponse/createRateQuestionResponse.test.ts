import {
    createDBUsersWithFullData,
    testCMSUser,
    testAdminUser,
} from '../../testHelpers/userHelpers'
import {
    constructTestPostgresServer,
    createTestRateQuestion,
    createTestRateQuestionResponse,
    updateTestStateAssignments,
} from '../../testHelpers/gqlHelpers'
import { createAndSubmitTestContractWithRate } from '../../testHelpers/gqlContractHelpers'
import { assertAnError, assertAnErrorCode, must } from '../../testHelpers'
import { testEmailConfig, testEmailer } from '../../testHelpers/emailerHelpers'

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

        const question = await createTestRateQuestion(
            cmsServer,
            rateID,
            undefined,
            { user: cmsUser }
        )

        const questionResponse = await createTestRateQuestionResponse(
            stateServer,
            question.question.id
        )

        expect(questionResponse).toBeDefined()
        expect(questionResponse.question).toBeDefined()

        const questionWithResponse = questionResponse.question

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

        const question = await createTestRateQuestion(
            cmsServer,
            rateID,
            undefined,
            { user: cmsUser }
        )

        const questionResponseResult = await createTestRateQuestionResponse(
            cmsServer,
            question.question.id,
            undefined,
            { user: cmsUser }
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

        const rateName =
            contractWithRate.packageSubmissions[0].rateRevisions[0].formData
                .rateCertificationName

        const question = await createTestRateQuestion(
            cmsServer,
            rateID,
            undefined,
            { user: cmsUser }
        )

        await createTestRateQuestionResponse(stateServer, question.question.id)

        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            6, // New response state email notification is the sixth email
            expect.objectContaining({
                subject: expect.stringContaining(
                    `[LOCAL] Response submitted to CMS for ${rateName}`
                ),
                sourceEmail: emailConfig.emailSource,
                toAddresses: expect.arrayContaining([
                    'james@example.com',
                    'email@example.com',
                ]),
                bodyText: expect.stringContaining(
                    'Response to DMCO rate questions was successfully submitted'
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
        const adminUser = testAdminUser()
        const stateServer = await constructTestPostgresServer({
            emailer: mockEmailer,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: oactCMS,
            },
            emailer: mockEmailer,
        })
        const adminServer = await constructTestPostgresServer({
            context: {
                user: adminUser,
            },
            emailer: mockEmailer,
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

        await createDBUsersWithFullData([...assignedUsers, oactCMS, adminUser])

        const assignedUserIDs = assignedUsers.map((u) => u.id)
        const assignedUserEmails = assignedUsers.map((u) => u.email)

        await updateTestStateAssignments(adminServer, 'FL', assignedUserIDs, {
            user: adminUser,
        })

        const submittedContractAndRate =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateRevision =
            submittedContractAndRate.packageSubmissions[0].rateRevisions[0]
        const rateID = rateRevision.rateID

        const rateQuestion = must(
            await createTestRateQuestion(cmsServer, rateID, undefined, {
                user: oactCMS,
            })
        )

        await createTestRateQuestionResponse(
            stateServer,
            rateQuestion.question.id
        )

        const rateName = rateRevision.formData.rateCertificationName

        const cmsRecipientEmails = [
            ...assignedUserEmails,
            ...emailConfig.devReviewTeamEmails,
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
                    `The state submitted responses to ${oactCMS.divisionAssignment}'s questions about ${rateName}`
                ),
                bodyHTML: expect.stringContaining(
                    `<a href="http://localhost/rates/${rateID}/question-and-answers">View rate Q&A</a>`
                ),
            })
        )
    })
})

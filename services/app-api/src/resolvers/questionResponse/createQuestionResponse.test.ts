import CREATE_QUESTION_RESPONSE from 'app-graphql/src/mutations/createQuestionResponse.graphql'
import {
    constructTestPostgresServer,
    createAndSubmitTestHealthPlanPackage,
    createTestQuestion,
    createTestQuestionResponse,
} from '../../testHelpers/gqlHelpers'
import { assertAnError, assertAnErrorCode } from '../../testHelpers'
import {
    createDBUsersWithFullData,
    testCMSUser,
} from '../../testHelpers/userHelpers'
import { testEmailConfig, testEmailer } from '../../testHelpers/emailerHelpers'
import { latestFormData } from '../../testHelpers/healthPlanPackageHelpers'
import { findStatePrograms } from '../../postgres'
import { packageName } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { getTestStateAnalystsEmails } from '../../testHelpers/parameterStoreHelpers'

describe('createQuestionResponse', () => {
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

        const submittedPkg =
            await createAndSubmitTestHealthPlanPackage(stateServer)

        const createdQuestion = await createTestQuestion(
            cmsServer,
            submittedPkg.id
        )

        const createResponseResult = await createTestQuestionResponse(
            stateServer,
            createdQuestion.question.id
        )

        expect(createResponseResult.question).toEqual(
            expect.objectContaining({
                ...createdQuestion.question,
                responses: expect.arrayContaining([
                    expect.objectContaining({
                        id: expect.any(String),
                        questionID: createdQuestion.question.id,
                        documents: [
                            {
                                name: 'Test Question Response',
                                s3URL: 'testS3Url',
                            },
                        ],
                        addedBy: expect.objectContaining({
                            role: 'STATE_USER',
                        }),
                    }),
                ]),
            })
        )
    })

    it('returns an error when attempting to create response for a question that does not exist', async () => {
        const stateServer = await constructTestPostgresServer()
        const fakeID = 'abc-123'

        const createResponseResult = await stateServer.executeOperation({
            query: CREATE_QUESTION_RESPONSE,
            variables: {
                input: {
                    questionID: fakeID,
                    documents: [
                        {
                            name: 'Test Question',
                            s3URL: 'testS3Url',
                        },
                    ],
                },
            },
        })

        expect(createResponseResult).toBeDefined()
        expect(assertAnErrorCode(createResponseResult)).toBe('BAD_USER_INPUT')
        expect(assertAnError(createResponseResult).message).toBe(
            `Question with ID: ${fakeID} not found to attach response to`
        )
    })

    it('returns an error if a cms user attempts to create a question response for a package', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })
        const submittedPkg =
            await createAndSubmitTestHealthPlanPackage(stateServer)
        const createdQuestion = await createTestQuestion(
            cmsServer,
            submittedPkg.id
        )

        const createResponseResult = await cmsServer.executeOperation({
            query: CREATE_QUESTION_RESPONSE,
            variables: {
                input: {
                    questionID: createdQuestion.question.id,
                    documents: [
                        {
                            name: 'Test Question',
                            s3URL: 'testS3Url',
                        },
                    ],
                },
            },
        })

        expect(createResponseResult.errors).toBeDefined()
        expect(assertAnErrorCode(createResponseResult)).toBe('FORBIDDEN')
        expect(assertAnError(createResponseResult).message).toBe(
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

        const submittedPkg =
            await createAndSubmitTestHealthPlanPackage(stateServer)

        const formData = latestFormData(submittedPkg)

        const createdQuestion = await createTestQuestion(cmsServer, formData.id)

        await createTestQuestionResponse(
            stateServer,
            createdQuestion?.question.id
        )

        const statePrograms = findStatePrograms(formData.stateCode)
        if (statePrograms instanceof Error) {
            throw new Error(
                `Unexpected error: No state programs found for stateCode ${formData.stateCode}`
            )
        }

        const pkgName = packageName(
            formData.stateCode,
            formData.stateNumber,
            formData.programIDs,
            statePrograms
        )

        const stateAnalystsEmails = getTestStateAnalystsEmails(
            formData.stateCode
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
                    `[LOCAL] New Responses for ${pkgName}`
                ),
                sourceEmail: emailConfig.emailSource,
                toAddresses: expect.arrayContaining(
                    Array.from(cmsRecipientEmails)
                ),
                bodyText: expect.stringContaining(
                    `The state submitted responses to OACT's questions about ${pkgName}`
                ),
                bodyHTML: expect.stringContaining(
                    `<a href="http://localhost/submissions/${submittedPkg.id}/question-and-answers">View submission Q&A</a>`
                ),
            })
        )
    })
})

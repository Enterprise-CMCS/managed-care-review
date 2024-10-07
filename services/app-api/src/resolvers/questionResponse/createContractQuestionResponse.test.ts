import CREATE_CONTRACT_QUESTION_RESPONSE from 'app-graphql/src/mutations/createContractQuestionResponse.graphql'
import {
    constructTestPostgresServer,
    createTestQuestion,
    createTestQuestionResponse,
    updateTestStateAssignments,
} from '../../testHelpers/gqlHelpers'
import {
    assertAnError,
    assertAnErrorCode,
    createAndSubmitTestContract,
} from '../../testHelpers'
import {
    createDBUsersWithFullData,
    testCMSUser,
} from '../../testHelpers/userHelpers'
import { testEmailConfig, testEmailer } from '../../testHelpers/emailerHelpers'
import { findStatePrograms, NewPostgresStore } from '../../postgres'
import { getTestStateAnalystsEmails } from '../../testHelpers/parameterStoreHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'

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

        const contract = await createAndSubmitTestContract(stateServer)

        const createdQuestion = await createTestQuestion(cmsServer, contract.id)

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
                                s3URL: 's3://bucketname/key/test1',
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
            query: CREATE_CONTRACT_QUESTION_RESPONSE,
            variables: {
                input: {
                    questionID: fakeID,
                    documents: [
                        {
                            name: 'Test Question',
                            s3URL: 's3://bucketname/key/test1',
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
        const contract = await createAndSubmitTestContract(stateServer)
        const createdQuestion = await createTestQuestion(cmsServer, contract.id)

        const createResponseResult = await cmsServer.executeOperation({
            query: CREATE_CONTRACT_QUESTION_RESPONSE,
            variables: {
                input: {
                    questionID: createdQuestion.question.id,
                    documents: [
                        {
                            name: 'Test Question',
                            s3URL: 's3://bucketname/key/test1',
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

        const contract = await createAndSubmitTestContract(stateServer, 'FL', {
            riskBasedContract: true,
        })

        const createdQuestion = await createTestQuestion(cmsServer, contract.id)

        await createTestQuestionResponse(
            stateServer,
            createdQuestion?.question.id
        )

        const contractName =
            contract.packageSubmissions[0].contractRevision.contractName
        const stateAnalystsEmails = getTestStateAnalystsEmails(
            contract.stateCode
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
                    `[LOCAL] New Responses for ${contractName}`
                ),
                sourceEmail: emailConfig.emailSource,
                toAddresses: expect.arrayContaining(
                    Array.from(cmsRecipientEmails)
                ),
                bodyText: expect.stringContaining(
                    `The state submitted responses to OACT's questions about ${contractName}`
                ),
                bodyHTML: expect.stringContaining(
                    `<a href="http://localhost/submissions/${contract.id}/question-and-answers">View submission Q&A</a>`
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

        const stateSubmission = await createAndSubmitTestContract(stateServer)
        const question = (
            await createTestQuestion(cmsServer, stateSubmission.id)
        ).question
        await createTestQuestionResponse(stateServer, question.id)

        const contractName =
            stateSubmission.packageSubmissions[0].contractRevision.contractName
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
                    `[LOCAL] New Responses for ${contractName}`
                ),
                sourceEmail: config.emailSource,
                toAddresses: expect.arrayContaining(Array.from(cmsEmails)),
                bodyText: expect.stringContaining(
                    `The state submitted responses to DMCO's questions about ${contractName}`
                ),
                bodyHTML: expect.stringContaining(
                    `<a href="http://localhost/submissions/${stateSubmission.id}/question-and-answers">View submission Q&A</a>`
                ),
            })
        )
    })

    it('sends State email', async () => {
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

        const contract = await createAndSubmitTestContract(stateServer)

        const createdQuestion = await createTestQuestion(cmsServer, contract.id)

        await createTestQuestionResponse(
            stateServer,
            createdQuestion?.question.id
        )

        const statePrograms = findStatePrograms(contract.stateCode)
        if (statePrograms instanceof Error) {
            throw new Error(
                `Unexpected error: No state programs found for stateCode ${contract.stateCode}`
            )
        }

        const pkgName =
            contract.packageSubmissions[0].contractRevision.contractName
        const formData =
            contract.packageSubmissions[0].contractRevision.formData
        const stateReceiverEmails = [
            'james@example.com',
            ...formData.stateContacts.map((contact) => contact.email),
        ]

        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            6, // New response CMS email notification is the fifth email
            expect.objectContaining({
                subject: expect.stringContaining(
                    `[LOCAL] Response submitted to CMS for ${pkgName}`
                ),
                sourceEmail: emailConfig.emailSource,
                toAddresses: expect.arrayContaining(
                    Array.from(stateReceiverEmails)
                ),
                bodyText: expect.stringContaining(
                    `${oactCMS.divisionAssignment} round 1 response was successfully submitted`
                ),
                bodyHTML: expect.stringContaining(
                    `<a href="http://localhost/submissions/${contract.id}/question-and-answers">View response</a>`
                ),
            })
        )
    })
})

import { CreateContractQuestionResponseDocument } from '../../gen/gqlClient'
import {
    constructTestPostgresServer,
    createTestQuestion,
    createTestQuestionResponse,
    updateTestStateAssignments,
} from '../../testHelpers/gqlHelpers'
import {
    approveTestContract,
    assertAnError,
    assertAnErrorCode,
} from '../../testHelpers'
import {
    createDBUsersWithFullData,
    testCMSUser,
} from '../../testHelpers/userHelpers'
import { testEmailConfig, testEmailer } from '../../testHelpers/emailerHelpers'
import { findStatePrograms } from '../../postgres'
import { createAndSubmitTestContractWithRate } from '../../testHelpers/gqlContractHelpers'

describe('createContractQuestionResponse', () => {
    const cmsUser = testCMSUser()
    // add some users to the db, assign them to the state in each test
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
    beforeAll(async () => {
        //Inserting a new CMS user, with division assigned, in postgres in order to create the question to user relationship.
        await createDBUsersWithFullData([...assignedUsers, cmsUser])
    })

    it('returns question response data', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

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
            query: CreateContractQuestionResponseDocument,
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
            `Contract question with ID: ${fakeID} not found to attach response to`
        )
    })

    it('returns an error when attempting to create response for a contract that has been approved', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })
        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const createdQuestion = await createTestQuestion(cmsServer, contract.id)
        await approveTestContract(cmsServer, contract.id)

        const createResponseResult = await stateServer.executeOperation({
            query: CreateContractQuestionResponseDocument,
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

        expect(createResponseResult).toBeDefined()
        expect(assertAnErrorCode(createResponseResult)).toBe('BAD_USER_INPUT')
        expect(assertAnError(createResponseResult).message).toBe(
            `Issue creating response for contract. Message: Cannot create response for contract in APPROVED status`
        )
    })

    it('returns an error if a cms user attempts to create a question response for a package', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })
        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const createdQuestion = await createTestQuestion(cmsServer, contract.id)

        const createResponseResult = await cmsServer.executeOperation({
            query: CreateContractQuestionResponseDocument,
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

        const assignedUserIDs = assignedUsers.map((u) => u.id)
        const assignedUserEmails = assignedUsers.map((u) => u.email)

        await updateTestStateAssignments(cmsServer, 'FL', assignedUserIDs)

        const contract = await createAndSubmitTestContractWithRate(
            stateServer,
            {
                stateCode: 'FL',
                riskBasedContract: true,
            }
        )

        const createdQuestion = await createTestQuestion(cmsServer, contract.id)

        await createTestQuestionResponse(
            stateServer,
            createdQuestion?.question.id
        )

        const contractName =
            contract.packageSubmissions[0].contractRevision.contractName

        const cmsRecipientEmails = [
            ...assignedUserEmails,
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

        const contract = await createAndSubmitTestContractWithRate(stateServer)

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
            6, // New response state email notification is the fifth email
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

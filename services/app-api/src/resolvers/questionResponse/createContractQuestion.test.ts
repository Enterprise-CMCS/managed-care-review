import { CreateContractQuestionDocument } from '../../gen/gqlClient'
import {
    constructTestPostgresServer,
    createTestQuestion,
    executeGraphQLOperation,
    updateTestStateAssignments,
} from '../../testHelpers/gqlHelpers'
import {
    assertAnError,
    assertAnErrorCode,
    createTestContract,
    fetchTestContractWithQuestions,
} from '../../testHelpers'
import {
    createDBUsersWithFullData,
    testCMSApproverUser,
    testCMSUser,
} from '../../testHelpers/userHelpers'
import { testEmailConfig, testEmailer } from '../../testHelpers/emailerHelpers'
import {
    approveTestContract,
    createAndSubmitTestContractWithRate,
    submitTestContract,
    unlockTestContract,
} from '../../testHelpers/gqlContractHelpers'

describe('createQuestion', () => {
    const cmsUser = testCMSUser()
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

    it('returns question data after creation', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        const createdQuestion = await createTestQuestion(cmsServer, contract.id)

        expect(createdQuestion).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                contractID: contract.id,
                division: 'DMCO',
                documents: [
                    {
                        name: 'Test Question',
                        s3URL: 's3://bucketname/key/test1',
                    },
                ],
                addedBy: cmsUser,
            })
        )
    })
    it('allows question creation on UNLOCKED and RESUBMITTED package', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })
        const contract = await createAndSubmitTestContractWithRate(stateServer)

        await unlockTestContract(cmsServer, contract.id, 'test unlock')
        await createTestQuestion(cmsServer, contract.id)
        await submitTestContract(stateServer, contract.id, 'resubmit reason')
        await createTestQuestion(cmsServer, contract.id, {
            documents: [
                {
                    name: 'Test Question 2',
                    s3URL: 's3://bucketname/key/test12',
                },
            ],
        })

        const contractWithQuestions = await fetchTestContractWithQuestions(
            stateServer,
            contract.id
        )

        const indexQuestionsPayload = contractWithQuestions.questions

        // Expect package to have two questions
        expect(indexQuestionsPayload).toEqual(
            expect.objectContaining({
                DMCOQuestions: expect.objectContaining({
                    totalCount: 2,
                    edges: expect.arrayContaining([
                        {
                            node: expect.objectContaining({
                                id: expect.any(String),
                                createdAt: expect.any(Date),
                                contractID: contract.id,
                                division: 'DMCO',
                                documents: [
                                    {
                                        name: 'Test Question',
                                        s3URL: 's3://bucketname/key/test1',
                                        downloadURL: expect.any(String),
                                    },
                                ],
                                addedBy: cmsUser,
                            }),
                        },
                        {
                            node: expect.objectContaining({
                                id: expect.any(String),
                                createdAt: expect.any(Date),
                                contractID: contract.id,
                                division: 'DMCO',
                                documents: [
                                    {
                                        name: 'Test Question 2',
                                        s3URL: 's3://bucketname/key/test12',
                                        downloadURL: expect.any(String),
                                    },
                                ],
                                addedBy: cmsUser,
                            }),
                        },
                    ]),
                }),
                DMCPQuestions: expect.objectContaining({
                    totalCount: 0,
                    edges: [],
                }),
                OACTQuestions: expect.objectContaining({
                    totalCount: 0,
                    edges: [],
                }),
            })
        )
    })
    it('returns an error if package status is DRAFT', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const draftContract = await createTestContract(stateServer)

        const createdQuestion = await executeGraphQLOperation(cmsServer, {
            query: CreateContractQuestionDocument,
            variables: {
                input: {
                    contractID: draftContract.id,
                    documents: [
                        {
                            name: 'Test Question',
                            s3URL: 's3://bucketname/key/test1',
                        },
                    ],
                },
            },
        })

        expect(createdQuestion.errors).toBeDefined()
        expect(assertAnErrorCode(createdQuestion)).toBe('BAD_USER_INPUT')
        expect(assertAnError(createdQuestion).message).toBe(
            'Issue creating question for contract. Message: Cannot create question for contract in DRAFT status'
        )
    })
    it('returns an error if contract has been approved', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        // approve contract
        const approvedContract = await approveTestContract(
            cmsServer,
            contract.id
        )
        const createdQuestion = await executeGraphQLOperation(cmsServer, {
            query: CreateContractQuestionDocument,
            variables: {
                input: {
                    contractID: approvedContract.id,
                    documents: [
                        {
                            name: 'Test Question',
                            s3URL: 's3://bucketname/key/test1',
                        },
                    ],
                },
            },
        })

        expect(createdQuestion.errors).toBeDefined()
        expect(assertAnErrorCode(createdQuestion)).toBe('BAD_USER_INPUT')
        expect(assertAnError(createdQuestion).message).toBe(
            'Issue creating question for contract. Message: Cannot create question for contract in APPROVED status'
        )
    })
    it('returns an error if a state user attempts to create a question for a package', async () => {
        const stateServer = await constructTestPostgresServer()
        const contract = await createAndSubmitTestContractWithRate(stateServer)

        const createdQuestion = await executeGraphQLOperation(stateServer, {
            query: CreateContractQuestionDocument,
            variables: {
                input: {
                    contractID: contract.id,
                    documents: [
                        {
                            name: 'Test Question',
                            s3URL: 's3://bucketname/key/test1',
                        },
                    ],
                },
            },
        })

        expect(createdQuestion.errors).toBeDefined()
        expect(assertAnErrorCode(createdQuestion)).toBe('FORBIDDEN')
        expect(assertAnError(createdQuestion).message).toBe(
            'user not authorized to create a question'
        )
    })
    it('returns error on invalid package id', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        await createAndSubmitTestContractWithRate(stateServer)

        const createdQuestion = await executeGraphQLOperation(cmsServer, {
            query: CreateContractQuestionDocument,
            variables: {
                input: {
                    contractID: 'invalid-pkg-id',
                    documents: [
                        {
                            name: 'Test Question',
                            s3URL: 's3://bucketname/key/test1',
                        },
                    ],
                },
            },
        })

        expect(createdQuestion.errors).toBeDefined()
        expect(assertAnErrorCode(createdQuestion)).toBe('NOT_FOUND')
        expect(assertAnError(createdQuestion).message).toBe(
            `Package with id invalid-pkg-id does not exist`
        )
    })
    it('returns error when CMS user division is unassigned', async () => {
        const cmsUserWithNoDivision = testCMSUser({
            divisionAssignment: undefined,
        })
        await createDBUsersWithFullData([cmsUserWithNoDivision])
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUserWithNoDivision,
            },
        })

        await createAndSubmitTestContractWithRate(stateServer)

        const createdQuestion = await executeGraphQLOperation(cmsServer, {
            query: CreateContractQuestionDocument,
            variables: {
                input: {
                    contractID: 'invalid-pkg-id',
                    documents: [
                        {
                            name: 'Test Question',
                            s3URL: 's3://bucketname/key/test1',
                        },
                    ],
                },
            },
        })

        expect(createdQuestion.errors).toBeDefined()
        expect(assertAnErrorCode(createdQuestion)).toBe('FORBIDDEN')
        expect(assertAnError(createdQuestion).message).toBe(
            `users without an assigned division are not authorized to create a question`
        )
    })
    it('returns error when CMS approver user division is unassigned', async () => {
        const cmsUserWithNoDivision = testCMSApproverUser({
            divisionAssignment: undefined,
        })
        await createDBUsersWithFullData([cmsUserWithNoDivision])
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUserWithNoDivision,
            },
        })

        await createAndSubmitTestContractWithRate(stateServer)

        const createdQuestion = await executeGraphQLOperation(cmsServer, {
            query: CreateContractQuestionDocument,
            variables: {
                input: {
                    contractID: 'invalid-pkg-id',
                    documents: [
                        {
                            name: 'Test Question',
                            s3URL: 's3://bucketname/key/test1',
                        },
                    ],
                },
            },
        })

        expect(createdQuestion.errors).toBeDefined()
        expect(assertAnErrorCode(createdQuestion)).toBe('FORBIDDEN')
        expect(assertAnError(createdQuestion).message).toBe(
            `users without an assigned division are not authorized to create a question`
        )
    })
    it('send state email to state contacts and all submitters when submitting a question succeeds', async () => {
        const config = testEmailConfig()
        const mockEmailer = testEmailer(config)
        //mock invoke email submit lambda
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            emailer: mockEmailer,
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        await createTestQuestion(cmsServer, contract.id)

        const formData =
            contract.packageSubmissions[0].contractRevision.formData
        const contractName =
            contract.packageSubmissions[0].contractRevision.contractName

        const stateReceiverEmails = [
            'james@example.com',
            ...formData.stateContacts.map((contact) => contact.email),
        ]

        // email subject line is correct for state email
        // Mock emailer is called 1 time
        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                subject: expect.stringContaining(
                    `[LOCAL] New questions about ${contractName}`
                ),
                sourceEmail: config.emailSource,
                toAddresses: expect.arrayContaining(
                    Array.from(stateReceiverEmails)
                ),
                bodyText: expect.stringContaining(
                    `CMS asked questions about ${contractName}`
                ),
                bodyHTML: expect.stringContaining(
                    `http://localhost/submissions/${contract.id}/question-and-answers`
                ),
            })
        )
    })

    it('send CMS email to state analysts if question is successfully submitted', async () => {
        const config = testEmailConfig()
        const mockEmailer = testEmailer(config)
        //mock invoke email submit lambda
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            emailer: mockEmailer,
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        await createTestQuestion(cmsServer, contract.id)

        const contractName =
            contract.packageSubmissions[0].contractRevision.contractName

        // Assign state analysts
        const assignedUserIDs = assignedUsers.map((u) => u.id)
        const assignedUserEmails = assignedUsers.map((u) => u.email)

        await updateTestStateAssignments(cmsServer, 'FL', assignedUserIDs)

        const cmsEmails = [...config.devReviewTeamEmails, ...assignedUserEmails]

        // email subject line is correct for CMS email
        // email is sent to the state anaylsts since it
        // was submitted by a DCMO user
        // Mock emailer is called 2 times,
        // first called to send the state email, then to CMS
        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                subject: expect.stringContaining(
                    `[LOCAL] Questions sent for ${contractName}`
                ),
                sourceEmail: config.emailSource,
                toAddresses: expect.arrayContaining(Array.from(cmsEmails)),
                bodyText: expect.stringContaining(
                    `DMCO sent questions to the state for submission ${contractName}`
                ),
                bodyHTML: expect.stringContaining(
                    `http://localhost/submissions/${contract.id}/question-and-answers`
                ),
            })
        )
    })

    it('send CMS email to state analysts with correct round number if multiple questions have been asked', async () => {
        const config = testEmailConfig()
        const mockEmailer = testEmailer(config)
        //mock invoke email submit lambda
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            emailer: mockEmailer,
        })
        const cmsDMCPUser = testCMSUser({ divisionAssignment: 'DMCP' })
        const cmsDMCPServer = await constructTestPostgresServer({
            context: {
                user: cmsDMCPUser,
            },
            emailer: mockEmailer,
        })
        const stateSubmission =
            await createAndSubmitTestContractWithRate(stateServer)

        await createTestQuestion(cmsDMCPServer, stateSubmission.id)
        await createTestQuestion(cmsServer, stateSubmission.id)
        await createTestQuestion(cmsServer, stateSubmission.id)

        const contractName =
            stateSubmission.packageSubmissions[0].contractRevision.contractName

        // Assign state analysts
        const assignedUserIDs = assignedUsers.map((u) => u.id)
        const assignedUserEmails = assignedUsers.map((u) => u.email)

        await updateTestStateAssignments(cmsServer, 'FL', assignedUserIDs)

        const cmsEmails = [...config.devReviewTeamEmails, ...assignedUserEmails]

        // email subject line is correct for CMS email
        // email is sent to the state anaylsts since it
        // was submitted by a DCMO user
        // Mock emailer is called 4 times,
        // first called to send the state email, then to CMS, two times each
        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            6,
            expect.objectContaining({
                subject: expect.stringContaining(
                    `[LOCAL] Questions sent for ${contractName}`
                ),
                sourceEmail: config.emailSource,
                toAddresses: expect.arrayContaining(Array.from(cmsEmails)),
                bodyText: expect.stringContaining('Round: 2'),
            })
        )
    })

    it('does not send any emails if submission fails', async () => {
        const mockEmailer = testEmailer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            emailer: mockEmailer,
        })

        const submitResult = await executeGraphQLOperation(cmsServer, {
            query: CreateContractQuestionDocument,
            variables: {
                input: {
                    contractID: '1234',
                    documents: [
                        {
                            name: 'Test Question',
                            s3URL: 's3://bucketname/key/test1',
                        },
                    ],
                },
            },
        })

        expect(submitResult.errors).toBeDefined()
        expect(mockEmailer.sendEmail).not.toHaveBeenCalled()
    })
})

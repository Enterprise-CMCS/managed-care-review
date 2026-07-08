import {
    constructTestPostgresServer,
    createTestRateQuestion,
    createTestRateQuestionResponse,
    executeGraphQLOperation,
    updateTestStateAssignments,
} from '../../testHelpers/gqlHelpers'
import {
    createDBUsersWithFullData,
    testCMSUser,
} from '../../testHelpers/userHelpers'
import {
    createAndSubmitTestContractWithRate,
    createAndUpdateTestContractWithRate,
    submitTestContract,
    unlockTestContract,
} from '../../testHelpers/gqlContractHelpers'
import { assertAnError, assertAnErrorCode, must } from '../../testHelpers'
import { testEmailConfig, testEmailer } from '../../testHelpers/emailerHelpers'
import { CreateRateQuestionDocument } from '../../gen/gqlClient'
import { withdrawTestRate } from '../../testHelpers/gqlRateHelpers'
import { ContractSubmissionTypeRecord } from '@mc-review/constants'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'

describe('createRateQuestion', () => {
    const cmsUser = testCMSUser()
    beforeAll(async () => {
        //Inserting a new CMS user, with division assigned, in postgres in order to create the question to user relationship.
        await createDBUsersWithFullData([cmsUser])
    })

    it('creates rate question', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })
        const submittedContractAndRate =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            submittedContractAndRate.packageSubmissions[0].rateRevisions[0]
                .rateID
        const rateQuestion = must(
            await createTestRateQuestion(cmsServer, rateID)
        )

        const prismaClient = await sharedTestPrismaClient()
        const rateTableRow = await prismaClient.rateTable.findUnique({
            where: { id: rateID },
            select: { lastActionDate: true },
        })
        expect(rateTableRow?.lastActionDate).toEqual(rateQuestion.createdAt)

        const contractTableRow = await prismaClient.contractTable.findUnique({
            where: { id: submittedContractAndRate.id },
            select: { lastActionDate: true },
        })
        expect(contractTableRow?.lastActionDate).toEqual(rateQuestion.createdAt)

        expect(rateQuestion).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                rateID: rateID,
                division: 'DMCO',
                documents: [
                    {
                        id: expect.any(String),
                        name: 'Test Question',
                        s3URL: 's3://bucketname/key/test1',
                        downloadURL: expect.any(String),
                        s3BucketName: 'bucketname',
                        s3Key: 'allusers/key',
                    },
                ],
                addedBy: cmsUser,
            })
        )
    })
    it('returns an error if there is an open question round (unanswered questions)', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })
        const submittedContractAndRate =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            submittedContractAndRate.packageSubmissions[0].rateRevisions[0]
                .rateID

        // Create a first question and leave it unanswered to keep the round open
        must(await createTestRateQuestion(cmsServer, rateID))

        // Attempting to create another question while the round is open should fail
        const rateQuestion = await executeGraphQLOperation(cmsServer, {
            query: CreateRateQuestionDocument,
            variables: {
                input: {
                    rateID,
                    documents: [
                        {
                            name: 'Test Question 2',
                            s3URL: 's3://bucketname/key/test2',
                        },
                    ],
                },
            },
        })

        expect(rateQuestion.errors).toBeDefined()
        expect(assertAnErrorCode(rateQuestion)).toBe('BAD_USER_INPUT')
        expect(assertAnError(rateQuestion).message).toBe(
            'Cannot create a new question while a previous question round is open. All questions must be answered before a new question can be created.'
        )
    })
    it('prevents concurrent requests from creating two open question rounds', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })
        const submittedContractAndRate =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            submittedContractAndRate.packageSubmissions[0].rateRevisions[0]
                .rateID

        const createQuestion = () =>
            executeGraphQLOperation(cmsServer, {
                query: CreateRateQuestionDocument,
                variables: {
                    input: {
                        rateID,
                        documents: [
                            {
                                name: 'Test Question',
                                s3URL: 's3://bucketname/key/test1',
                            },
                        ],
                    },
                },
            })

        // Fire two requests at once. The parent rate row lock serializes them
        // so only one question round can be created.
        const results = await Promise.all([createQuestion(), createQuestion()])

        const succeeded = results.filter((r) => !r.errors)
        const failed = results.filter((r) => r.errors)

        expect(succeeded).toHaveLength(1)
        expect(failed).toHaveLength(1)
        expect(assertAnErrorCode(failed[0])).toBe('BAD_USER_INPUT')
        expect(assertAnError(failed[0]).message).toBe(
            'Cannot create a new question while a previous question round is open. All questions must be answered before a new question can be created.'
        )
    })
    it('allows question creation on UNLOCKED and RESUBMITTED rate', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })
        const submittedContractAndRate =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            submittedContractAndRate.packageSubmissions[0].rateRevisions[0]
                .rateID
        await unlockTestContract(
            cmsServer,
            submittedContractAndRate.id,
            'Test unlock reason'
        )
        const rateQuestion = await createTestRateQuestion(cmsServer, rateID)

        expect(rateQuestion).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                rateID: rateID,
                division: 'DMCO',
                documents: [
                    {
                        id: expect.any(String),
                        name: 'Test Question',
                        s3URL: 's3://bucketname/key/test1',
                        downloadURL: expect.any(String),
                        s3BucketName: 'bucketname',
                        s3Key: 'allusers/key',
                    },
                ],
                addedBy: cmsUser,
            })
        )

        await submitTestContract(
            stateServer,
            submittedContractAndRate.id,
            'Test resubmit reason'
        )
        // Answer the first question so the round is closed and a new question
        // can be created.
        await createTestRateQuestionResponse(stateServer, rateQuestion.id)
        const rateQuestion2 = await createTestRateQuestion(cmsServer, rateID, {
            documents: [
                {
                    name: 'Test Question 2',
                    s3URL: 's3://bucketname/key/test1',
                },
            ],
        })

        expect(rateQuestion2).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                rateID: rateID,
                division: 'DMCO',
                documents: [
                    {
                        id: expect.any(String),
                        name: 'Test Question 2',
                        s3URL: 's3://bucketname/key/test1',
                        downloadURL: expect.any(String),
                        s3BucketName: 'bucketname',
                        s3Key: 'allusers/key',
                    },
                ],
                addedBy: cmsUser,
            })
        )
    })
    it('returns an error if the rate is in invalid status for questions', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })
        const submittedContractAndRate =
            await createAndUpdateTestContractWithRate(stateServer)

        const contractWithRateToWithdraw =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateToWithdraw =
            contractWithRateToWithdraw.packageSubmissions[0].rateRevisions[0]

        const rateID = submittedContractAndRate.draftRates?.[0].id

        if (!rateID) {
            throw new Error(
                'Unexpected error: Rate not found in test draft contract and rate'
            )
        }

        const rateQuestion = await executeGraphQLOperation(cmsServer, {
            query: CreateRateQuestionDocument,
            variables: {
                input: {
                    rateID,
                    documents: [
                        {
                            name: 'Test Question',
                            s3URL: 's3://bucketname/key/test1',
                        },
                    ],
                },
            },
        })

        expect(rateQuestion.errors).toBeDefined()
        expect(assertAnErrorCode(rateQuestion)).toBe('BAD_USER_INPUT')
        expect(assertAnError(rateQuestion).message).toBe(
            'Issue creating question for rate. Message: Rate is in an invalid status: DRAFT'
        )

        const withdrawnRate = await withdrawTestRate(
            cmsServer,
            rateToWithdraw.rateID,
            'Withdraw rate'
        )

        const rateQuestionForWithdrawnRate = await executeGraphQLOperation(
            cmsServer,
            {
                query: CreateRateQuestionDocument,
                variables: {
                    input: {
                        rateID: withdrawnRate.id,
                        documents: [
                            {
                                name: 'Test Question',
                                s3URL: 's3://bucketname/key/test1',
                            },
                        ],
                    },
                },
            }
        )

        expect(rateQuestionForWithdrawnRate.errors).toBeDefined()
        expect(assertAnErrorCode(rateQuestionForWithdrawnRate)).toBe(
            'BAD_USER_INPUT'
        )
        expect(assertAnError(rateQuestionForWithdrawnRate).message).toBe(
            'Issue creating question for rate. Message: Rate is in an invalid status: WITHDRAWN'
        )
    })
    it('returns an error of a state user attempts to create a rate question', async () => {
        const stateServer = await constructTestPostgresServer()
        const submittedContractAndRate =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            submittedContractAndRate.packageSubmissions[0].rateRevisions[0]
                .rateID
        const rateQuestion = await executeGraphQLOperation(stateServer, {
            query: CreateRateQuestionDocument,
            variables: {
                input: {
                    rateID,
                    documents: [
                        {
                            name: 'Test Question',
                            s3URL: 's3://bucketname/key/test1',
                        },
                    ],
                },
            },
        })

        expect(rateQuestion.errors).toBeDefined()
        expect(assertAnErrorCode(rateQuestion)).toBe('FORBIDDEN')
        expect(assertAnError(rateQuestion).message).toBe(
            'user not authorized to create a question'
        )
    })
    it('returns an error on invalid rate id', async () => {
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })
        const invalidRateID = 'invalidID'

        const rateQuestionRes = await executeGraphQLOperation(cmsServer, {
            query: CreateRateQuestionDocument,
            variables: {
                input: {
                    rateID: invalidRateID,
                    documents: [
                        {
                            name: 'Test Question',
                            s3URL: 's3://bucketname/key/test1',
                        },
                    ],
                },
            },
        })

        expect(rateQuestionRes.errors).toBeDefined()
        expect(assertAnErrorCode(rateQuestionRes)).toBe('NOT_FOUND')
        expect(assertAnError(rateQuestionRes).message).toBe(
            `Rate with id ${invalidRateID} does not exist`
        )
    })
    it('returns an error when CMS user division is unassigned', async () => {
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

        const submittedContractAndRate =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            submittedContractAndRate.packageSubmissions[0].rateRevisions[0]
                .rateID

        // THIS ERROR IS GETTING USER INPUT INSTEAD OF FORBIDDEN
        const rateQuestionRes = await executeGraphQLOperation(cmsServer, {
            query: CreateRateQuestionDocument,
            variables: {
                input: {
                    rateID,
                    documents: [
                        {
                            name: 'Test Question',
                            s3URL: 's3://bucketname/key/test1',
                        },
                    ],
                },
            },
        })

        expect(rateQuestionRes.errors).toBeDefined()
        expect(assertAnErrorCode(rateQuestionRes)).toBe('FORBIDDEN')
        expect(assertAnError(rateQuestionRes).message).toBe(
            `users without an assigned division are not authorized to create a question`
        )
    })

    it('send state email to state submitting a question succeeds', async () => {
        const config = testEmailConfig()
        const mockEmailer = testEmailer(config)

        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            emailer: mockEmailer,
        })
        const submittedContractAndRate =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateRevision =
            submittedContractAndRate.packageSubmissions[0].rateRevisions[0]
        const rateID = rateRevision.rateID

        must(await createTestRateQuestion(cmsServer, rateID))

        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                subject: expect.stringContaining(
                    `[LOCAL] New questions about ${rateRevision.formData.rateCertificationName}`
                ),
                sourceEmail: config.emailSource,
                bodyText: expect.stringContaining(
                    `CMS asked questions about ${rateRevision.formData.rateCertificationName}`
                ),
                bodyHTML: expect.stringContaining(
                    `http://localhost/submissions/${ContractSubmissionTypeRecord[submittedContractAndRate.contractSubmissionType]}/${submittedContractAndRate.id}/rates/${rateID}/question-and-answers`
                ),
            })
        )
    })

    it('send CMS email to state analysts if question is successfully submitted', async () => {
        const config = testEmailConfig()
        const mockEmailer = testEmailer(config)

        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            emailer: mockEmailer,
        })

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

        must(await createTestRateQuestion(cmsServer, rateID))

        const cmsEmails = [
            ...config.devReviewTeamEmails,
            ...config.dmcoEmails,
            ...assignedUserEmails,
        ]

        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                subject: expect.stringContaining(
                    `[LOCAL] Questions sent for ${rateRevision.formData.rateCertificationName}`
                ),
                sourceEmail: config.emailSource,
                toAddresses: expect.arrayContaining(Array.from(cmsEmails)),
                bodyText: expect.stringContaining(
                    `DMCO sent questions to the state for rate ${rateRevision.formData.rateCertificationName}`
                ),
                bodyHTML: expect.stringContaining(
                    `http://localhost/rates/${rateID}/question-and-answers`
                ),
            })
        )
    })

    it('send CMS email with correct round number if multiple questions have been asked', async () => {
        const config = testEmailConfig()
        const mockEmailer = testEmailer(config)

        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            emailer: mockEmailer,
        })

        const oactServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser({
                    divisionAssignment: 'OACT',
                }),
            },
            emailer: mockEmailer,
        })

        const submittedContractAndRate =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateRevision =
            submittedContractAndRate.packageSubmissions[0].rateRevisions[0]
        const rateID = rateRevision.rateID

        // Each question round must be answered before a new question can be
        // created, so respond to each question before asking the next.
        // round 1 dmco question
        const dmcoQuestionRound1 = must(
            await createTestRateQuestion(cmsServer, rateID)
        )
        await createTestRateQuestionResponse(stateServer, dmcoQuestionRound1.id)
        // round 1 oact question
        const oactQuestionRound1 = must(
            await createTestRateQuestion(oactServer, rateID)
        )
        await createTestRateQuestionResponse(stateServer, oactQuestionRound1.id)
        // round 2 dmco
        must(await createTestRateQuestion(cmsServer, rateID))

        // The last email sent is the CMS email for the second DMCO question,
        // which should report round 2.
        expect(mockEmailer.sendEmail).toHaveBeenLastCalledWith(
            expect.objectContaining({
                subject: expect.stringContaining(
                    `[LOCAL] Questions sent for ${rateRevision.formData.rateCertificationName}`
                ),
                sourceEmail: config.emailSource,
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
            query: CreateRateQuestionDocument,
            variables: {
                input: {
                    rateID: '1234',
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

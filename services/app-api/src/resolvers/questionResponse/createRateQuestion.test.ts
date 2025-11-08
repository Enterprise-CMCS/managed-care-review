import {
    constructTestPostgresServer,
    createTestRateQuestion,
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
                    },
                ],
                addedBy: cmsUser,
            })
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
            'Issue creating question for rate. Message: Rate is in a invalid statius: DRAFT'
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
            'Issue creating question for rate. Message: Rate is in a invalid statius: WITHDRAWN'
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

        const cmsEmails = [...config.devReviewTeamEmails, ...assignedUserEmails]

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

        // round 1 dmco question
        must(await createTestRateQuestion(cmsServer, rateID))
        // round 1 oact question
        must(await createTestRateQuestion(oactServer, rateID))
        // round 2 dmco
        must(await createTestRateQuestion(cmsServer, rateID))

        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            6,
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

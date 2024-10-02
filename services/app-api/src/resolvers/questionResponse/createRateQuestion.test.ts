import {
    constructTestPostgresServer,
    createTestRateQuestion,
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
        const rateQuestionRes = must(
            await createTestRateQuestion(cmsServer, rateID)
        )
        const rateQuestion = rateQuestionRes?.data?.createRateQuestion

        expect(rateQuestion.question).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                rateID: rateID,
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
        const rateQuestionRes = must(
            await createTestRateQuestion(cmsServer, rateID)
        )
        const rateQuestion = rateQuestionRes?.data?.createRateQuestion

        expect(rateQuestion.question).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                rateID: rateID,
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

        await submitTestContract(
            stateServer,
            submittedContractAndRate.id,
            'Test resubmit reason'
        )
        const rateQuestionRes2 = must(
            await createTestRateQuestion(cmsServer, rateID, {
                documents: [
                    {
                        name: 'Test Question 2',
                        s3URL: 's3://bucketname/key/test1',
                    },
                ],
            })
        )
        const rateQuestion2 = rateQuestionRes2?.data?.createRateQuestion

        expect(rateQuestion2.question).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                rateID: rateID,
                division: 'DMCO',
                documents: [
                    {
                        name: 'Test Question 2',
                        s3URL: 's3://bucketname/key/test1',
                    },
                ],
                addedBy: cmsUser,
            })
        )
    })
    it('returns an error if the rate is in DRAFT', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })
        const submittedContractAndRate = must(
            await createAndUpdateTestContractWithRate(stateServer)
        )

        const rateID = submittedContractAndRate.draftRates?.[0].id

        if (!rateID) {
            throw new Error(
                'Unexpected error: Rate not found in test draft contract and rate'
            )
        }

        const rateQuestionRes = must(
            await createTestRateQuestion(cmsServer, rateID)
        )

        expect(rateQuestionRes.errors).toBeDefined()
        expect(assertAnErrorCode(rateQuestionRes)).toBe('BAD_USER_INPUT')
        expect(assertAnError(rateQuestionRes).message).toBe(
            'Issue creating question for rate. Message: Cannot create question for rate in DRAFT status'
        )
    })
    it('returns an error of a state user attempts to create a rate question', async () => {
        const stateServer = await constructTestPostgresServer()
        const submittedContractAndRate =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            submittedContractAndRate.packageSubmissions[0].rateRevisions[0]
                .rateID
        const rateQuestion = await createTestRateQuestion(stateServer, rateID)

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
        const rateQuestionRes = await createTestRateQuestion(
            cmsServer,
            invalidRateID
        )

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

        const rateQuestionRes = await createTestRateQuestion(cmsServer, rateID)

        expect(rateQuestionRes.errors).toBeDefined()
        expect(assertAnErrorCode(rateQuestionRes)).toBe('FORBIDDEN')
        expect(assertAnError(rateQuestionRes).message).toBe(
            `users without an assigned division are not authorized to create a question`
        )
    })
})

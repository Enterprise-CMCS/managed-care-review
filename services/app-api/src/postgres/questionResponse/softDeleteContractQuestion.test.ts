import { softDeleteContractQuestion } from './softDeleteContractQuestion'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import {
    constructTestPostgresServer,
    createTestQuestion,
    createTestQuestionResponse,
} from '../../testHelpers/gqlHelpers'
import {
    createDBUsersWithFullData,
    testAdminUser,
    testCMSUser,
} from '../../testHelpers/userHelpers'
import { createAndSubmitTestContractWithRate } from '../../testHelpers/gqlContractHelpers'
import { testS3Client } from '../../testHelpers'

describe('softDeleteContractQuestion', () => {
    const mockS3 = testS3Client()

    // Test race conditions, but not reliability. There is complexity in trying to truly test the race condition in js.
    it('serializes concurrent deletes — no duplicate action rows under a race', async () => {
        const cmsUser = testCMSUser()
        const adminUser = testAdminUser()
        await createDBUsersWithFullData([cmsUser, adminUser])

        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })
        const cmsServer = await constructTestPostgresServer({
            context: { user: cmsUser },
            s3Client: mockS3,
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        const question = await createTestQuestion(cmsServer, contract.id, {
            documents: [{ name: 'Q-doc', s3URL: 's3://bucketname/key/q' }],
        })
        const response = await createTestQuestionResponse(
            stateServer,
            question.id,
            {
                documents: [{ name: 'R-doc', s3URL: 's3://bucketname/key/r' }],
            }
        )

        const responseID = response.responses[0].id
        const responseDocID = response.responses[0].documents[0].id
        const questionDocID = question.documents[0].id

        const prismaClient = await sharedTestPrismaClient()

        // Fire two store-level deletes in parallel. Going straight to the
        // store cuts out the resolver/auth overhead so the two transactions
        // open close together, giving Postgres a real shot at overlapping
        // their snapshots and triggering P2034 → retry. If one transaction
        // commits first, the other hits the idempotency branch instead.
        // Either way we should never see duplicate action rows.
        const [r1, r2] = await Promise.all([
            softDeleteContractQuestion(prismaClient, {
                questionID: question.id,
                user: adminUser,
                reason: 'concurrent delete test',
            }),
            softDeleteContractQuestion(prismaClient, {
                questionID: question.id,
                user: adminUser,
                reason: 'concurrent delete test',
            }),
        ])

        expect(r1).not.toBeInstanceOf(Error)
        expect(r2).not.toBeInstanceOf(Error)

        // Both calls return the same shape — one wrote the action rows, the
        // other refetched via the idempotency branch — so each result should
        // surface the deleted question with its descendants intact.
        const expectedQuestion = expect.objectContaining({
            id: question.id,
            actions: expect.arrayContaining([
                expect.objectContaining({ action: 'DELETE' }),
            ]),
            documents: [expect.objectContaining({ id: questionDocID })],
            responses: [
                expect.objectContaining({
                    id: responseID,
                    documents: [expect.objectContaining({ id: responseDocID })],
                }),
            ],
        })
        expect(r1).toEqual(expectedQuestion)
        expect(r2).toEqual(expectedQuestion)

        const questionActions =
            await prismaClient.contractQuestionAction.findMany({
                where: { questionID: question.id },
            })
        expect(questionActions).toHaveLength(1)
        expect(questionActions[0].action).toBe('DELETE')

        const responseActions =
            await prismaClient.contractQuestionResponseAction.findMany({
                where: { responseID },
            })
        expect(responseActions).toHaveLength(1)
        expect(responseActions[0].action).toBe('CASCADE_DELETE')

        const questionDocActions =
            await prismaClient.contractQuestionDocumentAction.findMany({
                where: { documentID: questionDocID as string },
            })
        expect(questionDocActions).toHaveLength(1)
        expect(questionDocActions[0].action).toBe('CASCADE_DELETE')

        const responseDocActions =
            await prismaClient.contractQuestionResponseDocumentAction.findMany({
                where: { documentID: responseDocID as string },
            })
        expect(responseDocActions).toHaveLength(1)
        expect(responseDocActions[0].action).toBe('CASCADE_DELETE')
    })
})

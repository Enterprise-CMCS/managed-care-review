import { DeleteContractQuestionDocument } from '../../gen/gqlClient'
import {
    constructTestPostgresServer,
    createTestQuestion,
    createTestQuestionResponse,
    deleteTestContractQuestion,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import {
    createDBUsersWithFullData,
    testAdminUser,
    testCMSUser,
} from '../../testHelpers/userHelpers'
import {
    createAndSubmitTestContractWithRate,
    fetchTestContractWithQuestions,
} from '../../testHelpers/gqlContractHelpers'
import {
    assertAnError,
    assertAnErrorCode,
    testS3Client,
} from '../../testHelpers'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'

describe('deleteContractQuestion', () => {
    const mockS3 = testS3Client()

    it('soft deletes a question and cascades to its responses and documents', async () => {
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
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
            s3Client: mockS3,
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        // A second question we'll leave alone — confirms the delete is
        // scoped to the target and doesn't bleed into siblings.
        const questionToKeep = await createTestQuestion(
            cmsServer,
            contract.id,
            {
                documents: [
                    { name: 'Keep me', s3URL: 's3://bucketname/key/keep' },
                ],
            }
        )

        const questionToDelete = await createTestQuestion(
            cmsServer,
            contract.id,
            {
                documents: [
                    { name: 'Q-doc-1', s3URL: 's3://bucketname/key/q1' },
                    { name: 'Q-doc-2', s3URL: 's3://bucketname/key/q2' },
                ],
            }
        )
        const response1 = await createTestQuestionResponse(
            stateServer,
            questionToDelete.id,
            {
                documents: [
                    { name: 'R-doc-1', s3URL: 's3://bucketname/key/r1' },
                ],
            }
        )
        const response2 = await createTestQuestionResponse(
            stateServer,
            questionToDelete.id,
            {
                documents: [
                    { name: 'R-doc-2', s3URL: 's3://bucketname/key/r2' },
                ],
            }
        )

        const responseIDs = [
            response1.responses[0].id,
            response2.responses[0].id,
        ]
        const responseDocIDs = [
            ...response1.responses[0].documents.map((d) => d.id),
            ...response2.responses[0].documents.map((d) => d.id),
        ]
        const questionDocIDs = questionToDelete.documents.map((d) => d.id)

        // Delete question
        const deletedQuestion = await deleteTestContractQuestion(
            adminServer,
            questionToDelete.id
        )
        //Assert the question is deleted.
        expect(deletedQuestion.id).toBe(questionToDelete.id)
        expect(deletedQuestion.actions?.[0].action).toBe('DELETE')
        expect(deletedQuestion.documents.map((d) => d.id).sort()).toEqual(
            [...questionDocIDs].sort()
        )
        expect(deletedQuestion.responses.map((r) => r.id).sort()).toEqual(
            [...responseIDs].sort()
        )
        expect(
            deletedQuestion.responses
                .flatMap((r) => r.documents.map((d) => d.id))
                .sort()
        ).toEqual([...responseDocIDs].sort())

        // We have not surfaced the actions field in responses or the Q&A docs yet
        // so we have to directly query the DB data to assert the records are
        // soft deleted.
        const prismaClient = await sharedTestPrismaClient()

        const questionAction =
            await prismaClient.contractQuestionAction.findFirst({
                where: { questionID: questionToDelete.id },
                orderBy: { createdAt: 'desc' },
            })
        expect(questionAction?.action).toBe('DELETE')
        expect(questionAction?.updatedByID).toBe(adminUser.id)
        expect(questionAction?.reason).toBe('Some reason')

        const responseActions =
            await prismaClient.contractQuestionResponseAction.findMany({
                where: { responseID: { in: responseIDs } },
            })
        expect(responseActions).toHaveLength(responseIDs.length)
        expect(
            responseActions.every(
                (a) =>
                    a.action === 'CASCADE_DELETE' && a.reason === 'Some reason'
            )
        ).toBe(true)

        const questionDocActions =
            await prismaClient.contractQuestionDocumentAction.findMany({
                where: { documentID: { in: questionDocIDs as string[] } },
            })
        expect(questionDocActions).toHaveLength(questionDocIDs.length)
        expect(
            questionDocActions.every(
                (a) =>
                    a.action === 'CASCADE_DELETE' && a.reason === 'Some reason'
            )
        ).toBe(true)

        const responseDocActions =
            await prismaClient.contractQuestionResponseDocumentAction.findMany({
                where: { documentID: { in: responseDocIDs as string[] } },
            })
        expect(responseDocActions).toHaveLength(responseDocIDs.length)
        expect(
            responseDocActions.every(
                (a) =>
                    a.action === 'CASCADE_DELETE' && a.reason === 'Some reason'
            )
        ).toBe(true)

        // Subsequent fetches no longer surface the deleted question.
        const fetched = await fetchTestContractWithQuestions(
            stateServer,
            contract.id
        )
        const dmcoQuestions = fetched.questions?.DMCOQuestions
        expect(dmcoQuestions?.totalCount).toBe(1)
        expect(dmcoQuestions?.edges).toHaveLength(1)
        expect(dmcoQuestions?.edges[0].node.id).toBe(questionToKeep.id)
    })

    it('rejects non-admin users with FORBIDDEN', async () => {
        const cmsUser = testCMSUser()
        await createDBUsersWithFullData([cmsUser])

        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })
        const cmsServer = await constructTestPostgresServer({
            context: { user: cmsUser },
            s3Client: mockS3,
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const question = await createTestQuestion(cmsServer, contract.id)

        const result = await executeGraphQLOperation(cmsServer, {
            query: DeleteContractQuestionDocument,
            variables: {
                input: { questionID: question.id, reason: 'Some reason' },
            },
        })

        expect(result.errors).toBeDefined()
        expect(assertAnErrorCode(result)).toBe('FORBIDDEN')
        expect(assertAnError(result).message).toBe(
            'user not authorized to delete a question'
        )
    })

    it('returns BAD_USER_INPUT when deleting an already-deleted question', async () => {
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
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
            s3Client: mockS3,
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const question = await createTestQuestion(cmsServer, contract.id)

        // First delete succeeds.
        await deleteTestContractQuestion(adminServer, question.id)

        // Second delete on the same id should be rejected — same signal a
        // race-loser gets at the store layer.
        const result = await executeGraphQLOperation(adminServer, {
            query: DeleteContractQuestionDocument,
            variables: {
                input: {
                    questionID: question.id,
                    reason: 'Some reason',
                },
            },
        })

        expect(result.errors).toBeDefined()
        expect(assertAnErrorCode(result)).toBe('BAD_USER_INPUT')
        expect(assertAnError(result).message).toBe(
            `Question with id ${question.id} is already deleted`
        )
    })

    it('returns NOT_FOUND for a missing question id', async () => {
        const adminUser = testAdminUser()
        await createDBUsersWithFullData([adminUser])

        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
            s3Client: mockS3,
        })

        const missingID = '00000000-0000-0000-0000-000000000000'
        const result = await executeGraphQLOperation(adminServer, {
            query: DeleteContractQuestionDocument,
            variables: {
                input: {
                    questionID: missingID,
                    reason: 'Some reason',
                },
            },
        })

        expect(result.errors).toBeDefined()
        expect(assertAnErrorCode(result)).toBe('NOT_FOUND')
    })
})

import {
    DeleteContractQuestionResponseDocument,
    FetchSubmissionHistoryDocument,
    type FetchSubmissionHistoryQuery,
} from '../../gen/gqlClient'
import {
    constructTestPostgresServer,
    createTestQuestion,
    createTestQuestionResponse,
    deleteTestContractQuestionResponse,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import {
    createDBUsersWithFullData,
    testAdminUser,
    testCMSUser,
} from '../../testHelpers/userHelpers'
import {
    createAndSubmitTestContractWithRate,
    fetchTestContract,
    fetchTestContractWithQuestions,
} from '../../testHelpers/gqlContractHelpers'
import {
    assertAnError,
    assertAnErrorCode,
    testS3Client,
} from '../../testHelpers'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'

describe('deleteContractQuestionResponse', () => {
    const mockS3 = testS3Client()

    it('soft deletes a response and cascades to its documents', async () => {
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
        const responseToDelete = await createTestQuestionResponse(
            stateServer,
            question.id,
            {
                documents: [
                    { name: 'R-doc-1', s3URL: 's3://bucketname/key/r1' },
                ],
            }
        )
        const responseToKeep = await createTestQuestionResponse(
            stateServer,
            question.id,
            {
                documents: [
                    { name: 'R-doc-2', s3URL: 's3://bucketname/key/r2' },
                ],
            }
        )

        const responseID = responseToDelete.responses[0].id
        const responseDocID = responseToDelete.responses[0].documents[0].id
        const keptResponseID = responseToKeep.responses[0].id

        const deletedResponseQuestion =
            await deleteTestContractQuestionResponse(adminServer, responseID)

        // Assert that the mutation returns the parent question for the deleted response.
        expect(deletedResponseQuestion.id).toBe(question.id)
        // Assert that the mutation payload includes both the deleted and still-active responses.
        expect(deletedResponseQuestion.responses.map((r) => r.id)).toEqual(
            expect.arrayContaining([responseID, keptResponseID])
        )

        const prismaClient = await sharedTestPrismaClient()

        const responseAction =
            await prismaClient.contractQuestionResponseAction.findFirst({
                where: { responseID },
                orderBy: { createdAt: 'desc' },
            })
        // Assert that the target response is audited as explicitly deleted.
        expect(responseAction?.action).toBe('DELETE')
        // Assert that the response delete audit row records the admin who deleted it.
        expect(responseAction?.updatedByID).toBe(adminUser.id)
        // Assert that the response delete audit row preserves the supplied reason.
        expect(responseAction?.reason).toBe('Some reason')

        const responseDocAction =
            await prismaClient.contractQuestionResponseDocumentAction.findFirst(
                {
                    where: { documentID: responseDocID as string },
                    orderBy: { createdAt: 'desc' },
                }
            )
        // Assert that active documents on the deleted response are cascade-deleted.
        expect(responseDocAction?.action).toBe('CASCADE_DELETE')
        // Assert that the cascade document audit row records the admin who deleted the response.
        expect(responseDocAction?.updatedByID).toBe(adminUser.id)
        // Assert that the cascade document audit row preserves the supplied reason.
        expect(responseDocAction?.reason).toBe('Some reason')

        const keptResponseActions =
            await prismaClient.contractQuestionResponseAction.findMany({
                where: { responseID: keptResponseID },
            })
        // Assert that deleting one response does not write audit actions for sibling responses.
        expect(keptResponseActions).toHaveLength(0)

        const fetched = await fetchTestContractWithQuestions(
            stateServer,
            contract.id
        )
        const responses =
            fetched.questions?.DMCOQuestions.edges[0].node.responses ?? []
        // Assert that future contract-question reads hide the soft-deleted response.
        expect(responses.map((r) => r.id)).toEqual([keptResponseID])
    })

    it('captures response deletes in submission history and lastUpdatedForDisplay', async () => {
        const ldService = testLDService({
            'use-stored-contract-action-dates': true,
        })
        const cmsUser = testCMSUser()
        const adminUser = testAdminUser()
        await createDBUsersWithFullData([cmsUser, adminUser])

        const stateServer = await constructTestPostgresServer({
            ldService,
            s3Client: mockS3,
        })
        const cmsServer = await constructTestPostgresServer({
            context: { user: cmsUser },
            ldService,
            s3Client: mockS3,
        })
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
            ldService,
            s3Client: mockS3,
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const question = await createTestQuestion(cmsServer, contract.id)
        const questionWithResponse = await createTestQuestionResponse(
            stateServer,
            question.id
        )
        const responseID = questionWithResponse.responses[0].id
        const deleteReason = 'Delete question response'

        await deleteTestContractQuestionResponse(
            adminServer,
            responseID,
            deleteReason
        )

        const prismaClient = await sharedTestPrismaClient()
        const responseAction =
            await prismaClient.contractQuestionResponseAction.findFirst({
                where: { responseID, action: 'DELETE' },
                orderBy: { createdAt: 'desc' },
            })
        if (!responseAction) {
            throw new Error('Expected response delete action to exist')
        }

        const historyResult =
            await executeGraphQLOperation<FetchSubmissionHistoryQuery>(
                stateServer,
                {
                    query: FetchSubmissionHistoryDocument,
                    variables: {
                        input: {
                            contractID: contract.id,
                        },
                    },
                }
            )
        expect(historyResult.errors).toBeUndefined()

        const latestHistoryEntry =
            historyResult.data?.fetchSubmissionHistory.history[0]
        expect(latestHistoryEntry?.actionType).toBe(
            'CONTRACT_QUESTION_RESPONSE_DELETE'
        )
        expect(latestHistoryEntry?.updatedReason).toBe(deleteReason)
        expect(new Date(latestHistoryEntry?.updatedAt ?? '').getTime()).toBe(
            responseAction.createdAt.getTime()
        )

        const fetchedContract = await fetchTestContract(
            stateServer,
            contract.id
        )
        expect(fetchedContract.lastUpdatedForDisplay.getTime()).toBe(
            responseAction.createdAt.getTime()
        )
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
        const response = await createTestQuestionResponse(
            stateServer,
            question.id
        )

        const result = await executeGraphQLOperation(cmsServer, {
            query: DeleteContractQuestionResponseDocument,
            variables: {
                input: {
                    responseID: response.responses[0].id,
                    reason: 'Some reason',
                },
            },
        })

        // Assert that non-admin callers receive a GraphQL error.
        expect(result.errors).toBeDefined()
        // Assert that the resolver classifies non-admin deletes as forbidden.
        expect(assertAnErrorCode(result)).toBe('FORBIDDEN')
        // Assert that the authorization failure message points to question-response deletion.
        expect(assertAnError(result).message).toBe(
            'user not authorized to delete a question response'
        )
    })

    it('returns BAD_USER_INPUT when deleting an already-deleted response', async () => {
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
        const response = await createTestQuestionResponse(
            stateServer,
            question.id
        )
        const responseID = response.responses[0].id

        await deleteTestContractQuestionResponse(adminServer, responseID)

        const result = await executeGraphQLOperation(adminServer, {
            query: DeleteContractQuestionResponseDocument,
            variables: {
                input: {
                    responseID,
                    reason: 'Some reason',
                },
            },
        })

        // Assert that deleting the same response twice returns a GraphQL error.
        expect(result.errors).toBeDefined()
        // Assert that repeat deletes are treated as invalid user input, not a missing row.
        expect(assertAnErrorCode(result)).toBe('BAD_USER_INPUT')
        // Assert that the error identifies the already-deleted response id.
        expect(assertAnError(result).message).toBe(
            `Response with id ${responseID} is already deleted`
        )
    })

    it('returns NOT_FOUND for a missing response id', async () => {
        const adminUser = testAdminUser()
        await createDBUsersWithFullData([adminUser])

        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
            s3Client: mockS3,
        })

        const missingID = '00000000-0000-0000-0000-000000000000'
        const result = await executeGraphQLOperation(adminServer, {
            query: DeleteContractQuestionResponseDocument,
            variables: {
                input: {
                    responseID: missingID,
                    reason: 'Some reason',
                },
            },
        })

        // Assert that deleting an unknown response id returns a GraphQL error.
        expect(result.errors).toBeDefined()
        // Assert that the resolver maps a missing response to NOT_FOUND.
        expect(assertAnErrorCode(result)).toBe('NOT_FOUND')
    })
})

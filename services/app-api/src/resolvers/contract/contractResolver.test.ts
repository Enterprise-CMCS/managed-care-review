import { FetchContractWithQuestionsDocument } from '../../gen/gqlClient'
import {
    constructTestPostgresServer,
    createTestQuestion,
    createTestQuestionResponse,
    deleteTestContractQuestionResponse,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import {
    createAndUpdateTestContractWithRate,
    fetchTestContractWithQuestions,
    submitTestContract,
} from '../../testHelpers/gqlContractHelpers'
import { testS3Client } from '../../testHelpers'
import {
    createDBUsersWithFullData,
    testAdminUser,
    testCMSUser,
    testStateUser,
} from '../../testHelpers/userHelpers'

describe('contractResolver', () => {
    const dmcoCMSUser = testCMSUser({
        divisionAssignment: 'DMCO',
    })
    const dmcpCMSUser = testCMSUser({
        divisionAssignment: 'DMCP',
    })
    const oactCMSUser = testCMSUser({
        divisionAssignment: 'OACT',
    })
    const adminUser = testAdminUser()
    const mockS3 = testS3Client()

    beforeAll(async () => {
        //Inserting a new CMS user, with division assigned, in postgres in order to create the question to user relationship.
        await createDBUsersWithFullData([
            dmcoCMSUser,
            dmcpCMSUser,
            oactCMSUser,
            adminUser,
        ])
    })

    it('returns questions associated with a contract', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        const dmcoCMSServer = await constructTestPostgresServer({
            context: {
                user: dmcoCMSUser,
            },
            s3Client: mockS3,
        })
        const dmcpCMSServer = await constructTestPostgresServer({
            context: {
                user: dmcpCMSUser,
            },
            s3Client: mockS3,
        })
        const oactCMServer = await constructTestPostgresServer({
            context: {
                user: oactCMSUser,
            },
            s3Client: mockS3,
        })

        const draft = await createAndUpdateTestContractWithRate(stateServer)
        const stateSubmission = await submitTestContract(stateServer, draft.id)

        const createdDMCOQuestion = await createTestQuestion(
            dmcoCMSServer,
            stateSubmission.id,
            {
                documents: [
                    {
                        name: 'Test Question 1',
                        s3URL: 's3://bucketname/key/test11',
                    },
                ],
            }
        )

        const responseToDMCO = await createTestQuestionResponse(
            stateServer,
            createdDMCOQuestion.id
        )

        const createdDMCPQuestion = await createTestQuestion(
            dmcpCMSServer,
            stateSubmission.id,
            {
                documents: [
                    {
                        name: 'Test Question 2',
                        s3URL: 's3://bucketname/key/test12',
                    },
                ],
            }
        )

        const responseToDMCP = await createTestQuestionResponse(
            stateServer,
            createdDMCPQuestion.id
        )

        const createdOACTQuestion = await createTestQuestion(
            oactCMServer,
            stateSubmission.id,
            {
                documents: [
                    {
                        name: 'Test Question 3',
                        s3URL: 's3://bucketname/key/test13',
                    },
                ],
            }
        )

        const responseToOACT = await createTestQuestionResponse(
            stateServer,
            createdOACTQuestion.id
        )

        const contractWithQuestions = await fetchTestContractWithQuestions(
            stateServer,
            stateSubmission.id
        )
        const indexQuestionsResult = contractWithQuestions.questions

        draft.questions = indexQuestionsResult
        const fetchContractResult = await executeGraphQLOperation(stateServer, {
            query: FetchContractWithQuestionsDocument,
            variables: {
                input: {
                    contractID: stateSubmission.id,
                },
            },
        })

        expect(fetchContractResult.errors).toBeUndefined()

        const questions =
            fetchContractResult.data?.fetchContract.contract.questions
        expect(questions).toEqual(
            expect.objectContaining({
                DMCOQuestions: expect.objectContaining({
                    totalCount: 1,
                    edges: expect.arrayContaining([
                        {
                            node: expect.objectContaining({
                                id: expect.any(String),
                                createdAt: expect.any(Date),
                                contractID: stateSubmission.id,
                                division: 'DMCO',
                                documents: [
                                    {
                                        id: expect.any(String),
                                        name: 'Test Question 1',
                                        s3URL: 's3://bucketname/key/test11',
                                        downloadURL: expect.any(String),
                                        s3BucketName: 'bucketname',
                                        s3Key: 'allusers/key',
                                    },
                                ],
                                addedBy: responseToDMCO.addedBy,
                            }),
                        },
                    ]),
                }),
                DMCPQuestions: expect.objectContaining({
                    totalCount: 1,
                    edges: [
                        {
                            node: expect.objectContaining({
                                id: expect.any(String),
                                createdAt: expect.any(Date),
                                contractID: stateSubmission.id,
                                division: 'DMCP',
                                documents: [
                                    {
                                        id: expect.any(String),
                                        name: 'Test Question 2',
                                        s3URL: 's3://bucketname/key/test12',
                                        downloadURL: expect.any(String),
                                        s3BucketName: 'bucketname',
                                        s3Key: 'allusers/key',
                                    },
                                ],
                                addedBy: responseToDMCP.addedBy,
                            }),
                        },
                    ],
                }),
                OACTQuestions: expect.objectContaining({
                    totalCount: 1,
                    edges: [
                        {
                            node: expect.objectContaining({
                                id: expect.any(String),
                                createdAt: expect.any(Date),
                                contractID: stateSubmission.id,
                                division: 'OACT',
                                documents: [
                                    {
                                        id: expect.any(String),
                                        name: 'Test Question 3',
                                        s3URL: 's3://bucketname/key/test13',
                                        downloadURL: expect.any(String),
                                        s3BucketName: 'bucketname',
                                        s3Key: 'allusers/key',
                                    },
                                ],
                                addedBy: responseToOACT.addedBy,
                            }),
                        },
                    ],
                }),
            })
        )
    })

    it('excludes soft-deleted question responses when fetching contract questions', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })
        const dmcoCMSServer = await constructTestPostgresServer({
            context: {
                user: dmcoCMSUser,
            },
            s3Client: mockS3,
        })
        const adminServer = await constructTestPostgresServer({
            context: {
                user: adminUser,
            },
            s3Client: mockS3,
        })

        const draft = await createAndUpdateTestContractWithRate(stateServer)
        const stateSubmission = await submitTestContract(stateServer, draft.id)
        const question = await createTestQuestion(
            dmcoCMSServer,
            stateSubmission.id
        )
        const responseToDelete = await createTestQuestionResponse(
            stateServer,
            question.id
        )
        const responseToKeep = await createTestQuestionResponse(
            stateServer,
            question.id
        )
        const deletedResponseID = responseToDelete.responses[0].id
        const keptResponseID = responseToKeep.responses[0].id

        await deleteTestContractQuestionResponse(adminServer, deletedResponseID)

        const fetched = await fetchTestContractWithQuestions(
            stateServer,
            stateSubmission.id
        )
        const fetchedQuestion = fetched.questions?.DMCOQuestions.edges.find(
            (edge) => edge.node.id === question.id
        )?.node

        // Assert that the fetch still returns the question after one of its responses is soft deleted.
        expect(fetchedQuestion).toBeDefined()
        // Assert that fetchContract filters out the soft-deleted response and keeps the active response.
        expect(fetchedQuestion?.responses.map((r) => r.id)).toEqual([
            keptResponseID,
        ])
    })

    it('errors if the wrong state user calls it', async () => {
        const stateServerFL = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        const draft = await createAndUpdateTestContractWithRate(stateServerFL)
        const stateSubmission = await submitTestContract(
            stateServerFL,
            draft.id
        )

        const stateServerVA = await constructTestPostgresServer({
            context: {
                user: testStateUser({
                    stateCode: 'VA',
                    email: 'aang@mn.gov',
                }),
            },
        })

        const fetchResult = await executeGraphQLOperation(stateServerVA, {
            query: FetchContractWithQuestionsDocument,
            variables: {
                input: {
                    contractID: stateSubmission.id,
                },
            },
        })

        expect(fetchResult.errors).toBeDefined()
        if (fetchResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(fetchResult.errors[0].extensions?.code).toBe('FORBIDDEN')
        expect(fetchResult.errors[0].message).toBe(
            'User from state VA not allowed to access contract from FL'
        )
    })
})

import { FetchContractWithQuestionsDocument } from '../../gen/gqlClient'
import {
    constructTestPostgresServer,
    createTestQuestion,
    createTestQuestionResponse,
} from '../../testHelpers/gqlHelpers'
import {
    createAndUpdateTestContractWithRate,
    fetchTestContractWithQuestions,
    submitTestContract,
} from '../../testHelpers/gqlContractHelpers'
import { testS3Client } from '../../testHelpers'
import {
    createDBUsersWithFullData,
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
    const mockS3 = testS3Client()

    beforeAll(async () => {
        //Inserting a new CMS user, with division assigned, in postgres in order to create the question to user relationship.
        await createDBUsersWithFullData([dmcoCMSUser, dmcpCMSUser, oactCMSUser])
    })

    it('returns questions associated with a contract', async () => {
        const stateUser = testStateUser()
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
            context: {
                user: stateUser,
            },
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
        const stateSubmission = await submitTestContract(stateServer, draft.id, undefined, { user: stateUser })

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
            },
            { user: dmcoCMSUser }
        )

        const responseToDMCO = await createTestQuestionResponse(
            stateServer,
            createdDMCOQuestion.question.id,
            undefined,
            { user: stateUser }
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
            },
            { user: dmcpCMSUser }
        )

        const responseToDMCP = await createTestQuestionResponse(
            stateServer,
            createdDMCPQuestion.question.id,
            undefined,
            { user: stateUser }
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
            },
            { user: oactCMSUser }
        )

        const responseToOACT = await createTestQuestionResponse(
            stateServer,
            createdOACTQuestion.question.id,
            undefined,
            { user: stateUser }
        )

        const contractWithQuestions = await fetchTestContractWithQuestions(
            stateServer,
            stateSubmission.id,
            { user: stateUser }
        )
        const indexQuestionsResult = contractWithQuestions.questions

        draft.questions = indexQuestionsResult
        const fetchContractResult = await stateServer.executeOperation({
            query: FetchContractWithQuestionsDocument,
            variables: {
                input: {
                    contractID: stateSubmission.id,
                },
            },
        }, {
            contextValue: { user: stateUser },
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
                                        name: 'Test Question 1',
                                        s3URL: 's3://bucketname/key/test11',
                                        downloadURL: expect.any(String),
                                    },
                                ],
                                addedBy: responseToDMCO.question.addedBy,
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
                                        name: 'Test Question 2',
                                        s3URL: 's3://bucketname/key/test12',
                                        downloadURL: expect.any(String),
                                    },
                                ],
                                addedBy: responseToDMCP.question.addedBy,
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
                                        name: 'Test Question 3',
                                        s3URL: 's3://bucketname/key/test13',
                                        downloadURL: expect.any(String),
                                    },
                                ],
                                addedBy: responseToOACT.question.addedBy,
                            }),
                        },
                    ],
                }),
            })
        )
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

        const vaUser = testStateUser({
            stateCode: 'VA',
            email: 'aang@mn.gov',
        })
        const stateServerVA = await constructTestPostgresServer({
            context: {
                user: vaUser,
            },
            s3Client: mockS3,
        })

        const fetchResult = await stateServerVA.executeOperation({
            query: FetchContractWithQuestionsDocument,
            variables: {
                input: {
                    contractID: stateSubmission.id,
                },
            },
        }, {
            contextValue: { user: vaUser },
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

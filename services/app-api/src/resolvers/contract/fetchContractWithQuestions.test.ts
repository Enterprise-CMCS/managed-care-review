import {
    constructTestPostgresServer,
    createTestQuestion,
    createTestQuestionResponse,
    indexTestQuestions,
} from '../../testHelpers/gqlHelpers'

import FETCH_CONTRACT_WITH_QUESTIONS from '../../../../app-graphql/src/queries/fetchContractWithQuestions.graphql'
import {
    createAndUpdateTestContractWithoutRates,
    submitTestContract,
} from '../../testHelpers/gqlContractHelpers'
import { testS3Client } from '../../testHelpers'
import {
    createDBUsersWithFullData,
    testCMSUser,
    testStateUser,
} from '../../testHelpers/userHelpers'

describe('fetchContractWithQuestions', () => {
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

        const draft = await createAndUpdateTestContractWithoutRates(stateServer)
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
            createdDMCOQuestion.question.id
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
            createdDMCPQuestion.question.id
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
            createdOACTQuestion.question.id
        )

        const indexQuestionsResult = await indexTestQuestions(
            stateServer,
            stateSubmission.id
        )
        draft.questions = indexQuestionsResult
        const fetchContractResult = await stateServer.executeOperation({
            query: FETCH_CONTRACT_WITH_QUESTIONS,
            variables: {
                input: {
                    contractID: stateSubmission.id,
                },
            },
        })

        expect(fetchContractResult.errors).toBeUndefined()

        const questions =
            fetchContractResult.data?.fetchContractWithQuestions.contract
                .questions
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

        const draft =
            await createAndUpdateTestContractWithoutRates(stateServerFL)
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

        const fetchResult = await stateServerVA.executeOperation({
            query: FETCH_CONTRACT_WITH_QUESTIONS,
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

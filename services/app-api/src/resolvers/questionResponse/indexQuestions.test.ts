import INDEX_QUESTIONS from 'app-graphql/src/queries/indexQuestions.graphql'
import {
    constructTestPostgresServer,
    createAndSubmitTestHealthPlanPackage,
    createTestQuestion,
    createTestQuestionResponse,
    indexTestQuestions,
} from '../../testHelpers/gqlHelpers'
import { assertAnError, assertAnErrorCode } from '../../testHelpers'
import {
    createDBUsersWithFullData,
    testCMSUser,
} from '../../testHelpers/userHelpers'
import { testS3Client } from '../../testHelpers/s3Helpers'

describe('indexQuestions', () => {
    const mockS3 = testS3Client()

    const dmcoCMSUser = testCMSUser({
        divisionAssignment: 'DMCO',
    })
    const dmcpCMSUser = testCMSUser({
        divisionAssignment: 'DMCP',
    })
    const oactCMSUser = testCMSUser({
        divisionAssignment: 'OACT',
    })
    beforeAll(async () => {
        //Inserting a new CMS user, with division assigned, in postgres in order to create the question to user relationship.
        await createDBUsersWithFullData([dmcoCMSUser, dmcpCMSUser, oactCMSUser])
    })

    it('returns package with questions and responses for each division', async () => {
        const stateServer = await constructTestPostgresServer()
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

        const submittedPkg =
            await createAndSubmitTestHealthPlanPackage(stateServer)

        const createdDMCOQuestion = await createTestQuestion(
            dmcoCMSServer,
            submittedPkg.id,
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
            submittedPkg.id,
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
            submittedPkg.id,
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
            submittedPkg.id
        )

        expect(indexQuestionsResult).toEqual(
            expect.objectContaining({
                DMCOQuestions: expect.objectContaining({
                    totalCount: 1,
                    edges: expect.arrayContaining([
                        {
                            node: expect.objectContaining({
                                id: expect.any(String),
                                createdAt: expect.any(Date),
                                contractID: submittedPkg.id,
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
                                contractID: submittedPkg.id,
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
                                contractID: submittedPkg.id,
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
    it('returns an error if you are requesting for a different state (403)', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })
        const otherStateServer = await constructTestPostgresServer({
            context: {
                user: {
                    id: '4fed22c0-6d05-4bae-9e9a-b2345073ccf8',
                    stateCode: 'VA',
                    role: 'STATE_USER',
                    email: 'aang@va.gov',
                    familyName: 'Aang',
                    givenName: 'Aang',
                },
            },
            s3Client: mockS3,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: dmcoCMSUser,
            },
            s3Client: mockS3,
        })

        const submittedPkg =
            await createAndSubmitTestHealthPlanPackage(stateServer)

        await createTestQuestion(cmsServer, submittedPkg.id)

        const result = await otherStateServer.executeOperation({
            query: INDEX_QUESTIONS,
            variables: {
                input: {
                    contractID: submittedPkg.id,
                },
            },
        })

        expect(result.errors).toBeDefined()
        expect(assertAnErrorCode(result)).toBe('FORBIDDEN')
        expect(assertAnError(result).message).toBe(
            'User not authorized to fetch data from a different state'
        )
    })
    it('returns an error if health plan package does not exist', async () => {
        const server = await constructTestPostgresServer({ s3Client: mockS3 })

        await createAndSubmitTestHealthPlanPackage(server)

        const result = await server.executeOperation({
            query: INDEX_QUESTIONS,
            variables: {
                input: {
                    contractID: 'invalid-pkg-id',
                },
            },
        })

        expect(result.errors).toBeDefined()
        expect(assertAnErrorCode(result)).toBe('NOT_FOUND')
        expect(assertAnError(result).message).toBe(
            'Issue finding a contract with id invalid-pkg-id. Message: Contract with id invalid-pkg-id does not exist'
        )
    })
})

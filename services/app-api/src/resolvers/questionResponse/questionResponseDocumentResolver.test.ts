import {
    constructTestPostgresServer,
    createAndSubmitTestHealthPlanPackage,
    createTestQuestion,
    createTestQuestionResponse,
    indexTestQuestions,
} from '../../testHelpers/gqlHelpers'
import {
    testCMSUser,
    createDBUsersWithFullData,
} from '../../testHelpers/userHelpers'
import { testS3Client } from '../../testHelpers/s3Helpers'

describe(`questionResponseDocumentResolver`, () => {
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

    it('populates a download url for documents on fetch', async () => {
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
})

import INDEX_QUESTIONS from '@managed-care-review/app-graphql/src/queries/indexQuestions.graphql'
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

describe('indexQuestions', () => {
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
        })
        const dmcpCMSServer = await constructTestPostgresServer({
            context: {
                user: dmcpCMSUser,
            },
        })
        const oactCMServer = await constructTestPostgresServer({
            context: {
                user: oactCMSUser,
            },
        })

        const submittedPkg = await createAndSubmitTestHealthPlanPackage(
            stateServer
        )

        const createdDMCOQuestion = await createTestQuestion(
            dmcoCMSServer,
            submittedPkg.id,
            {
                documents: [
                    {
                        name: 'Test Question 1',
                        s3URL: 'testS3Url1',
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
                        s3URL: 'testS3Url2',
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
                        s3URL: 'testS3Url3',
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
                                pkgID: submittedPkg.id,
                                division: 'DMCO',
                                documents: [
                                    {
                                        name: 'Test Question 1',
                                        s3URL: 'testS3Url1',
                                    },
                                ],
                                addedBy: dmcoCMSUser,
                                responses: [responseToDMCO.response],
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
                                pkgID: submittedPkg.id,
                                division: 'DMCP',
                                documents: [
                                    {
                                        name: 'Test Question 2',
                                        s3URL: 'testS3Url2',
                                    },
                                ],
                                addedBy: dmcpCMSUser,
                                responses: [responseToDMCP.response],
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
                                pkgID: submittedPkg.id,
                                division: 'OACT',
                                documents: [
                                    {
                                        name: 'Test Question 3',
                                        s3URL: 'testS3Url3',
                                    },
                                ],
                                addedBy: oactCMSUser,
                                responses: [responseToOACT.response],
                            }),
                        },
                    ],
                }),
            })
        )
    })
    it('returns an error if you are requesting for a different state (403)', async () => {
        const stateServer = await constructTestPostgresServer()
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
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: dmcoCMSUser,
            },
        })

        const submittedPkg = await createAndSubmitTestHealthPlanPackage(
            stateServer
        )

        await createTestQuestion(cmsServer, submittedPkg.id)

        const result = await otherStateServer.executeOperation({
            query: INDEX_QUESTIONS,
            variables: {
                input: {
                    pkgID: submittedPkg.id,
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
        const server = await constructTestPostgresServer()

        await createAndSubmitTestHealthPlanPackage(server)

        const result = await server.executeOperation({
            query: INDEX_QUESTIONS,
            variables: {
                input: {
                    pkgID: 'invalid-pkg-id',
                },
            },
        })

        expect(result.errors).toBeDefined()
        expect(assertAnErrorCode(result)).toBe('NOT_FOUND')
        expect(assertAnError(result).message).toBe(
            'Issue finding a package with id invalid-pkg-id. Message: Package with id invalid-pkg-id does not exist'
        )
    })
})

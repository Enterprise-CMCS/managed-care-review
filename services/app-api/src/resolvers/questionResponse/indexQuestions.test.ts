import INDEX_QUESTIONS from 'app-graphql/src/queries/indexQuestions.graphql'
import {
    constructTestPostgresServer,
    createAndSubmitTestHealthPlanPackage,
    createTestQuestion,
    createTestQuestionResponse,
    indexTestQuestions,
} from '../../testHelpers/gqlHelpers'
import { UserType } from '../../domain-models'
import { assertAnError, assertAnErrorCode } from '../../testHelpers'

describe('indexQuestions', () => {
    const testUserCMS: UserType = {
        id: 'f7571910-ef02-427d-bae3-3e945e20e59d',
        role: 'CMS_USER',
        email: 'zuko@example.com',
        familyName: 'Zuko',
        givenName: 'Prince',
        stateAssignments: [],
    }
    it('returns package with questions and responses', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testUserCMS,
            },
        })

        const submittedPkg = await createAndSubmitTestHealthPlanPackage(
            stateServer
        )

        const createdQuestion1 = await createTestQuestion(
            cmsServer,
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

        const response1 = await createTestQuestionResponse(
            stateServer,
            createdQuestion1.question.id
        )

        const createdQuestion2 = await createTestQuestion(
            cmsServer,
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

        const response2 = await createTestQuestionResponse(
            stateServer,
            createdQuestion2.question.id
        )

        await createTestQuestion(cmsServer, submittedPkg.id, {
            documents: [
                {
                    name: 'Test Question 3',
                    s3URL: 'testS3Url3',
                },
            ],
        })

        const indexQuestionsResult = await indexTestQuestions(
            cmsServer,
            submittedPkg.id
        )

        expect(indexQuestionsResult).toEqual(
            expect.objectContaining({
                DMCOQuestions: expect.objectContaining({
                    totalCount: 3,
                    edges: expect.arrayContaining([
                        {
                            node: expect.objectContaining({
                                id: expect.any(String),
                                createdAt: expect.any(Date),
                                pkgID: submittedPkg.id,
                                documents: [
                                    {
                                        name: 'Test Question 1',
                                        s3URL: 'testS3Url1',
                                    },
                                ],
                                addedBy: testUserCMS,
                                responses: [response1.response],
                            }),
                        },
                        {
                            node: expect.objectContaining({
                                id: expect.any(String),
                                createdAt: expect.any(Date),
                                pkgID: submittedPkg.id,
                                documents: [
                                    {
                                        name: 'Test Question 2',
                                        s3URL: 'testS3Url2',
                                    },
                                ],
                                addedBy: testUserCMS,
                                responses: [response2.response],
                            }),
                        },
                        {
                            node: expect.objectContaining({
                                id: expect.any(String),
                                createdAt: expect.any(Date),
                                pkgID: submittedPkg.id,
                                documents: [
                                    {
                                        name: 'Test Question 3',
                                        s3URL: 'testS3Url3',
                                    },
                                ],
                                addedBy: testUserCMS,
                            }),
                        },
                    ]),
                }),
                DMCPQuestions: expect.objectContaining({
                    totalCount: 0,
                    edges: [],
                }),
                OACTQuestions: expect.objectContaining({
                    totalCount: 0,
                    edges: [],
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
                user: testUserCMS,
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

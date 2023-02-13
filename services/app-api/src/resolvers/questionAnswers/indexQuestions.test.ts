import INDEX_QUESTIONS from 'app-graphql/src/queries/indexQuestions.graphql'
import CREATE_QUESTION from 'app-graphql/src/mutations/createQuestion.graphql'
import {
    constructTestPostgresServer,
    createAndSubmitTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'
import { UserType } from '../../domain-models'

describe('indexQuestions', () => {
    const testUserCMS: UserType = {
        id: 'f7571910-ef02-427d-bae3-3e945e20e59d',
        role: 'CMS_USER',
        email: 'zuko@example.com',
        familyName: 'Zuko',
        givenName: 'Prince',
        stateAssignments: [],
    }
    it('returns package with questions', async () => {
        const server = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testUserCMS,
            },
        })

        const submittedPkg = await createAndSubmitTestHealthPlanPackage(server)

        await cmsServer.executeOperation({
            query: CREATE_QUESTION,
            variables: {
                input: {
                    pkgID: submittedPkg.id,
                    documents: [
                        {
                            name: 'Test Question 1',
                            s3URL: 'testS3Url1',
                        },
                    ],
                },
            },
        })

        await cmsServer.executeOperation({
            query: CREATE_QUESTION,
            variables: {
                input: {
                    pkgID: submittedPkg.id,
                    documents: [
                        {
                            name: 'Test Question 2',
                            s3URL: 'testS3Url2',
                        },
                    ],
                },
            },
        })

        await cmsServer.executeOperation({
            query: CREATE_QUESTION,
            variables: {
                input: {
                    pkgID: submittedPkg.id,
                    documents: [
                        {
                            name: 'Test Question 3',
                            s3URL: 'testS3Url3',
                        },
                    ],
                },
            },
        })

        const indexQuestionsResult = await server.executeOperation({
            query: INDEX_QUESTIONS,
            variables: {
                input: {
                    pkgID: submittedPkg.id,
                },
            },
        })

        expect(indexQuestionsResult.errors).toBeUndefined()
        expect(indexQuestionsResult?.data?.indexQuestions).toEqual(
            expect.objectContaining({
                DMCOQuestions: expect.objectContaining({
                    totalCount: 3,
                    edges: expect.arrayContaining([
                        {
                            node: expect.objectContaining({
                                id: expect.any(String),
                                dateAdded: expect.any(Date),
                                pkgID: submittedPkg.id,
                                documents: [
                                    {
                                        name: 'Test Question 1',
                                        s3URL: 'testS3Url1',
                                    },
                                ],
                                addedBy: testUserCMS,
                            }),
                        },
                        {
                            node: expect.objectContaining({
                                id: expect.any(String),
                                dateAdded: expect.any(Date),
                                pkgID: submittedPkg.id,
                                documents: [
                                    {
                                        name: 'Test Question 2',
                                        s3URL: 'testS3Url2',
                                    },
                                ],
                                addedBy: testUserCMS,
                            }),
                        },
                        {
                            node: expect.objectContaining({
                                id: expect.any(String),
                                dateAdded: expect.any(Date),
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
        const server = await constructTestPostgresServer()

        const stateSubmission = await createAndSubmitTestHealthPlanPackage(
            server
        )

        const input = {
            pkgID: stateSubmission.id,
        }

        const otherUserServer = await constructTestPostgresServer({
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

        const result = await otherUserServer.executeOperation({
            query: INDEX_QUESTIONS,
            variables: { input },
        })

        expect(result.errors).toBeDefined()
        if (result.errors === undefined) {
            throw new Error('annoying jest typing behavior')
        }
        expect(result.errors).toHaveLength(1)
        const resultErr = result.errors[0]

        expect(resultErr?.message).toBe(
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
        if (result.errors === undefined) {
            throw new Error('annoying jest typing behavior')
        }

        expect(result.errors).toHaveLength(1)
        const resultErr = result.errors[0]

        expect(resultErr?.message).toBe(
            'Issue finding a package with id invalid-pkg-id. Message: Result was undefined'
        )
    })
})

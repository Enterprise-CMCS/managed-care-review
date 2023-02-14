import CREATE_QUESTION from 'app-graphql/src/mutations/createQuestion.graphql'
import {
    constructTestPostgresServer,
    createAndSubmitTestHealthPlanPackage,
    createTestHealthPlanPackage,
    resubmitTestHealthPlanPackage,
    unlockTestHealthPlanPackage,
    createTestQuestion,
    indexTestQuestions,
} from '../../testHelpers/gqlHelpers'
import { CMSUserType } from '../../domain-models'
import { assertAnError, assertAnErrorCode } from '../../testHelpers'

describe('createQuestion', () => {
    const testUserCMS: CMSUserType = {
        id: 'f7571910-ef02-427d-bae3-3e945e20e59d',
        role: 'CMS_USER',
        email: 'zuko@example.com',
        familyName: 'Zuko',
        givenName: 'Prince',
        stateAssignments: [],
    }

    it('returns question data after creation', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testUserCMS,
            },
        })

        const submittedPkg = await createAndSubmitTestHealthPlanPackage(
            stateServer
        )

        const createdQuestion = await createTestQuestion(
            cmsServer,
            submittedPkg.id
        )

        expect(createdQuestion.question).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                pkgID: submittedPkg.id,
                documents: [
                    {
                        name: 'Test Question',
                        s3URL: 'testS3Url',
                    },
                ],
                addedBy: testUserCMS,
            })
        )
    })
    it('allows question creation on UNLOCKED and RESUBMITTED package', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testUserCMS,
            },
        })

        const submittedPkg = await createAndSubmitTestHealthPlanPackage(
            stateServer
        )

        const unlockedPkg = await unlockTestHealthPlanPackage(
            cmsServer,
            submittedPkg.id,
            'test unlock'
        )

        await createTestQuestion(cmsServer, submittedPkg.id)

        // Resubmit package
        await resubmitTestHealthPlanPackage(
            stateServer,
            unlockedPkg.id,
            'resubmit reason'
        )

        await createTestQuestion(cmsServer, submittedPkg.id, {
            documents: [
                {
                    name: 'Test Question 2',
                    s3URL: 'testS3Url2',
                },
            ],
        })

        const indexQuestionsPayload = await indexTestQuestions(
            cmsServer,
            submittedPkg.id
        )

        // Expect package to have two questions
        expect(indexQuestionsPayload).toEqual(
            expect.objectContaining({
                DMCOQuestions: expect.objectContaining({
                    totalCount: 2,
                    edges: expect.arrayContaining([
                        {
                            node: expect.objectContaining({
                                id: expect.any(String),
                                dateAdded: expect.any(Date),
                                pkgID: submittedPkg.id,
                                documents: [
                                    {
                                        name: 'Test Question',
                                        s3URL: 'testS3Url',
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
    it('returns an error package status is DRAFT', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testUserCMS,
            },
        })

        const draftPkg = await createTestHealthPlanPackage(stateServer)

        const createdQuestion = await cmsServer.executeOperation({
            query: CREATE_QUESTION,
            variables: {
                input: {
                    pkgID: draftPkg.id,
                    documents: [
                        {
                            name: 'Test Question',
                            s3URL: 'testS3Url',
                        },
                    ],
                },
            },
        })

        expect(createdQuestion.errors).toBeDefined()
        expect(assertAnErrorCode(createdQuestion)).toBe('BAD_USER_INPUT')
        expect(assertAnError(createdQuestion).message).toBe(
            'Issue creating question for health plan package. Message: Cannot create question for health plan package in DRAFT status'
        )
    })
    it('returns an error if a state user attempts to create a question for a package', async () => {
        const stateServer = await constructTestPostgresServer()
        const submittedPkg = await createAndSubmitTestHealthPlanPackage(
            stateServer
        )

        const createdQuestion = await stateServer.executeOperation({
            query: CREATE_QUESTION,
            variables: {
                input: {
                    pkgID: submittedPkg.id,
                    documents: [
                        {
                            name: 'Test Question',
                            s3URL: 'testS3Url',
                        },
                    ],
                },
            },
        })

        expect(createdQuestion.errors).toBeDefined()
        expect(assertAnErrorCode(createdQuestion)).toBe('FORBIDDEN')
        expect(assertAnError(createdQuestion).message).toBe(
            'user not authorized to create a question'
        )
    })
    it('returns error on invalid package id', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testUserCMS,
            },
        })

        await createAndSubmitTestHealthPlanPackage(stateServer)

        const createdQuestion = await cmsServer.executeOperation({
            query: CREATE_QUESTION,
            variables: {
                input: {
                    pkgID: 'invalid-pkg-id',
                    documents: [
                        {
                            name: 'Test Question',
                            s3URL: 'testS3Url',
                        },
                    ],
                },
            },
        })

        expect(createdQuestion.errors).toBeDefined()
        expect(assertAnErrorCode(createdQuestion)).toBe('NOT_FOUND')
        expect(assertAnError(createdQuestion).message).toBe(
            `Issue finding a package with id invalid-pkg-id. Message: Package with id invalid-pkg-id does not exist`
        )
    })
})

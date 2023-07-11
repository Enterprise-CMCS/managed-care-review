import CREATE_QUESTION from '@managed-care-review/app-graphql/src/mutations/createQuestion.graphql'
import {
    constructTestPostgresServer,
    createAndSubmitTestHealthPlanPackage,
    createTestHealthPlanPackage,
    resubmitTestHealthPlanPackage,
    unlockTestHealthPlanPackage,
    createTestQuestion,
    indexTestQuestions,
} from '../../testHelpers/gqlHelpers'
import { assertAnError, assertAnErrorCode } from '../../testHelpers'
import {
    createDBUsersWithFullData,
    testCMSUser,
} from '../../testHelpers/userHelpers'

describe('createQuestion', () => {
    const cmsUser = testCMSUser()
    beforeAll(async () => {
        //Inserting a new CMS user, with division assigned, in postgres in order to create the question to user relationship.
        await createDBUsersWithFullData([cmsUser])
    })

    it('returns question data after creation', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
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
                division: 'DMCO',
                documents: [
                    {
                        name: 'Test Question',
                        s3URL: 'testS3Url',
                    },
                ],
                addedBy: cmsUser,
            })
        )
    })
    it('allows question creation on UNLOCKED and RESUBMITTED package', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
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
                                createdAt: expect.any(Date),
                                pkgID: submittedPkg.id,
                                division: 'DMCO',
                                documents: [
                                    {
                                        name: 'Test Question',
                                        s3URL: 'testS3Url',
                                    },
                                ],
                                addedBy: cmsUser,
                            }),
                        },
                        {
                            node: expect.objectContaining({
                                id: expect.any(String),
                                createdAt: expect.any(Date),
                                pkgID: submittedPkg.id,
                                division: 'DMCO',
                                documents: [
                                    {
                                        name: 'Test Question 2',
                                        s3URL: 'testS3Url2',
                                    },
                                ],
                                addedBy: cmsUser,
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
                user: cmsUser,
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
                user: cmsUser,
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
    it('returns error when CMS user division is unassigned', async () => {
        const cmsUserWithNoDivision = testCMSUser({
            divisionAssignment: undefined,
        })
        await createDBUsersWithFullData([cmsUserWithNoDivision])
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUserWithNoDivision,
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
        expect(assertAnErrorCode(createdQuestion)).toBe('FORBIDDEN')
        expect(assertAnError(createdQuestion).message).toBe(
            `users without an assigned division are not authorized to create a question`
        )
    })
})

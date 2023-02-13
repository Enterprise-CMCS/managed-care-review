import CREATE_QUESTION from 'app-graphql/src/mutations/createQuestion.graphql'
import CREATE_HEALTH_PLAN_PACKAGE from 'app-graphql/src/mutations/createHealthPlanPackage.graphql'
import {
    constructTestPostgresServer,
    createAndSubmitTestHealthPlanPackage,
    resubmitTestHealthPlanPackage,
    unlockTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'
import { CMSUserType } from '../../domain-models'
import { CreateHealthPlanPackageInput } from '../../gen/gqlServer'
import INDEX_QUESTIONS from 'app-graphql/src/queries/indexQuestions.graphql'

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

        const input = {
            pkgID: submittedPkg.id,
            documents: [
                {
                    name: 'Test Question',
                    s3URL: 'testS3Url',
                },
            ],
        }

        const result = await cmsServer.executeOperation({
            query: CREATE_QUESTION,
            variables: { input },
        })

        expect(result.errors).toBeUndefined()
        expect(result.data?.createQuestion.question).toEqual(
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

        const createdQuestionOnUnlock = await cmsServer.executeOperation({
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

        // Expect no errors when creating question for UNLOCKED package
        expect(createdQuestionOnUnlock.errors).toBeUndefined()

        // Resubmit package
        await resubmitTestHealthPlanPackage(
            stateServer,
            unlockedPkg.id,
            'resubmit reason'
        )

        // Create question for resubmitted package.
        const createdQuestionOnResubmit = await cmsServer.executeOperation({
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

        // Expect no errors when creating question for resubmitted package
        expect(createdQuestionOnResubmit.errors).toBeUndefined()

        // Expect two questions from indexQuestions
        const indexQuestionsResult = await cmsServer.executeOperation({
            query: INDEX_QUESTIONS,
            variables: {
                input: {
                    pkgID: submittedPkg.id,
                },
            },
        })

        // Expect package to have two questions
        expect(indexQuestionsResult?.data?.indexQuestions).toEqual(
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

        const newSubInput: CreateHealthPlanPackageInput = {
            programIDs: [
                '5c10fe9f-bec9-416f-a20c-718b152ad633',
                '037af66b-81eb-4472-8b80-01edf17d12d9',
            ],
            riskBasedContract: false,
            submissionType: 'CONTRACT_ONLY',
            submissionDescription: 'A real submission',
            contractType: 'BASE',
        }

        const draftPkg = await stateServer.executeOperation({
            query: CREATE_HEALTH_PLAN_PACKAGE,
            variables: {
                input: newSubInput,
            },
        })

        const pkg = draftPkg.data?.createHealthPlanPackage.pkg

        const input = {
            pkgID: pkg.id,
            documents: [
                {
                    name: 'Test Question',
                    s3URL: 'testS3Url',
                },
            ],
        }

        const createdQuestion = await cmsServer.executeOperation({
            query: CREATE_QUESTION,
            variables: { input },
        })

        expect(createdQuestion.errors).toBeDefined()
        expect(
            createdQuestion.errors && createdQuestion.errors[0].message
        ).toBe(
            'Issue creating question for health plan package. Message: Cannot create question for health plan package in DRAFT status'
        )
    })
    it('returns an error if a state user attempts to create a question for a package', async () => {
        const stateServer = await constructTestPostgresServer()

        const submittedPkg = await createAndSubmitTestHealthPlanPackage(
            stateServer
        )

        const input = {
            pkgID: submittedPkg.id,
            documents: [
                {
                    name: 'Test Question',
                    s3URL: 'testS3Url',
                },
            ],
        }

        const createdQuestion = await stateServer.executeOperation({
            query: CREATE_QUESTION,
            variables: { input },
        })

        expect(createdQuestion.errors).toBeDefined()
        expect(
            createdQuestion.errors && createdQuestion.errors[0].message
        ).toBe('user not authorized to create a question')
    })
    it('returns error on invalid package id', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testUserCMS,
            },
        })
        await constructTestPostgresServer({
            context: {
                user: testUserCMS,
            },
        })
        await constructTestPostgresServer({
            context: {
                user: testUserCMS,
            },
        })

        await createAndSubmitTestHealthPlanPackage(stateServer)

        const input = {
            pkgID: 'invalid-pkg-id',
            documents: [
                {
                    name: 'Test Question',
                    s3URL: 'testS3Url',
                },
            ],
        }

        const createdQuestion = await cmsServer.executeOperation({
            query: CREATE_QUESTION,
            variables: { input },
        })

        expect(createdQuestion.errors).toBeDefined()
        expect(
            createdQuestion.errors && createdQuestion.errors[0].message
        ).toBe(
            `Issue finding a package with id invalid-pkg-id. Message: Result was undefined`
        )
    })
})

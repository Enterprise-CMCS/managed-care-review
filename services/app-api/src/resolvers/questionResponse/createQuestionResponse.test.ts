import CREATE_QUESTION_RESPONSE from 'app-graphql/src/mutations/createQuestionResponse.graphql'
import {
    constructTestPostgresServer,
    createAndSubmitTestHealthPlanPackage,
    createTestQuestion,
    createTestQuestionResponse,
} from '../../testHelpers/gqlHelpers'
import { assertAnError, assertAnErrorCode } from '../../testHelpers'
import {
    createDBUsersWithFullData,
    testCMSUser,
} from '../../testHelpers/userHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'

describe('createQuestionResponse', () => {
    const mockLDService = testLDService({ ['rates-db-refactor']: true })
    const cmsUser = testCMSUser()
    beforeAll(async () => {
        //Inserting a new CMS user, with division assigned, in postgres in order to create the question to user relationship.
        await createDBUsersWithFullData([cmsUser])
    })

    it('returns question response data', async () => {
        const stateServer = await constructTestPostgresServer({
            ldService: mockLDService,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService: mockLDService,
        })

        const submittedPkg = await createAndSubmitTestHealthPlanPackage(
            stateServer
        )

        const createdQuestion = await createTestQuestion(
            cmsServer,
            submittedPkg.id
        )

        const createdResponse = await createTestQuestionResponse(
            stateServer,
            createdQuestion?.question.id
        )

        expect(createdResponse).toEqual({
            response: expect.objectContaining({
                id: expect.any(String),
                questionID: createdQuestion?.question.id,
                documents: [
                    {
                        name: 'Test Question',
                        s3URL: 'testS3Url',
                    },
                ],
                addedBy: expect.objectContaining({
                    role: 'STATE_USER',
                }),
            }),
        })
    })

    it('returns an error when attempting to create response for a question that does not exist', async () => {
        const stateServer = await constructTestPostgresServer({
            ldService: mockLDService,
        })
        const fakeID = 'abc-123'

        const createdResponse = await stateServer.executeOperation({
            query: CREATE_QUESTION_RESPONSE,
            variables: {
                input: {
                    questionID: fakeID,
                    documents: [
                        {
                            name: 'Test Question',
                            s3URL: 'testS3Url',
                        },
                    ],
                },
            },
        })

        expect(createdResponse.errors).toBeDefined()
        expect(assertAnErrorCode(createdResponse)).toBe('BAD_USER_INPUT')
        expect(assertAnError(createdResponse).message).toBe(
            `Issue creating question response for question ${fakeID} of type NOT_FOUND_ERROR. Message: An operation failed because it depends on one or more records that were required but not found.`
        )
    })

    it('returns an error if a cms user attempts to create a question response for a package', async () => {
        const stateServer = await constructTestPostgresServer({
            ldService: mockLDService,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService: mockLDService,
        })
        const submittedPkg = await createAndSubmitTestHealthPlanPackage(
            stateServer
        )
        const createdQuestion = await createTestQuestion(
            cmsServer,
            submittedPkg.id
        )

        const createdResponse = await cmsServer.executeOperation({
            query: CREATE_QUESTION_RESPONSE,
            variables: {
                input: {
                    questionID: createdQuestion.question.id,
                    documents: [
                        {
                            name: 'Test Question',
                            s3URL: 'testS3Url',
                        },
                    ],
                },
            },
        })

        expect(createdResponse.errors).toBeDefined()
        expect(assertAnErrorCode(createdResponse)).toBe('FORBIDDEN')
        expect(assertAnError(createdResponse).message).toBe(
            'user not authorized to create a question response'
        )
    })
})

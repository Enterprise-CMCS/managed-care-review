import CREATE_QUESTION_RESPONSE from 'app-graphql/src/mutations/createQuestionResponse.graphql'
import {
    constructTestPostgresServer,
    createAndSubmitTestHealthPlanPackage,
    createTestQuestion,
    createTestQuestionResponse,
} from '../../testHelpers/gqlHelpers'
import { CMSUserType} from '../../domain-models'
import { assertAnError, assertAnErrorCode } from '../../testHelpers'

describe('createQuestionResponse', () => {
    const testUserCMS: CMSUserType = {
        id: 'f7571910-ef02-427d-bae3-3e945e20e59d',
        role: 'CMS_USER',
        email: 'zuko@example.com',
        familyName: 'Zuko',
        givenName: 'Prince',
        stateAssignments: [],
    }

    it('returns question response data', async () => {
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

        const createdResponse = await createTestQuestionResponse(
            stateServer,
            createdQuestion?.question.id
        )

        expect(createdResponse).toEqual({
            response: 
                expect.objectContaining({
                    id: expect.any(String),
                    questionID: createdQuestion?.question.id,
                    documents: [
                        {
                            name: 'Test Question',
                            s3URL: 'testS3Url',
                        },
                    ],
                    addedBy: expect.objectContaining({
                        role: 'STATE_USER'}
                    )
                })
            }
        )

    })

    it('returns an error when attempting to create response for a question that does not exist', async () => {
        const stateServer = await constructTestPostgresServer()
        const fakeID = 'abc-123'

        
        const createdResponse = await stateServer.executeOperation({
            query: CREATE_QUESTION_RESPONSE,
            variables: {
                input: {
                    fakeID,
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
            `Issue creating question response for question ${fakeID}`
        )
    })

    it('returns an error if a cms user attempts to create a question response for a package', async () => {
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


      const createdResponse = await stateServer.executeOperation({
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

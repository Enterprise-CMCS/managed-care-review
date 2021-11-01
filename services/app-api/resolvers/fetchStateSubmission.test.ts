import FETCH_STATE_SUBMISSION from '../../app-graphql/src/queries/fetchStateSubmission.graphql'
import {
    constructTestServer,
    createTestStateSubmission,
    createAndUpdateTestDraftSubmission,
} from '../testHelpers/gqlHelpers'

describe('fetchStateSubmission', () => {
    it('returns draft submission payload with a draft submission', async () => {
        const server = constructTestServer()

        // First, create a new submission
        const stateSubmission = await createTestStateSubmission(server)

        const createdID = stateSubmission.id

        // then see if we can fetch that same submission
        const input = {
            submissionID: createdID,
        }

        const result = await server.executeOperation({
            query: FETCH_STATE_SUBMISSION,
            variables: { input },
        })

        expect(result.errors).toBeUndefined()

        const resultSub = result.data?.fetchStateSubmission.submission
        expect(resultSub.id).toEqual(createdID)
        expect(resultSub.program.id).toEqual('cnet')
        expect(resultSub.program.name).toBe('CNET')
        expect(resultSub.name).toContain('FL-CNET')
        expect(resultSub.submissionDescription).toEqual('An updated submission')
        expect(resultSub.documents).toEqual([])
        expect(resultSub.contractDocuments).toEqual([
            {
                name: 'contractDocument.pdf',
                s3URL: 'fakeS3URL',
            },
        ])
        const today = new Date()
        const expectedDate = today.toISOString().split('T')[0]
        expect(resultSub.submittedAt).toEqual(expectedDate)
    })

    it('returns an error if the submission is a draft', async () => {
        const server = constructTestServer()

        // First, create a new submission
        const draft = await createAndUpdateTestDraftSubmission(server)

        // then see if we can fetch that same submission
        const input = {
            submissionID: draft.id,
        }

        const result = await server.executeOperation({
            query: FETCH_STATE_SUBMISSION,
            variables: { input },
        })

        expect(result.errors).toBeDefined()
        if (result.errors === undefined) {
            throw new Error('annoying jest typing behavior')
        }
        expect(result.errors?.length).toEqual(1)
        const resultErr = result.errors[0]

        expect(resultErr?.message).toEqual(
            'Submission is not a StateSubmission'
        )
        expect(resultErr?.extensions?.code).toEqual('WRONG_STATUS')
    })

    it('returns null if the ID does not exist', async () => {
        const server = constructTestServer()

        // then see if we can fetch that same submission
        const input = {
            submissionID: 'deadbeef-3292323-foo-bar',
        }

        const result = await server.executeOperation({
            query: FETCH_STATE_SUBMISSION,
            variables: { input },
        })

        expect(result.errors).toBeUndefined()
        expect(result.data?.fetchStateSubmission.submission).toBeNull()
    })

    it('a different user from the same state can fetch the draft', async () => {
        const server = constructTestServer()

        // First, create a new submission
        const stateSubmission = await createTestStateSubmission(server)

        const createdID = stateSubmission.id

        // then see if we can fetch that same submission
        const input = {
            submissionID: createdID,
        }

        // setup a server with a different user
        const otherUserServer = constructTestServer({
            context: {
                user: {
                    name: 'Aang',
                    state_code: 'FL',
                    role: 'STATE_USER',
                    email: 'aang@mn.gov',
                },
            },
        })

        const result = await otherUserServer.executeOperation({
            query: FETCH_STATE_SUBMISSION,
            variables: { input },
        })

        expect(result.errors).toBeUndefined()

        expect(result.data).toBeDefined()
    })

    it('returns an error if you are requesting for a different state (403)', async () => {
        const server = constructTestServer()

        // First, create a new submission
        const stateSubmission = await createTestStateSubmission(server)

        const createdID = stateSubmission.id

        // then see if we can fetch that same submission
        const input = {
            submissionID: createdID,
        }

        // setup a server with a different user
        const otherUserServer = constructTestServer({
            context: {
                user: {
                    name: 'Aang',
                    state_code: 'VA',
                    role: 'STATE_USER',
                    email: 'aang@va.gov',
                },
            },
        })

        const result = await otherUserServer.executeOperation({
            query: FETCH_STATE_SUBMISSION,
            variables: { input },
        })

        expect(result.errors).toBeDefined()
        if (result.errors === undefined) {
            throw new Error('annoying jest typing behavior')
        }
        expect(result.errors?.length).toEqual(1)
        const resultErr = result.errors[0]

        expect(resultErr?.message).toEqual(
            'user not authorized to fetch data from a different state'
        )
        expect(resultErr?.extensions?.code).toEqual('FORBIDDEN')
    })
})

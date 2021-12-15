import { CreateDraftSubmissionInput } from '../gen/gqlServer'
import CREATE_DRAFT_SUBMISSION from '../../app-graphql/src/mutations/createDraftSubmission.graphql'
import FETCH_DRAFT_SUBMISSION from '../../app-graphql/src/queries/fetchDraftSubmission.graphql'
import { constructTestPostgresServer } from '../testHelpers/gqlHelpers'

describe('fetchDraftSubmission', () => {
    it('returns draft submission payload with a draft submission', async () => {
        const server = await constructTestPostgresServer()

        // First, create a new submission
        const createInput: CreateDraftSubmissionInput = {
            programIDs: ['managed-medical-assistance'],
            submissionType: 'CONTRACT_ONLY',
            submissionDescription: 'A real submission',
        }
        const createResult = await server.executeOperation({
            query: CREATE_DRAFT_SUBMISSION,
            variables: { input: createInput },
        })

        const createdID =
            createResult.data?.createDraftSubmission.draftSubmission.id

        // then see if we can fetch that same submission
        const input = {
            submissionID: createdID,
        }

        const result = await server.executeOperation({
            query: FETCH_DRAFT_SUBMISSION,
            variables: { input },
        })

        expect(result.errors).toBeUndefined()

        const resultDraft = result.data?.fetchDraftSubmission.draftSubmission
        expect(resultDraft.id).toEqual(createdID)
        expect(resultDraft.program.id).toEqual('managed-medical-assistance')
        expect(resultDraft.program.name).toBe('Managed Medical Assistance')
        expect(resultDraft.name).toContain('FL-MANAGED-MEDICAL-ASSISTANCE')
        expect(resultDraft.submissionDescription).toEqual('A real submission')
        expect(resultDraft.documents).toEqual([])
    })

    it('returns null if the ID does not exist', async () => {
        const server = await constructTestPostgresServer()

        // then see if we can fetch that same submission
        const input = {
            submissionID: 'deadbeef-3292323-foo-bar',
        }

        const result = await server.executeOperation({
            query: FETCH_DRAFT_SUBMISSION,
            variables: { input },
        })

        expect(result.errors).toBeUndefined()
        expect(result.data?.fetchDraftSubmission.draftSubmission).toBeNull()
    })

    it('a different user from the same state can fetch the draft', async () => {
        const server = await constructTestPostgresServer()

        // First, create a new submission
        const createInput: CreateDraftSubmissionInput = {
            programIDs: ['smmc'],
            submissionType: 'CONTRACT_ONLY',
            submissionDescription: 'A real submission',
        }
        const createResult = await server.executeOperation({
            query: CREATE_DRAFT_SUBMISSION,
            variables: { input: createInput },
        })

        const createdID =
            createResult.data?.createDraftSubmission.draftSubmission.id

        // then see if we can fetch that same submission
        const input = {
            submissionID: createdID,
        }

        // setup a server with a different user
        const otherUserServer = await constructTestPostgresServer({
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
            query: FETCH_DRAFT_SUBMISSION,
            variables: { input },
        })

        expect(result.errors).toBeUndefined()

        expect(result.data?.fetchDraftSubmission?.draftSubmission).toBeDefined()
        expect(
            result.data?.fetchDraftSubmission?.draftSubmission
        ).not.toBeNull()
    })

    it('returns an error if you are requesting for a different state (403)', async () => {
        const server = await constructTestPostgresServer()

        // First, create a new submission
        const createInput: CreateDraftSubmissionInput = {
            programIDs: ['smmc'],
            submissionType: 'CONTRACT_ONLY',
            submissionDescription: 'A real submission',
        }
        const createResult = await server.executeOperation({
            query: CREATE_DRAFT_SUBMISSION,
            variables: { input: createInput },
        })

        const createdID =
            createResult.data?.createDraftSubmission.draftSubmission.id

        // then see if we can fetch that same submission
        const input = {
            submissionID: createdID,
        }

        // setup a server with a different user
        const otherUserServer = await constructTestPostgresServer({
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
            query: FETCH_DRAFT_SUBMISSION,
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

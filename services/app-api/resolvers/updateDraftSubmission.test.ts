import { createTestClient } from 'apollo-server-testing'

import { CreateDraftSubmissionInput, SubmissionType } from '../gen/gqlServer'
import CREATE_DRAFT_SUBMISSION from '../../app-graphql/src/mutations/createDraftSubmission.graphql'
import UPDATE_DRAFT_SUBMISSION from '../../app-graphql/src/mutations/updateDraftSubmission.graphql'
import FETCH_DRAFT_SUBMISSION from '../../app-graphql/src/queries/fetchDraftSubmission.graphql'
import { constructTestServer } from '../testHelpers/gqlHelpers'

describe('updateDraftSubmission', () => {
    it('updates a submission if the state matches', async () => {
        const server = constructTestServer()

        const { query, mutate } = createTestClient(server)

        // SETUP: First, create a new submission
        const createInput: CreateDraftSubmissionInput = {
            programID: 'smmc',
            submissionType: 'CONTRACT_ONLY' as SubmissionType.ContractOnly,
            submissionDescription: 'A created submission',
        }
        const createResult = await mutate({
            mutation: CREATE_DRAFT_SUBMISSION,
            variables: { input: createInput },
        })

        expect(createResult.errors).toBeUndefined()

        const createdDraft =
            createResult.data.createDraftSubmission.draftSubmission

        // ACT: next, update that submission
        const createdID = createdDraft.id

        // In order to test updatedAt, we delay 2 seconds here.
        await new Promise((resolve) => setTimeout(resolve, 2000))

        const updatedDraft = {
            programID: 'cnet',
            submissionType: 'CONTRACT_AND_RATES',
            submissionDescription: 'An updated submission',
            documents: []
        }

        const updateResult = await mutate({
            mutation: UPDATE_DRAFT_SUBMISSION,
            variables: {
                input: {
                    submissionID: createdID,
                    draftSubmissionUpdates: updatedDraft,
                },
            },
        })

        expect(updateResult.errors).toBeUndefined()

        // TEST: Finally, fetch and see if that works
        const input = {
            submissionID: createdID,
        }

        const result = await query({
            query: FETCH_DRAFT_SUBMISSION,
            variables: { input },
        })

        expect(result.errors).toBeUndefined()

        const resultDraft = result.data.fetchDraftSubmission.draftSubmission
        expect(resultDraft.id).toEqual(createdID)
        expect(resultDraft.submissionType).toEqual('CONTRACT_AND_RATES')
        expect(resultDraft.program.id).toEqual('cnet')
        // check that the stateNumber is being returned the same
        expect(resultDraft.name.split('-')[2]).toEqual(
            createdDraft.name.split('-')[2]
        )
        expect(resultDraft.submissionDescription).toEqual(
            'An updated submission'
        )

        // UpdatedAt should be after the former updatedAt
        const resultUpdated = new Date(resultDraft.updatedAt)
        const createdUpdated = new Date(createdDraft.updatedAt)
        expect(
            resultUpdated.getTime() - createdUpdated.getTime()
        ).toBeGreaterThan(0)
    })

    it('updates a submission to have documents', async () => {
        const server = constructTestServer()

        const { query, mutate } = createTestClient(server)

        // SETUP: First, create a new submission
        const createInput: CreateDraftSubmissionInput = {
            programID: 'smmc',
            submissionType: 'CONTRACT_ONLY' as SubmissionType.ContractOnly,
            submissionDescription: 'A created submission',
        }
        const createResult = await mutate({
            mutation: CREATE_DRAFT_SUBMISSION,
            variables: { input: createInput },
        })

        expect(createResult.errors).toBeUndefined()

        const createdDraft =
            createResult.data.createDraftSubmission.draftSubmission

        // ACT: next, update that submission with a single document
        const createdID = createdDraft.id

        const updatedDraft = {
            programID: 'cnet',
            submissionType: 'CONTRACT_AND_RATES',
            submissionDescription: 'An updated submission',
            documents:[
                {
                    name: 'myfile.pdf',
                    url: 'https://www.example.com'
                }
            ]
        }

        const updateResult = await mutate({
            mutation: UPDATE_DRAFT_SUBMISSION,
            variables: {
                input: {
                    submissionID: createdID,
                    draftSubmissionUpdates: updatedDraft,
                },
            },
        })

        expect(updateResult.errors).toBeUndefined()

        // TEST: fetch and see if that works
        const input = {
            submissionID: createdID,
        }

        const result = await query({
            query: FETCH_DRAFT_SUBMISSION,
            variables: { input },
        })

        expect(result.errors).toBeUndefined()

        const resultDraft = result.data.fetchDraftSubmission.draftSubmission

        expect(resultDraft.id).toEqual(createdID)
        expect(resultDraft.submissionType).toEqual('CONTRACT_AND_RATES')
        expect(resultDraft.program.id).toEqual('cnet')
        expect(resultDraft.submissionDescription).toEqual(
            'An updated submission'
        )
        expect(resultDraft.documents.length).toEqual(1)
        expect(resultDraft.documents).toEqual([ {
            name: 'myfile.pdf',
            url: 'https://www.example.com'
        }])

        // Update with two more documents
        const updatedDraft2 = {
            programID: 'cnet',
            submissionType: 'CONTRACT_AND_RATES',
            submissionDescription: 'An updated submission',
            documents:[
                {
                    name: 'myfile2.pdf',
                    url: 'https://www.example.com'
                },
                {
                    name: 'myfile3.pdf',
                    url: 'https://www.example.com'
                }
            ]
        }

        const updateResult2 = await mutate({
            mutation: UPDATE_DRAFT_SUBMISSION,
            variables: {
                input: {
                    submissionID: createdID,
                    draftSubmissionUpdates: updatedDraft2,
                },
            },
        })
        const resultDraft2 = updateResult2.data.updateDraftSubmission.draftSubmission
        expect(resultDraft2.documents.length).toEqual(2)
        expect(resultDraft2.documents[0].name).toEqual('myfile2.pdf')

    })

    it.todo('updates a submission to remove existing documents')

    it('errors if the ID doesnt exist', async () => {
        const server = constructTestServer()

        const { mutate } = createTestClient(server)

        const updatedDraft = {
            programID: 'cnet',
            submissionType: 'CONTRACT_AND_RATES',
            submissionDescription: 'An updated submission',
            documents: []
        }

        const updateResult = await mutate({
            mutation: UPDATE_DRAFT_SUBMISSION,
            variables: {
                input: {
                    submissionID: 'foo-bar-123',
                    draftSubmissionUpdates: updatedDraft,
                },
            },
        })

        expect(updateResult.errors).toBeDefined()
        if (updateResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(updateResult.errors[0].extensions?.code).toEqual(
            'BAD_USER_INPUT'
        )
        expect(updateResult.errors[0].extensions?.argumentName).toEqual(
            'submissionID'
        )
    })

    it('returns an error if you are requesting for a different state (403)', async () => {
        const server = constructTestServer()

        const { mutate } = createTestClient(server)

        // SETUP: First, create a new submission
        const createInput: CreateDraftSubmissionInput = {
            programID: 'smmc',
            submissionType: 'CONTRACT_ONLY' as SubmissionType.ContractOnly,
            submissionDescription: 'A created submission',
        }
        const createResult = await mutate({
            mutation: CREATE_DRAFT_SUBMISSION,
            variables: { input: createInput },
        })

        expect(createResult.errors).toBeUndefined()

        const createdDraft =
            createResult.data.createDraftSubmission.draftSubmission

        // ACT: next, update that submission but from a user from a diferent state
        const createdID = createdDraft.id

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

        const { mutate: otherMutate } = createTestClient(otherUserServer)

        const updatedDraft = {
            programID: 'cnet',
            submissionType: 'CONTRACT_AND_RATES',
            submissionDescription: 'An updated submission',
            documents: []
        }

        const updateResult = await otherMutate({
            mutation: UPDATE_DRAFT_SUBMISSION,
            variables: {
                input: {
                    submissionID: createdID,
                    draftSubmissionUpdates: updatedDraft,
                },
            },
        })

        // TEST: that should error.
        expect(updateResult.errors).toBeDefined()
        if (updateResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(updateResult.errors[0].extensions?.code).toEqual('FORBIDDEN')
    })

    it('returns an error if you try and set a programID thats not valid', async () => {
        const server = constructTestServer()

        const { mutate } = createTestClient(server)

        // SETUP: First, create a new submission
        const createInput: CreateDraftSubmissionInput = {
            programID: 'smmc',
            submissionType: 'CONTRACT_ONLY' as SubmissionType.ContractOnly,
            submissionDescription: 'A created submission'
        }
        const createResult = await mutate({
            mutation: CREATE_DRAFT_SUBMISSION,
            variables: { input: createInput },
        })

        expect(createResult.errors).toBeUndefined()

        const createdDraft =
            createResult.data.createDraftSubmission.draftSubmission

        // ACT: next, update that submission but from a user from a diferent state
        const createdID = createdDraft.id

        const updatedDraft = {
            programID: 'wefwefwefew',
            submissionType: 'CONTRACT_AND_RATES',
            submissionDescription: 'An updated submission',      
            documents: []
        }

        const updateResult = await mutate({
            mutation: UPDATE_DRAFT_SUBMISSION,
            variables: {
                input: {
                    submissionID: createdID,
                    draftSubmissionUpdates: updatedDraft,
                },
            },
        })

        // TEST: that should error.
        expect(updateResult.errors).toBeDefined()
        if (updateResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(updateResult.errors[0].extensions?.code).toEqual(
            'BAD_USER_INPUT'
        )
    })
})

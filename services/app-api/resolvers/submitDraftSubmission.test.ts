import { createTestClient } from 'apollo-server-testing'
import SUBMIT_DRAFT_SUBMISSION from '../../app-graphql/src/mutations/submitDraftSubmission.graphql'
import {
    constructTestServer,
    createAndUpdateTestDraftSubmission,
    fetchTestStateSubmissionById,
} from '../testHelpers/gqlHelpers'

describe('submitDraftSubmission', () => {
    it('returns a StateSubmission if complete', async () => {
        const server = constructTestServer()

        const { query, mutate } = createTestClient(server)

        // setup
        const draft = await createAndUpdateTestDraftSubmission(mutate)
        const draftID = draft.id

        // submit
        await new Promise((resolve) => setTimeout(resolve, 2000))
        const submitResult = await mutate({
            mutation: SUBMIT_DRAFT_SUBMISSION,
            variables: {
                input: {
                    submissionID: draftID,
                },
            },
        })

        expect(submitResult.errors).toBeUndefined()
        const createdID =
            submitResult?.data?.submitDraftSubmission.submission.id

        // test result
        const resultDraft = await fetchTestStateSubmissionById(query, createdID)

        // The submission fields should still be set
        expect(resultDraft.id).toEqual(createdID)
        expect(resultDraft.submissionType).toEqual('CONTRACT_AND_RATES')
        expect(resultDraft.program.id).toEqual('cnet')
        // check that the stateNumber is being returned the same
        expect(resultDraft.name.split('-')[2]).toEqual(draft.name.split('-')[2])
        expect(resultDraft.submissionDescription).toEqual(
            'An updated submission'
        )

        // Contract details fields should still be set
        expect(resultDraft.contractType).toEqual(draft.contractType)
        expect(resultDraft.contractDateStart).toEqual(draft.contractDateStart)
        expect(resultDraft.contractDateEnd).toEqual(draft.contractDateEnd)
        expect(resultDraft.managedCareEntities).toEqual(
            draft.managedCareEntities
        )
        expect(resultDraft.federalAuthorities).toEqual(draft.federalAuthorities)
        // submittedAt should be set to today's date
        const today = new Date()
        const expectedDate = today.toISOString().split('T')[0]
        expect(resultDraft.submittedAt).toEqual(expectedDate)

        // UpdatedAt should be after the former updatedAt
        const resultUpdated = new Date(resultDraft.updatedAt)
        const createdUpdated = new Date(draft.updatedAt)
        expect(
            resultUpdated.getTime() - createdUpdated.getTime()
        ).toBeGreaterThan(0)
    })

    it('returns an error if there are no documents attached', async () => {
        const server = constructTestServer()

        const { mutate } = createTestClient(server)

        const draft = await createAndUpdateTestDraftSubmission(mutate, {
            documents: [],
        })
        const draftID = draft.id

        const submitResult = await mutate({
            mutation: SUBMIT_DRAFT_SUBMISSION,
            variables: {
                input: {
                    submissionID: draftID,
                },
            },
        })

        expect(submitResult.errors).toBeDefined()

        expect(submitResult.errors?.[0].extensions?.code).toEqual(
            'BAD_USER_INPUT'
        )
        expect(submitResult.errors?.[0].extensions?.message).toEqual(
            'submissions must have documents'
        )
    })

    it('returns an error if there are no contract details fields', async () => {
        const server = constructTestServer()

        const { mutate } = createTestClient(server)

        const draft = await createAndUpdateTestDraftSubmission(mutate, {
            contractType: undefined,
            managedCareEntities: [],
            federalAuthorities: [],
        })

        const draftID = draft.id
        const submitResult = await mutate({
            mutation: SUBMIT_DRAFT_SUBMISSION,
            variables: {
                input: {
                    submissionID: draftID,
                },
            },
        })

        expect(submitResult.errors).toBeDefined()

        expect(submitResult.errors?.[0].extensions?.code).toEqual(
            'BAD_USER_INPUT'
        )
        expect(submitResult.errors?.[0].extensions?.message).toEqual(
            'submission is missing a required field'
        )
    })
})

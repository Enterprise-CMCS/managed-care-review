import { createTestClient } from 'apollo-server-testing'

import SUBMIT_DRAFT_SUBMISSION from '../../app-graphql/src/mutations/submitDraftSubmission.graphql'
import {
    constructTestServer,
    createTestDraftSubmission,
    createCompleteTestDraftSubmission,
    fetchTestStateSubmissionById,
} from '../testHelpers/gqlHelpers'

describe('submitDraftSubmission', () => {
    it('returns a StateSubmission if complete', async () => {
        const server = constructTestServer()

        const { query, mutate } = createTestClient(server)

        const draft = await createCompleteTestDraftSubmission(mutate)
        const draftID = draft.id
        // In order to test updatedAt, we delay 2 seconds here.
        await new Promise((resolve) => setTimeout(resolve, 2000))

        const updateResult = await mutate({
            mutation: SUBMIT_DRAFT_SUBMISSION,
            variables: {
                input: {
                    submissionID: draftID,
                },
            },
        })

        expect(updateResult.errors).toBeUndefined()

        const createdID =
            updateResult?.data?.submitDraftSubmission.submission.id

        // now we should be able to fetch it in its new state?

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

        const draft = await createTestDraftSubmission(mutate)
        const draftID = draft.id

        const updateResult = await mutate({
            mutation: SUBMIT_DRAFT_SUBMISSION,
            variables: {
                input: {
                    submissionID: draftID,
                },
            },
        })

        expect(updateResult.errors).toBeDefined()

        expect(updateResult.errors?.[0].extensions?.code).toEqual(
            'BAD_USER_INPUT'
        )
        expect(updateResult.errors?.[0].extensions?.message).toEqual(
            'submissions must have documents'
        )
    })
})

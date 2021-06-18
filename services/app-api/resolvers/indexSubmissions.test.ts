import { createTestClient } from 'apollo-server-testing'

import { CreateDraftSubmissionInput, SubmissionType } from '../gen/gqlServer'
import CREATE_DRAFT_SUBMISSION from '../../app-graphql/src/mutations/createDraftSubmission.graphql'
import INDEX_SUBMISSIONS from '../../app-graphql/src/queries/indexSubmissions.graphql'
import {
    constructTestServer,
    createTestDraftSubmission,
    createTestStateSubmission,
} from '../testHelpers/gqlHelpers'
import { DraftSubmission, StateSubmission } from '../gen/gqlServer'

describe('fetchDraftSubmission', () => {
    it('returns some submissions', async () => {
        const server = constructTestServer()

        const { query, mutate } = createTestClient(server)

        // First, create a new submission
        const draftSub = await createTestDraftSubmission(mutate)
        const stateSub = await createTestStateSubmission(mutate)

        // then see if we can get that same submission back from the index
        const result = await query({
            query: INDEX_SUBMISSIONS,
        })

        expect(result.errors).toBeUndefined()

        const resultSubmissions = result.data.indexSubmissions

        expect(resultSubmissions.totalCount).toBeGreaterThan(3)

        // Since we don't wipe the DB between tests, here we filter out all
        // the extraneous submissions and grab the two we started with.
        const theseSubmissions: (DraftSubmission | StateSubmission)[] = []
        resultSubmissions.edges.forEach(
            (sub: { node: DraftSubmission | StateSubmission }) => {
                if ([draftSub.id, stateSub.id].includes(sub.node.id)) {
                    theseSubmissions.push(sub.node)
                }
            }
        )

        expect(theseSubmissions.length).toBe(2)

        console.log('BACK', theseSubmissions)
    })
})

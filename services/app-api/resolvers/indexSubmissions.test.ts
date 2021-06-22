import { createTestClient } from 'apollo-server-testing'

import INDEX_SUBMISSIONS from '../../app-graphql/src/queries/indexSubmissions.graphql'
import {
    constructTestServer,
    createTestDraftSubmission,
    createTestStateSubmission,
} from '../testHelpers/gqlHelpers'
import {
    DraftSubmission,
    StateSubmission,
    SubmissionEdge,
    Submission,
} from '../gen/gqlServer'

describe('indexDraftSubmission', () => {
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

        const submissionsIndex = result.data.indexSubmissions

        expect(submissionsIndex.totalCount).toBeGreaterThan(1)

        // Since we don't wipe the DB between tests, here we filter out all
        // the extraneous submissions and grab the two we started with.

        const theseSubmissions: Submission[] = submissionsIndex.edges
            .map((edge: SubmissionEdge) => edge.node)
            .filter((sub: Submission) =>
                [draftSub.id, stateSub.id].includes(sub.id)
            )
        expect(theseSubmissions.length).toBe(2)

        let draftResult: DraftSubmission | undefined = undefined
        let stateResult: StateSubmission | undefined = undefined
        for (const sub of theseSubmissions) {
            if (sub.id === draftSub.id) {
                draftResult = sub as DraftSubmission
            }
            if (sub.id === stateSub.id) {
                stateResult = sub as StateSubmission
            }
        }

        expect(draftResult).toBeDefined()
        expect(stateResult).toBeDefined()

        if (draftResult === undefined || stateResult === undefined) {
            throw new Error('gotta make the type checker happy')
        }

        expect(draftResult.__typename).toBe('DraftSubmission')
        expect(stateResult.__typename).toBe('StateSubmission')
    })

    it('returns no submissions for a different user', async () => {
        const server = constructTestServer()

        const { mutate } = createTestClient(server)

        // First, create a new submission
        const draftSub = await createTestDraftSubmission(mutate)
        const stateSub = await createTestStateSubmission(mutate)

        const otherUserServer = constructTestServer({
            context: {
                user: {
                    name: 'Aang',
                    state_code: 'VA',
                    role: 'STATE_USER',
                    email: 'aang@mn.gov',
                },
            },
        })

        const { query: otherStateQuery } = createTestClient(otherUserServer)

        // then see if we can get that same submission back from the index
        const result = await otherStateQuery({
            query: INDEX_SUBMISSIONS,
        })

        expect(result.errors).toBeUndefined()

        const submissionsIndex = result.data.indexSubmissions

        // Since we don't wipe the DB between tests, here we filter out all
        // the extraneous submissions and grab the two we started with.

        const theseSubmissions: Submission[] = submissionsIndex.edges
            .map((edge: SubmissionEdge) => edge.node)
            .filter((sub: Submission) =>
                [draftSub.id, stateSub.id].includes(sub.id)
            )
        expect(theseSubmissions.length).toBe(0)
    })
})

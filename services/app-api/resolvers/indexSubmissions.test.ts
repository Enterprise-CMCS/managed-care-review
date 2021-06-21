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

        // this is dumb and bad but I'm not sure how to do this right
        // by doing true ? we trick the compiler into thinking that draftResult actually can
        // be DraftSubmission or undefined. For some reason, the fact that it can be set
        // inside the forEach function is ignored by typescript.
        let draftResult: DraftSubmission | undefined = true
            ? undefined
            : draftSub
        let stateResult: StateSubmission | undefined = true
            ? undefined
            : stateSub
        theseSubmissions.forEach((sub: Submission) => {
            if (sub.id === draftSub.id) {
                draftResult = sub as DraftSubmission
            }
            if (sub.id === stateSub.id) {
                stateResult = sub as StateSubmission
            }
        })

        expect(draftResult).toBeDefined()
        expect(stateResult).toBeDefined()

        if (draftResult === undefined || stateResult === undefined) {
            throw new Error('gotta make the type checker happy')
        }

        expect(draftResult.__typename).toBe('DraftSubmission')
        expect(stateResult.__typename).toBe('StateSubmission')
    })
})

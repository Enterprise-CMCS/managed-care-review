import { DraftSubmissionType } from '../../app-web/src/common-code/domain-models'
import { isStoreError } from '../store'
import { sharedTestPrismaClient } from '../testHelpers/storeHelpers'
import { insertDraftSubmission } from './insertDraftSubmission'

describe('insertDraftSubmissionPostgres', () => {
    // eslint-disable-next-line jest/expect-expect
    it('increases state number with every insertion', async () => {
        // this test attempts to create a number of drafts concurrently.
        // if any of the state numbers in the resultant drafts are duplicates, we have a bug.

        const client = await sharedTestPrismaClient()

        const args = {
            stateCode: 'FL',
            programID: 'smmc',
            submissionType: 'CONTRACT_ONLY' as const,
            submissionDescription: 'concurrency state code test',
        }

        const resultPromises = []
        for (let i = 0; i < 30; i++) {
            resultPromises.push(insertDraftSubmission(client, args))
        }

        const results = await Promise.all(resultPromises)
        if (results.some((result) => isStoreError(result))) {
            console.log('RESULTS', results)
            throw new Error('some of our inserts failed')
        }

        // Because we are erroring above if _any_ of our results are a store error
        // we can tell the type system that all of our results are DraftSubmissionType
        const drafts = results as DraftSubmissionType[]

        // Quick way to see if there are any duplicates, throw the state numbers into
        // a set and check that the set and the array have the same number of elements
        const stateNumbers = drafts.map((draft) => draft.stateNumber)
        const stateNumberSet = new Set(stateNumbers)

        if (stateNumbers.length !== stateNumberSet.size) {
            console.log(
                'We got some duplicates: ',
                stateNumbers.sort(),
                stateNumberSet.size
            )
            throw new Error('got some duplicate state numbers.')
        }
    })
})

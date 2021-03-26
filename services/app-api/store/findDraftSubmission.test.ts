import { v4 as uuidv4 } from 'uuid'

import { StoreError, isStoreError } from './storeError'
import { getTestStore } from '../testHelpers/storeHelpers'

describe('findDraftSubmission', () => {
    it('returns undefined if nothing is found with that ID', async () => {
        const store = getTestStore()

        try {
            const findResult = await store.findDraftSubmission(
                '4ef98660-34d6-4656-966b-db59f3003cea'
            )

            expect(findResult).toBe(undefined)
        } catch (e) {
            throw e
        }
    })

    it.todo('returns a submission if it exists')
    it.todo('returns a submission by state and code')
    it.todo('returns an error if the connection is bad')
})

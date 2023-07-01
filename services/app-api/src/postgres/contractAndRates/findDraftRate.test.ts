import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { insertDraftRate } from './insertRate'
import { updateDraftRate } from './updateDraftRate'
import { must } from '../../testHelpers'
import { findDraftRate } from './findDraftRate'

describe('findDraftRate', () => {
    it('handles drafts correctly', async () => {
        const client = await sharedTestPrismaClient()

        // Add 2 rates 1, 2
        const rate1 = must(await insertDraftRate(client, 'onepoint0'))
        must(await updateDraftRate(client, rate1.id, 'draftData', []))

        const draft = await findDraftRate(client, rate1.id)

        if (draft instanceof Error) {
            throw draft
        }

        expect(draft?.revisionFormData).toBe('draftData')
    })
})

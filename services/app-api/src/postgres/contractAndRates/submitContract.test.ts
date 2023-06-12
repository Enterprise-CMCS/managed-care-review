import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { v4 as uuidv4 } from 'uuid'
import { submitRateRevision } from './submitRateRevision'
import { insertDraftContract } from './insertContract'
import { insertDraftRate } from './insertRate'
import { updateRateDraft } from './updateRateDraft'
import { must } from '../../testHelpers'

describe('findContract', () => {
    it('handles concurrent drafts correctly', async () => {
        const client = await sharedTestPrismaClient()

        const stateUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Aang',
                familyName: 'Avatar',
                email: 'aang@example.com',
                role: 'STATE_USER',
                stateCode: 'NM',
            },
        })

        const contractA = must(
            await insertDraftContract(client, 'one contract')
        )

        // Attempt to submit a rate related to this draft contract
        const rate1 = must(await insertDraftRate(client, 'onepoint0'))
        must(
            await updateRateDraft(client, rate1.id, 'onepoint0', [contractA.id])
        )
        const result = await submitRateRevision(
            client,
            rate1.id,
            stateUser.id,
            'Rate Submit'
        )

        if (!(result instanceof Error)) {
            throw new Error('must be an error')
        }
        expect(result.message).toBe(
            'Attempted to submit a rate related to a contract that has not been submitted'
        )
    })
})

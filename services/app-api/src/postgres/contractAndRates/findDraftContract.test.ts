import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { v4 as uuidv4 } from 'uuid'
import { submitContract } from './submitContract'
import { submitRate } from './submitRate'
import { insertDraftContract } from './insertContract'
import { unlockContract } from './unlockContract'
import { updateDraftContract } from './updateDraftContract'
import { insertDraftRate } from './insertRate'
import { updateDraftRate } from './updateDraftRate'
import { unlockRate } from './unlockRate'
import { findDraftContract } from './findDraftContract'
import { must } from '../../testHelpers'

describe('findDraftContract', () => {
    it('handles drafts correctly', async () => {
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

        // Add 2 rates 1, 2
        const rate1 = must(await insertDraftRate(client, 'onepoint0'))
        must(await updateDraftRate(client, rate1.id, 'onepoint0', []))
        must(await submitRate(client, rate1.id, stateUser.id, 'Rate Submit'))

        const rate2 = must(await insertDraftRate(client, 'twopointo'))
        must(await updateDraftRate(client, rate2.id, 'twopointo', []))
        must(await submitRate(client, rate2.id, stateUser.id, 'Rate Submit 2'))

        // add a draft contract that has both of them.
        const contractA = must(
            await insertDraftContract(client, 'one contract')
        )
        must(
            await updateDraftContract(client, contractA.id, 'one contract', [
                rate1.id,
                rate2.id,
            ])
        )

        const draft = must(await findDraftContract(client, contractA.id))

        if (!draft) {
            throw new Error('no draft returned')
        }

        expect(draft).toBeDefined()
        expect(draft.rateRevisions).toHaveLength(2)
    })

    it('handles multiple rate revisions correctly', async () => {
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

        const cmsUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Zuko',
                familyName: 'Hotman',
                email: 'zuko@example.com',
                role: 'CMS_USER',
            },
        })

        // Add rate with 2 revisions
        const rate1 = must(await insertDraftRate(client, 'onepoint0'))
        must(await updateDraftRate(client, rate1.id, 'onepoint0', []))
        must(await submitRate(client, rate1.id, stateUser.id, 'Rate Submit'))

        const rate2 = must(
            await unlockRate(
                client,
                rate1.id,
                cmsUser.id,
                'to test out multiple revisions'
            )
        )
        must(await updateDraftRate(client, rate2.id, 'draft two', []))
        must(await submitRate(client, rate2.id, stateUser.id, 'Rate Submit 2'))

        must(
            await unlockRate(
                client,
                rate1.id,
                cmsUser.id,
                'to test out unlocked rates being ignored'
            )
        )
        must(await updateDraftRate(client, rate2.id, 'draft three', []))

        // add a draft contract that has both of them.
        const contractA = must(
            await insertDraftContract(client, 'one contract')
        )
        must(
            await updateDraftContract(client, contractA.id, 'one contract', [
                rate1.id,
                rate2.id,
            ])
        )

        const draft = must(await findDraftContract(client, contractA.id))

        if (!draft) {
            throw new Error('no draft returned')
        }

        expect(draft).toBeDefined()
        expect(draft.rateRevisions).toHaveLength(1)
        expect(draft.rateRevisions[0].revisionFormData).toBe('draft two')
    })

    it('works on a later revision', async () => {
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

        const cmsUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Zuko',
                familyName: 'Hotman',
                email: 'zuko@example.com',
                role: 'CMS_USER',
            },
        })

        // add a draft contract that has both of them.
        const contractA = must(
            await insertDraftContract(client, 'one contract')
        )
        must(await updateDraftContract(client, contractA.id, 'first draft', []))
        must(
            await submitContract(
                client,
                contractA.id,
                stateUser.id,
                'First Submission'
            )
        )

        must(
            await unlockContract(
                client,
                contractA.id,
                cmsUser.id,
                'unlock to see if draft still comes'
            )
        )
        must(await updateDraftContract(client, contractA.id, 'draft Edit', []))

        const draft = must(await findDraftContract(client, contractA.id))

        if (!draft) {
            throw new Error('no draft returned')
        }

        expect(draft).toBeDefined()
        expect(draft.rateRevisions).toHaveLength(0)
        expect(draft.contractFormData).toBe('draft Edit')
    })
})

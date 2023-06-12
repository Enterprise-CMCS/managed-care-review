import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { v4 as uuidv4 } from 'uuid'
import { submitContract } from './submitContract'
import { submitRateRevision } from './submitRateRevision'
import { insertDraftContract } from './insertContract'
import { unlockContract } from './unlockContract'
import { updateContractDraft } from './updateContractDraft'
import { insertDraftRate } from './insertRate'
import { updateRateDraft } from './updateRateDraft'
import { unlockRate } from './unlockRate'
import { findRate } from './findRate'
import { must } from '../../testHelpers'

describe('findContract', () => {
    it('finds a full contract', async () => {
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

        // setup a couple test contracts
        const contractA = must(
            await insertDraftContract(client, 'one contract')
        )
        must(
            await submitContract(
                client,
                contractA.id,
                stateUser.id,
                'initial submit'
            )
        )

        // Add 3 rates 1, 2, 3 pointing to contract A
        const rate1 = must(await insertDraftRate(client, 'someurle.en'))
        must(
            await updateRateDraft(client, rate1.id, 'someurle.en', [
                contractA.id,
            ])
        )
        must(
            await submitRateRevision(
                client,
                rate1.id,
                stateUser.id,
                'Rate Submit'
            )
        )

        const rate2 = must(await insertDraftRate(client, 'twopointo'))
        must(
            await updateRateDraft(client, rate2.id, 'twopointo', [contractA.id])
        )
        must(
            await submitRateRevision(
                client,
                rate2.id,
                stateUser.id,
                'RateSubmit 2'
            )
        )

        const rate3 = must(await insertDraftRate(client, 'threepointo'))
        must(
            await updateRateDraft(client, rate3.id, 'threepointo', [
                contractA.id,
            ])
        )
        must(
            await submitRateRevision(
                client,
                rate3.id,
                stateUser.id,
                '3.0 create'
            )
        )

        // remove the connection from rate 2
        must(
            await unlockRate(
                client,
                rate2.id,
                cmsUser.id,
                'unlock for 2.1 remove'
            )
        )
        must(await updateRateDraft(client, rate2.id, 'twopointone', []))
        must(
            await submitRateRevision(
                client,
                rate2.id,
                stateUser.id,
                '2.1 remove'
            )
        )

        // update rate 1 to have a new version, should make one new rev.
        must(await unlockRate(client, rate1.id, cmsUser.id, 'unlock for 1.1'))
        must(
            await updateRateDraft(client, rate1.id, 'onepointone', [
                contractA.id,
            ])
        )
        must(
            await submitRateRevision(
                client,
                rate1.id,
                stateUser.id,
                '1.1 new name'
            )
        )

        // Make a new Contract Revision, should show up as a single new rev with all the old info
        must(
            await unlockContract(
                client,
                contractA.id,
                cmsUser.id,
                'unlocking A.0'
            )
        )
        must(
            await updateContractDraft(client, contractA.id, 'a.1 body', [
                rate1.id,
                rate3.id,
            ])
        )
        must(
            await submitContract(
                client,
                contractA.id,
                stateUser.id,
                'Submitting A.1'
            )
        )

        // Make a new Contract Revision, changing the connections should show up as a single new rev.
        must(
            await unlockContract(
                client,
                contractA.id,
                cmsUser.id,
                'unlocking A.1'
            )
        )
        must(
            await updateContractDraft(client, contractA.id, 'a.2 body', [
                rate3.id,
            ])
        )
        must(
            await submitContract(
                client,
                contractA.id,
                stateUser.id,
                'Submitting A.2'
            )
        )

        // Now, find that contract and assert the history is what we expected
        const resultingRate = await findRate(client, rate1.id)
        if (resultingRate instanceof Error) {
            throw resultingRate
        }

        const revisions = resultingRate.revisions

        console.info(
            'ALL First REvisions: ',
            JSON.stringify(revisions, null, '  ')
        )

        // Each Revision needs a Reason, one of the contracts or revisions associated with it should have changed and why.

        expect(revisions).toHaveLength(4)
        expect(revisions[0].contractRevisions).toHaveLength(1)
        expect(
            revisions[0].contractRevisions &&
                revisions[0].contractRevisions[0].contractFormData
        ).toBe('one contract')
        expect(revisions[0].submitInfo?.updatedReason).toBe('Rate Submit')

        expect(revisions[1].contractRevisions).toHaveLength(1)
        expect(
            revisions[1].contractRevisions &&
                revisions[1].contractRevisions[0].contractFormData
        ).toBe('one contract')
        expect(revisions[1].submitInfo?.updatedReason).toBe('1.1 new name')

        expect(revisions[2].contractRevisions).toHaveLength(1)
        expect(
            revisions[2].contractRevisions &&
                revisions[2].contractRevisions[0].contractFormData
        ).toBe('a.1 body')
        expect(revisions[2].submitInfo?.updatedReason).toBe('Submitting A.1')

        expect(revisions[3].contractRevisions).toHaveLength(0)
        expect(revisions[3].submitInfo?.updatedReason).toBe('Submitting A.2')
    })
})

import { sharedTestPrismaClient } from "../../testHelpers/storeHelpers"
import { v4 as uuidv4 } from 'uuid'
import { findContract } from "./findContract"
import { submitContract } from "./submitContract"
import { submitRateRevision } from "./submitRateRevision"
import { insertDraftContract } from "./insertContract"
import { unlockContract } from "./unlockContract"
import { updateContractDraft } from "./updateContractDraft"
import { insertDraftRate } from "./insertRate"
import { updateRateDraft } from "./updateRateDraft"
import { unlockRate } from "./unlockRate"

async function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

// For use in TESTS only. Throws a returned error
function must<T>(maybeErr: T | Error): T {
    if (maybeErr instanceof Error) {
        throw maybeErr
    }
    return maybeErr
}

describe('findContract', () => {

    it('finds a full contract', async () =>  {

        const client = await sharedTestPrismaClient()

        const stateUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Aang',
                familyName: 'Avatar',
                email: 'aang@example.com',
                role: 'STATE_USER',
                stateCode: 'NM',
            }
        })

        const cmsUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Zuko',
                familyName: 'Hotman',
                email: 'zuko@example.com',
                role: 'CMS_USER',
            }
        })

        // setup a single test contract
        const contractA = must(await insertDraftContract(client, 'one contract'))
        must(await submitContract(client, contractA.id, stateUser.id, 'initial submit' ))

        // Add 3 rates 1, 2, 3 pointing to contract A
        const rate1 = must(await insertDraftRate(client, 'someurle.en'))
        must(await updateRateDraft(client, rate1.id, 'someurle.en', [contractA.id]))
        must(await submitRateRevision(client, rate1.id, stateUser.id, 'Rate Submit'))
        
        await delay(100)

        const rate2 = must(await insertDraftRate(client, 'twopointo'))
        must(await updateRateDraft(client, rate2.id, 'twopointo', [contractA.id]))
        must(await submitRateRevision(client, rate2.id, stateUser.id, 'RateSubmit 2'))

        await delay(100)

        const rate3 = must(await insertDraftRate(client, 'threepointo'))
        must(await updateRateDraft(client, rate3.id, 'threepointo', [contractA.id]))
        must(await submitRateRevision(client, rate3.id, stateUser.id, '3.0 create'))


        await delay(100)

        // remove the connection from rate 2
        must(await unlockRate(client, rate2.id, cmsUser.id, 'unlock for 2.1 remove'))
        must(await updateRateDraft(client, rate2.id, 'twopointone', []))
        must(await submitRateRevision(client, rate2.id, stateUser.id, '2.1 remove'))

        await delay(100)

        // update rate 1 to have a new version, should make one new rev.
        must(await unlockRate(client, rate1.id, cmsUser.id, 'unlock for 1.1'))
        must(await updateRateDraft(client, rate1.id, 'onepointone', [contractA.id]))
        must(await submitRateRevision(client, rate1.id, stateUser.id, '1.1 new name'))

        await delay(100)

        // Make a new Contract Revision, should show up as a single new rev with all the old info
        must(await unlockContract(client, contractA.id, cmsUser.id, 'unlocking A.0'))
        must(await submitContract(client, contractA.id, stateUser.id, 'Submitting A.1'))

        // Make a new Contract Revision, changing the connections should show up as a single new rev.
        must(await unlockContract(client, contractA.id, cmsUser.id, 'unlocking A.1'))
        must(await updateContractDraft(client, contractA.id, 'a.2 body', [rate3.id]))
        must(await submitContract(client, contractA.id, stateUser.id, 'Submitting A.2'))

        // Now, find that contract and assert the history is what we expected
        const resultingContract = await findContract(client, contractA.id)
        if (resultingContract instanceof Error) {
            throw resultingContract
        }

        const revisions = resultingContract.revisions

        console.info('ALL First REvisions: ', JSON.stringify(revisions, null, '  '))

        // Each Revision needs a Reason, one of the contracts or revisions associated with it should have changed and why.

        expect(revisions).toHaveLength(8)
        expect(revisions[0].rateRevisions).toHaveLength(0)
        expect(revisions[0].submitInfo?.updatedReason).toBe('initial submit')

        expect(revisions[1].rateRevisions).toHaveLength(1)
        expect(revisions[1].submitInfo?.updatedReason).toBe('Rate Submit')

        expect(revisions[2].rateRevisions).toHaveLength(2)
        expect(revisions[2].submitInfo?.updatedReason).toBe('RateSubmit 2')

        expect(revisions[3].rateRevisions).toHaveLength(3)
        expect(revisions[4].rateRevisions).toHaveLength(2)

        expect(revisions[5].rateRevisions).toHaveLength(2)
        expect(revisions[5].rateRevisions[1].revisionFormData).toBe('onepointone')
        expect(revisions[5].submitInfo?.updatedReason).toBe('1.1 new name')

        expect(revisions[6].rateRevisions).toHaveLength(2)
        expect(revisions[6].submitInfo?.updatedReason).toBe('Submitting A.1')

        expect(revisions[7].rateRevisions).toHaveLength(1)
        expect(revisions[7].contractFormData).toBe('a.2 body')
        expect(revisions[7].submitInfo?.updatedReason).toBe('Submitting A.2')

    })

    it('handles drafts correctly', async () =>  {
        
        const client = await sharedTestPrismaClient()

        const stateUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Aang',
                familyName: 'Avatar',
                email: 'aang@example.com',
                role: 'STATE_USER',
                stateCode: 'NM',
            }
        })

        const cmsUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Zuko',
                familyName: 'Hotman',
                email: 'zuko@example.com',
                role: 'CMS_USER',
            }
        })

        // Add 2 rates 1, 2
        const rate1 = must(await insertDraftRate(client, 'onepoint0'))
        must(await updateRateDraft(client, rate1.id, 'onepoint0', []))
        must(await submitRateRevision(client, rate1.id, stateUser.id, 'Rate Submit'))


        await delay(100)

        const rate2 = must(await insertDraftRate(client, 'twopointo'))
        must(await updateRateDraft(client, rate2.id, 'twopointo', []))
        must(await submitRateRevision(client, rate2.id, stateUser.id, 'Rate Submit 2'))

        await delay(100)

        // add a contract that has both of them. 
        const contractA = must(await insertDraftContract(client, 'one contract'))
        must(await updateContractDraft(client, contractA.id, 'one contract', [rate1.id, rate2.id]))
        must(await submitContract(client, contractA.id, stateUser.id, 'initial submit' ))

        await delay(100)

        // Unlock A, but don't resubmit it yet. 
        must(await unlockContract(client, contractA.id, cmsUser.id, 'unlock A Open'))

        await delay(100)
        
        // unlock and submit second rate rev
        must(await unlockRate(client, rate2.id, cmsUser.id, 'unlock for 2.1'))
        must(await updateRateDraft(client, rate2.id, 'twopointone', [contractA.id]))
        must(await submitRateRevision(client, rate2.id, stateUser.id, '2.1 update'))


        await delay(100)
        // submit A1, now, should show up as a single new rev and have the latest rates
        must (await submitContract(client, contractA.id, stateUser.id, 'third submit' ))

        // attempt a second submission, should result in an error.
        const contractA_1_Error = await submitContract(client, contractA.id, stateUser.id, 'third submit' )
        if (!(contractA_1_Error instanceof Error)) {
            throw new Error('Should be impossible to submit twice in a row.')
        }

        const res = await findContract(client, contractA.id)

        if (res instanceof Error) {
            throw res
        }

        const revisions = res.revisions

        console.info('ALL First REvisions: ', JSON.stringify(revisions, null, '  '))

        expect(revisions).toHaveLength(3)
        expect(revisions[0].rateRevisions).toHaveLength(2)
        expect(revisions[0].submitInfo?.updatedReason).toBe('initial submit')

        expect(revisions[1].rateRevisions).toHaveLength(2)
        expect(revisions[1].submitInfo?.updatedReason).toBe('2.1 update')

        expect(revisions[2].rateRevisions).toHaveLength(2)
        expect(revisions[2].submitInfo?.updatedReason).toBe('third submit')

        expect(revisions[2].rateRevisions.map(rr => rr.revisionFormData)).toStrictEqual(['onepoint0', 'twopointone'])

    })

    // get the current thing only, maybe ignoring the current draft

    // go from the other direction. find rate 

    // get draft?

})

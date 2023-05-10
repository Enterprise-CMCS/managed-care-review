import { sharedTestPrismaClient } from "../../testHelpers/storeHelpers"
import { v4 as uuidv4 } from 'uuid'
import { findContract } from "./findContract"
import { createRateRevision } from "./createRateRevision"
import { submitContract } from "./submitContract"
import { submitRateRevision } from "./submitRateRevision"
import { insertDraftContract } from "./insertContract"
import { unlockContract } from "./unlockContract"
import { updateContractDraft } from "./updateContractDraft"

async function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
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

        const contractADraft = await insertDraftContract(client, 'one contract')
        if (contractADraft instanceof Error) {
            throw contractADraft
        }
        const contractA = await submitContract(client, contractADraft.id, stateUser.id, 'initial submit' )
        if (contractA instanceof Error) {
            throw contractA
        }

        console.log('first contact', contractA)

        console.log('PAST FIRST CONTRACT')

        // Add 3 rates 1, 2, 3
        const rate1 = await client.rateTable.create({ data: { id: uuidv4()}})
        const rate1_0Draft = await createRateRevision(client, rate1.id, 'someurle.en', [contractA.id])
        if (rate1_0Draft instanceof Error) {
            throw rate1_0Draft
        }
        const rate1_0 = await submitRateRevision(client, rate1_0Draft.id, { updatedAt: new Date(), updatedBy: stateUser.id, updatedReason: 'Rate Submit' })
        if (rate1_0 instanceof Error) {
            throw rate1_0
        }

        await delay(100)

        const rate2 = await client.rateTable.create({ data: { id: uuidv4()}})
        const rate2_0Draft = await createRateRevision(client, rate2.id, 'twopointo', [contractA.id])
        if (rate2_0Draft instanceof Error) {
            throw rate2_0Draft
        }
        const rate2_0 = await submitRateRevision(client, rate2_0Draft.id, { updatedAt: new Date(), updatedBy: stateUser.id, updatedReason: 'RateSubmit 2' })
        if (rate2_0 instanceof Error) {
            throw rate2_0
        }

        await delay(100)

        const rate3 = await client.rateTable.create({ data: { id: uuidv4()}})
        const rate3_0Draft = await createRateRevision(client, rate3.id, 'threepointo', [contractA.id])
        if (rate3_0Draft instanceof Error) {
            throw rate3_0Draft
        }
        const rate3_0 = await submitRateRevision(client, rate3_0Draft.id, { updatedAt: new Date(), updatedBy: stateUser.id, updatedReason: '3.0 create' })
        if (rate3_0 instanceof Error) {
            throw rate3_0
        }

        console.log('RATE REV 3', rate3_0)
        // Remove 1 rate (2)

        await delay(100)

        const rate2_1Draft = await createRateRevision(client, rate2.id, 'twopointone', [])
        if (rate2_1Draft instanceof Error) {
            throw rate2_1Draft
        }
        const rate2_1 = await submitRateRevision(client, rate2_1Draft.id, { updatedAt: new Date(), updatedBy: stateUser.id, updatedReason: '2.1 remove' })
        if (rate2_1 instanceof Error) {
            throw rate2_1
        }

        await delay(100)

        // update rate 1 to have a new version, should make one new rev.
        const rate1_1Draft = await createRateRevision(client, rate1.id, 'onepointone', [contractA.id])
        if (rate1_1Draft instanceof Error) {
            throw rate1_1Draft
        }
        const rate1_1 = await submitRateRevision(client, rate1_1Draft.id, { updatedAt: new Date(), updatedBy: stateUser.id, updatedReason: '1.1 new name' })
        if (rate1_1 instanceof Error) {
            throw rate1_1
        }

        await delay(100)

        // Make a new Contract Revision, should show up as a single new rev with all the old info
        const contractA_1Draft = await unlockContract(client, contractA.id, cmsUser.id, 'unlocking A.0')
        if (contractA_1Draft instanceof Error) {
            throw contractA_1Draft
        }

        const contractA_1 = await submitContract(client, contractA.id, stateUser.id, 'Submitting A.1')
        if (contractA_1 instanceof Error) {
            throw contractA_1
        }

        // Make a new Contract Revision, changing the connections should show up as a single new rev.
        const contractA_2Draft = await unlockContract(client, contractA.id, cmsUser.id, 'unlocking A.1')
        if (contractA_2Draft instanceof Error) {
            throw contractA_2Draft
        }

        const updatedA_2Draft = await updateContractDraft(client, contractA.id, 'a.2 body', [rate3.id])
        if (updatedA_2Draft instanceof Error) {
            throw updatedA_2Draft
        }

        const contractA_2 = await submitContract(client, contractA.id, stateUser.id, 'Submitting A.2')
        if (contractA_2 instanceof Error) {
            throw contractA_2
        }

        const resultingContract = await findContract(client, contractA.id)

        if (resultingContract instanceof Error) {
            throw resultingContract
        }

        const revisions = resultingContract.revisions

        console.log('ALL First REvisions: ', JSON.stringify(revisions, null, '  '))

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

        console.log('RES', revisions)

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

        // Add 3 rates 1, 2
        const rate1 = await client.rateTable.create({ data: { id: uuidv4()}})
        const rate1_0Draft = await createRateRevision(client, rate1.id, 'onepoint0', [])
        if (rate1_0Draft instanceof Error) {
            throw rate1_0Draft
        }
        const rate1_0 = await submitRateRevision(client, rate1_0Draft.id, { updatedAt: new Date(), updatedBy: stateUser.id, updatedReason: 'Rate Submit' })
        if (rate1_0 instanceof Error) {
            throw rate1_0
        }

        await delay(100)

        const rate2 = await client.rateTable.create({ data: { id: uuidv4()}})
        const rate2_0Draft = await createRateRevision(client, rate2.id, 'twopointo', [])
        if (rate2_0Draft instanceof Error) {
            throw rate2_0Draft
        }
        const rate2_0 = await submitRateRevision(client, rate2_0Draft.id, { updatedAt: new Date(), updatedBy: stateUser.id, updatedReason: 'RateSubmit 2' })
        if (rate2_0 instanceof Error) {
            throw rate2_0
        }

        await delay(100)

        const contractADraft = await insertDraftContract(client, 'one contract')
        if (contractADraft instanceof Error) {
            throw contractADraft
        }

        const updatedADraft = await updateContractDraft(client, contractADraft.id, 'one contract', [rate1.id, rate2.id])

        const contractA = await submitContract(client, contractADraft.id, stateUser.id, 'initial submit' )
        if (contractA instanceof Error) {
            throw contractA
        }

        await delay(100)

        const unlockedA = await unlockContract(client, contractA.id, cmsUser.id, 'unlock A Open')
        if (unlockedA instanceof Error) {
            throw unlockedA
        }

        await delay(100)
        // submit second rate rev
        const rate2_1Draft = await createRateRevision(client, rate2.id, 'twopointone', [contractA.id])
        if (rate2_1Draft instanceof Error) {
            throw rate2_1Draft
        }
        const rate2_1 = await submitRateRevision(client, rate2_1Draft.id, { updatedAt: new Date(), updatedBy: stateUser.id, updatedReason: '2.1 update' })
        if (rate2_1 instanceof Error) {
            throw rate2_1
        }

        await delay(100)
        // submit A1, should show up as a single new rev.
        const contractA_1 = await submitContract(client, contractA.id, stateUser.id, 'third submit' )
        if (contractA_1 instanceof Error) {
            throw contractA_1
        }

        const res = await findContract(client, contractA.id)

        if (res instanceof Error) {
            throw res
        }

        console.log(JSON.stringify(res, undefined, '  '))

        // Each Revision needs a Reason, one of the contracts or revisions associated with it should have changed and why.

        const revisions = res.revisions

        expect(revisions).toHaveLength(3)
        expect(revisions[0].rateRevisions).toHaveLength(2)
        expect(revisions[0].submitInfo?.updatedReason).toBe('initial submit')

        expect(revisions[1].rateRevisions).toHaveLength(2)
        expect(revisions[1].submitInfo?.updatedReason).toBe('2.1 update')

        expect(revisions[2].rateRevisions).toHaveLength(2)
        expect(revisions[2].submitInfo?.updatedReason).toBe('third submit')

        expect(revisions[2].rateRevisions.map(rr => rr.revisionFormData)).toStrictEqual(['onepoint0', 'twopointone'])

        console.log('RES', revisions)

    })

    // get the current thing only, maybe ignoring the current draft

    // go from the other direction. find rate

    // Have a draft pointing to a draft and save both in serial. 

    // have a draft pointing to a real, create a draft on the real, save the second draft

    // can't submit an already submitted rev.

})

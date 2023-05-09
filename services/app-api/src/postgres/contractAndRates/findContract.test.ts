import { sharedTestPrismaClient } from "../../testHelpers/storeHelpers"
import { v4 as uuidv4 } from 'uuid'
import { findContractRevisions } from "./findContract"
import { createContractRevision } from "./createContractRevision"
import { createRateRevision } from "./createRateRevision"
import { submitContractRevision } from "./submitContractRevision"
import { submitRateRevision } from "./submitRateRevision"
import { insertDraftContract } from "./insertContract"

async function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

describe('findContract', () => {

    it('finds a full contract', async () =>  {

        const client = await sharedTestPrismaClient()

        const contractADraft = await insertDraftContract(client, 'one contract', [])
        if (contractADraft instanceof Error) {
            throw contractADraft
        }
        const contractA_0ID = contractADraft.revisions[0].id

        const contractA_0 = await submitContractRevision(client, contractA_0ID, { updatedAt: new Date(), updatedBy: 'foo user', updatedReason: 'initial submit' })
        if (contractA_0 instanceof Error) {
            throw contractA_0
        }

        console.log('first contact', contractA_0)

        console.log('PAST FIRST CONTRACT')

        // Add 3 rates 1, 2, 3
        const rate1 = await client.rateTable.create({ data: { id: uuidv4()}})
        const rate1_0Draft = await createRateRevision(client, rate1.id, 'someurle.en', [contractADraft.id])
        if (rate1_0Draft instanceof Error) {
            throw rate1_0Draft
        }
        const rate1_0 = await submitRateRevision(client, rate1_0Draft.id, { updatedAt: new Date(), updatedBy: 'foo user', updatedReason: 'Rate Submit' })
        if (rate1_0 instanceof Error) {
            throw rate1_0
        }

        await delay(100)

        const rate2 = await client.rateTable.create({ data: { id: uuidv4()}})
        const rate2_0Draft = await createRateRevision(client, rate2.id, 'twopointo', [contractADraft.id])
        if (rate2_0Draft instanceof Error) {
            throw rate2_0Draft
        }
        const rate2_0 = await submitRateRevision(client, rate2_0Draft.id, { updatedAt: new Date(), updatedBy: 'foo user', updatedReason: 'RateSubmit 2' })
        if (rate2_0 instanceof Error) {
            throw rate2_0
        }

        await delay(100)

        const rate3 = await client.rateTable.create({ data: { id: uuidv4()}})
        const rate3_0Draft = await createRateRevision(client, rate3.id, 'threepointo', [contractADraft.id])
        if (rate3_0Draft instanceof Error) {
            throw rate3_0Draft
        }
        const rate3_0 = await submitRateRevision(client, rate3_0Draft.id, { updatedAt: new Date(), updatedBy: 'foo user', updatedReason: '3.0 create' })
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
        const rate2_1 = await submitRateRevision(client, rate2_1Draft.id, { updatedAt: new Date(), updatedBy: 'foo user', updatedReason: '2.1 remove' })
        if (rate2_1 instanceof Error) {
            throw rate2_1
        }

        await delay(100)

        // update rate 1 to have a new version, should make one new rev.
        const rate1_1Draft = await createRateRevision(client, rate1.id, 'onepointone', [contractADraft.id])
        if (rate1_1Draft instanceof Error) {
            throw rate1_1Draft
        }
        const rate1_1 = await submitRateRevision(client, rate1_1Draft.id, { updatedAt: new Date(), updatedBy: 'foo user', updatedReason: '1.1 new name' })
        if (rate1_1 instanceof Error) {
            throw rate1_1
        }

        await delay(100)

        // Make a new Contract Revision, should show up as a single new rev.
        const contractA_1Draft = await createContractRevision(client, contractADraft.id, 'one contract dot one', [rate1.id, rate3.id])
        if (contractA_1Draft instanceof Error) {
            throw contractA_1Draft
        }
        const contractA_1 = await submitContractRevision(client, contractA_1Draft.id, { updatedAt: new Date(), updatedBy: 'foo user', updatedReason: 'third submit' })
        if (contractA_1 instanceof Error) {
            throw contractA_1
        }

        const res = await findContractRevisions(client, contractADraft.id)

        if (res instanceof Error) {
            throw res
        }

        // Each Revision needs a Reason, one of the contracts or revisions associated with it should have changed and why.

        expect(res).toHaveLength(7)
        expect(res[0].rateRevisions).toHaveLength(0)
        expect(res[0].submitInfo?.updatedReason).toBe('initial submit')

        expect(res[1].rateRevisions).toHaveLength(1)
        expect(res[1].submitInfo?.updatedReason).toBe('Rate Submit')

        expect(res[2].rateRevisions).toHaveLength(2)
        expect(res[2].submitInfo?.updatedReason).toBe('RateSubmit 2')

        expect(res[3].rateRevisions).toHaveLength(3)
        expect(res[4].rateRevisions).toHaveLength(2)

        expect(res[5].rateRevisions).toHaveLength(2)
        expect(res[5].rateRevisions[1].revisionFormData).toBe('onepointone')
        expect(res[5].submitInfo?.updatedReason).toBe('1.1 new name')

        expect(res[6].rateRevisions).toHaveLength(2)
        expect(res[6].submitInfo?.updatedReason).toBe('third submit')

        console.log('RES', res)

    })

    it('handles drafts correctly', async () =>  {

        const client = await sharedTestPrismaClient()

        // Add 3 rates 1, 2
        const rate1 = await client.rateTable.create({ data: { id: uuidv4()}})
        const rate1_0Draft = await createRateRevision(client, rate1.id, 'onepoint0', [])
        if (rate1_0Draft instanceof Error) {
            throw rate1_0Draft
        }
        const rate1_0 = await submitRateRevision(client, rate1_0Draft.id, { updatedAt: new Date(), updatedBy: 'foo user', updatedReason: 'Rate Submit' })
        if (rate1_0 instanceof Error) {
            throw rate1_0
        }

        await delay(100)

        const rate2 = await client.rateTable.create({ data: { id: uuidv4()}})
        const rate2_0Draft = await createRateRevision(client, rate2.id, 'twopointo', [])
        if (rate2_0Draft instanceof Error) {
            throw rate2_0Draft
        }
        const rate2_0 = await submitRateRevision(client, rate2_0Draft.id, { updatedAt: new Date(), updatedBy: 'foo user', updatedReason: 'RateSubmit 2' })
        if (rate2_0 instanceof Error) {
            throw rate2_0
        }

        await delay(100)

        const contractA = await client.contractTable.create({ data: { id: uuidv4() }})
        const contractA_0Draft = await createContractRevision(client, contractA.id, 'one contract', [rate1.id, rate2.id])
        if (contractA_0Draft instanceof Error) {
            throw contractA_0Draft
        }
        const contractA_0 = await submitContractRevision(client, contractA_0Draft.id, { updatedAt: new Date(), updatedBy: 'foo user', updatedReason: 'initial submit' })
        if (contractA_0 instanceof Error) {
            throw contractA_0
        }

        console.log('first contact', contractA_0)

        // make new draft for contract and one rate
        await delay(100)
        const contractA_1Draft = await createContractRevision(client, contractA.id, 'one contract dot one', [rate1.id, rate2.id])
        if (contractA_1Draft instanceof Error) {
            throw contractA_1Draft
        }

        await delay(100)
        // submit second rate rev
        const rate2_1Draft = await createRateRevision(client, rate2.id, 'twopointone', [contractA.id])
        if (rate2_1Draft instanceof Error) {
            throw rate2_1Draft
        }
        const rate2_1 = await submitRateRevision(client, rate2_1Draft.id, { updatedAt: new Date(), updatedBy: 'foo user', updatedReason: '2.1 update' })
        if (rate2_1 instanceof Error) {
            throw rate2_1
        }

        await delay(100)
        // submit A1, should show up as a single new rev.
        const contractA_1 = await submitContractRevision(client, contractA_1Draft.id, { updatedAt: new Date(), updatedBy: 'foo user', updatedReason: 'third submit' })
        if (contractA_1 instanceof Error) {
            throw contractA_1
        }

        const res = await findContractRevisions(client, contractA.id)

        if (res instanceof Error) {
            throw res
        }

        console.log(JSON.stringify(res, undefined, '  '))

        // Each Revision needs a Reason, one of the contracts or revisions associated with it should have changed and why.

        expect(res).toHaveLength(3)
        expect(res[0].rateRevisions).toHaveLength(2)
        expect(res[0].submitInfo?.updatedReason).toBe('initial submit')

        expect(res[1].rateRevisions).toHaveLength(2)
        expect(res[1].submitInfo?.updatedReason).toBe('2.1 update')

        expect(res[2].rateRevisions).toHaveLength(2)
        expect(res[2].submitInfo?.updatedReason).toBe('third submit')

        expect(res[2].rateRevisions.map(rr => rr.revisionFormData)).toStrictEqual(['onepoint0', 'twopointone'])

        console.log('RES', res)

    })

    // get the current thing only, maybe ignoring the current draft

    // go from the other direction. find rate

    // Have a draft pointing to a draft and save both in serial. 

    // have a draft pointing to a real, create a draft on the real, save the second draft

    // can't submit an already submitted rev.

})

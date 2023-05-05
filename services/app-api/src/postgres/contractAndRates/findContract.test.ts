import { sharedTestPrismaClient } from "../../testHelpers/storeHelpers"
import { v4 as uuidv4 } from 'uuid'
import { findContractRevisions } from "./findContract"
import { createContractRevision } from "./createContractRevision"
import { createRateRevision } from "./createRateRevision"
import { submitContractRevision } from "./submitContractRevision"
import { submitRateRevision } from "./submitRateRevision"

async function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

describe('findContract', () => {

    it('finds a full contract', async () =>  {

        const client = await sharedTestPrismaClient()

        const contractA = await client.contractTable.create({ data: { id: uuidv4() }})
        const contractA_0Draft = await createContractRevision(client, contractA.id, 'one contract', [])
        if (contractA_0Draft instanceof Error) {
            throw contractA_0Draft
        }
        const contractA_0 = await submitContractRevision(client, contractA_0Draft.id, { updatedAt: new Date(), updatedBy: 'foo user', updatedReason: 'initial submit' })
        if (contractA_0 instanceof Error) {
            throw contractA_0
        }

        console.log('first contact', contractA_0)

        console.log('PAST FIRST CONTRACT')

        // Add 3 rates 1, 2, 3
        const rate1 = await client.rateTable.create({ data: { id: uuidv4()}})
        const rate1_0Draft = await createRateRevision(client, rate1.id, 'someurle.en', [contractA_0.id])
        if (rate1_0Draft instanceof Error) {
            throw rate1_0Draft
        }
        const rate1_0 = await submitRateRevision(client, rate1_0Draft.id, { updatedAt: new Date(), updatedBy: 'foo user', updatedReason: 'Rate Submit' })
        if (rate1_0 instanceof Error) {
            throw rate1_0
        }

        await delay(100)

        const rate2 = await client.rateTable.create({ data: { id: uuidv4()}})
        const rate2_0Draft = await createRateRevision(client, rate2.id, 'twopointo', [contractA_0.id])
        if (rate2_0Draft instanceof Error) {
            throw rate2_0Draft
        }
        const rate2_0 = await submitRateRevision(client, rate2_0Draft.id, { updatedAt: new Date(), updatedBy: 'foo user', updatedReason: 'RateSubmit 2' })
        if (rate2_0 instanceof Error) {
            throw rate2_0
        }

        await delay(100)

        const rate3 = await client.rateTable.create({ data: { id: uuidv4()}})
        const rate3_0Draft = await createRateRevision(client, rate3.id, 'threepointo', [contractA_0.id])
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

        // TODO: update rate 1 to have a new version, should make one new rev.

        // Make a new Contract Revision, should show up as a single new rev.
        const contractA_1Draft = await createContractRevision(client, contractA.id, 'one contract dot one', [rate1_0.id, rate3_0.id])
        if (contractA_1Draft instanceof Error) {
            throw contractA_1Draft
        }
        const contractA_1 = await submitContractRevision(client, contractA_1Draft.id, { updatedAt: new Date(), updatedBy: 'foo user', updatedReason: 'third submit' })
        if (contractA_1 instanceof Error) {
            throw contractA_1
        }

        const res = await findContractRevisions(client, contractA.id)

        if (res instanceof Error) {
            throw res
        }

        // Each Revision needs a Reason, one of the contracts or revisions associated with it should have changed and why.

        expect(res).toHaveLength(6)
        expect(res[0].rateRevisions).toHaveLength(0)
        expect(res[0].submitInfo?.updatedReason).toBe('initial submit')

        expect(res[1].rateRevisions).toHaveLength(1)
        expect(res[1].submitInfo?.updatedReason).toBe('Rate Submit')

        expect(res[2].rateRevisions).toHaveLength(2)
        expect(res[2].submitInfo?.updatedReason).toBe('RateSubmit 2')

        expect(res[3].rateRevisions).toHaveLength(3)
        expect(res[4].rateRevisions).toHaveLength(2)

        expect(res[5].rateRevisions).toHaveLength(2)
        expect(res[5].submitInfo?.updatedReason).toBe('third submit')

        console.log('RES', res)

    })

    // get the current thing only, maybe ignoring the current draft
    // get the 

    // Have a draft pointing to a draft and save both in serial. 

    // have a draft pointing to a real, create a draft on the real, save the second draft

    // can't submit an already submitted rev.

    // it('handles a second contract rev', async () =>  {

    //     const client = await sharedTestPrismaClient()

    //     const contractA = await client.contractTable.create({ data: { id: uuidv4() }})
    //     const contractA_0 = await client.contractRevisionTable.create({ 
    //         data: { 
    //             id: uuidv4(), 
    //             contract: {
    //                 connect: {
    //                     id: contractA.id,
    //                 }
    //             }, 
    //             name: 'A.0',
    //             draftFormData: {
    //                 create: {
    //                     id: uuidv4(),
    //                     startDate: new Date(),
    //                     endDate: new Date(),
    //                     contractDescription: 'one contract',
    //                     submissionType: 'CONTRACT_ONLY',
    //                     federalAuthorities: ['WAIVER_1915B', 'VOLUNTARY'],
    //                     modifiedGeoAreaServed: true,
    //                     contractDocuments: {
    //                         create: {
    //                             id: uuidv4(),
    //                             s3url: 'foo://bar',
    //                             title: 'someDoc',
    //                         }
    //                     },
    //                     additionalDocuments: {
    //                         create: [
    //                         {
    //                             id: uuidv4(),
    //                             s3url: 'foo://baz',
    //                             title: 'adddoc',
    //                         },
    //                         {
    //                             id: uuidv4(),
    //                             s3url: 'foo://foo',
    //                             title: 'addadddoc',
    //                         }]
    //                     }

    //                 }
    //             }
    //         }
    //     })

    //     // Add 3 rates 1, 2, 3
    //     const rate1 = await client.rateTable.create({ data: { id: uuidv4()}})
    //     const rate1_0 = await client.rateRevisionTable.create({
    //         data: {
    //             id: uuidv4(), 
    //             rateID: rate1.id, 
    //             name: '1.0', 
    //             rateCertURL: 'someurle.en',
    //             contractRevisions: {
    //                 create: {
    //                     contractRevisionID: contractA_0.id,
    //                     validAfter: new Date(2022,1,1),
    //                 }
    //             }
    //         }
    //     })
    //     const rate2 = await client.rateTable.create({ data: { id: uuidv4()}})
    //     const rate2_0 = await client.rateRevisionTable.create({
    //         data: {
    //             id: uuidv4(), 
    //             rateID: rate2.id, 
    //             name: '2.0', 
    //             rateCertURL: 'twopointo',
    //             contractRevisions: {
    //                 create: {
    //                     contractRevisionID: contractA_0.id,
    //                     validAfter: new Date(2022,1,2)
    //                 }
    //             }
    //         },
    //         include: {
    //             contractRevisions: true
    //         }
    //     })
    //     const rate3 = await client.rateTable.create({ data: { id: uuidv4()}})
    //     const rate3_0 = await client.rateRevisionTable.create({
    //         data: {
    //             id: uuidv4(), 
    //             rateID: rate3.id, 
    //             name: '3.0', 
    //             rateCertURL: 'threepointo',
    //             contractRevisions: {
    //                 create: {
    //                     contractRevisionID: contractA_0.id,
    //                     validAfter: new Date(2022,1,3)
    //                 }
    //             }
    //         },
    //         include: {
    //             contractRevisions: true
    //         }
    //     })
    //     console.log('RATE REV 3', rate3_0)
    //     // Remove 1 rate (2)
    //     const join2_1 = rate2_0.contractRevisions[0]
    //     await client.rateRevisionsOnContractRevisionsTable.update({
    //         where: {
    //             rateRevisionID_contractRevisionID_validAfter: {
    //                 rateRevisionID: join2_1.rateRevisionID, 
    //                 contractRevisionID: join2_1.contractRevisionID, 
    //                 validAfter: join2_1.validAfter,
    //             }
    //         },
    //         data: {
    //             validUntil: new Date(2022,1,4)
    //         },
    //     })


    //     const contractA_1 = await client.contractRevisionTable.create({ 
    //         data: { 
    //             id: uuidv4(), 
    //             contract: {
    //                 connect: {
    //                     id: contractA.id,
    //                 }
    //             }, 
    //             name: 'A.0',
    //             rateRevisions: {
    //                 createMany: {
    //                     data: [
    //                         {
    //                             rateRevisionID: rate3_0.id,
    //                         },
    //                         {
    //                             rateRevisionID: rate1_0.id,
    //                         },
    //                     ]
    //                 }
    //             },
    //             draftFormData: {
    //                 create: {
    //                     id: uuidv4(),
    //                     startDate: new Date(),
    //                     endDate: new Date(),
    //                     contractDescription: 'two contract',
    //                     submissionType: 'CONTRACT_ONLY',
    //                     federalAuthorities: ['WAIVER_1915B', 'VOLUNTARY'],
    //                     modifiedGeoAreaServed: true,
    //                     contractDocuments: {
    //                         create: {
    //                             id: uuidv4(),
    //                             s3url: 'foo://bar',
    //                             title: 'someDoc',
    //                         }
    //                     },
    //                     additionalDocuments: {
    //                         create: [
    //                         {
    //                             id: uuidv4(),
    //                             s3url: 'foo://baz',
    //                             title: 'adddoc',
    //                         },
    //                         {
    //                             id: uuidv4(),
    //                             s3url: 'foo://foo',
    //                             title: 'addadddoc',
    //                         }]
    //                     }

    //                 }
    //             }
    //         }
    //     })


    //     const res = await findContractRevisions(client, contractA.id)

    //     if (res instanceof Error) {
    //         throw res
    //     }

    //     expect(res).toHaveLength(5)
    //     expect(res[0].rateRevisions).toHaveLength(1)
    //     expect(res[0].contractFormData).toBe('one contract')

    //     expect(res[1].rateRevisions).toHaveLength(2)
    //     expect(res[2].rateRevisions).toHaveLength(3)
    //     expect(res[3].rateRevisions).toHaveLength(2)

    //     expect(res[4].rateRevisions).toHaveLength(2)
    //     expect(res[4].contractFormData).toBe('two contract')


    //     console.log('RES', res)

    // })

})

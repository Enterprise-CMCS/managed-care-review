import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { v4 as uuidv4 } from 'uuid'
import { findContractWithHistory } from './findContractWithHistory'
import { submitContract } from './submitContract'
import { submitRate } from './submitRate'
import { insertDraftContract } from './insertContract'
import { unlockContract } from './unlockContract'
import { updateDraftContract } from './updateDraftContract'
import { insertDraftRate } from './insertRate'
import { updateDraftRate } from './updateDraftRate'
import { unlockRate } from './unlockRate'
import { findRateWithHistory } from './findRateWithHistory'
import { must, createInsertContractData } from '../../testHelpers'
import { updateDraftContractRates } from './updateDraftContractRates'
import { createInsertRateData } from '../../testHelpers/contractAndRates/rateHelpers'
import type { DraftContractType } from '../../domain-models/contractAndRates'

describe('findContract', () => {
    it('finds a stripped down contract with history', async () => {
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

        // setup a single test contract
        const draftContractData = createInsertContractData({
            submissionDescription: 'one contract',
        })
        const contractA = must(
            await insertDraftContract(client, draftContractData)
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
        const rate1 = must(
            await insertDraftRate(client, {
                stateCode: 'MN',
                rateCertificationName: 'someurle.en',
            })
        )
        must(
            await updateDraftRate(client, {
                rateID: rate1.id,
                formData: { rateCertificationName: 'someurle.en' },
                contractIDs: [contractA.id],
            })
        )
        must(await submitRate(client, rate1.id, stateUser.id, 'Rate Submit'))

        const rate2 = must(
            await insertDraftRate(client, {
                stateCode: 'MN',
                rateCertificationName: 'twopointo',
            })
        )
        must(
            await updateDraftRate(client, {
                rateID: rate2.id,
                formData: { rateCertificationName: 'twopointo' },
                contractIDs: [contractA.id],
            })
        )
        must(await submitRate(client, rate2.id, stateUser.id, 'RateSubmit 2'))

        const rate3 = must(
            await insertDraftRate(client, {
                stateCode: 'MN',
                rateCertificationName: 'threepointo',
            })
        )
        must(
            await updateDraftRate(client, {
                rateID: rate3.id,
                formData: { rateCertificationName: 'threepointo' },
                contractIDs: [contractA.id],
            })
        )
        must(await submitRate(client, rate3.id, stateUser.id, '3.0 create'))

        // Now, find that contract and assert the history is what we expected
        const threeContract = must(
            await findContractWithHistory(client, contractA.id)
        )
        if (threeContract instanceof Error) {
            throw threeContract
        }
        expect(threeContract.revisions).toHaveLength(4)

        // remove the connection from rate 2
        must(
            await unlockRate(
                client,
                rate2.id,
                cmsUser.id,
                'unlock for 2.1 remove'
            )
        )
        must(
            await updateDraftRate(client, {
                rateID: rate2.id,
                formData: { rateCertificationName: 'twopointone' },
                contractIDs: [],
            })
        )
        must(await submitRate(client, rate2.id, stateUser.id, '2.1 remove'))

        // Now, find that contract and assert the history is what we expected
        const twoContract = must(
            await findContractWithHistory(client, contractA.id)
        )
        if (twoContract instanceof Error) {
            throw twoContract
        }
        expect(twoContract.revisions).toHaveLength(5)
        expect(twoContract.revisions[0].rateRevisions).toHaveLength(2)

        // update rate 1 to have a new version, should make one new rev.
        must(await unlockRate(client, rate1.id, cmsUser.id, 'unlock for 1.1'))
        must(
            await updateDraftRate(client, {
                rateID: rate1.id,
                formData: { rateCertificationName: 'onepointone' },
                contractIDs: [contractA.id],
            })
        )
        must(await submitRate(client, rate1.id, stateUser.id, '1.1 new name'))

        // Now, find that contract and assert the history is what we expected
        const backAgainContract = must(
            await findContractWithHistory(client, contractA.id)
        )
        if (backAgainContract instanceof Error) {
            throw backAgainContract
        }
        expect(backAgainContract.revisions).toHaveLength(6)

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
            await submitContract(
                client,
                contractA.id,
                stateUser.id,
                'Submitting A.1'
            )
        )

        // Now, find that contract and assert the history is what we expected
        let testingContract = must(
            await findContractWithHistory(client, contractA.id)
        )
        if (testingContract instanceof Error) {
            throw testingContract
        }
        expect(testingContract.revisions).toHaveLength(7)

        // Make a new Contract Revision, changing the connections should show up as a single new rev.
        must(
            await unlockContract(
                client,
                contractA.id,
                cmsUser.id,
                'unlocking A.1'
            )
        )
        const updatedDraftContract = must(
            await updateDraftContract(client, {
                contractID: contractA.id,
                formData: {
                    submissionType: 'CONTRACT_AND_RATES',
                    submissionDescription: 'a.2 body',
                    contractType: 'BASE',
                    programIDs: ['PMAP'],
                    populationCovered: 'MEDICAID',
                    riskBasedContract: false,
                },
            })
        ) as DraftContractType

        // Remove rate 1 and rate 2 from contract
        must(
            await updateDraftContractRates(client, {
                draftContract: updatedDraftContract,
                disconnectRates: [rate1.id, rate2.id],
            })
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
        testingContract = must(
            await findContractWithHistory(client, contractA.id)
        )
        if (testingContract instanceof Error) {
            throw testingContract
        }
        expect(testingContract.revisions).toHaveLength(8)

        // Now, find that contract and assert the history is what we expected
        const resultingContract = must(
            await findContractWithHistory(client, contractA.id)
        )
        if (resultingContract instanceof Error) {
            throw resultingContract
        }

        const revisionsInTimeOrder = resultingContract.revisions.reverse()

        console.info(
            'ALL First REvisions: ',
            JSON.stringify(revisionsInTimeOrder, null, '  ')
        )

        // Each Revision needs a Reason, one of the contracts or revisions associated with it should have changed and why.

        expect(revisionsInTimeOrder).toHaveLength(8)
        expect(revisionsInTimeOrder[0].rateRevisions).toHaveLength(0)
        expect(revisionsInTimeOrder[0].unlockInfo).toBeUndefined()
        expect(revisionsInTimeOrder[0].submitInfo?.updatedReason).toBe(
            'initial submit'
        )

        expect(revisionsInTimeOrder[1].rateRevisions).toHaveLength(1)
        expect(revisionsInTimeOrder[1].unlockInfo).toBeUndefined()
        expect(revisionsInTimeOrder[1].submitInfo?.updatedReason).toBe(
            'Rate Submit'
        )

        expect(revisionsInTimeOrder[2].rateRevisions).toHaveLength(2)
        expect(revisionsInTimeOrder[2].unlockInfo).toBeUndefined()
        expect(revisionsInTimeOrder[2].submitInfo?.updatedReason).toBe(
            'RateSubmit 2'
        )

        expect(revisionsInTimeOrder[3].rateRevisions).toHaveLength(3)
        expect(revisionsInTimeOrder[3].unlockInfo).toBeUndefined()
        expect(revisionsInTimeOrder[3].submitInfo?.updatedReason).toBe(
            '3.0 create'
        )

        expect(revisionsInTimeOrder[4].rateRevisions).toHaveLength(2)
        expect(revisionsInTimeOrder[4].unlockInfo?.updatedReason).toBe(
            'unlock for 2.1 remove'
        )
        expect(revisionsInTimeOrder[4].unlockInfo?.updatedBy).toBe(
            'zuko@example.com'
        )
        expect(revisionsInTimeOrder[4].submitInfo?.updatedReason).toBe(
            '2.1 remove'
        )

        expect(revisionsInTimeOrder[5].rateRevisions).toHaveLength(2)
        expect(
            revisionsInTimeOrder[5].rateRevisions[1].formData
                .rateCertificationName
        ).toBe('onepointone')
        expect(revisionsInTimeOrder[5].unlockInfo?.updatedReason).toBe(
            'unlock for 1.1'
        )
        expect(revisionsInTimeOrder[5].submitInfo?.updatedReason).toBe(
            '1.1 new name'
        )

        expect(revisionsInTimeOrder[6].rateRevisions).toHaveLength(2)
        expect(revisionsInTimeOrder[6].submitInfo?.updatedReason).toBe(
            'Submitting A.1'
        )

        expect(revisionsInTimeOrder[7].rateRevisions).toHaveLength(1)
        expect(revisionsInTimeOrder[7].formData).toEqual(
            expect.objectContaining({
                submissionType: 'CONTRACT_AND_RATES',
                submissionDescription: 'a.2 body',
            })
        )
        expect(revisionsInTimeOrder[7].submitInfo?.updatedReason).toBe(
            'Submitting A.2'
        )

        // check for rate and see if it handles the removed bit right

        const rate1fetched = await findRateWithHistory(client, rate1.id)
        if (rate1fetched instanceof Error) {
            throw rate1fetched
        }

        expect(rate1fetched.revisions).toHaveLength(4)
        expect(rate1fetched.revisions[0].submitInfo?.updatedReason).toBe(
            'Submitting A.2'
        )
    })

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

        // setup a single test contract
        const draftContractData = createInsertContractData({
            submissionDescription: 'one contract',
        })
        const contractA = must(
            await insertDraftContract(client, draftContractData)
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
        const rate1 = must(
            await insertDraftRate(client, {
                stateCode: 'MN',
                rateCertificationName: 'someurle.en',
            })
        )
        must(
            await updateDraftRate(
                client,

                {
                    rateID: rate1.id,
                    formData: { rateCertificationName: 'someurle.en' },
                    contractIDs: [contractA.id],
                }
            )
        )
        must(await submitRate(client, rate1.id, stateUser.id, 'Rate Submit'))

        const rate2 = must(
            await insertDraftRate(client, {
                stateCode: 'MN',
                rateCertificationName: 'twopointo',
            })
        )
        must(
            await updateDraftRate(client, {
                rateID: rate2.id,
                formData: { rateCertificationName: 'twopointone' },
                contractIDs: [contractA.id],
            })
        )
        must(await submitRate(client, rate2.id, stateUser.id, 'RateSubmit 2'))

        const rate3 = must(
            await insertDraftRate(client, {
                stateCode: 'MN',
                rateCertificationName: 'threepointo',
            })
        )
        must(
            await updateDraftRate(client, {
                rateID: rate3.id,
                formData: { rateCertificationName: 'threepointo' },
                contractIDs: [contractA.id],
            })
        )
        must(await submitRate(client, rate3.id, stateUser.id, '3.0 create'))

        // remove the connection from rate 2
        must(
            await unlockRate(
                client,
                rate2.id,
                cmsUser.id,
                'unlock for 2.1 remove'
            )
        )
        must(
            await updateDraftRate(client, {
                rateID: rate2.id,
                formData: { rateCertificationName: 'twopointone' },
                contractIDs: [],
            })
        )
        must(await submitRate(client, rate2.id, stateUser.id, '2.1 remove'))

        // update rate 1 to have a new version, should make one new rev.
        must(await unlockRate(client, rate1.id, cmsUser.id, 'unlock for 1.1'))
        must(
            await updateDraftRate(client, {
                rateID: rate1.id,
                formData: { rateCertificationName: 'onepointone' },
                contractIDs: [contractA.id],
            })
        )
        must(await submitRate(client, rate1.id, stateUser.id, '1.1 new name'))

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
        const updatedDraftContract = must(
            await updateDraftContract(client, {
                contractID: contractA.id,
                formData: {
                    submissionType: 'CONTRACT_AND_RATES',
                    submissionDescription: 'a.2 body',
                    contractType: 'BASE',
                    programIDs: ['PMAP'],
                    populationCovered: 'MEDICAID',
                    riskBasedContract: false,
                },
            })
        ) as DraftContractType

        // Remove rate 1 and rate 2 from contract
        must(
            await updateDraftContractRates(client, {
                draftContract: updatedDraftContract,
                disconnectRates: [rate1.id, rate2.id],
            })
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
        const resultingContract = must(
            await findContractWithHistory(client, contractA.id)
        )
        if (resultingContract instanceof Error) {
            throw resultingContract
        }

        const revisions = resultingContract.revisions.reverse()

        console.info(
            'ALL First REvisions: ',
            JSON.stringify(revisions, null, '  ')
        )

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
        expect(
            revisions[5].rateRevisions[1].formData.rateCertificationName
        ).toBe('onepointone')
        expect(revisions[5].submitInfo?.updatedReason).toBe('1.1 new name')

        expect(revisions[6].rateRevisions).toHaveLength(2)
        expect(revisions[6].submitInfo?.updatedReason).toBe('Submitting A.1')

        expect(revisions[7].rateRevisions).toHaveLength(1)
        expect(revisions[7].formData).toEqual(
            expect.objectContaining({
                submissionType: 'CONTRACT_AND_RATES',
                submissionDescription: 'a.2 body',
            })
        )
        expect(revisions[7].submitInfo?.updatedReason).toBe('Submitting A.2')

        // check for rate and see if it handles the removed bit right

        const rate1fetched = await findRateWithHistory(client, rate1.id)
        if (rate1fetched instanceof Error) {
            throw rate1fetched
        }

        expect(rate1fetched.revisions).toHaveLength(4)
        expect(rate1fetched.revisions[0].submitInfo?.updatedReason).toBe(
            'Submitting A.2'
        )
    })

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

        const cmsUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Zuko',
                familyName: 'Hotman',
                email: 'zuko@example.com',
                role: 'CMS_USER',
            },
        })

        const rate1 = createInsertRateData({
            stateCode: 'MN',
            rateCertificationName: 'onepoint0',
        })

        const rate2 = createInsertRateData({
            stateCode: 'MN',
            rateCertificationName: 'twopoint0',
        })

        // add a contract that has both of them.
        const draftContractData = createInsertContractData({
            submissionDescription: 'one contract',
        })
        const contractA = must(
            await insertDraftContract(client, draftContractData)
        )
        const updatedDraftContract = must(
            await updateDraftContract(client, {
                contractID: contractA.id,
                formData: {
                    submissionType: 'CONTRACT_AND_RATES',
                    submissionDescription: 'one contract',
                    contractType: 'BASE',
                    programIDs: ['PMAP'],
                    populationCovered: 'MEDICAID',
                    riskBasedContract: false,
                },
            })
        ) as DraftContractType

        // Add rate 1 and rate 2 to contract
        const updatedDraftContractWithRates = must(
            await updateDraftContractRates(client, {
                draftContract: updatedDraftContract,
                connectOrCreate: [rate1, rate2],
            })
        )

        if (!updatedDraftContractWithRates.draftRevision) {
            throw new Error(
                'Unexpected error: draftRevision does not exist in contract'
            )
        }

        const draftRateRevisionData1 =
            updatedDraftContractWithRates.draftRevision.rateRevisions[0]
                .formData
        const draftRateRevisionData2 =
            updatedDraftContractWithRates.draftRevision.rateRevisions[1]
                .formData

        if (!draftRateRevisionData1.rateID || !draftRateRevisionData2.rateID) {
            throw new Error('Unexpected error: rate revision is missing rateID')
        }

        // submit both rates
        must(
            await submitRate(
                client,
                draftRateRevisionData1.rateID,
                stateUser.id,
                'Rate Submit'
            )
        )
        const submittedRate2 = must(
            await submitRate(
                client,
                draftRateRevisionData2.rateID,
                stateUser.id,
                'Rate Submit 2'
            )
        )

        // submit contract
        must(
            await submitContract(
                client,
                contractA.id,
                stateUser.id,
                'initial submit'
            )
        )

        // Unlock contract A, but don't resubmit it yet.
        must(
            await unlockContract(
                client,
                contractA.id,
                cmsUser.id,
                'unlock A Open'
            )
        )

        // Draft should pull revision 2.0 out
        const draftPreRateUnlock = must(
            await findContractWithHistory(client, contractA.id)
        )
        expect(draftPreRateUnlock.draftRevision).toBeDefined()
        expect(
            draftPreRateUnlock.draftRevision?.rateRevisions.map(
                (rr) => rr.formData.rateCertificationName
            )
        ).toEqual(['onepoint0', 'twopoint0'])

        // unlock and submit second rate rev
        must(
            await unlockRate(
                client,
                submittedRate2.id,
                cmsUser.id,
                'unlock for 2.1'
            )
        )
        must(
            await updateDraftRate(client, {
                rateID: submittedRate2.id,
                formData: { rateCertificationName: 'twopointone' },
                contractIDs: [contractA.id],
            })
        )

        // Draft should now pull draft revision 2.1 out, even though its unsubmitted
        const draftPreRateSubmit = must(
            await findContractWithHistory(client, contractA.id)
        )
        expect(draftPreRateSubmit.draftRevision).toBeDefined()
        expect(
            draftPreRateSubmit.draftRevision?.rateRevisions.map(
                (rr) => rr.formData.rateCertificationName
            )
        ).toEqual(['onepoint0', 'twopointone'])

        // Submit Rate 2.1
        must(
            await submitRate(
                client,
                submittedRate2.id,
                stateUser.id,
                '2.1 update'
            )
        )

        // raft should still pull revision 2.1 out
        const draftPostRateSubmit = must(
            await findContractWithHistory(client, contractA.id)
        )
        expect(draftPostRateSubmit.draftRevision).toBeDefined()
        expect(
            draftPostRateSubmit.draftRevision?.rateRevisions.map(
                (rr) => rr.formData.rateCertificationName
            )
        ).toEqual(['onepoint0', 'twopointone'])

        // submit contract A1, now, should show up as a single new rev and have the latest rates
        must(
            await submitContract(
                client,
                contractA.id,
                stateUser.id,
                'third submit'
            )
        )

        // attempt a second submission, should result in an error.
        const contractA_1_Error = await submitContract(
            client,
            contractA.id,
            stateUser.id,
            'third submit'
        )
        if (!(contractA_1_Error instanceof Error)) {
            throw new Error('Should be impossible to submit twice in a row.')
        }

        const res = must(await findContractWithHistory(client, contractA.id))

        const revisions = res.revisions.reverse()

        console.info(
            'ALL First REvisions: ',
            JSON.stringify(revisions, null, '  ')
        )

        expect(revisions).toHaveLength(3)
        expect(revisions[0].rateRevisions).toHaveLength(2)
        expect(revisions[0].submitInfo?.updatedReason).toBe('initial submit')

        expect(revisions[1].rateRevisions).toHaveLength(2)
        expect(revisions[1].submitInfo?.updatedReason).toBe('2.1 update')

        expect(revisions[2].rateRevisions).toHaveLength(2)
        expect(revisions[2].submitInfo?.updatedReason).toBe('third submit')

        // these revisions can be in any order because they were saved at the same time
        const revisionFormDatas = new Set(
            revisions[2].rateRevisions.map(
                (rr) => rr.formData.rateCertificationName
            )
        )
        const expectedFormDatas = new Set(['onepoint0', 'twopointone'])
        expect(revisionFormDatas).toStrictEqual(expectedFormDatas)
    })
})

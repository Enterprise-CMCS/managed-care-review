import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { v4 as uuidv4 } from 'uuid'
import { findContractWithHistory } from './findContractWithHistory'
import { submitContract } from './submitContract'
import { submitRate } from './submitRate'
import { insertDraftContract } from './insertContract'
import { unlockContract } from './unlockContract'
import { updateDraftContractWithRates } from './updateDraftContractWithRates'
import { insertDraftRate } from './insertRate'
import { updateDraftRate } from './updateDraftRate'
import { unlockRate } from './unlockRate'
import { findRateWithHistory } from './findRateWithHistory'
import { must, createInsertContractData } from '../../testHelpers'
import { createInsertRateData } from '../../testHelpers/contractAndRates/rateHelpers'

// TODO: Enable these tests again after reimplementing rate change history that was in contractWithHistoryToDomainModel
// eslint-disable-next-line jest/no-disabled-tests
describe.skip('findContractWithHistory with full contract and rate history', () => {
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('finds a stripped down contract with history', async () => {
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
            await submitContract(client, {
                contractID: contractA.id,
                submittedByUserID: stateUser.id,
                submitReason: 'initial submit',
            })
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
        must(
            await submitRate(client, {
                rateID: rate1.id,
                submittedByUserID: stateUser.id,
                submitReason: 'Rate Submit',
            })
        )

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
        must(
            await submitRate(client, {
                rateID: rate2.id,
                submittedByUserID: stateUser.id,
                submitReason: 'RateSubmit 2',
            })
        )

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
        must(
            await submitRate(client, {
                rateID: rate3.id,
                submittedByUserID: stateUser.id,
                submitReason: '3.0 create',
            })
        )

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
            await unlockRate(client, {
                rateID: rate2.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock for 2.1 remove',
            })
        )
        must(
            await updateDraftRate(client, {
                rateID: rate2.id,
                formData: { rateCertificationName: 'twopointone' },
                contractIDs: [],
            })
        )
        must(
            await submitRate(client, {
                rateID: rate2.id,
                submittedByUserID: stateUser.id,
                submitReason: '2.1 remove',
            })
        )

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
        must(
            await unlockRate(client, {
                rateID: rate1.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock for 1.1',
            })
        )
        must(
            await updateDraftRate(client, {
                rateID: rate1.id,
                formData: { rateCertificationName: 'onepointone' },
                contractIDs: [contractA.id],
            })
        )
        must(
            await submitRate(client, {
                rateID: rate1.id,
                submittedByUserID: stateUser.id,
                submitReason: '1.1 new name',
            })
        )

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
            await unlockContract(client, {
                contractID: contractA.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlocking A.0',
            })
        )
        must(
            await submitContract(client, {
                contractID: contractA.id,
                submittedByUserID: stateUser.id,
                submitReason: 'Submitting A.1',
            })
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
        const unlockedContractA = must(
            await unlockContract(client, {
                contractID: contractA.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlocking A.1',
            })
        )
        must(
            await updateDraftContractWithRates(client, {
                contractID: contractA.id,
                formData: {
                    submissionType: 'CONTRACT_AND_RATES',
                    submissionDescription: 'a.2 body',
                    contractType: 'BASE',
                    programIDs: ['PMAP'],
                    populationCovered: 'MEDICAID',
                    riskBasedContract: false,
                },
                rateFormDatas: unlockedContractA.draftRevision?.rateRevisions
                    .filter(
                        (rateRevision) =>
                            rateRevision.formData.rateID !== rate1.id &&
                            rateRevision.formData.rateID !== rate2.id
                    )
                    .map((rate) => rate.formData),
            })
        )
        must(
            await submitContract(client, {
                contractID: contractA.id,
                submittedByUserID: stateUser.id,
                submitReason: 'Submitting A.2',
            })
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
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('finds a full contract', async () => {
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
            await submitContract(client, {
                contractID: contractA.id,
                submittedByUserID: stateUser.id,
                submitReason: 'initial submit',
            })
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
        must(
            await submitRate(client, {
                rateID: rate1.id,
                submittedByUserID: stateUser.id,
                submitReason: 'Rate Submit',
            })
        )

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
        must(
            await submitRate(client, {
                rateID: rate2.id,
                submittedByUserID: stateUser.id,
                submitReason: 'RateSubmit 2',
            })
        )

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
        must(
            await submitRate(client, {
                rateID: rate3.id,
                submittedByUserID: stateUser.id,
                submitReason: '3.0 create',
            })
        )

        // remove the connection from rate 2
        must(
            await unlockRate(client, {
                rateID: rate2.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock for 2.1 remove',
            })
        )
        must(
            await updateDraftRate(client, {
                rateID: rate2.id,
                formData: { rateCertificationName: 'twopointone' },
                contractIDs: [],
            })
        )
        must(
            await submitRate(client, {
                rateID: rate2.id,
                submittedByUserID: stateUser.id,
                submitReason: '2.1 remove',
            })
        )

        // update rate 1 to have a new version, should make one new rev.
        must(
            await unlockRate(client, {
                rateID: rate1.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock for 1.1',
            })
        )
        must(
            await updateDraftRate(client, {
                rateID: rate1.id,
                formData: { rateCertificationName: 'onepointone' },
                contractIDs: [contractA.id],
            })
        )
        must(
            await submitRate(client, {
                rateID: rate1.id,
                submittedByUserID: stateUser.id,
                submitReason: '1.1 new name',
            })
        )

        // Make a new Contract Revision, should show up as a single new rev with all the old info
        must(
            await unlockContract(client, {
                contractID: contractA.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlocking A.0',
            })
        )

        must(
            await submitContract(client, {
                contractID: contractA.id,
                submittedByUserID: stateUser.id,
                submitReason: 'Submitting A.1',
            })
        )

        // Make a new Contract Revision, changing the connections should show up as a single new rev.
        const unlockedContractA = must(
            await unlockContract(client, {
                contractID: contractA.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlocking A.1',
            })
        )
        // Remove rate 1 and rate 2 from contract
        must(
            await updateDraftContractWithRates(client, {
                contractID: contractA.id,
                formData: {
                    submissionType: 'CONTRACT_AND_RATES',
                    submissionDescription: 'a.2 body',
                    contractType: 'BASE',
                    programIDs: ['PMAP'],
                    populationCovered: 'MEDICAID',
                    riskBasedContract: false,
                },
                rateFormDatas: unlockedContractA.draftRevision?.rateRevisions
                    .filter(
                        (rateRevision) =>
                            rateRevision.formData.rateID !== rate1.id &&
                            rateRevision.formData.rateID !== rate2.id
                    )
                    .map((rate) => rate.formData),
            })
        )

        must(
            await submitContract(client, {
                contractID: contractA.id,
                submittedByUserID: stateUser.id,
                submitReason: 'Submitting A.2',
            })
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
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('handles drafts correctly', async () => {
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
            id: uuidv4(),
            stateCode: 'MN',
            rateCertificationName: 'onepoint0',
        })

        const rate2 = createInsertRateData({
            id: uuidv4(),
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
        const updatedDraftContractWithRates = must(
            await updateDraftContractWithRates(client, {
                contractID: contractA.id,
                formData: {
                    submissionType: 'CONTRACT_AND_RATES',
                    submissionDescription: 'one contract',
                    contractType: 'BASE',
                    programIDs: ['PMAP'],
                    populationCovered: 'MEDICAID',
                    riskBasedContract: false,
                },
                rateFormDatas: [rate1, rate2],
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
            await submitRate(client, {
                rateID: draftRateRevisionData1.rateID,
                submittedByUserID: stateUser.id,
                submitReason: 'Rate Submit',
            })
        )

        const submittedRate2 = must(
            await submitRate(client, {
                rateID: draftRateRevisionData2.rateID,
                submittedByUserID: stateUser.id,
                submitReason: 'Rate Submit 2',
            })
        )

        // submit contract
        must(
            await submitContract(client, {
                contractID: contractA.id,
                submittedByUserID: stateUser.id,
                submitReason: 'initial submit',
            })
        )

        // Unlock contract A, but don't resubmit it yet.
        must(
            await unlockContract(client, {
                contractID: contractA.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock A Open',
            })
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
            await unlockRate(client, {
                rateID: submittedRate2.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock for 2.1',
            })
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
            await submitRate(client, {
                rateID: submittedRate2.id,
                submittedByUserID: stateUser.id,
                submitReason: '2.1 update',
            })
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
            await submitContract(client, {
                contractID: contractA.id,
                submittedByUserID: stateUser.id,
                submitReason: 'third submit',
            })
        )

        // attempt a second submission, should result in an error.
        const contractA_1_Error = await submitContract(client, {
            contractID: contractA.id,
            submittedByUserID: stateUser.id,
            submitReason: 'third submit',
        })
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

describe('findContractWithHistory with only contract history', () => {
    it('matches correct rate revisions to contract revision with independent rate unlocks and submits', async () => {
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
        const draftContract = must(
            await insertDraftContract(client, draftContractData)
        )

        const updatedContract = must(
            await updateDraftContractWithRates(client, {
                contractID: draftContract.id,
                formData: {},
                rateFormDatas: [
                    createInsertRateData({
                        id: uuidv4(),
                        rateType: 'NEW',
                        rateCertificationName: 'First rate',
                    }),
                ],
            })
        )

        if (!updatedContract.draftRevision) {
            throw new Error(
                'Unexpected Error: No draft contract revision found in contract'
            )
        }

        const contractID = updatedContract.id
        const rateID = updatedContract.draftRevision.rateRevisions[0].rate.id

        // Submit rate
        must(
            await submitRate(client, {
                rateID,
                submittedByUserID: stateUser.id,
                submitReason: 'submit rate A revision 1.0',
            })
        )

        // Submit contract
        must(
            await submitContract(client, {
                contractID: draftContract.id,
                submittedByUserID: stateUser.id,
                submitReason: 'submit contract revision 1.0',
            })
        )

        // Unlock and resubmit rate 3 times.
        must(
            await unlockRate(client, {
                rateID,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock rate A revision 1.0',
            })
        )
        must(
            await submitRate(client, {
                rateID,
                submittedByUserID: stateUser.id,
                submitReason: 'submit rate A revision 1.1',
            })
        )
        must(
            await unlockRate(client, {
                rateID,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock rate A revision 1.1',
            })
        )
        must(
            await submitRate(client, {
                rateID,
                submittedByUserID: stateUser.id,
                submitReason: 'submit rate A revision 1.2',
            })
        )
        must(
            await unlockRate(client, {
                rateID,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock rate A revision 1.2',
            })
        )
        must(
            await submitRate(client, {
                rateID,
                submittedByUserID: stateUser.id,
                submitReason: 'submit rate A revision 1.3',
            })
        )

        // Fetch contract
        let submittedContract = must(
            await findContractWithHistory(client, contractID)
        )

        // Expect rate revision on contract revision to be rate revision 1.3
        expect(
            submittedContract.revisions[0].rateRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('submit rate A revision 1.3')

        // Unlock contract
        must(
            await unlockContract(client, {
                contractID,
                unlockReason: 'unlock contract revision 1.0',
                unlockedByUserID: cmsUser.id,
            })
        )

        // Unlock and resubmit rate again
        must(
            await unlockRate(client, {
                rateID,
                unlockReason: 'unlock rate A revision 1.3',
                unlockedByUserID: cmsUser.id,
            })
        )
        must(
            await submitRate(client, {
                rateID,
                submittedByUserID: stateUser.id,
                submitReason: 'submit rate A revision 1.4',
            })
        )

        // Resubmit contract
        must(
            await submitContract(client, {
                contractID,
                submitReason: 'submit contract revision 1.1',
                submittedByUserID: stateUser.id,
            })
        )

        // Unlock and resubmit rate again
        must(
            await unlockRate(client, {
                rateID,
                unlockReason: 'unlock rate A revision 1.4',
                unlockedByUserID: cmsUser.id,
            })
        )
        must(
            await submitRate(client, {
                rateID,
                submittedByUserID: stateUser.id,
                submitReason: 'submit rate A revision 1.5',
            })
        )

        // Fetch contract again
        submittedContract = must(
            await findContractWithHistory(client, contractID)
        )

        // Expect 2 contract revisions
        expect(submittedContract.revisions).toHaveLength(2)

        // Expect latest contract revision to be version 1.1
        expect(submittedContract.revisions[0].submitInfo?.updatedReason).toBe(
            'submit contract revision 1.1'
        )

        // Expect latest contract revisions matching rate revision to be version 1.5
        expect(
            submittedContract.revisions[0].rateRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('submit rate A revision 1.5')

        // Expect the earliest contract revision to be version 1.0
        expect(submittedContract.revisions[1].submitInfo?.updatedReason).toBe(
            'submit contract revision 1.0'
        )

        // Expect latest contract revisions matching rate revision to be version 1.3
        expect(
            submittedContract.revisions[1].rateRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('submit rate A revision 1.3')

        // Add a second rate to contract and submit
        const unlockedContract = must(
            await unlockContract(client, {
                contractID,
                unlockReason: 'unlock contract revision 1.1',
                unlockedByUserID: cmsUser.id,
            })
        )

        if (!unlockedContract.draftRevision) {
            throw new Error(
                'Unexpected Error: No draft contract revision found in contract'
            )
        }

        const updatedContractWithRates = must(
            await updateDraftContractWithRates(client, {
                contractID: draftContract.id,
                formData: {},
                rateFormDatas: [
                    // Make sure existing rate is still included. If not it will be removed from the contract
                    unlockedContract.draftRevision.rateRevisions[0].formData,
                    createInsertRateData({
                        id: uuidv4(),
                        rateType: 'NEW',
                        rateCertificationName: 'Second rate',
                    }),
                ],
            })
        )

        const secondRate =
            updatedContractWithRates.draftRevision?.rateRevisions.find(
                (rr) => rr.formData.rateCertificationName === 'Second rate'
            )

        if (!secondRate) {
            throw new Error('Unexpected Error: No rate found in contract')
        }

        must(
            await submitRate(client, {
                rateID: secondRate.rate.id,
                submittedByUserID: stateUser.id,
                submitReason: 'submit rate B revision 1.0',
            })
        )
        must(
            await submitContract(client, {
                contractID,
                submittedByUserID: stateUser.id,
                submitReason: 'submit contract revision 1.2',
            })
        )

        // Unlock and resubmit rate B twice
        must(
            await unlockRate(client, {
                rateID: secondRate.rate.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock rate B revision 1.0',
            })
        )
        must(
            await submitRate(client, {
                rateID: secondRate.rate.id,
                submittedByUserID: stateUser.id,
                submitReason: 'submit rate B revision 1.1',
            })
        )
        must(
            await unlockRate(client, {
                rateID: secondRate.rate.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock rate B revision 1.1',
            })
        )
        must(
            await submitRate(client, {
                rateID: secondRate.rate.id,
                submittedByUserID: stateUser.id,
                submitReason: 'submit rate B revision 1.2',
            })
        )

        // Fetch contract again
        submittedContract = must(
            await findContractWithHistory(client, contractID)
        )

        // Expect 3 contract revisions
        expect(submittedContract.revisions).toHaveLength(3)

        // Expect latest contract revision to be version 1.2 with rate A revision 1.5 and rate B revision 1.1
        expect(submittedContract.revisions[0].submitInfo?.updatedReason).toBe(
            'submit contract revision 1.2'
        )
        expect(
            submittedContract.revisions[0].rateRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('submit rate A revision 1.5')
        expect(
            submittedContract.revisions[0].rateRevisions[1].submitInfo
                ?.updatedReason
        ).toBe('submit rate B revision 1.2')

        // Expect previous contract revisions to not have changed.
        expect(submittedContract.revisions[1].submitInfo?.updatedReason).toBe(
            'submit contract revision 1.1'
        )
        expect(
            submittedContract.revisions[1].rateRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('submit rate A revision 1.5')
        expect(submittedContract.revisions[2].submitInfo?.updatedReason).toBe(
            'submit contract revision 1.0'
        )
        expect(
            submittedContract.revisions[2].rateRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('submit rate A revision 1.3')
    })
})

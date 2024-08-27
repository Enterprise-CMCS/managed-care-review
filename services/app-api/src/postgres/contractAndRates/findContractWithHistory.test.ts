import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { v4 as uuidv4 } from 'uuid'
import { findContractWithHistory } from './findContractWithHistory'
import { submitContract } from './submitContract'
import { submitRate } from './submitRate'
import { insertDraftContract } from './insertContract'
import { unlockContract } from './unlockContract'
import { updateDraftContractFormData } from './updateDraftContractWithRates'
import { insertDraftRate } from './insertRate'
import { updateDraftRate } from './updateDraftRate'
import { unlockRate } from './unlockRate'
import { findRateWithHistory } from './findRateWithHistory'
import { must, mockInsertContractArgs } from '../../testHelpers'
import { mockInsertRateArgs } from '../../testHelpers/rateDataMocks'
import { convertContractToDraftRateRevisions } from '../../domain-models/contractAndRates/convertContractWithRatesToHPP'
import { updateDraftContractRates } from './updateDraftContractRates'

describe('findContractWithHistory with full contract and rate history', () => {
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
        const draftContractData = mockInsertContractArgs({
            submissionDescription: 'one contract',
        })
        const contractA = must(
            await insertDraftContract(client, draftContractData)
        )

        // Add 3 rates 1, 2, 3 pointing to contract A
        const rate1 = must(
            await insertDraftRate(client, contractA.id, {
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

        const rate2 = must(
            await insertDraftRate(client, contractA.id, {
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

        const rate3 = must(
            await insertDraftRate(client, contractA.id, {
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
            await submitContract(client, {
                contractID: contractA.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'initial submit',
            })
        )

        // Now, find that contract and assert the history is what we expected
        const threeContract = must(
            await findContractWithHistory(client, contractA.id)
        )
        if (threeContract instanceof Error) {
            throw threeContract
        }
        expect(threeContract.packageSubmissions).toHaveLength(1)

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
                submittedReason: '2.1 remove',
            })
        )

        // Now, find that contract and assert the history is what we expected
        const twoContract = must(
            await findContractWithHistory(client, contractA.id)
        )
        if (twoContract instanceof Error) {
            throw twoContract
        }
        expect(twoContract.packageSubmissions).toHaveLength(2)
        expect(twoContract.packageSubmissions[0].rateRevisions).toHaveLength(2)

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
                submittedReason: '1.1 new name',
            })
        )

        // Now, find that contract and assert the history is what we expected
        const backAgainContract = must(
            await findContractWithHistory(client, contractA.id)
        )
        if (backAgainContract instanceof Error) {
            throw backAgainContract
        }
        expect(backAgainContract.packageSubmissions).toHaveLength(3)

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
                submittedReason: 'Submitting A.1',
            })
        )

        // Now, find that contract and assert the history is what we expected
        let testingContract = must(
            await findContractWithHistory(client, contractA.id)
        )
        if (testingContract instanceof Error) {
            throw testingContract
        }
        expect(testingContract.packageSubmissions).toHaveLength(4)

        // Make a new Contract Revision, changing the connections should show up as a single new rev.
        const unlockedContractA = must(
            await unlockContract(client, {
                contractID: contractA.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlocking A.1',
            })
        )
        must(
            await updateDraftContractFormData(client, {
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
        )

        const remainingRateRevisions = convertContractToDraftRateRevisions(
            unlockedContractA
        ).filter(
            (rateRevision) =>
                rateRevision.formData.rateID !== rate1.id &&
                rateRevision.formData.rateID !== rate2.id
        )

        must(
            await updateDraftContractRates(client, {
                contractID: contractA.id,
                rateUpdates: {
                    create: [],
                    update: remainingRateRevisions.map((r, idx) => ({
                        rateID: r.rateID,
                        formData: r.formData,
                        ratePosition: idx + 1,
                    })),
                    link: [],
                    unlink: [
                        {
                            rateID: rate1.id,
                        },
                        {
                            rateID: rate2.id,
                        },
                    ],
                    delete: [],
                },
            })
        )

        must(
            await submitContract(client, {
                contractID: contractA.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'Submitting A.2',
            })
        )

        // Now, find that contract and assert the history is what we expected
        testingContract = must(
            await findContractWithHistory(client, contractA.id)
        )
        if (testingContract instanceof Error) {
            throw testingContract
        }
        expect(testingContract.packageSubmissions).toHaveLength(5)

        // Now, find that contract and assert the history is what we expected
        const resultingContract = must(
            await findContractWithHistory(client, contractA.id)
        )
        if (resultingContract instanceof Error) {
            throw resultingContract
        }

        const submissionsInTimeOrder =
            resultingContract.packageSubmissions.reverse()

        // console.info(
        //     'ALL First REvisions: ',
        //     JSON.stringify(submissionsInTimeOrder, null, '  ')
        // )

        // Each submission needs a Reason, one of the contracts or revisions associated with it should have changed and why.
        expect(submissionsInTimeOrder).toHaveLength(5)
        expect(
            submissionsInTimeOrder[0].contractRevision.unlockInfo
        ).toBeUndefined()
        expect(submissionsInTimeOrder[0].rateRevisions).toHaveLength(3)
        expect(submissionsInTimeOrder[0].submitInfo?.updatedReason).toBe(
            'initial submit'
        )

        expect(submissionsInTimeOrder[1].rateRevisions).toHaveLength(2)
        expect(
            submissionsInTimeOrder[1].contractRevision.unlockInfo
        ).toBeUndefined()
        expect(
            submissionsInTimeOrder[1].submittedRevisions[0].unlockInfo
                ?.updatedReason
        ).toBe('unlock for 2.1 remove')
        expect(
            submissionsInTimeOrder[1].submittedRevisions[0].unlockInfo
                ?.updatedBy.email
        ).toBe('zuko@example.com')
        expect(submissionsInTimeOrder[1].submitInfo?.updatedReason).toBe(
            '2.1 remove'
        )

        expect(submissionsInTimeOrder[2].rateRevisions).toHaveLength(2)
        expect(
            submissionsInTimeOrder[2].rateRevisions[0].formData
                .rateCertificationName
        ).toBe('onepointone')
        expect(
            submissionsInTimeOrder[2].rateRevisions[0].unlockInfo?.updatedReason
        ).toBe('unlock for 1.1')
        expect(submissionsInTimeOrder[2].submitInfo?.updatedReason).toBe(
            '1.1 new name'
        )

        expect(submissionsInTimeOrder[3].rateRevisions).toHaveLength(2)
        expect(submissionsInTimeOrder[3].submitInfo?.updatedReason).toBe(
            'Submitting A.1'
        )

        expect(submissionsInTimeOrder[4].rateRevisions).toHaveLength(1)
        expect(submissionsInTimeOrder[4].contractRevision.formData).toEqual(
            expect.objectContaining({
                submissionType: 'CONTRACT_AND_RATES',
                submissionDescription: 'a.2 body',
            })
        )
        expect(submissionsInTimeOrder[4].submitInfo?.updatedReason).toBe(
            'Submitting A.2'
        )

        // check for rate and see if it handles the removed bit right
        const rate1fetched = await findRateWithHistory(client, rate1.id)
        if (rate1fetched instanceof Error) {
            throw rate1fetched
        }

        expect(rate1fetched.packageSubmissions).toHaveLength(4)
        expect(
            rate1fetched.packageSubmissions[0].submitInfo?.updatedReason
        ).toBe('Submitting A.2')
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
        const draftContractData = mockInsertContractArgs({
            submissionDescription: 'one contract',
        })
        const contractA = must(
            await insertDraftContract(client, draftContractData)
        )

        // Add 3 rates 1, 2, 3 pointing to contract A
        const rate1 = must(
            await insertDraftRate(client, contractA.id, {
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

        const rate2 = must(
            await insertDraftRate(client, contractA.id, {
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

        const rate3 = must(
            await insertDraftRate(client, contractA.id, {
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
            await submitContract(client, {
                contractID: contractA.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'initial submit',
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
                submittedReason: '2.1 remove',
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
                submittedReason: '1.1 new name',
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
                submittedReason: 'Submitting A.1',
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
            await updateDraftContractFormData(client, {
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
        )

        const remainingRateRevisions = convertContractToDraftRateRevisions(
            unlockedContractA
        ).filter(
            (rateRevision) =>
                rateRevision.formData.rateID !== rate1.id &&
                rateRevision.formData.rateID !== rate2.id
        )

        must(
            await updateDraftContractRates(client, {
                contractID: contractA.id,
                rateUpdates: {
                    create: [],
                    update: remainingRateRevisions.map((r, idx) => ({
                        rateID: r.rateID,
                        formData: r.formData,
                        ratePosition: idx + 1,
                    })),
                    link: [],
                    unlink: [
                        {
                            rateID: rate1.id,
                        },
                        {
                            rateID: rate2.id,
                        },
                    ],
                    delete: [],
                },
            })
        )

        must(
            await submitContract(client, {
                contractID: contractA.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'Submitting A.2',
            })
        )

        // Now, find that contract and assert the history is what we expected
        const resultingContract = must(
            await findContractWithHistory(client, contractA.id)
        )
        if (resultingContract instanceof Error) {
            throw resultingContract
        }

        const submissionsInTimeOrder =
            resultingContract.packageSubmissions.reverse()

        // console.info(
        //     'ALL First REvisions: ',
        //     JSON.stringify(submissionsInTimeOrder, null, '  ')
        // )

        // Each Revision needs a Reason, one of the contracts or revisions associated with it should have changed and why.
        expect(submissionsInTimeOrder).toHaveLength(5)
        expect(submissionsInTimeOrder[0].rateRevisions).toHaveLength(3)
        expect(submissionsInTimeOrder[0].submitInfo?.updatedReason).toBe(
            'initial submit'
        )

        expect(submissionsInTimeOrder[1].rateRevisions).toHaveLength(2)

        expect(submissionsInTimeOrder[2].rateRevisions).toHaveLength(2)
        expect(
            submissionsInTimeOrder[2].rateRevisions[0].formData
                .rateCertificationName
        ).toBe('onepointone')
        expect(submissionsInTimeOrder[2].submitInfo?.updatedReason).toBe(
            '1.1 new name'
        )

        expect(submissionsInTimeOrder[3].rateRevisions).toHaveLength(2)
        expect(submissionsInTimeOrder[3].submitInfo?.updatedReason).toBe(
            'Submitting A.1'
        )

        expect(submissionsInTimeOrder[4].rateRevisions).toHaveLength(1)
        expect(submissionsInTimeOrder[4].contractRevision.formData).toEqual(
            expect.objectContaining({
                submissionType: 'CONTRACT_AND_RATES',
                submissionDescription: 'a.2 body',
            })
        )
        expect(submissionsInTimeOrder[4].submitInfo?.updatedReason).toBe(
            'Submitting A.2'
        )

        // check for rate and see if it handles the removed bit right
        const rate1fetched = await findRateWithHistory(client, rate1.id)
        if (rate1fetched instanceof Error) {
            throw rate1fetched
        }

        expect(rate1fetched.packageSubmissions).toHaveLength(4)
        expect(
            rate1fetched.packageSubmissions[0].submitInfo?.updatedReason
        ).toBe('Submitting A.2')
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

        const rate1 = mockInsertRateArgs({
            id: uuidv4(),
            stateCode: 'MN',
            rateCertificationName: 'onepoint0',
        })

        const rate2 = mockInsertRateArgs({
            id: uuidv4(),
            stateCode: 'MN',
            rateCertificationName: 'twopoint0',
        })
        const rate3 = mockInsertRateArgs({
            id: uuidv4(),
            stateCode: 'MN',
            rateCertificationName: 'threepoint0',
        })

        // add a contract that has both of them.
        const draftContractData = mockInsertContractArgs({
            submissionDescription: 'one contract',
        })
        const contractA = must(
            await insertDraftContract(client, draftContractData)
        )
        must(
            await updateDraftContractFormData(client, {
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
        )

        const updatedDraftContractAWithRates = must(
            await updateDraftContractRates(client, {
                contractID: contractA.id,
                rateUpdates: {
                    create: [
                        {
                            formData: rate1,
                            ratePosition: 1,
                        },
                        {
                            formData: rate2,
                            ratePosition: 2,
                        },
                    ],
                    update: [],
                    link: [],
                    unlink: [],
                    delete: [],
                },
            })
        )

        if (!updatedDraftContractAWithRates.draftRevision) {
            throw new Error(
                'Unexpected error: draftRevision does not exist in contract'
            )
        }
        if (!updatedDraftContractAWithRates.draftRates) {
            throw new Error('Unexpected error: revisions missing draftRates')
        }

        const draftRateRevisionData1 =
            updatedDraftContractAWithRates.draftRates[0].draftRevision?.formData
        const draftRateRevisionData2 =
            updatedDraftContractAWithRates.draftRates[1].draftRevision?.formData

        if (
            !draftRateRevisionData1?.rateID ||
            !draftRateRevisionData2?.rateID
        ) {
            throw new Error('Unexpected error: rate revision is missing rateID')
        }

        // submit contract
        must(
            await submitContract(client, {
                contractID: contractA.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'initial submit',
            })
        )

        const rate1ID = updatedDraftContractAWithRates.draftRates[0].id

        // add a contract that has both of them.
        const draftContractBData = mockInsertContractArgs({
            submissionDescription: 'two contract',
        })
        const contractB = must(
            await insertDraftContract(client, draftContractBData)
        )

        must(
            await updateDraftContractRates(client, {
                contractID: contractB.id,
                rateUpdates: {
                    create: [
                        {
                            formData: rate3,
                            ratePosition: 1,
                        },
                    ],
                    update: [],
                    link: [
                        {
                            rateID: rate1ID,
                            ratePosition: 2,
                        },
                    ],
                    unlink: [],
                    delete: [],
                },
            })
        )

        // submit contract
        must(
            await submitContract(client, {
                contractID: contractB.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'initial submit',
            })
        )

        // Unlock contract B, but don't resubmit it yet.
        must(
            await unlockContract(client, {
                contractID: contractB.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock A Open',
            })
        )

        // Draft should pull revision 2.0 out
        const draftPreRateUnlock = must(
            await findContractWithHistory(client, contractB.id)
        )
        expect(draftPreRateUnlock.draftRevision).toBeDefined()
        expect(
            draftPreRateUnlock.draftRates &&
                draftPreRateUnlock.draftRates.map(
                    (rr) =>
                        rr?.draftRevision?.formData.rateCertificationName ||
                        rr.packageSubmissions[0].rateRevision.formData
                            .rateCertificationName
                )
        ).toEqual(['threepoint0', 'onepoint0'])

        // unlock and submit second rate one
        must(
            await unlockRate(client, {
                rateID: rate1ID,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock for 2.1',
            })
        )
        must(
            await updateDraftRate(client, {
                rateID: rate1ID,
                formData: { rateCertificationName: 'onepointone' },
                contractIDs: [contractA.id, contractB.id],
            })
        )

        // Draft should now pull draft revision 2.1 out, even though its unsubmitted
        const draftPreRateSubmit = must(
            await findContractWithHistory(client, contractB.id)
        )
        expect(draftPreRateSubmit.draftRevision).toBeDefined()
        expect(
            draftPreRateSubmit.draftRates &&
                draftPreRateSubmit.draftRates.map(
                    (rr) =>
                        rr?.draftRevision?.formData.rateCertificationName ||
                        rr.packageSubmissions[0].rateRevision.formData
                            .rateCertificationName
                )
        ).toEqual(['threepoint0', 'onepointone'])

        // Submit Rate 2.1
        must(
            await submitRate(client, {
                rateID: rate1ID,
                submittedByUserID: stateUser.id,
                submittedReason: '2.1 update',
            })
        )

        // raft should still pull revision 2.1 out
        const draftPostRateSubmit = must(
            await findContractWithHistory(client, contractB.id)
        )
        expect(draftPostRateSubmit.draftRevision).toBeDefined()
        expect(
            draftPreRateSubmit.draftRates &&
                draftPreRateSubmit.draftRates.map(
                    (rr) =>
                        rr?.draftRevision?.formData.rateCertificationName ||
                        rr.packageSubmissions[0].rateRevision.formData
                            .rateCertificationName
                )
        ).toEqual(['threepoint0', 'onepointone'])

        // submit contract B1, now, should show up as a single new rev and have the latest rates
        must(
            await submitContract(client, {
                contractID: contractB.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'third submit',
            })
        )

        // attempt a second submission, should result in an error.
        const contractB_1_Error = await submitContract(client, {
            contractID: contractB.id,
            submittedByUserID: stateUser.id,
            submittedReason: 'third submit',
        })
        if (!(contractB_1_Error instanceof Error)) {
            throw new Error('Should be impossible to submit twice in a row.')
        }

        const res = must(await findContractWithHistory(client, contractB.id))

        const submissionsInTimeOrder = res.packageSubmissions.reverse()

        expect(submissionsInTimeOrder).toHaveLength(3)
        expect(submissionsInTimeOrder[0].rateRevisions).toHaveLength(2)
        expect(submissionsInTimeOrder[0].submitInfo?.updatedReason).toBe(
            'initial submit'
        )

        expect(submissionsInTimeOrder[1].rateRevisions).toHaveLength(2)
        expect(submissionsInTimeOrder[1].submitInfo?.updatedReason).toBe(
            '2.1 update'
        )

        expect(submissionsInTimeOrder[2].rateRevisions).toHaveLength(2)
        expect(submissionsInTimeOrder[2].submitInfo?.updatedReason).toBe(
            'third submit'
        )

        // these revisions can be in any order because they were saved at the same time
        const revisionFormDatas = new Set(
            submissionsInTimeOrder[2].rateRevisions.map(
                (rr) => rr.formData.rateCertificationName
            )
        )
        const expectedFormDatas = new Set(['threepoint0', 'onepointone'])
        expect(revisionFormDatas).toStrictEqual(expectedFormDatas)
    })
})

describe('findContractWithHistory with only contract history', () => {
    // eslint-disable-next-line jest/no-disabled-tests
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
        const draftContractData = mockInsertContractArgs({
            submissionDescription: 'one contract',
        })
        const draftContract = must(
            await insertDraftContract(client, draftContractData)
        )

        const updatedContract = must(
            await updateDraftContractRates(client, {
                contractID: draftContract.id,
                rateUpdates: {
                    create: [
                        {
                            formData: mockInsertRateArgs({
                                rateType: 'NEW',
                                rateCertificationName: 'First rate',
                            }),
                            ratePosition: 1,
                        },
                    ],
                    update: [],
                    link: [],
                    unlink: [],
                    delete: [],
                },
            })
        )

        if (!updatedContract.draftRevision) {
            throw new Error(
                'Unexpected Error: No draft contract revision found in contract'
            )
        }

        const contractID = updatedContract.id
        const rateID =
            convertContractToDraftRateRevisions(updatedContract)[0].rateID

        // Submit contract
        must(
            await submitContract(client, {
                contractID: draftContract.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit contract revision 1.0',
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
                submittedReason: 'submit rate A revision 1.1',
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
                submittedReason: 'submit rate A revision 1.2',
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
                submittedReason: 'submit rate A revision 1.3',
            })
        )

        // Fetch contract
        let submittedContract = must(
            await findContractWithHistory(client, contractID)
        )

        // Expect rate revision on contract revision to be rate revision 1.3
        expect(
            submittedContract.packageSubmissions[0].rateRevisions[0].submitInfo
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

        // Resubmit contract
        must(
            await submitContract(client, {
                contractID,
                submittedReason: 'submit contract revision 1.1',
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
                submittedReason: 'submit rate A revision 1.5',
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
            submittedContract.packageSubmissions[0].rateRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('submit rate A revision 1.5')

        // Expect the earliest contract revision to be version 1.0
        expect(submittedContract.revisions[1].submitInfo?.updatedReason).toBe(
            'submit contract revision 1.0'
        )

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
            await updateDraftContractRates(client, {
                contractID: draftContract.id,
                rateUpdates: {
                    create: [
                        {
                            formData: mockInsertRateArgs({
                                rateType: 'NEW',
                                rateCertificationName: 'Second rate',
                            }),
                            ratePosition: 2,
                        },
                    ],
                    update: [
                        {
                            rateID: convertContractToDraftRateRevisions(
                                unlockedContract
                            )[0].rateID,
                            formData:
                                convertContractToDraftRateRevisions(
                                    unlockedContract
                                )[0].formData,
                            ratePosition: 1,
                        },
                    ],
                    link: [],
                    unlink: [],
                    delete: [],
                },
            })
        )

        const secondRate = convertContractToDraftRateRevisions(
            updatedContractWithRates
        ).find((rr) => rr.formData.rateCertificationName === 'Second rate')

        if (!secondRate) {
            throw new Error('Unexpected Error: No rate found in contract')
        }

        must(
            await submitContract(client, {
                contractID,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit contract revision 1.2',
            })
        )

        // Unlock and resubmit rate B twice
        must(
            await unlockRate(client, {
                rateID: secondRate.rateID,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock rate B revision 1.0',
            })
        )
        must(
            await submitRate(client, {
                rateID: secondRate.rateID,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit rate B revision 1.1',
            })
        )
        must(
            await unlockRate(client, {
                rateID: secondRate.rateID,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock rate B revision 1.1',
            })
        )
        must(
            await submitRate(client, {
                rateID: secondRate.rateID,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit rate B revision 1.2',
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
            submittedContract.packageSubmissions[0].rateRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('submit contract revision 1.2')
        expect(
            submittedContract.packageSubmissions[0].rateRevisions[1].submitInfo
                ?.updatedReason
        ).toBe('submit rate B revision 1.2')

        // Expect previous contract revisions to not have changed.
        expect(submittedContract.revisions[1].submitInfo?.updatedReason).toBe(
            'submit contract revision 1.1'
        )

        expect(submittedContract.revisions[2].submitInfo?.updatedReason).toBe(
            'submit contract revision 1.0'
        )
    })
})

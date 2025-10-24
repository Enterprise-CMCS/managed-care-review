import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { v4 as uuidv4 } from 'uuid'
import { submitContract } from './submitContract'
import { submitRate } from './submitRate'
import { insertDraftContract } from './insertContract'
import { unlockContract } from './unlockContract'
import { updateDraftContractFormData } from './updateDraftContractWithRates'
import { insertDraftRate } from './insertRate'
import { updateDraftRate } from './updateDraftRate'
import { unlockRate } from './unlockRate'
import { findRateWithHistory } from './findRateWithHistory'
import {
    must,
    mockInsertContractArgs,
    mockInsertRateArgs,
} from '../../testHelpers'
import { findContractWithHistory } from './findContractWithHistory'
import type { DraftContractType } from '../../domain-models/contractAndRates/contractTypes'
import { updateDraftContractRates } from './updateDraftContractRates'
import { getDraftContractRateRevisions } from '../../domain-models/'

describe('findRate', () => {
    it('finds a stripped down rate with history', async () => {
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

        const draftContractData = mockInsertContractArgs({
            submissionDescription: 'one contract',
        })
        const contractA = must(
            await insertDraftContract(client, draftContractData)
        )

        // setup a single test rate
        const draftRateData = mockInsertRateArgs({
            rateCertificationName: 'one contract',
        })
        const rateA = must(
            await insertDraftRate(client, contractA.id, draftRateData)
        )

        if (!rateA.draftRevision) {
            throw new Error(
                'Unexpected error: draft rate is missing a draftRevision.'
            )
        }

        must(
            await submitContract(client, {
                contractID: contractA.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'First Contract Submit',
            })
        )

        // Add 3 contracts 1, 2, 3 pointing to rate A
        const contract1 = must(
            await insertDraftContract(client, {
                contractSubmissionType: 'HEALTH_PLAN',
                stateCode: 'MN',
                submissionDescription: 'someurle.en',
                programIDs: ['13221'],
                submissionType: 'CONTRACT_ONLY',
                contractType: 'BASE',
            })
        )
        must(
            await updateDraftContractFormData(client, {
                contractID: contract1.id,
                formData: { submissionDescription: 'someurle.en' },
            })
        )

        must(
            await updateDraftContractRates(client, {
                contractID: contract1.id,
                rateUpdates: {
                    create: [],
                    update: [],
                    link: [
                        {
                            rateID: rateA.id,
                            ratePosition: 1,
                        },
                    ],
                    unlink: [],
                    delete: [],
                },
            })
        )

        const contract2 = must(
            await insertDraftContract(client, {
                contractSubmissionType: 'HEALTH_PLAN',
                stateCode: 'MN',
                submissionDescription: 'twopointo',
                programIDs: ['13221'],
                submissionType: 'CONTRACT_ONLY',
                contractType: 'BASE',
            })
        )
        must(
            await updateDraftContractFormData(client, {
                contractID: contract2.id,
                formData: { submissionDescription: 'twopointo' },
            })
        )

        must(
            await updateDraftContractRates(client, {
                contractID: contract2.id,
                rateUpdates: {
                    create: [],
                    update: [],
                    link: [
                        {
                            rateID: rateA.id,
                            ratePosition: 1,
                        },
                    ],
                    unlink: [],
                    delete: [],
                },
            })
        )

        const contract3 = must(
            await insertDraftContract(client, {
                contractSubmissionType: 'HEALTH_PLAN',
                stateCode: 'MN',
                submissionDescription: 'threepointo',
                programIDs: ['13221'],
                submissionType: 'CONTRACT_ONLY',
                contractType: 'BASE',
            })
        )
        must(
            await updateDraftContractFormData(client, {
                contractID: contract3.id,
                formData: { submissionDescription: 'threepointo' },
            })
        )

        must(
            await updateDraftContractRates(client, {
                contractID: contract3.id,
                rateUpdates: {
                    create: [],
                    update: [],
                    link: [
                        {
                            rateID: rateA.id,
                            ratePosition: 1,
                        },
                    ],
                    unlink: [],
                    delete: [],
                },
            })
        )

        // Submit rateA
        // const submittedRateA = must(
        //     await submitRate(client, {
        //         rateID: rateA.id,
        //         submittedByUserID: stateUser.id,
        //         submittedReason: 'initial rate submit',
        //     })
        // )

        // Submit Contract 1, 2, and 3
        must(
            await submitContract(client, {
                contractID: contract1.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'Contract Submit',
            })
        )
        must(
            await submitContract(client, {
                contractID: contract2.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'ContractSubmit 2',
            })
        )
        must(
            await submitContract(client, {
                contractID: contract3.id,
                submittedByUserID: stateUser.id,
                submittedReason: '3.0 create',
            })
        )

        // Now, find that rate and assert the history is what we expected
        const threeRate = must(await findRateWithHistory(client, rateA.id))
        if (threeRate instanceof Error) {
            throw threeRate
        }
        expect(threeRate.packageSubmissions).toHaveLength(4)
        expect(threeRate.packageSubmissions[0].contractRevisions).toHaveLength(
            4
        )

        // remove the connection from contract 2
        const unlockedContract2 = must(
            await unlockContract(client, {
                contractID: contract2.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock for 2.1 remove',
            })
        )
        must(
            await updateDraftContractFormData(client, {
                contractID: unlockedContract2.id,
                formData: {
                    submissionType: 'CONTRACT_AND_RATES',
                    submissionDescription: 'a.2 body',
                    contractType: 'BASE',
                    populationCovered: 'MEDICAID',
                    riskBasedContract: false,
                },
            })
        )

        must(
            await updateDraftContractRates(client, {
                contractID: contract2.id,
                rateUpdates: {
                    create: [],
                    update: [],
                    link: [],
                    unlink: [
                        {
                            rateID: rateA.id,
                        },
                    ],
                    delete: [],
                },
            })
        )

        must(
            await submitContract(client, {
                contractID: contract2.id,
                submittedByUserID: stateUser.id,
                submittedReason: '2.1 remove',
            })
        )

        // Now, find that rate and assert the history is what we expected
        const twoRate = must(await findRateWithHistory(client, rateA.id))
        if (twoRate instanceof Error) {
            throw twoRate
        }
        expect(twoRate.packageSubmissions).toHaveLength(5)

        expect(twoRate.packageSubmissions[0].contractRevisions).toHaveLength(3)

        // update contract 1 to have a new version, should make one new rev.
        const unlockedContract1 = must(
            await unlockContract(client, {
                contractID: contract1.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock for 1.1',
            })
        ) as DraftContractType
        must(
            await updateDraftContractFormData(client, {
                contractID: unlockedContract1.id,
                formData: { submissionDescription: 'onepointone' },
            })
        )
        must(
            await submitContract(client, {
                contractID: contract1.id,
                submittedByUserID: stateUser.id,
                submittedReason: '1.1 new name',
            })
        )

        // Now, find that rate and assert the history is what we expected
        const backAgainRate = must(await findRateWithHistory(client, rateA.id))
        if (backAgainRate instanceof Error) {
            throw backAgainRate
        }
        expect(backAgainRate.packageSubmissions).toHaveLength(6)

        // Make a new Rate Revision, should show up as a single new rev with all the old info
        must(
            await unlockRate(client, {
                rateID: rateA.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlocking A.0',
            })
        )
        const resubmittedRateA = must(
            await submitRate(client, {
                rateID: rateA.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'Submitting A.1',
            })
        )

        // Now, find that contract and assert the history is what we expected
        const testingRate = must(
            await findRateWithHistory(client, resubmittedRateA.id)
        )
        if (testingRate instanceof Error) {
            throw testingRate
        }
        expect(testingRate.revisions).toHaveLength(2)
        expect(testingRate.packageSubmissions).toHaveLength(7)

        // Make a new Rate Revision, changing the connections should show up as a single new rev.
        const secondUnlockRateA = must(
            await unlockRate(client, {
                rateID: resubmittedRateA.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlocking A.1',
            })
        )
        must(
            await updateDraftRate(client, {
                rateID: secondUnlockRateA.id,
                formData: {
                    rateCertificationName: 'one contract',
                    rateType: 'AMENDMENT',
                },
                contractIDs: [contract3.id],
            })
        )
        const secondResubmitRateA = must(
            await submitRate(client, {
                rateID: rateA.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'Submitting A.2',
            })
        )

        // Now, find that contract and assert the history is what we expected
        const testingRateTwo = must(
            await findRateWithHistory(client, secondResubmitRateA.id)
        )
        if (testingRateTwo instanceof Error) {
            throw testingRateTwo
        }
        expect(testingRateTwo.packageSubmissions).toHaveLength(8)

        // Now, find that contract and assert the history is what we expected
        const resultingRate = must(
            await findRateWithHistory(client, secondResubmitRateA.id)
        )
        if (resultingRate instanceof Error) {
            throw resultingRate
        }

        const submissionsInTimeOrder =
            resultingRate.packageSubmissions.reverse()

        console.info(
            'ALL First REvisions: ',
            JSON.stringify(submissionsInTimeOrder, null, '  ')
        )

        // Each Revision needs a Reason, one of the rates or revisions associated with it should have changed and why.
        expect(submissionsInTimeOrder).toHaveLength(8)
        expect(submissionsInTimeOrder[0].contractRevisions).toHaveLength(1)
        // expect(submissionsInTimeOrder[0].unlockInfo).toBeUndefined()
        expect(submissionsInTimeOrder[0].submitInfo?.updatedReason).toBe(
            'First Contract Submit'
        )

        expect(submissionsInTimeOrder[1].contractRevisions).toHaveLength(2)
        // expect(submissionsInTimeOrder[1].unlockInfo).toBeUndefined()
        expect(submissionsInTimeOrder[1].submitInfo?.updatedReason).toBe(
            'Contract Submit'
        )

        expect(submissionsInTimeOrder[2].contractRevisions).toHaveLength(3)
        // expect(submissionsInTimeOrder[2].unlockInfo).toBeUndefined()
        expect(submissionsInTimeOrder[2].submitInfo?.updatedReason).toBe(
            'ContractSubmit 2'
        )

        expect(submissionsInTimeOrder[3].contractRevisions).toHaveLength(4)
        // expect(submissionsInTimeOrder[3].unlockInfo).toBeUndefined()
        expect(submissionsInTimeOrder[3].submitInfo?.updatedReason).toBe(
            '3.0 create'
        )

        expect(submissionsInTimeOrder[4].contractRevisions).toHaveLength(3)
        // expect(submissionsInTimeOrder[4].unlockInfo?.updatedReason).toBe(
        //     'unlock for 2.1 remove'
        // )
        // expect(submissionsInTimeOrder[4].unlockInfo?.updatedBy).toBe(
        //     'zuko@example.com'
        // )
        expect(submissionsInTimeOrder[4].submitInfo?.updatedReason).toBe(
            '2.1 remove'
        )

        expect(submissionsInTimeOrder[5].contractRevisions).toHaveLength(3)
        expect(
            submissionsInTimeOrder[5].contractRevisions[2].formData
                .submissionDescription
        ).toBe('onepointone')
        // expect(submissionsInTimeOrder[5].unlockInfo?.updatedReason).toBe(
        //     'unlock for 1.1'
        // )
        expect(submissionsInTimeOrder[5].submitInfo?.updatedReason).toBe(
            '1.1 new name'
        )

        expect(submissionsInTimeOrder[6].contractRevisions).toHaveLength(3)
        expect(submissionsInTimeOrder[6].submitInfo?.updatedReason).toBe(
            'Submitting A.1'
        )

        expect(submissionsInTimeOrder[7].contractRevisions).toHaveLength(1)
        expect(submissionsInTimeOrder[7].rateRevision.formData).toEqual(
            expect.objectContaining({
                rateCertificationName: 'one contract',
                rateDateCertified: undefined,

                rateType: 'AMENDMENT',
            })
        )
        expect(submissionsInTimeOrder[7].submitInfo?.updatedReason).toBe(
            'Submitting A.2'
        )

        // check for contract and see if it handles the removed bit right

        const contract1fetched = await findContractWithHistory(
            client,
            contract1.id
        )
        if (contract1fetched instanceof Error) {
            throw contract1fetched
        }

        expect(contract1fetched.packageSubmissions).toHaveLength(4)
        expect(
            contract1fetched.packageSubmissions[0].submitInfo?.updatedReason
        ).toBe('Submitting A.2')
    })

    // This test mimics the way rates are created, updated, and disconnected using the app today.
    it('finds a full rate with history', async () => {
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

        // Create 1 contract
        const draftContractData = mockInsertContractArgs({
            submissionDescription: 'initial rate two submit',
        })
        const draftContract = must(
            await insertDraftContract(client, draftContractData)
        )
        const contractID = draftContract.id

        // Create rate 1
        const draftRateOne = must(
            await insertDraftRate(client, contractID, {
                stateCode: 'MN',
                rateCertificationName: 'first submission rate revision',
            })
        )

        //TODO these rates are bs, new ones are being created with the connect call
        // redo it with actual API calls.

        // Create rate 2
        const draftRateTwo = must(
            await insertDraftRate(client, contractID, {
                stateCode: 'MN',
                rateCertificationName: 'second submission rate revision',
            })
        )

        const rateIDOne = draftRateOne.id
        const rateIDTwo = draftRateTwo.id

        must(
            await submitContract(client, {
                contractID,
                submittedByUserID: stateUser.id,
                submittedReason: 'initial contract submit',
            })
        )

        // Rate one history
        const fetchSubmittedRateOne = must(
            await findRateWithHistory(client, rateIDOne)
        )
        // Expect only one rate revision
        expect(fetchSubmittedRateOne.revisions).toHaveLength(1)
        // Expect initial rate two submit to be attached to first submission rate revision
        expect(
            fetchSubmittedRateOne.revisions[0].submitInfo?.updatedReason
        ).toBe('initial contract submit')

        //Rate two history
        const fetchSubmittedRateTwo = must(
            await findRateWithHistory(client, rateIDTwo)
        )
        expect(fetchSubmittedRateTwo.revisions).toHaveLength(1)
        // Expect initial rate two submit to be attached to first submission rate revision
        expect(
            fetchSubmittedRateTwo.revisions[0].submitInfo?.updatedReason
        ).toBe('initial contract submit')

        must(
            await unlockContract(client, {
                contractID,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'Unlock first contract submission',
            })
        )

        must(
            await submitContract(client, {
                contractID,
                submittedByUserID: stateUser.id,
                submittedReason: 'resubmit contract',
            })
        )

        // Rate one resubmission history
        const fetchResubmittedRateOne = must(
            await findRateWithHistory(client, rateIDOne)
        )
        expect(fetchResubmittedRateOne.revisions).toHaveLength(2)
        // Expect the earliest submission contract revision to be attached to first submission rate revision
        expect(
            fetchResubmittedRateOne.revisions[1].submitInfo?.updatedReason
        ).toBe('initial contract submit')
        // Expect the latest submission contract revision to be attached to latest submission rate revision
        expect(
            fetchResubmittedRateOne.revisions[0].submitInfo?.updatedReason
        ).toBe('resubmit contract')

        // Rate two resubmission history
        const fetchResubmittedRateTwo = must(
            await findRateWithHistory(client, rateIDTwo)
        )
        expect(fetchResubmittedRateTwo.revisions).toHaveLength(2)
        // Expect the earliest submission contract revision to be attached to first submission rate revision
        expect(
            fetchResubmittedRateTwo.revisions[1].submitInfo?.updatedReason
        ).toBe('initial contract submit')
        // Expect the latest submission contract revision to be attached to latest submission rate revision
        expect(
            fetchResubmittedRateTwo.revisions[0].submitInfo?.updatedReason
        ).toBe('resubmit contract')

        const unlockedContract = must(
            await unlockContract(client, {
                contractID,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'Unlock to remove rate one from contract',
            })
        )

        expect(unlockedContract.draftRates).toHaveLength(2)

        // Remove rate one from contact
        const removedContract = must(
            await updateDraftContractRates(client, {
                contractID,
                rateUpdates: {
                    create: [],
                    update: [
                        {
                            rateID: rateIDTwo,
                            formData: draftRateOne,
                            ratePosition: 1,
                        },
                    ],
                    link: [],
                    unlink: [
                        {
                            rateID: rateIDOne,
                        },
                    ],
                    delete: [],
                },
            })
        )

        expect(removedContract.draftRates).toHaveLength(1)

        // Submit rate two and contract
        const resubmittedContract = must(
            await submitContract(client, {
                contractID,
                submittedByUserID: stateUser.id,
                submittedReason:
                    'resubmit contract removing rate one leaving only rate two',
            })
        )

        const resubmittedRateIDs =
            resubmittedContract.packageSubmissions[0].rateRevisions.map(
                (rr) => rr.rateID
            )
        expect(resubmittedRateIDs).toHaveLength(1)

        // Unlocked Rate one history
        const fetchUnlockedRateOne = must(
            await findRateWithHistory(client, rateIDOne)
        )
        // Expect unlocked rate to have a draftRevision
        expect(fetchUnlockedRateOne.draftRevision).toBeDefined()
        // Expect our draft revision to have no contract revisions after we removed it
        expect(fetchUnlockedRateOne.draftContracts).toHaveLength(0)
        // Expect our unlocked rate to still have the same revision data (revision history)
        // Expect the earliest submission contract revision to be attached to first submission rate revision
        expect(
            fetchUnlockedRateOne.revisions[1].submitInfo?.updatedReason
        ).toBe('initial contract submit')
        // Expect the resubmitted rate revision to have the attached contract revision that was attached to this rate
        expect(
            fetchUnlockedRateOne.revisions[0].submitInfo?.updatedReason
        ).toBe('resubmit contract')

        // Rate two re-resubmission history
        const latestRateTwoResubmit = must(
            await findRateWithHistory(client, rateIDTwo)
        )
        expect(latestRateTwoResubmit.revisions).toHaveLength(3)
        // Expect the earliest submission contract revision to be attached to first submission rate revision
        expect(
            latestRateTwoResubmit.revisions[2].submitInfo?.updatedReason
        ).toBe('initial contract submit')

        // Expect the first resubmission contract revision to be attached to first resubmission rate revision
        expect(
            latestRateTwoResubmit.revisions[1].submitInfo?.updatedReason
        ).toBe('resubmit contract')

        // Expect the latest submission contract revision to be attached to latest submission rate revision
        expect(
            latestRateTwoResubmit.revisions[0].submitInfo?.updatedReason
        ).toBe('resubmit contract removing rate one leaving only rate two')

        // Rate one re-resubmission history
        const latestRateOneResubmit = must(
            await submitRate(client, {
                rateID: rateIDOne,
                submittedReason: 'resubmit without contract',
                submittedByUserID: stateUser.id,
            })
        )

        // Expect no draft revision
        expect(latestRateOneResubmit.draftRevision).toBeUndefined()

        // Expect our resubmitted rate to still have the same revision history along with the newest submitted rate
        // Expect the earliest submission contract revision to be attached to first submission rate revision
        expect(
            latestRateOneResubmit.revisions[2].submitInfo?.updatedReason
        ).toBe('initial contract submit')

        // Expect the resubmitted rate revision to have the attached contract revision that was attached to this rate
        expect(
            latestRateOneResubmit.revisions[1].submitInfo?.updatedReason
        ).toBe('resubmit contract')

        // Expect the latest resubmitted rate revision to have no attached contract revision
        expect(
            latestRateOneResubmit.revisions[0].submitInfo?.updatedReason
        ).toBe('resubmit without contract')
    })

    it('matches contract revision to rate revision with independent rate submit and unlocks', async () => {
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
                                id: uuidv4(),
                                rateType: 'NEW',
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

        const draftRateRevision =
            getDraftContractRateRevisions(updatedContract)[0]

        if (!draftRateRevision) {
            throw new Error('Unexpected Error: No rate found in contract')
        }

        const contractID = updatedContract.id
        const rateID = draftRateRevision?.rateID

        // Submit contract
        must(
            await submitContract(client, {
                contractID: draftContract.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit contract revision 1.0',
            })
        )

        let submittedRate = must(await findRateWithHistory(client, rateID))

        // Expect rate revision 1.0 to have contract revision 1.0
        expect(submittedRate.revisions[0].submitInfo?.updatedReason).toBe(
            'submit contract revision 1.0'
        )

        // Unlock and resubmit contract
        must(
            await unlockContract(client, {
                contractID,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock contract revision 1.0',
            })
        )
        must(
            await submitContract(client, {
                contractID,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit contract revision 1.1',
            })
        )

        submittedRate = must(await findRateWithHistory(client, rateID))

        // Expect rate revision 1.0 to have contract revision 1.1
        expect(submittedRate.revisions[0].submitInfo?.updatedReason).toBe(
            'submit contract revision 1.1'
        )

        // Unlock and resubmit rate
        must(
            await unlockRate(client, {
                rateID,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock rate revision 1.0',
            })
        )
        must(
            await submitRate(client, {
                rateID,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit rate revision 1.1',
            })
        )

        // Fetch fresh data
        submittedRate = must(await findRateWithHistory(client, rateID))

        // Expect latest rate revision to be 1.1 and have contract revision 1.1
        expect(submittedRate.revisions[0].submitInfo?.updatedReason).toBe(
            'submit rate revision 1.1'
        )

        // Expect earilest rate revision to be 1.0 and have contract revision 1.1
        expect(submittedRate.revisions[1].submitInfo?.updatedReason).toBe(
            'submit contract revision 1.1'
        )

        // Expect earilest rate revision to be 1.0 and have contract revision 1.1
        expect(submittedRate.revisions[2].submitInfo?.updatedReason).toBe(
            'submit contract revision 1.0'
        )

        // Unlock rate and resubmit
        must(
            await unlockRate(client, {
                rateID,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock rate revision 1.1',
            })
        )
        must(
            await submitRate(client, {
                rateID,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit rate revision 1.2',
            })
        )

        // Fetch fresh data
        submittedRate = must(await findRateWithHistory(client, rateID))

        // Expect latest rate revision to be 1.2 and have contract revision 1.2
        expect(submittedRate.revisions[0].submitInfo?.updatedReason).toBe(
            'submit rate revision 1.2'
        )

        // Expect previous rate revisions to still be connected to the same contract revision
        expect(submittedRate.revisions[1].submitInfo?.updatedReason).toBe(
            'submit rate revision 1.1'
        )
        expect(submittedRate.revisions[2].submitInfo?.updatedReason).toBe(
            'submit contract revision 1.1'
        )

        // create a new contract linked to it and submit many times
        const draftContract2Data = mockInsertContractArgs({
            submissionDescription: 'two contract',
        })
        const draft2Contract = must(
            await insertDraftContract(client, draftContract2Data)
        )

        const updatedContract2 = must(
            await updateDraftContractRates(client, {
                contractID: draft2Contract.id,
                rateUpdates: {
                    create: [],
                    update: [],
                    link: [
                        {
                            rateID: rateID,
                            ratePosition: 1,
                        },
                    ],
                    unlink: [],
                    delete: [],
                },
            })
        )

        // Submit contract
        must(
            await submitContract(client, {
                contractID: updatedContract2.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit contract revision 2.0',
            })
        )

        const contract2ID = updatedContract2.id

        // Multiple contract unlocks and resubmits
        must(
            await unlockContract(client, {
                contractID: contract2ID,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock contract revision 2.0',
            })
        )
        must(
            await submitContract(client, {
                contractID: contract2ID,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit contract revision 2.1',
            })
        )
        must(
            await unlockContract(client, {
                contractID: contract2ID,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock contract revision 2.1',
            })
        )
        must(
            await submitContract(client, {
                contractID: contract2ID,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit contract revision 2.2',
            })
        )
        must(
            await unlockContract(client, {
                contractID: contract2ID,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock contract revision 2.2',
            })
        )
        must(
            await submitContract(client, {
                contractID: contract2ID,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit contract revision 2.3',
            })
        )

        // Fetch fresh data
        submittedRate = must(await findRateWithHistory(client, rateID))

        // Expect latest rate revision to be 1.2 and have contract revision 2.3
        expect(
            submittedRate.packageSubmissions[0].submitInfo?.updatedReason
        ).toBe('submit contract revision 2.3')
        expect(
            submittedRate.packageSubmissions[0].rateRevision.submitInfo
                ?.updatedReason
        ).toBe('submit rate revision 1.2')
        expect(
            submittedRate.packageSubmissions[0].contractRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('submit contract revision 1.1')
        expect(
            submittedRate.packageSubmissions[0].contractRevisions[1].submitInfo
                ?.updatedReason
        ).toBe('submit contract revision 2.3')

        // Expect previous rate revisions to still be connected to the same contract revision
        expect(
            submittedRate.packageSubmissions[1].submitInfo?.updatedReason
        ).toBe('submit contract revision 2.2')
        expect(
            submittedRate.packageSubmissions[1].rateRevision.submitInfo
                ?.updatedReason
        ).toBe('submit rate revision 1.2')
        expect(
            submittedRate.packageSubmissions[1].contractRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('submit contract revision 1.1')
        expect(
            submittedRate.packageSubmissions[1].contractRevisions[1].submitInfo
                ?.updatedReason
        ).toBe('submit contract revision 2.2')

        expect(
            submittedRate.packageSubmissions[2].submitInfo?.updatedReason
        ).toBe('submit contract revision 2.1')
        expect(
            submittedRate.packageSubmissions[2].contractRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('submit contract revision 1.1')

        // 3 rate unlocks and resubmits
        must(
            await unlockRate(client, {
                rateID,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock rate revision 1.2',
            })
        )
        must(
            await submitRate(client, {
                rateID,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit rate revision 1.3',
            })
        )
        must(
            await unlockRate(client, {
                rateID,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock rate revision 1.3',
            })
        )
        must(
            await submitRate(client, {
                rateID,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit rate revision 1.4',
            })
        )
        must(
            await unlockRate(client, {
                rateID,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock rate revision 1.4',
            })
        )
        must(
            await submitRate(client, {
                rateID,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit rate revision 1.5',
            })
        )

        // Fetch fresh data
        submittedRate = must(await findRateWithHistory(client, rateID))

        // Expect to have 6 revisions, 3 additional from 3 unlocks and resubmits
        expect(submittedRate.packageSubmissions).toHaveLength(11)

        // Expect three latest revisions to have contract version 1.5
        expect(
            submittedRate.packageSubmissions[0].submitInfo?.updatedReason
        ).toBe('submit rate revision 1.5')
        expect(
            submittedRate.packageSubmissions[0].contractRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('submit contract revision 1.1')
        expect(
            submittedRate.packageSubmissions[0].contractRevisions[1].submitInfo
                ?.updatedReason
        ).toBe('submit contract revision 2.3')

        expect(
            submittedRate.packageSubmissions[1].submitInfo?.updatedReason
        ).toBe('submit rate revision 1.4')
        expect(
            submittedRate.packageSubmissions[1].contractRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('submit contract revision 1.1')

        expect(
            submittedRate.packageSubmissions[2].submitInfo?.updatedReason
        ).toBe('submit rate revision 1.3')
        expect(
            submittedRate.packageSubmissions[2].contractRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('submit contract revision 1.1')
    })
})

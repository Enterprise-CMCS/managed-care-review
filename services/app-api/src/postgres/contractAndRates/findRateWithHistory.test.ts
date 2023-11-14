import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { v4 as uuidv4 } from 'uuid'
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
import { findContractWithHistory } from './findContractWithHistory'
import type { DraftContractType } from '../../domain-models/contractAndRates/contractTypes'

describe('findRate', () => {
    // TODO: Enable this tests again after reimplementing rate change history that was in contractWithHistoryToDomainModel
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('finds a stripped down rate with history', async () => {
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

        // setup a single test rate
        const draftRateData = createInsertRateData({
            rateCertificationName: 'one contract',
        })
        const rateA = must(await insertDraftRate(client, draftRateData))

        if (!rateA.draftRevision) {
            throw new Error(
                'Unexpected error: draft rate is missing a draftRevision.'
            )
        }

        // Add 3 contracts 1, 2, 3 pointing to rate A
        const contract1 = must(
            await insertDraftContract(client, {
                stateCode: 'MN',
                submissionDescription: 'someurle.en',
                programIDs: ['13221'],
                submissionType: 'CONTRACT_ONLY',
                contractType: 'BASE',
            })
        )
        must(
            await updateDraftContractWithRates(client, {
                contractID: contract1.id,
                formData: { submissionDescription: 'someurle.en' },
                rateFormDatas: [rateA.draftRevision.formData],
            })
        )

        const contract2 = must(
            await insertDraftContract(client, {
                stateCode: 'MN',
                submissionDescription: 'twopointo',
                programIDs: ['13221'],
                submissionType: 'CONTRACT_ONLY',
                contractType: 'BASE',
            })
        )
        must(
            await updateDraftContractWithRates(client, {
                contractID: contract2.id,
                formData: { submissionDescription: 'twopointo' },
                rateFormDatas: [rateA.draftRevision.formData],
            })
        )

        const contract3 = must(
            await insertDraftContract(client, {
                stateCode: 'MN',
                submissionDescription: 'threepointo',
                programIDs: ['13221'],
                submissionType: 'CONTRACT_ONLY',
                contractType: 'BASE',
            })
        )
        must(
            await updateDraftContractWithRates(client, {
                contractID: contract3.id,
                formData: { submissionDescription: 'threepointo' },
                rateFormDatas: [rateA.draftRevision.formData],
            })
        )

        // Submit rateA
        const submittedRateA = must(
            await submitRate(client, {
                rateID: rateA.id,
                submittedByUserID: stateUser.id,
                submitReason: 'initial rate submit',
            })
        )

        // Submit Contract 1, 2, and 3
        must(
            await submitContract(client, {
                contractID: contract1.id,
                submittedByUserID: stateUser.id,
                submitReason: 'Contract Submit',
            })
        )
        must(
            await submitContract(client, {
                contractID: contract2.id,
                submittedByUserID: stateUser.id,
                submitReason: 'ContractSubmit 2',
            })
        )
        must(
            await submitContract(client, {
                contractID: contract3.id,
                submittedByUserID: stateUser.id,
                submitReason: '3.0 create',
            })
        )

        // Now, find that rate and assert the history is what we expected
        const threeRate = must(await findRateWithHistory(client, rateA.id))
        if (threeRate instanceof Error) {
            throw threeRate
        }
        expect(threeRate.revisions).toHaveLength(4)

        // remove the connection from contract 2
        const unlockedContract2 = must(
            await unlockContract(client, {
                contractID: contract2.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock for 2.1 remove',
            })
        )
        must(
            await updateDraftContractWithRates(client, {
                contractID: unlockedContract2.id,
                formData: {
                    submissionType: 'CONTRACT_AND_RATES',
                    submissionDescription: 'a.2 body',
                    contractType: 'BASE',
                    populationCovered: 'MEDICAID',
                    riskBasedContract: false,
                },
                rateFormDatas:
                    unlockedContract2.draftRevision?.rateRevisions.filter(
                        (rate) => rate.formData.rateID !== submittedRateA.id
                    ),
            })
        )
        must(
            await submitContract(client, {
                contractID: contract2.id,
                submittedByUserID: stateUser.id,
                submitReason: '2.1 remove',
            })
        )

        // Now, find that contract and assert the history is what we expected
        const twoRate = must(
            await findRateWithHistory(client, submittedRateA.id)
        )
        if (twoRate instanceof Error) {
            throw twoRate
        }
        expect(twoRate.revisions).toHaveLength(5)
        expect(twoRate.revisions[0].contractRevisions).toHaveLength(2)

        // update rate 1 to have a new version, should make one new rev.
        const unlockedContract1 = must(
            await unlockContract(client, {
                contractID: contract1.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock for 1.1',
            })
        ) as DraftContractType
        must(
            await updateDraftContractWithRates(client, {
                contractID: unlockedContract1.id,
                formData: { submissionDescription: 'onepointone' },
                rateFormDatas: [rateA.draftRevision.formData],
            })
        )
        must(
            await submitContract(client, {
                contractID: contract1.id,
                submittedByUserID: stateUser.id,
                submitReason: '1.1 new name',
            })
        )

        // Now, find that contract and assert the history is what we expected
        const backAgainRate = must(
            await findRateWithHistory(client, submittedRateA.id)
        )
        if (backAgainRate instanceof Error) {
            throw backAgainRate
        }
        expect(backAgainRate.revisions).toHaveLength(6)

        // Make a new Contract Revision, should show up as a single new rev with all the old info
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
                submitReason: 'Submitting A.1',
            })
        )

        // Now, find that contract and assert the history is what we expected
        let testingRate = must(
            await findRateWithHistory(client, resubmittedRateA.id)
        )
        if (testingRate instanceof Error) {
            throw testingRate
        }
        expect(testingRate.revisions).toHaveLength(7)

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
                    rateType: 'AMENDMENT',
                },
                contractIDs: [contract3.id],
            })
        )
        const secondResubmitRateA = must(
            await submitRate(client, {
                rateID: rateA.id,
                submittedByUserID: stateUser.id,
                submitReason: 'Submitting A.2',
            })
        )

        // Now, find that contract and assert the history is what we expected
        testingRate = must(
            await findRateWithHistory(client, secondResubmitRateA.id)
        )
        if (testingRate instanceof Error) {
            throw testingRate
        }
        expect(testingRate.revisions).toHaveLength(8)

        // Now, find that contract and assert the history is what we expected
        const resultingRate = must(
            await findRateWithHistory(client, secondResubmitRateA.id)
        )
        if (resultingRate instanceof Error) {
            throw resultingRate
        }

        const revisionsInTimeOrder = resultingRate.revisions.reverse()

        console.info(
            'ALL First REvisions: ',
            JSON.stringify(revisionsInTimeOrder, null, '  ')
        )

        // Each Revision needs a Reason, one of the rates or revisions associated with it should have changed and why.

        expect(revisionsInTimeOrder).toHaveLength(8)
        expect(revisionsInTimeOrder[0].contractRevisions).toHaveLength(0)
        expect(revisionsInTimeOrder[0].unlockInfo).toBeUndefined()
        expect(revisionsInTimeOrder[0].submitInfo?.updatedReason).toBe(
            'initial rate submit'
        )

        expect(revisionsInTimeOrder[1].contractRevisions).toHaveLength(1)
        expect(revisionsInTimeOrder[1].unlockInfo).toBeUndefined()
        expect(revisionsInTimeOrder[1].submitInfo?.updatedReason).toBe(
            'Contract Submit'
        )

        expect(revisionsInTimeOrder[2].contractRevisions).toHaveLength(2)
        expect(revisionsInTimeOrder[2].unlockInfo).toBeUndefined()
        expect(revisionsInTimeOrder[2].submitInfo?.updatedReason).toBe(
            'ContractSubmit 2'
        )

        expect(revisionsInTimeOrder[3].contractRevisions).toHaveLength(3)
        expect(revisionsInTimeOrder[3].unlockInfo).toBeUndefined()
        expect(revisionsInTimeOrder[3].submitInfo?.updatedReason).toBe(
            '3.0 create'
        )

        expect(revisionsInTimeOrder[4].contractRevisions).toHaveLength(2)
        expect(revisionsInTimeOrder[4].unlockInfo?.updatedReason).toBe(
            'unlock for 2.1 remove'
        )
        expect(revisionsInTimeOrder[4].unlockInfo?.updatedBy).toBe(
            'zuko@example.com'
        )
        expect(revisionsInTimeOrder[4].submitInfo?.updatedReason).toBe(
            '2.1 remove'
        )

        expect(revisionsInTimeOrder[5].contractRevisions).toHaveLength(2)
        expect(
            revisionsInTimeOrder[5].contractRevisions[1].formData
                .submissionDescription
        ).toBe('onepointone')
        expect(revisionsInTimeOrder[5].unlockInfo?.updatedReason).toBe(
            'unlock for 1.1'
        )
        expect(revisionsInTimeOrder[5].submitInfo?.updatedReason).toBe(
            '1.1 new name'
        )

        expect(revisionsInTimeOrder[6].contractRevisions).toHaveLength(2)
        expect(revisionsInTimeOrder[6].submitInfo?.updatedReason).toBe(
            'Submitting A.1'
        )

        expect(revisionsInTimeOrder[7].contractRevisions).toHaveLength(1)
        expect(revisionsInTimeOrder[7].formData).toEqual(
            expect.objectContaining({
                rateCertificationName: 'one contract',
                rateDateCertified: undefined,

                rateType: 'AMENDMENT',
            })
        )
        expect(revisionsInTimeOrder[7].submitInfo?.updatedReason).toBe(
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

        expect(contract1fetched.revisions).toHaveLength(4)
        expect(contract1fetched.revisions[0].submitInfo?.updatedReason).toBe(
            'Submitting A.2'
        )
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
        const draftContractData = createInsertContractData({
            submissionDescription: 'initial rate two submit',
        })
        const draftContract = must(
            await insertDraftContract(client, draftContractData)
        )
        const contractID = draftContract.id

        // Create rate 1
        const draftRateOne = must(
            await insertDraftRate(client, {
                stateCode: 'MN',
                rateCertificationName: 'first submission rate revision',
            })
        )

        // Create rate 2
        const draftRateTwo = must(
            await insertDraftRate(client, {
                stateCode: 'MN',
                rateCertificationName: 'second submission rate revision',
            })
        )

        const rateIDOne = draftRateOne.id
        const rateIDTwo = draftRateTwo.id

        // Update contract with both rates
        must(
            await updateDraftContractWithRates(client, {
                contractID,
                formData: {},
                rateFormDatas: [
                    { ...draftRateOne.draftRevision?.formData },
                    { ...draftRateTwo.draftRevision?.formData },
                ],
            })
        )

        // Submit rates then contract
        must(
            await submitRate(client, {
                rateID: rateIDOne,
                submittedByUserID: stateUser.id,
                submitReason: 'initial rate one submit',
            })
        )
        // Submit rate then contract
        must(
            await submitRate(client, {
                rateID: rateIDTwo,
                submittedByUserID: stateUser.id,
                submitReason: 'initial rate two submit',
            })
        )
        must(
            await submitContract(client, {
                contractID,
                submittedByUserID: stateUser.id,
                submitReason: 'initial contract submit',
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
        ).toBe('initial rate one submit')
        expect(
            fetchSubmittedRateOne.revisions[0].contractRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('initial contract submit')

        //Rate two history
        const fetchSubmittedRateTwo = must(
            await findRateWithHistory(client, rateIDTwo)
        )
        expect(fetchSubmittedRateTwo.revisions).toHaveLength(1)
        // Expect initial rate two submit to be attached to first submission rate revision
        expect(
            fetchSubmittedRateTwo.revisions[0].submitInfo?.updatedReason
        ).toBe('initial rate two submit')
        expect(
            fetchSubmittedRateTwo.revisions[0].contractRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('initial contract submit')

        // Unlock rate and contract
        must(
            await unlockRate(client, {
                rateID: rateIDOne,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'Unlock rate one submission',
            })
        )

        must(
            await unlockRate(client, {
                rateID: rateIDTwo,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'Unlock rate two submission',
            })
        )

        must(
            await unlockContract(client, {
                contractID,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'Unlock first contract submission',
            })
        )

        // Resubmit rates then contract
        must(
            await submitRate(client, {
                rateID: rateIDOne,
                submittedByUserID: stateUser.id,
                submitReason: 'resubmit rate one',
            })
        )
        must(
            await submitRate(client, {
                rateID: rateIDTwo,
                submittedByUserID: stateUser.id,
                submitReason: 'resubmit rate two',
            })
        )
        must(
            await submitContract(client, {
                contractID,
                submittedByUserID: stateUser.id,
                submitReason: 'resubmit contract',
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
        ).toBe('initial rate one submit')
        expect(
            fetchResubmittedRateOne.revisions[1].contractRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('initial contract submit')
        // Expect the latest submission contract revision to be attached to latest submission rate revision
        expect(
            fetchResubmittedRateOne.revisions[0].submitInfo?.updatedReason
        ).toBe('resubmit rate one')
        expect(
            fetchResubmittedRateOne.revisions[0].contractRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('resubmit contract')

        // Rate two resubmission history
        const fetchResubmittedRateTwo = must(
            await findRateWithHistory(client, rateIDTwo)
        )
        expect(fetchResubmittedRateTwo.revisions).toHaveLength(2)
        // Expect the earliest submission contract revision to be attached to first submission rate revision
        expect(
            fetchResubmittedRateTwo.revisions[1].submitInfo?.updatedReason
        ).toBe('initial rate two submit')
        expect(
            fetchResubmittedRateTwo.revisions[1].contractRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('initial contract submit')
        // Expect the latest submission contract revision to be attached to latest submission rate revision
        expect(
            fetchResubmittedRateTwo.revisions[0].submitInfo?.updatedReason
        ).toBe('resubmit rate two')
        expect(
            fetchResubmittedRateTwo.revisions[0].contractRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('resubmit contract')

        // Unlock rate and contract and remove rate one from contract
        must(
            await unlockRate(client, {
                rateID: rateIDOne,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'Unlock to remove this rate from contract',
            })
        )

        const unlockedRateTwo = must(
            await unlockRate(client, {
                rateID: rateIDTwo,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'No edits to this rate',
            })
        )

        must(
            await unlockContract(client, {
                contractID,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'Unlock to remove rate one from contract',
            })
        )

        // Remove rate one from contact
        must(
            await updateDraftContractWithRates(client, {
                contractID,
                formData: {
                    submissionDescription: 'remove rate',
                },
                rateFormDatas: [
                    {
                        ...unlockedRateTwo.draftRevision?.formData,
                    },
                ],
            })
        )

        // Submit rate two and contract
        must(
            await submitRate(client, {
                rateID: rateIDTwo,
                submittedByUserID: stateUser.id,
                submitReason: 're-resubmit rate two',
            })
        )
        must(
            await submitContract(client, {
                contractID,
                submittedByUserID: stateUser.id,
                submitReason:
                    'resubmit contract removing rate one leaving only rate two',
            })
        )

        // Unlocked Rate one history
        const fetchUnlockedRateOne = must(
            await findRateWithHistory(client, rateIDOne)
        )
        // Expect unlocked rate to have a draftRevision
        expect(fetchUnlockedRateOne.draftRevision).toBeDefined()
        // Expect our draft revision to have no contract revisions after we removed it
        expect(
            fetchUnlockedRateOne.draftRevision?.contractRevisions
        ).toHaveLength(0)
        // Expect our unlocked rate to still have the same revision data (revision history)
        // Expect the earliest submission contract revision to be attached to first submission rate revision
        expect(
            fetchUnlockedRateOne.revisions[1].submitInfo?.updatedReason
        ).toBe('initial rate one submit')
        expect(
            fetchUnlockedRateOne.revisions[1].contractRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('initial contract submit')
        // Expect the resubmitted rate revision to have the attached contract revision that was attached to this rate
        expect(
            fetchUnlockedRateOne.revisions[0].submitInfo?.updatedReason
        ).toBe('resubmit rate one')
        expect(
            fetchUnlockedRateOne.revisions[0].contractRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('resubmit contract')

        // Rate two re-resubmission history
        const latestRateOneResubmit = must(
            await findRateWithHistory(client, rateIDTwo)
        )
        expect(latestRateOneResubmit.revisions).toHaveLength(3)
        // Expect the earliest submission contract revision to be attached to first submission rate revision
        expect(
            latestRateOneResubmit.revisions[2].submitInfo?.updatedReason
        ).toBe('initial rate two submit')
        expect(
            latestRateOneResubmit.revisions[2].contractRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('initial contract submit')
        // Expect the first resubmission contract revision to be attached to first resubmission rate revision
        expect(
            latestRateOneResubmit.revisions[1].submitInfo?.updatedReason
        ).toBe('resubmit rate two')
        expect(
            latestRateOneResubmit.revisions[1].contractRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('resubmit contract')
        // Expect the latest submission contract revision to be attached to latest submission rate revision
        expect(
            latestRateOneResubmit.revisions[0].submitInfo?.updatedReason
        ).toBe('re-resubmit rate two')
        expect(
            latestRateOneResubmit.revisions[0].contractRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('resubmit contract removing rate one leaving only rate two')

        // Rate one re-resubmission history
        const latestRateTwoResubmit = must(
            await submitRate(client, {
                rateID: rateIDOne,
                submitReason: 'resubmit without contract',
                submittedByUserID: stateUser.id,
            })
        )

        // Expect no draft revision
        expect(latestRateTwoResubmit.draftRevision).toBeUndefined()

        // Expect our resubmitted rate to still have the same revision history along with the newest submitted rate
        // Expect the earliest submission contract revision to be attached to first submission rate revision
        expect(
            latestRateTwoResubmit.revisions[2].submitInfo?.updatedReason
        ).toBe('initial rate one submit')
        expect(
            latestRateTwoResubmit.revisions[2].contractRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('initial contract submit')

        // Expect the resubmitted rate revision to have the attached contract revision that was attached to this rate
        expect(
            latestRateTwoResubmit.revisions[1].submitInfo?.updatedReason
        ).toBe('resubmit rate one')
        expect(
            latestRateTwoResubmit.revisions[1].contractRevisions[0].submitInfo
                ?.updatedReason
        ).toBe('resubmit contract')

        // Expect the latest resubmitted rate revision to have no attached contract revision
        expect(
            latestRateTwoResubmit.revisions[0].submitInfo?.updatedReason
        ).toBe('resubmit without contract')
        expect(
            latestRateTwoResubmit.revisions[0].contractRevisions
        ).toHaveLength(0)
    })
})

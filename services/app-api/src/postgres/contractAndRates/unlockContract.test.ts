import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { v4 as uuidv4 } from 'uuid'
import { insertDraftContract } from './insertContract'
import { unlockContract } from './unlockContract'
import { insertDraftRate } from './insertRate'
import { unlockRate } from './unlockRate'
import { submitRate } from './submitRate'
import { updateDraftContractFormData } from './updateDraftContractWithRates'
import { updateDraftRate } from './updateDraftRate'
import { submitContract } from './submitContract'
import { findContractWithHistory } from './findContractWithHistory'
import { must, mockInsertContractArgs } from '../../testHelpers'
import { updateDraftContractRates } from './updateDraftContractRates'

describe('unlockContract', () => {
    it('Unlocks a rate without breaking connected draft contract', async () => {
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
            submissionDescription: 'Contract 1.0',
        })

        //Creat a draft contract and draft rate
        const contract = must(
            await insertDraftContract(client, draftContractData)
        )
        const rate = must(
            await insertDraftRate(client, contract.id, {
                stateCode: 'MN',
                rateCertificationName: 'Rate 1.0',
            })
        )

        // Submit Contract With Rate A
        const submittedContractWithRateA = must(
            await submitContract(client, {
                contractID: contract.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'Rate A 1.0 submit',
            })
        )

        const submittedRateAID =
            submittedContractWithRateA.packageSubmissions[0].rateRevisions[0]
                .rateID

        const contract2 = must(
            await insertDraftContract(client, draftContractData)
        )
        // Connect draft contract to submitted rate
        must(
            await updateDraftContractRates(client, {
                contractID: contract2.id,
                rateUpdates: {
                    create: [],
                    update: [],
                    link: [
                        {
                            rateID: rate.id,
                            ratePosition: 1,
                        },
                    ],
                    unlink: [],
                    delete: [],
                },
            })
        )

        const fullDraftContract = must(
            await findContractWithHistory(client, contract2.id)
        )

        const draftContractRev = fullDraftContract.draftRevision
        const draftRates = fullDraftContract.draftRates

        if (draftContractRev === undefined || draftRates === undefined) {
            throw Error('Unexpect error: draft contract missing draft revision')
        }

        // Rate revision should be connected to contract
        expect(draftRates[0].id).toEqual(submittedRateAID)

        // Unlock the rate
        must(
            await unlockRate(client, {
                rateID: rate.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'Unlocking rate',
            })
        )
        must(
            await updateDraftRate(client, {
                rateID: rate.id,
                formData: { rateCertificationName: 'Rate 2.0' },
                contractIDs: [],
            })
        )

        const resubmittedRate = must(
            await submitRate(client, {
                rateID: rate.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'Updated things',
            })
        )

        const fullDraftContractTwo = must(
            await findContractWithHistory(client, contract2.id)
        )

        const draftContractRevTwo = fullDraftContractTwo.draftRevision
        const draftContractTwoDraftRates = fullDraftContractTwo.draftRates

        if (
            draftContractRevTwo === undefined ||
            draftContractTwoDraftRates === undefined
        ) {
            throw Error('Unexpect error: draft contract missing draft revision')
        }

        // Contract should now have the latest rate revision
        expect(draftContractTwoDraftRates[0].id).toEqual(resubmittedRate.id)
    })

    // This is unlocking a rate without unlocking the contract that this rate belongs to. Then it updates the rate and resubmits.
    // The rate gets a new revision, but the submitted contract does not.
    // This test does not simulate how creating/updating a rate currently works in our app and the contract revision history
    // will not match.
    // Skipping this for now, revisit during rate only feature work.
    // eslint-disable-next-line jest/no-disabled-tests
    it.skip('Unlocks a rate without breaking connected submitted contract', async () => {
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
            submissionDescription: 'Contract 1.0',
        })

        //Creat a draft contract and draft rate
        const contract = must(
            await insertDraftContract(client, draftContractData)
        )
        const rate = must(
            await insertDraftRate(client, contract.id, {
                stateCode: 'MN',
                rateCertificationName: 'Rate 1.0',
            })
        )

        // Submit Rate A
        const submittedRate = must(
            await submitRate(client, {
                rateID: rate.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'Rate 1.0 submit',
            })
        )

        // Connect draft contract to submitted rate
        must(
            await updateDraftContractFormData(client, {
                contractID: contract.id,
                formData: {
                    submissionType: 'CONTRACT_AND_RATES',
                    submissionDescription: 'Connecting rate',
                    contractType: 'BASE',
                    programIDs: ['PMAP'],
                    populationCovered: 'MEDICAID',
                    riskBasedContract: false,
                },
            })
        )

        must(
            await updateDraftContractRates(client, {
                contractID: contract.id,
                rateUpdates: {
                    create: [],
                    update: [],
                    link: [
                        {
                            rateID: submittedRate.id,
                            ratePosition: 1,
                        },
                    ],
                    unlink: [],
                    delete: [],
                },
            })
        )

        // Submit contract
        const submittedContract = must(
            await submitContract(client, {
                contractID: contract.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'Initial Submit',
            })
        )
        // Latest revision is the last index
        const latestSubmission = submittedContract.packageSubmissions[0]

        // Expect rate to be connected to submitted contract
        expect(latestSubmission.rateRevisions[0].id).toEqual(
            submittedRate.revisions[0].id
        )

        // Unlock the rate and resubmit rate
        must(
            await unlockRate(client, {
                rateID: rate.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'Unlocking rate',
            })
        )
        must(
            await updateDraftRate(client, {
                rateID: rate.id,
                formData: { rateCertificationName: 'Rate 2.0' },
                contractIDs: [contract.id],
            })
        )
        const resubmittedRate = must(
            await submitRate(client, {
                rateID: rate.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'Rate resubmit',
            })
        )

        // Expect rate to still be connected to submitted contract
        const submittedContract2 = must(
            await findContractWithHistory(client, contract.id)
        )
        // Latest revision is the last index
        const latestResubmittedPackage =
            submittedContract2.packageSubmissions[0]

        // Expect latest contract revision to now be connected to latest rate revision
        expect(latestResubmittedPackage.rateRevisions[0].id).toEqual(
            resubmittedRate.revisions[0].id
        )
    })

    it('Unlocks a contract without breaking connection to rate', async () => {
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
            submissionDescription: 'Contract 1.0',
        })

        //Creat a draft contract and draft rate
        const contract = must(
            await insertDraftContract(client, draftContractData)
        )
        const rate = must(
            await insertDraftRate(client, contract.id, {
                stateCode: 'MN',
                rateCertificationName: 'rate 1.0',
            })
        )

        if (!rate.draftRevision) {
            throw new Error(
                'Unexpected error: draft rate is missing a draftRevision.'
            )
        }

        // Submit contract
        const submittedContract = must(
            await submitContract(client, {
                contractID: contract.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'Submit contract 1.0',
            })
        )
        const lastestSubmission = submittedContract.packageSubmissions[0]

        expect(lastestSubmission.rateRevisions[0].id).toEqual(
            rate.draftRevision.id
        )

        // Unlock and resubmit contract
        must(
            await unlockContract(client, {
                contractID: contract.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'First unlock',
            })
        )

        const resubmittedContract = must(
            await submitContract(client, {
                contractID: contract.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'Submit contract 2.0',
            })
        )
        const latestResubmission = resubmittedContract.packageSubmissions[0]

        // Expect rate revision to still be connected
        expect(latestResubmission.rateRevisions[0].rateID).toEqual(
            rate.draftRevision.rateID
        )
    })
    it('errors when unlocking a draft contract or rate', async () => {
        const client = await sharedTestPrismaClient()

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
            submissionDescription: 'Contract 1.0',
        })

        //Creat a draft contract
        const contractA = must(
            await insertDraftContract(client, draftContractData)
        )
        const rateA = must(
            await insertDraftRate(client, contractA.id, {
                stateCode: 'MN',
                rateCertificationName: 'rate A 1.1',
            })
        )

        //Unlocking it results in error
        expect(
            await unlockContract(client, {
                contractID: contractA.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlocking contact A 1.1',
            })
        ).toBeInstanceOf(Error)
        expect(
            await unlockRate(client, {
                rateID: rateA.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlocking rate A 1.1',
            })
        ).toBeInstanceOf(Error)
    })
})

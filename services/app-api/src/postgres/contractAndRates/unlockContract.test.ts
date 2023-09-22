// // For use in TESTS only. Throws a returned error
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { v4 as uuidv4 } from 'uuid'
import { insertDraftContract } from './insertContract'
import { unlockContract } from './unlockContract'
import { insertDraftRate } from './insertRate'
import { unlockRate } from './unlockRate'
import { submitRate } from './submitRate'
import { updateDraftContractWithRates } from './updateDraftContractWithRates'
import { updateDraftRate } from './updateDraftRate'
import { submitContract } from './submitContract'
import { findContractWithHistory } from './findContractWithHistory'
import { must, createInsertContractData } from '../../testHelpers'

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

        const draftContractData = createInsertContractData({
            submissionDescription: 'Contract 1.0',
        })

        //Creat a draft contract and draft rate
        const contract = must(
            await insertDraftContract(client, draftContractData)
        )
        const rate = must(
            await insertDraftRate(client, {
                stateCode: 'MN',
                rateCertificationName: 'Rate 1.0',
            })
        )

        // Submit Rate A
        const submittedRate = must(
            await submitRate(client, {
                rateID: rate.id,
                submittedByUserID: stateUser.id,
                submitReason: 'Rate A 1.0 submit',
            })
        )

        // Connect draft contract to submitted rate
        must(
            await updateDraftContractWithRates(client, {
                contractID: contract.id,
                formData: {
                    submissionType: 'CONTRACT_AND_RATES',
                    submissionDescription: 'Connecting rate',
                    contractType: 'BASE',
                    programIDs: ['PMAP'],
                    populationCovered: 'MEDICAID',
                    riskBasedContract: false,
                },
                rateFormDatas: [submittedRate.revisions[0].formData],
            })
        )

        const fullDraftContract = must(
            await findContractWithHistory(client, contract.id)
        )

        const draftContract = fullDraftContract.draftRevision

        if (draftContract === undefined) {
            throw Error('Unexpect error: draft contract missing draft revision')
        }

        // Rate revision should be connected to contract
        expect(draftContract.rateRevisions[0].id).toEqual(
            submittedRate.revisions[0].id
        )

        // Unlock the rate
        must(await unlockRate(client, rate.id, cmsUser.id, 'Unlocking rate'))
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
                submitReason: 'Updated things',
            })
        )

        const fullDraftContractTwo = must(
            await findContractWithHistory(client, contract.id)
        )

        const draftContractTwo = fullDraftContractTwo.draftRevision

        if (draftContractTwo === undefined) {
            throw Error('Unexpect error: draft contract missing draft revision')
        }

        // Contract should now have the latest rate revision
        expect(draftContractTwo.rateRevisions[0].id).toEqual(
            resubmittedRate.revisions[0].id
        )
    })

    it('Unlocks a rate without breaking connected submitted contract', async () => {
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

        const draftContractData = createInsertContractData({
            submissionDescription: 'Contract 1.0',
        })

        //Creat a draft contract and draft rate
        const contract = must(
            await insertDraftContract(client, draftContractData)
        )
        const rate = must(
            await insertDraftRate(client, {
                stateCode: 'MN',
                rateCertificationName: 'Rate 1.0',
            })
        )

        // Submit Rate A
        const submittedRate = must(
            await submitRate(client, {
                rateID: rate.id,
                submittedByUserID: stateUser.id,
                submitReason: 'Rate 1.0 submit',
            })
        )

        // Connect draft contract to submitted rate
        must(
            await updateDraftContractWithRates(client, {
                contractID: contract.id,
                formData: {
                    submissionType: 'CONTRACT_AND_RATES',
                    submissionDescription: 'Connecting rate',
                    contractType: 'BASE',
                    programIDs: ['PMAP'],
                    populationCovered: 'MEDICAID',
                    riskBasedContract: false,
                },
                rateFormDatas: [submittedRate.revisions[0].formData],
            })
        )

        // Submit contract
        const submittedContract = must(
            await submitContract(client, {
                contractID: contract.id,
                submittedByUserID: stateUser.id,
                submitReason: 'Initial Submit',
            })
        )
        // Latest revision is the last index
        const latestContractRev = submittedContract.revisions[0]

        // Expect rate to be connected to submitted contract
        expect(latestContractRev.rateRevisions[0].id).toEqual(
            submittedRate.revisions[0].id
        )

        // Unlock the rate and resubmit rate
        must(await unlockRate(client, rate.id, cmsUser.id, 'Unlocking rate'))
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
                submitReason: 'Rate resubmit',
            })
        )

        // Expect rate to still be connected to submitted contract
        const submittedContract2 = must(
            await findContractWithHistory(client, contract.id)
        )
        // Latest revision is the last index
        const latestResubmittedRev = submittedContract2.revisions[0]

        // Expect latest contract revision to now be connected to latest rate revision
        expect(latestResubmittedRev.rateRevisions[0].id).toEqual(
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

        const draftContractData = createInsertContractData({
            submissionDescription: 'Contract 1.0',
        })

        //Creat a draft contract and draft rate
        const contract = must(
            await insertDraftContract(client, draftContractData)
        )
        const rate = must(
            await insertDraftRate(client, {
                stateCode: 'MN',
                rateCertificationName: 'rate 1.0',
            })
        )

        if (!rate.draftRevision) {
            throw new Error(
                'Unexpected error: draft rate is missing a draftRevision.'
            )
        }

        // Connect draft contract to draft rate
        must(
            await updateDraftContractWithRates(client, {
                contractID: contract.id,
                formData: {
                    submissionType: 'CONTRACT_AND_RATES',
                    submissionDescription: 'contract 1.0',
                    contractType: 'BASE',
                    programIDs: ['PMAP'],
                    populationCovered: 'MEDICAID',
                    riskBasedContract: false,
                },
                rateFormDatas: [rate.draftRevision?.formData],
            })
        )

        // Submit rate
        const submittedRate = must(
            await submitRate(client, {
                rateID: rate.id,
                submittedByUserID: stateUser.id,
                submitReason: 'Submit rate 1.0',
            })
        )

        // Submit contract
        const submittedContract = must(
            await submitContract(client, {
                contractID: contract.id,
                submittedByUserID: stateUser.id,
                submitReason: 'Submit contract 1.0',
            })
        )
        const latestContractRev = submittedContract.revisions[0]

        expect(latestContractRev.rateRevisions[0].id).toEqual(
            submittedRate.revisions[0].id
        )

        // Unlock and resubmit contract
        must(
            await unlockContract(
                client,
                contract.id,
                cmsUser.id,
                'First unlock'
            )
        )
        must(
            await updateDraftContractWithRates(client, {
                contractID: contract.id,
                formData: {
                    submissionType: 'CONTRACT_AND_RATES',
                    submissionDescription: 'contract 2.0',
                    contractType: 'BASE',
                    programIDs: ['PMAP'],
                    populationCovered: 'MEDICAID',
                    riskBasedContract: false,
                },
                rateFormDatas: [rate.draftRevision?.formData],
            })
        )

        const resubmittedContract = must(
            await submitContract(client, {
                contractID: contract.id,
                submittedByUserID: stateUser.id,
                submitReason: 'Submit contract 2.0',
            })
        )
        const latestResubmittedRev = resubmittedContract.revisions[0]

        // Expect rate revision to still be connected
        expect(latestResubmittedRev.rateRevisions[0].id).toEqual(
            submittedRate.revisions[0].id
        )
    })
    it('errors when submitting a contract that has a draft rate', async () => {
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

        const draftContractData = createInsertContractData({
            submissionDescription: 'Contract 1.0',
        })

        //Creat a draft contract and draft rate
        const contract = must(
            await insertDraftContract(client, draftContractData)
        )
        const rate = must(
            await insertDraftRate(client, {
                stateCode: 'MN',
                rateCertificationName: 'rate 1.0',
            })
        )

        if (!rate.draftRevision) {
            throw new Error(
                'Unexpected error: draft rate is missing a draftRevision.'
            )
        }

        // Connect draft contract to submitted rate
        must(
            await updateDraftContractWithRates(client, {
                contractID: contract.id,
                formData: {
                    submissionType: 'CONTRACT_AND_RATES',
                    submissionDescription: 'contract 1.0',
                    contractType: 'BASE',
                    programIDs: ['PMAP'],
                    populationCovered: 'MEDICAID',
                    riskBasedContract: false,
                },
                rateFormDatas: [rate.draftRevision?.formData],
            })
        )

        // Submit contract
        const submittedContract = await submitContract(client, {
            contractID: contract.id,
            submittedByUserID: stateUser.id,
            submitReason: 'Submit contract 1.0',
        })
        expect(submittedContract).toBeInstanceOf(Error)
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

        const draftContractData = createInsertContractData({
            submissionDescription: 'Contract 1.0',
        })

        //Creat a draft contract
        const contractA = must(
            await insertDraftContract(client, draftContractData)
        )
        const rateA = must(
            await insertDraftRate(client, {
                stateCode: 'MN',
                rateCertificationName: 'rate A 1.1',
            })
        )

        //Unlocking it results in error
        expect(
            await unlockContract(
                client,
                contractA.id,
                cmsUser.id,
                'unlocking contact A 1.1'
            )
        ).toBeInstanceOf(Error)
        expect(
            await unlockRate(
                client,
                rateA.id,
                cmsUser.id,
                'unlocking rate A 1.1'
            )
        ).toBeInstanceOf(Error)
    })
})

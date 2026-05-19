import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { v4 as uuidv4 } from 'uuid'
import { insertDraftContract } from './insertContract'
import { insertDraftRate } from './insertRate'
import { submitContract } from './submitContract'
import { unlockContract } from './unlockContract'
import { undoUnlockContract } from './undoUnlockContract'
import { findContractWithHistory } from './findContractWithHistory'
import { findRateWithHistory } from './findRateWithHistory'
import { must, mockInsertContractArgs } from '../../testHelpers'

describe('undoUnlockContract', () => {
    it('removes the unlocked draft contract and child rate revisions', async () => {
        const client = await sharedTestPrismaClient()

        const stateUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Katara',
                familyName: 'Water',
                email: 'katara@example.com',
                role: 'STATE_USER',
                stateCode: 'NM',
            },
        })

        const cmsUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Toph',
                familyName: 'Beifong',
                email: 'toph@example.com',
                role: 'CMS_USER',
            },
        })

        const contract = must(
            await insertDraftContract(
                client,
                mockInsertContractArgs({
                    submissionDescription: 'Contract 1.0',
                })
            )
        )
        must(
            await insertDraftRate(client, contract.id, {
                stateCode: 'MN',
                rateCertificationName: 'Rate 1.0',
            })
        )

        const submittedContract = must(
            await submitContract(client, {
                contractID: contract.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'Initial submit',
            })
        )

        expect(submittedContract.status).toBe('SUBMITTED')

        const unlockedContract = must(
            await unlockContract(client, {
                contractID: contract.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'Unlock for changes',
            })
        )

        expect(unlockedContract.status).toBe('UNLOCKED')
        expect(unlockedContract.draftRevision).toBeDefined()
        expect(unlockedContract.draftRates[0].draftRevision).toBeDefined()

        const reversedContract = must(
            await undoUnlockContract(client, {
                contractID: contract.id,
                updatedByID: cmsUser.id,
                updatedReason: 'Unlock was accidental',
            })
        )

        expect(reversedContract.status).toBe('SUBMITTED')
        expect(reversedContract.consolidatedStatus).toBe('SUBMITTED')
        expect(reversedContract.draftRevision).toBeUndefined()
        expect(reversedContract.draftRates).toBeUndefined()

        const childRateID =
            reversedContract.packageSubmissions[0].rateRevisions[0].rateID
        const childRate = must(await findRateWithHistory(client, childRateID))

        expect(childRate.status).toBe('SUBMITTED')
        expect(childRate.draftRevision).toBeUndefined()
    })

    it('restores the previous RESUBMITTED state when reversing a second unlock', async () => {
        const client = await sharedTestPrismaClient()

        const stateUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Sokka',
                familyName: 'Boomerang',
                email: 'sokka@example.com',
                role: 'STATE_USER',
                stateCode: 'NM',
            },
        })

        const cmsUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Iroh',
                familyName: 'Tea',
                email: 'iroh@example.com',
                role: 'CMS_USER',
            },
        })

        const contract = must(
            await insertDraftContract(
                client,
                mockInsertContractArgs({
                    submissionDescription: 'Contract 2.0',
                })
            )
        )

        must(
            await submitContract(client, {
                contractID: contract.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'Initial submit',
            })
        )
        must(
            await unlockContract(client, {
                contractID: contract.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'First unlock',
            })
        )
        must(
            await submitContract(client, {
                contractID: contract.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'Resubmitting changes',
            })
        )
        must(
            await unlockContract(client, {
                contractID: contract.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'Second unlock',
            })
        )

        const reversedContract = must(
            await undoUnlockContract(client, {
                contractID: contract.id,
                updatedByID: cmsUser.id,
                updatedReason: 'Second unlock was accidental',
            })
        )

        expect(reversedContract.status).toBe('RESUBMITTED')
        expect(reversedContract.consolidatedStatus).toBe('RESUBMITTED')

        const contractWithHistory = must(
            await findContractWithHistory(client, contract.id)
        )
        expect(contractWithHistory.draftRevision).toBeUndefined()
        expect(
            contractWithHistory.packageSubmissions[0].submitInfo.updatedReason
        ).toBe('Resubmitting changes')
    })
})

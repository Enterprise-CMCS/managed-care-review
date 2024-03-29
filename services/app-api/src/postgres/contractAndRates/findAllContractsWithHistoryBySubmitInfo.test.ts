import { findAllContractsWithHistoryBySubmitInfo } from './findAllContractsWithHistoryBySubmitInfo'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { mockInsertContractArgs, must } from '../../testHelpers'
import { v4 as uuidv4 } from 'uuid'
import { insertDraftContract } from './insertContract'
import { submitContract } from './submitContract'
import { unlockContract } from './unlockContract'

describe('findAllContractsWithHistoryBySubmittedInfo', () => {
    it('returns only contracts that have been submitted or unlocked', async () => {
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

        // make two submitted contracts and submit them
        const contractOne = must(
            await insertDraftContract(client, draftContractData)
        )
        const contractTwo = must(
            await insertDraftContract(client, draftContractData)
        )
        const submittedContractOne = must(
            await submitContract(client, {
                contractID: contractOne.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'contractOne submit',
            })
        )
        const submittedContractTwo = must(
            await submitContract(client, {
                contractID: contractTwo.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'contractTwo submit',
            })
        )

        // make two draft contracts
        const draftContractOne = must(
            await insertDraftContract(client, draftContractData)
        )
        const draftContractTwo = must(
            await insertDraftContract(client, draftContractData)
        )

        // make one unlocked contract
        const contractThree = must(
            await insertDraftContract(client, draftContractData)
        )
        must(
            await submitContract(client, {
                contractID: contractThree.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'unlockContractOne submit',
            })
        )
        const unlockedContract = must(
            await unlockContract(client, {
                contractID: contractThree.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock unlockContractOne',
            })
        )

        // call the find by submit info function
        const contracts = must(
            await findAllContractsWithHistoryBySubmitInfo(client)
        )

        // expect our two submitted contracts
        expect(contracts).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    contractID: submittedContractOne.id,
                }),
                expect.objectContaining({
                    contractID: submittedContractTwo.id,
                }),
            ])
        )

        // expect our one unlocked contract
        expect(contracts).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    contractID: unlockedContract.id,
                }),
            ])
        )

        // expect our two draft contracts to not be in the results
        expect(contracts).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    contractID: draftContractOne.id,
                }),
                expect.objectContaining({
                    contractID: draftContractTwo.id,
                }),
            ])
        )
    })
})

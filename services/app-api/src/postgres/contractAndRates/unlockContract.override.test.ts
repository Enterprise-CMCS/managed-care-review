import { v4 as uuidv4 } from 'uuid'
import { must } from '../../testHelpers/assertionHelpers'
import { mockInsertContractArgs } from '../../testHelpers/contractDataMocks'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { insertDraftContract } from './insertContract'
import { overrideContractData } from './overrideContractData'
import { submitContract } from './submitContract'
import { unlockContract } from './unlockContract'

describe('unlockContract with revision overrides', () => {
    it('copies the effective overridden contractType into the unlocked draft revision', async () => {
        const client = await sharedTestPrismaClient()
        const stateUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Aang',
                familyName: 'Avatar',
                email: 'aang@example.com',
                role: 'STATE_USER',
                stateCode: 'MN',
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
        const draftContract = must(
            await insertDraftContract(
                client,
                mockInsertContractArgs({ contractType: 'BASE' })
            )
        )
        must(
            await submitContract(client, {
                contractID: draftContract.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'initial submit',
            })
        )
        must(
            await overrideContractData(client, {
                contractID: draftContract.id,
                updatedByID: cmsUser.id,
                description: 'Override contract type',
                overrides: {
                    revisionOverride: {
                        contractType: 'AMENDMENT',
                    },
                },
            })
        )

        const unlockedContract = must(
            await unlockContract(client, {
                contractID: draftContract.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock to edit',
            })
        )

        expect(unlockedContract.draftRevision.formData.contractType).toBe(
            'AMENDMENT'
        )
    })
})

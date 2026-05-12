import { v4 as uuidv4 } from 'uuid'
import { must } from '../../testHelpers/assertionHelpers'
import { mockInsertContractArgs } from '../../testHelpers/contractDataMocks'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { insertDraftContract } from './insertContract'
import { overrideContractData } from './overrideContractData'
import { submitContract } from './submitContract'

describe('overrideContractData', () => {
    it('creates contract metadata and revision overrides on the latest submitted revision', async () => {
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
        const submittedContract = must(
            await submitContract(client, {
                contractID: draftContract.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'initial submit',
            })
        )
        const initiallySubmittedAt = new Date('2024-01-01')

        const overriddenContract = must(
            await overrideContractData(client, {
                contractID: draftContract.id,
                updatedByID: cmsUser.id,
                description: 'Override contract metadata',
                overrides: {
                    initiallySubmittedAt,
                    revisionOverride: {
                        contractType: 'AMENDMENT',
                    },
                },
            })
        )

        expect(overriddenContract.contractOverrides?.[0]).toMatchObject({
            description: 'Override contract metadata',
            overrides: {
                initiallySubmittedAt,
                revisionOverride: {
                    contractRevisionID:
                        submittedContract.packageSubmissions[0].contractRevision
                            .id,
                    contractType: 'AMENDMENT',
                },
            },
        })
        expect(overriddenContract.revisions[0].formData.contractType).toBe(
            'AMENDMENT'
        )
    })

    it('rejects overrides unless the contract is submitted or resubmitted', async () => {
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
        const draftContract = must(
            await insertDraftContract(client, mockInsertContractArgs({}))
        )

        const result = await overrideContractData(client, {
            contractID: draftContract.id,
            updatedByID: cmsUser.id,
            description: 'Override draft contract',
            overrides: {
                revisionOverride: {
                    contractType: 'AMENDMENT',
                },
            },
        })

        expect(result).toBeInstanceOf(Error)
        expect((result as Error).message).toContain(
            'contract consolidated status must be SUBMITTED or RESUBMITTED'
        )
    })
})

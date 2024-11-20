import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { mockInsertContractArgs, must } from '../../testHelpers'
import { v4 as uuidv4 } from 'uuid'
import { submitContract } from './submitContract'
import { insertDraftContract } from './insertContract'
import { approveContract } from './approveContract'

describe('approveContract', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })

    it('approves contract correctly', async () => {
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
                givenName: 'Aang',
                familyName: 'Avatar',
                email: 'aang@example.com',
                role: 'CMS_USER',
            },
        })

        const contractData = mockInsertContractArgs({})

        const draftContract = must(
            await insertDraftContract(client, contractData)
        )

        const submittedContract = must(
            await submitContract(client, {
                contractID: draftContract.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'submit contract',
            })
        )

        const approvedContract = must(
            await approveContract(client, {
                contractID: submittedContract.id,
                updatedByID: cmsUser.id,
                updatedReason: undefined,
            })
        )

        expect(approvedContract).toBeDefined()
        expect(approvedContract.reviewStatus).toBe('APPROVED')
        expect(approvedContract.reviewStatusActions![0].actionType).toBe(
            'APPROVAL_AS_APPROVED'
        )
    })
})

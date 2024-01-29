import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { mockInsertContractArgs, must } from '../../testHelpers'
import { updateMCCRSID } from './updateMCCRSID'
import { v4 as uuidv4 } from 'uuid'
import { submitContract } from './submitContract'
import { insertDraftContract } from './insertContract'

describe('updateContract', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })

    it('updates contract correctly', async () => {
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

        const updatedContract = must(
            await updateMCCRSID(client, {
                contractID: submittedContract.id,
                mccrsID: '1234',
            })
        )

        expect(updatedContract).toBeDefined()
        expect(updatedContract.mccrsID).toBe('1234')

        const updatedContractWithNoID = must(
            await updateMCCRSID(client, {
                contractID: submittedContract.id,
            })
        )

        expect(updatedContractWithNoID).toBeDefined()
        expect(updatedContractWithNoID.mccrsID).toBeUndefined()
    })
})

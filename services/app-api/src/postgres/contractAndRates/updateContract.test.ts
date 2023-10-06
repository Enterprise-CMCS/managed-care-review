import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { createContractData, must } from '../../testHelpers'
import { updateContract } from './updateContract'

describe('updateContract', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })

    it('updates contract correctly', async () => {
        const client = await sharedTestPrismaClient()

        const contract = createContractData({})

        const updatedContract = must(
            await updateContract(client, {
                contractID: contract.id,
                mccrsID: '1234',
            })
        )

        expect(updatedContract).toBeDefined()
        expect(updatedContract.mccrsID).toBe('1234')
    })
})

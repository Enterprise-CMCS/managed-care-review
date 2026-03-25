import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { findAllFlattenedContracts } from './findAllFlattenedContracts'

describe('findAllFlattenedContracts', () => {
    it('logs all flattened contract data', async () => {
        const client = await sharedTestPrismaClient()

        const result = await findAllFlattenedContracts(client)

        if (result instanceof Error) {
            console.error('Error fetching flattened contracts:', result.message)
            throw result
        }

        console.info('Flattened contracts:', JSON.stringify(result, null, 2))
        console.info('Total flattened rows:', result.length)

        expect(result).toBeDefined()
        expect(Array.isArray(result)).toBe(true)
    })
})

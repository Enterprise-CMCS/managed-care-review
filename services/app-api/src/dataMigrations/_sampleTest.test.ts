import { sharedTestPrismaClient } from '../testHelpers/storeHelpers'
import { migrate } from './migrations/20240422103442_migrate_contract_rate_relationships'

/*
    Demo of how to test a data migration - can run and test locally with this test.

    Guidelines
    - Make sure your migration script is wrapped in a transaction and includes adequate logging.
    - Throw Error so it's easy to run repeatedly
*/

/* eslint-disable jest/no-disabled-tests, jest/expect-expect */
describe('Model of how to test a migration locally', () => {
    it('Example migration test for local dev purposes', async () => {
        const client = await sharedTestPrismaClient()

        await client.$transaction(async (tx) => {
            await migrate(tx)
            throw new Error('ROLLBACK TO CONTINUE TESTING')
        })
    })
})

import { sharedTestPrismaClient } from '../testHelpers/storeHelpers'
import { insertDraftContract } from './contractAndRates'
import { must, mockInsertContractArgs } from '../testHelpers'
import {
    lockContractRowForUpdate,
    runTransactionWithRowLock,
} from './prismaHelpers'

describe('runTransactionWithRowLock', () => {
    // Lets the test wait for a specific point, then continue when `resolve()` is called.
    const deferred = () => {
        let resolve!: () => void
        const promise = new Promise<void>((res) => {
            resolve = res
        })
        return { promise, resolve }
    }

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('serializes concurrent work on the same locked contract row', async () => {
        const client = await sharedTestPrismaClient()
        const contract = must(
            await insertDraftContract(client, mockInsertContractArgs({}))
        )

        // Tells the test when the first transaction has updated the row and still holds the lock.
        const firstTransactionUpdatedRow = deferred()
        vi.spyOn(console, 'error').mockImplementation(() => {})

        const firstTransaction = runTransactionWithRowLock({
            client,
            operationName: 'row lock test',
            lock: async (tx) => await lockContractRowForUpdate(tx, contract.id),
            transaction: async (tx) => {
                await tx.contractTable.update({
                    where: { id: contract.id },
                    data: { mccrsID: 'ROW_LOCK_WINNER' },
                })

                // Tell the test the first transaction is ready.
                firstTransactionUpdatedRow.resolve()

                // Keep the lock open long enough for the second transaction to wait on it.
                await tx.$queryRaw<Array<{ slept: number }>>`
                    SELECT 1 AS slept
                    FROM pg_sleep(0.2)
                `

                return 'winner'
            },
        })

        // Start the second transaction only after the first one is holding the lock.
        await firstTransactionUpdatedRow.promise

        const secondTransaction = runTransactionWithRowLock({
            client,
            operationName: 'row lock test',
            lock: async (tx) => await lockContractRowForUpdate(tx, contract.id),
            transaction: async (tx) => {
                const lockedContract = await tx.contractTable.findUnique({
                    where: { id: contract.id },
                    select: { mccrsID: true },
                })

                // If locking works, this read happens after the first transaction commits.
                if (lockedContract?.mccrsID === 'ROW_LOCK_WINNER') {
                    return new Error('Second transaction observed winner state')
                }

                return 'loser should not win'
            },
        })

        const [firstResult, secondResult] = await Promise.all([
            firstTransaction,
            secondTransaction,
        ])

        expect(firstResult).toBe('winner')
        expect(secondResult).toBeInstanceOf(Error)
        expect((secondResult as Error).message).toBe(
            'Second transaction observed winner state'
        )

        const updatedContract = await client.contractTable.findUnique({
            where: { id: contract.id },
            select: { mccrsID: true },
        })
        expect(updatedContract?.mccrsID).toBe('ROW_LOCK_WINNER')
    })
})

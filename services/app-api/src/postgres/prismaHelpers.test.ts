import { sharedTestPrismaClient } from '../testHelpers/storeHelpers'
import { insertDraftContract } from './contractAndRates'
import { must, mockInsertContractArgs } from '../testHelpers'
import { runTransactionWithRowLock } from './prismaHelpers'

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
            table: 'ContractTable',
            id: contract.id,
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
            table: 'ContractTable',
            id: contract.id,
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

    it('does not block concurrent work on different locked contract rows', async () => {
        const client = await sharedTestPrismaClient()
        const firstContract = must(
            await insertDraftContract(client, mockInsertContractArgs({}))
        )
        const secondContract = must(
            await insertDraftContract(client, mockInsertContractArgs({}))
        )
        const thirdContract = must(
            await insertDraftContract(client, mockInsertContractArgs({}))
        )

        const firstTransactionLockedRow = deferred()
        const allowFirstTransactionToFinish = deferred()
        vi.spyOn(console, 'error').mockImplementation(() => {})

        const firstTransaction = runTransactionWithRowLock({
            client,
            operationName: 'different row lock test',
            table: 'ContractTable',
            id: firstContract.id,
            transaction: async (tx) => {
                await tx.contractTable.update({
                    where: { id: firstContract.id },
                    data: { mccrsID: 'FIRST_CONTRACT_UPDATED' },
                })

                firstTransactionLockedRow.resolve()
                await allowFirstTransactionToFinish.promise

                return 'first transaction finished'
            },
        })

        await firstTransactionLockedRow.promise

        const secondTransaction = runTransactionWithRowLock({
            client,
            operationName: 'different row lock test',
            table: 'ContractTable',
            id: secondContract.id,
            transaction: async (tx) => {
                await tx.contractTable.update({
                    where: { id: secondContract.id },
                    data: { mccrsID: 'SECOND_CONTRACT_UPDATED' },
                })

                return 'second transaction finished'
            },
        })

        const thirdTransaction = runTransactionWithRowLock({
            client,
            operationName: 'different row lock test',
            table: 'ContractTable',
            id: thirdContract.id,
            transaction: async (tx) => {
                await tx.contractTable.update({
                    where: { id: thirdContract.id },
                    data: { mccrsID: 'THIRD_CONTRACT_UPDATED' },
                })

                return 'third transaction finished'
            },
        })

        const [secondResult, thirdResult] = await Promise.all([
            Promise.race([
                secondTransaction,
                new Promise<string>((resolve) =>
                    setTimeout(
                        () => resolve('timed out waiting for second'),
                        200
                    )
                ),
            ]),
            Promise.race([
                thirdTransaction,
                new Promise<string>((resolve) =>
                    setTimeout(
                        () => resolve('timed out waiting for third'),
                        200
                    )
                ),
            ]),
        ])

        expect(secondResult).toBe('second transaction finished')
        expect(thirdResult).toBe('third transaction finished')

        allowFirstTransactionToFinish.resolve()

        const firstResult = await firstTransaction
        expect(firstResult).toBe('first transaction finished')

        const [
            updatedFirstContract,
            updatedSecondContract,
            updatedThirdContract,
        ] = await Promise.all([
            client.contractTable.findUnique({
                where: { id: firstContract.id },
                select: { mccrsID: true },
            }),
            client.contractTable.findUnique({
                where: { id: secondContract.id },
                select: { mccrsID: true },
            }),
            client.contractTable.findUnique({
                where: { id: thirdContract.id },
                select: { mccrsID: true },
            }),
        ])

        expect(updatedFirstContract?.mccrsID).toBe('FIRST_CONTRACT_UPDATED')
        expect(updatedSecondContract?.mccrsID).toBe('SECOND_CONTRACT_UPDATED')
        expect(updatedThirdContract?.mccrsID).toBe('THIRD_CONTRACT_UPDATED')
    })
})

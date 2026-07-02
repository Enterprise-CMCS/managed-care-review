import { parseErrorToError } from '@mc-review/helpers'
import { NotFoundError, UserInputPostgresError } from './postgresErrors'
import type { ExtendedPrismaClient } from './prismaClient'
import { Prisma } from '../generated/client'
import type { PrismaTransactionType } from './prismaTypes'

type LockableTables =
    | 'ContractTable'
    | 'RateTable'
    | 'ContractQuestion'
    | 'RateQuestion'

type RunTransactionWithRowLockArgs<T> = {
    client: ExtendedPrismaClient
    operationName: string
    table: LockableTables
    id: string
    transaction: (tx: PrismaTransactionType) => Promise<T | Error>
    useRowLock?: boolean
    transactionOptions?: {
        maxWait?: number
        timeout?: number
        isolationLevel?: Prisma.TransactionIsolationLevel
    }
}

/**
 * Row-locks a record before database writes so concurrent updates to the same
 * record cannot run before the other finishes.
 *
 * Callers must perform validation inside the transaction after the lock is
 * acquired, so a later transaction re-checks current state instead of
 * overwriting changes made by the first one.
 *
 * @param args.client Prisma client used to run the transaction.
 * @param args.operationName Operation name used in error logging.
 * @param args.table Table containing the row to lock before writes begin.
 * @param args.id Identifier of the row to lock.
 * @param args.transaction Store write logic to run after the row lock is acquired.
 * @param args.useRowLock Optional toggle for callers that need transaction
 * atomicity but do not need row-level serialization.
 * @param args.transactionOptions Optional Prisma transaction settings.
 */
async function runTransactionWithRowLock<T>(
    args: RunTransactionWithRowLockArgs<T>
): Promise<T | Error> {
    const {
        client,
        table,
        id,
        transaction,
        transactionOptions,
        useRowLock = true,
    } = args

    try {
        return await client.$transaction(async (tx) => {
            if (useRowLock) {
                await lockTableRowForUpdate(tx, table, id)
            }

            const result = await transaction(tx)
            if (result instanceof Error) {
                throw result
            }

            return result
        }, transactionOptions)
    } catch (err) {
        if (
            err instanceof NotFoundError ||
            err instanceof UserInputPostgresError
        ) {
            return err
        }

        console.error(`Prisma error ${args.operationName}`, err)
        return parseErrorToError(err)
    }
}

async function lockTableRowForUpdate(
    tx: PrismaTransactionType,
    table: LockableTables,
    id: string
) {
    const lockableTables = {
        ContractTable: Prisma.raw('"ContractTable"'),
        RateTable: Prisma.raw('"RateTable"'),
        ContractQuestion: Prisma.raw('"ContractQuestion"'),
        RateQuestion: Prisma.raw('"RateQuestion"'),
    } as const

    const lockedRows = await tx.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`
            SELECT id
            FROM ${lockableTables[table]}
            WHERE id = ${id}
            FOR UPDATE
        `
    )

    if (lockedRows.length === 0) {
        throw new NotFoundError(
            `${table} with id ${id} was not found for row lock.`
        )
    }
}

export { runTransactionWithRowLock }

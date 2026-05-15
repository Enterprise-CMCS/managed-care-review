import { parseErrorToError } from '@mc-review/helpers'
import { NotFoundError } from './postgresErrors'
import type { ExtendedPrismaClient } from './prismaClient'
import type { Prisma } from '../generated/client'
import type { PrismaTransactionType } from './prismaTypes'

type RunTransactionWithRowLockArgs<T> = {
    client: ExtendedPrismaClient
    operationName: string
    lock: (tx: PrismaTransactionType) => Promise<void | Error>
    transaction: (tx: PrismaTransactionType) => Promise<T | Error>
    transactionOptions?: {
        maxWait?: number
        timeout?: number
        isolationLevel?: Prisma.TransactionIsolationLevel
    }
}

/**
 * Helper function that row-locks records before database writes so concurrent
 * updates to the same record cannot run before the other finishes.
 *
 * Callers must perform validation inside the transaction after the lock is
 * acquired, so a later transaction re-checks current state instead of
 * overwriting changes made by the first one.
 */
async function runTransactionWithRowLock<T>(
    args: RunTransactionWithRowLockArgs<T>
): Promise<T | Error> {
    const { client, lock, transaction, transactionOptions } = args

    try {
        return await client.$transaction(async (tx) => {
            const lockResult = await lock(tx)
            if (lockResult instanceof Error) {
                throw lockResult
            }

            const result = await transaction(tx)
            if (result instanceof Error) {
                throw result
            }

            return result
        }, transactionOptions)
    } catch (err) {
        console.error(`Prisma error ${args.operationName}`, err)
        return parseErrorToError(err)
    }
}

async function lockContractRowForUpdate(
    tx: PrismaTransactionType,
    contractID: string
): Promise<void | Error> {
    const lockedContractRows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM "ContractTable"
        WHERE id = ${contractID}
        FOR UPDATE
    `

    if (lockedContractRows.length === 0) {
        return new NotFoundError(
            `Contract with id ${contractID} was not found for row lock.`
        )
    }
}

async function lockContractQuestionRowForUpdate(
    tx: PrismaTransactionType,
    questionID: string
): Promise<void | Error> {
    const lockedQuestionRows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM "ContractQuestion"
        WHERE id = ${questionID}
        FOR UPDATE
    `

    if (lockedQuestionRows.length === 0) {
        return new NotFoundError(
            `Question with id ${questionID} was not found for row lock.`
        )
    }
}

async function lockRateQuestionRowForUpdate(
    tx: PrismaTransactionType,
    questionID: string
): Promise<void | Error> {
    const lockedQuestionRows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id
        FROM "RateQuestion"
        WHERE id = ${questionID}
        FOR UPDATE
    `

    if (lockedQuestionRows.length === 0) {
        return new NotFoundError(
            `Rate question with id ${questionID} was not found for row lock.`
        )
    }
}

export {
    runTransactionWithRowLock,
    lockContractRowForUpdate,
    lockContractQuestionRowForUpdate,
    lockRateQuestionRowForUpdate,
}

import type { PrismaTransactionType } from '../prismaTypes'
import type { RateType } from '../../domain-models'
import { findRateWithHistory } from './findRateWithHistory'
import type { PrismaClient } from '@prisma/client'

type WithdrawRateArgsType = {
    rateID: string
    updatedByID: string
    updatedReason: string
}

const withdrawRateInsideTransaction = async (
    tx: PrismaTransactionType,
    args: WithdrawRateArgsType
): Promise<RateType | Error> => {
    const { rateID, updatedByID, updatedReason } = args

    try {
        await tx.rateTable.update({
            where: {
                id: rateID,
            },
            data: {
                reviewStatusActions: {
                    create: {
                        updatedByID,
                        updatedReason,
                        actionType: 'WITHDRAW',
                    },
                },
            },
        })

        return findRateWithHistory(tx, rateID)
    } catch (err) {
        console.error('PRISMA ERROR: Error withdrawing rate', err)
        return new Error(err)
    }
}

const withdrawRate = async (
    client: PrismaClient,
    args: WithdrawRateArgsType
): Promise<RateType | Error> => {
    try {
        return await client.$transaction(async (tx) => {
            const withdrawResult = await withdrawRateInsideTransaction(tx, args)
            if (withdrawResult instanceof Error) {
                return withdrawResult
            }
            return withdrawResult
        })
    } catch (err) {
        console.error('PRISMA ERROR: Error withdrawing rate', err)
        return err
    }
}

export {
    withdrawRate,
    withdrawRateInsideTransaction,
    type WithdrawRateArgsType,
}

import { findRateWithHistory } from './findRateWithHistory'
import type { RateType } from '../../domain-models/contractAndRates'
import type { PrismaTransactionType } from '../prismaTypes'
import { NotFoundError } from '../postgresErrors'

type WithdrawDateArgsType = {
    rateID: string
    withdrawnByUserID: string
    withdrawReason: string
}

// This function was originally built for use within replaceRateOnContract, which is a limited admin-only use case
// would likely need to be more robust  for use on demand
async function withdrawRateInsideTransaction(
    tx: PrismaTransactionType,
    args: WithdrawDateArgsType
): Promise<RateType | Error> {
    const { rateID, withdrawReason, withdrawnByUserID } = args

    try {
        // check rate is not already withdrawn
        const rate = await tx.rateTable.findUnique({
            where: {
                id: rateID,
            },
        })

        if (rate === null) {
            const err = `PRISMA ERROR: Cannot find rate with id: ${rateID}`
            return new NotFoundError(err)
        }
        if (rate.withdrawInfoID !== null) {
            const err = `PRISMA ERROR: Cannot withdraw rate more than once. See rate id: ${rateID}`
            return new Error(err)
        }

        // generate withdraw info and update rate
        const currentDateTime = new Date()
        const withdrawInfo = await tx.updateInfoTable.create({
            data: {
                updatedAt: currentDateTime,
                updatedByID: withdrawnByUserID,
                updatedReason: withdrawReason,
            },
        })

        const updatedRate = await tx.rateTable.update({
            where: {
                id: rateID,
            },
            data: {
                withdrawInfo: {
                    connect: { id: withdrawInfo.id },
                },
            },
        })

        if (updatedRate instanceof Error) {
            return updatedRate
        }

        return findRateWithHistory(tx, rateID)
    } catch (err) {
        console.error('Prisma error finding rate to withdraw', err)
        return new Error(err)
    }
}

export { withdrawRateInsideTransaction }
export type { WithdrawDateArgsType }

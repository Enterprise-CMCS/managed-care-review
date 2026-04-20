import { findContractWithHistory } from './findContractWithHistory'
import { NotFoundError } from '../postgresErrors'
import type { ContractType } from '../../domain-models/contractAndRates'
import type { PrismaTransactionType } from '../prismaTypes'
import type { ExtendedPrismaClient } from '../prismaClient'
import { parseErrorToError } from '@mc-review/helpers'

async function reverseApproveContractInsideTransaction(
    tx: PrismaTransactionType,
    args: ReverseApproveContractArgsType
): Promise<ContractType | Error> {
    const { contractID, updatedByID, updatedReason } = args

    const contract = await tx.contractTable.findFirst({
        where: {
            id: contractID,
        },
        include: {
            reviewStatusActions: {
                orderBy: { updatedAt: 'desc' },
                take: 1,
            },
        },
    })

    if (!contract) {
        const err = `PRISMA ERROR: Cannot find contract with id: ${contractID}`
        console.error(err)
        return new NotFoundError(err)
    }

    const latestAction = contract.reviewStatusActions[0]
    if (!latestAction || latestAction.actionType !== 'MARK_AS_APPROVED') {
        return new Error(
            `Cannot reverse approval: latest review action is not MARK_AS_APPROVED`
        )
    }

    await tx.contractActionTable.create({
        data: {
            updatedByID: updatedByID,
            updatedReason: updatedReason,
            actionType: 'UNDER_REVIEW',
            contractID: contractID,
        },
    })

    return findContractWithHistory(tx, contractID)
}

type ReverseApproveContractArgsType = {
    contractID: string
    updatedByID: string
    updatedReason: string
}

async function reverseApproveContract(
    client: ExtendedPrismaClient,
    args: ReverseApproveContractArgsType
): Promise<ContractType | NotFoundError | Error> {
    try {
        return await client.$transaction(async (tx) => {
            const result = await reverseApproveContractInsideTransaction(
                tx,
                args
            )
            if (result instanceof Error) {
                throw result
            }
            return result
        })
    } catch (err) {
        console.error('Prisma error reversing contract approval', err)
        return parseErrorToError(err)
    }
}

export { reverseApproveContract }
export type { ReverseApproveContractArgsType }

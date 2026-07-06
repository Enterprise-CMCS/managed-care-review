import { findContractWithHistory } from './findContractWithHistory'
import { NotFoundError } from '../postgresErrors'
import type { ContractType } from '../../domain-models'
import type { PrismaTransactionType } from '../prismaTypes'
import type { ExtendedPrismaClient } from '../prismaClient'
import { runTransactionWithRowLock } from '../prismaHelpers'

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
        return new NotFoundError(
            `PRISMA ERROR: Cannot find contract with id: ${contractID}`
        )
    }

    const latestAction = contract.reviewStatusActions[0]
    if (!latestAction || latestAction.actionType !== 'MARK_AS_APPROVED') {
        return new Error(
            `Cannot reverse approval: latest review action is not MARK_AS_APPROVED`
        )
    }

    const reverseApprovalAction = await tx.contractActionTable.create({
        data: {
            updatedByID: updatedByID,
            updatedReason: updatedReason,
            actionType: 'UNDER_REVIEW',
            contractID: contractID,
        },
    })

    // Reverse approval is a review action visible to CMS/Admin users, so it
    // becomes the contract's latest action date.
    await tx.contractTable.update({
        where: {
            id: contractID,
        },
        data: {
            lastActionDate: reverseApprovalAction.updatedAt,
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
    return runTransactionWithRowLock({
        client,
        operationName: 'reverseApproveContract',
        table: 'ContractTable',
        id: args.contractID,
        transaction: async (tx) =>
            await reverseApproveContractInsideTransaction(tx, args),
    })
}

export { reverseApproveContract }
export type { ReverseApproveContractArgsType }

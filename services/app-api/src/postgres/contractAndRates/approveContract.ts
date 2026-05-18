import { findContractWithHistory } from './findContractWithHistory'
import { NotFoundError } from '../postgresErrors'
import type { ContractType } from '../../domain-models'
import type { PrismaTransactionType } from '../prismaTypes'
import type { ExtendedPrismaClient } from '../prismaClient'
import { runTransactionWithRowLock } from '../prismaHelpers'

async function approveContractInsideTransaction(
    tx: PrismaTransactionType,
    args: ApproveContractArgsType
): Promise<ContractType | Error> {
    const {
        contractID,
        updatedByID,
        dateApprovalReleasedToState,
        updatedReason,
    } = args

    const contract = await tx.contractTable.findFirst({
        where: {
            id: contractID,
        },
        include: {
            reviewStatusActions: {
                orderBy: {
                    updatedAt: 'desc',
                },
                take: 1,
            },
        },
    })

    if (!contract) {
        return new NotFoundError(
            `PRISMA ERROR: Cannot find contract with id: ${contractID}`
        )
    }

    const latestReviewStatusAction = contract.reviewStatusActions[0]
    if (latestReviewStatusAction?.actionType === 'MARK_AS_APPROVED') {
        return new Error(
            'Cannot approve contract: contract is already approved'
        )
    }

    // generate approval notice info and update contract
    const approvalNotice = await tx.contractActionTable.create({
        data: {
            updatedByID: updatedByID,
            dateApprovalReleasedToState: dateApprovalReleasedToState,
            updatedReason,
            actionType: 'MARK_AS_APPROVED',
            contractID: contractID,
        },
    })

    await tx.contractTable.update({
        where: {
            id: contractID,
        },
        data: {
            reviewStatusActions: {
                connect: { id: approvalNotice.id },
            },
        },
    })

    return findContractWithHistory(tx, contractID)
}

type ApproveContractArgsType = {
    contractID: string
    updatedByID: string
    dateApprovalReleasedToState: Date
    updatedReason?: string | null
}

async function approveContract(
    client: ExtendedPrismaClient,
    args: ApproveContractArgsType
): Promise<ContractType | NotFoundError | Error> {
    return runTransactionWithRowLock({
        client,
        operationName: 'approveContract',
        table: 'ContractTable',
        id: args.contractID,
        transaction: async (tx) =>
            await approveContractInsideTransaction(tx, args),
    })
}

export { approveContract }
export type { ApproveContractArgsType }

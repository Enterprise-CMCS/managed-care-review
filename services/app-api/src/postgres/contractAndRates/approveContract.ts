import { findContractWithHistory } from './findContractWithHistory'
import { NotFoundError } from '../postgresErrors'
import type { ContractType } from '../../domain-models/contractAndRates'
import type { PrismaTransactionType } from '../prismaTypes'
import type { PrismaClient } from '@prisma/client'

async function approveContractInsideTransaction(
    tx: PrismaTransactionType,
    args: ApproveContractArgsType
): Promise<ContractType | Error> {
    const { contractID, updatedByID, updatedReason } = args
    try {
        const contract = await tx.contractTable.findFirst({
            where: {
                id: contractID,
            },
            include: {
                reviewStatusActions: true,
            },
        })

        if (!contract) {
            const err = `PRISMA ERROR: Cannot find contract with id: ${contractID}`
            console.error(err)
            return new NotFoundError(err)
        }

        // generate approval notice info and update contract
        const approvalNotice = await tx.contractActionTable.create({
            data: {
                updatedByID: updatedByID,
                updatedReason: updatedReason || '',
                actionType: 'APPROVAL_NOTICE',
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
    } catch (err) {
        console.error('Prisma error finding contract to approve', err)
        return new Error(err)
    }
}

type ApproveContractArgsType = {
    contractID: string
    updatedByID: string
    updatedReason: string | undefined
}

async function approveContract(
    client: PrismaClient,
    args: ApproveContractArgsType
): Promise<ContractType | NotFoundError | Error> {
    try {
        return await client.$transaction(async (tx) => {
            const result = await approveContractInsideTransaction(tx, args)
            if (result instanceof Error) {
                throw result
            }
            return result
        })
    } catch (err) {
        console.error('Prisma error approving contract', err)
        return err
    }
}

export { approveContract }
export type { ApproveContractArgsType }

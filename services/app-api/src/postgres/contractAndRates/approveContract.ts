import { findContractWithHistory } from './findContractWithHistory'
import { NotFoundError } from '../postgresErrors'
import type { ContractType } from '../../domain-models/contractAndRates'
import type { PrismaTransactionType } from '../prismaTypes'

async function approveContract(
    tx: PrismaTransactionType,
    args: ApproveContractArgsType
): Promise<ContractType | Error> {
    const { contractID, updatedByID } = args
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
            const err = `PRISMA ERROR: Cannot find the current rev to update with contract id: ${contractID}`
            console.error(err)
            return new NotFoundError(err)
        }

        // generate approval notice info and update contract
        const currentDateTime = new Date()
        const approvalNotice = await tx.contractActionTable.create({
            data: {
                updatedAt: currentDateTime,
                updatedByID: updatedByID,
                updatedReason: '',
                actionType: 'APPROVAL_NOTICE',
                contractID: contractID,
            },
        })

        const updatedContract = await tx.contractTable.update({
            where: {
                id: contractID,
            },
            data: {
                reviewStatusActions: {
                    connect: { id: approvalNotice.id },
                },
            },
        })

        if (updatedContract instanceof Error) {
            return updatedContract
        }

        return findContractWithHistory(tx, contractID)
    } catch (err) {
        console.error('Prisma error finding contract to approve', err)
        return new Error(err)
    }
}

type ApproveContractArgsType = {
    contractID: string
    updatedByID: string
}

export { approveContract }
export type { ApproveContractArgsType }

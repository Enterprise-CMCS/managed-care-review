import { findContractWithHistory } from './findContractWithHistory'
import { NotFoundError } from '../postgresErrors'
import type { PrismaClient } from '@prisma/client'
import type {
    ContractType,
    ContractFormEditableType,
} from '../../domain-models/contractAndRates'
import { prismaUpdateContractFormDataFromDomain } from './prismaContractRateAdaptors'
import type { PrismaTransactionType } from '../prismaTypes'

async function updateDraftContractInsideTransaction(
    tx: PrismaTransactionType,
    args: UpdateContractArgsType
): Promise<ContractType | Error> {
    const { contractID, formData } = args

    // Find the latest contract revision with contractID and with no submitInfo,
    const currentContractRev = await tx.contractRevisionTable.findFirst({
        where: {
            contractID: contractID,
            submitInfoID: null,
        },
        include: {
            contract: true,
        },
    })

    if (!currentContractRev) {
        const err = `PRISMA ERROR: Cannot find the current rev to update with contract id: ${contractID}`
        console.error(err)
        return new NotFoundError(err)
    }

    // Then update the contractRevision, adjusting all simple fields
    await tx.contractRevisionTable.update({
        where: {
            id: currentContractRev.id,
        },
        data: {
            ...prismaUpdateContractFormDataFromDomain(formData),
        },
    })

    return findContractWithHistory(tx, contractID)
}

type UpdateContractArgsType = {
    contractID: string
    formData: ContractFormEditableType
}

// Update the given draft
async function updateDraftContract(
    client: PrismaClient,
    args: UpdateContractArgsType
): Promise<ContractType | NotFoundError | Error> {
    try {
        return await client.$transaction(async (tx) => {
            const result = await updateDraftContractInsideTransaction(tx, args)
            if (result instanceof Error) {
                throw result
            }
            return result
        })
    } catch (err) {
        console.error('Prisma error updating contract', err)
        return err
    }
}

export { updateDraftContract }
export type { UpdateContractArgsType }

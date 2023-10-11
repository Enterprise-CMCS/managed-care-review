import { findContractWithHistory } from './findContractWithHistory'
import type { NotFoundError } from '../storeError'
import type { PrismaClient } from '@prisma/client'
import type { ContractType } from '../../domain-models/contractAndRates'
import { nullify } from '../prismaDomainAdaptors'

type UpdateMCCRSIDFormArgsType = {
    contractID: string
    mccrsID?: string
}

// Update the MCCRS record number
async function updateMCCRSID(
    client: PrismaClient,
    args: UpdateMCCRSIDFormArgsType
): Promise<ContractType | NotFoundError | Error> {
    const { contractID, mccrsID } = args

    try {
        return await client.$transaction(async (tx) => {
            // Get the Contract associated with this given contract ID
            await tx.contractTable.update({
                data: {
                    mccrsID: nullify(mccrsID),
                },
                where: {
                    id: contractID,
                },
            })

            return findContractWithHistory(tx, contractID)
        })
    } catch (err) {
        console.error('Prisma error updating contract', err)
        return err
    }
}

export { updateMCCRSID }
export type { UpdateMCCRSIDFormArgsType }

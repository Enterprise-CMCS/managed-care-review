import { findContractWithHistory } from './findContractWithHistory'
import type { NotFoundError } from '../postgresErrors'

import type { ContractType } from '../../domain-models'
import { nullify } from '../prismaDomainAdaptors'
import type { ExtendedPrismaClient } from '../prismaClient'
import {
    lockContractRowForUpdate,
    runTransactionWithRowLock,
} from '../prismaHelpers'

type UpdateMCCRSIDFormArgsType = {
    contractID: string
    mccrsID?: string
}

// Update the MCCRS record number
async function updateMCCRSID(
    client: ExtendedPrismaClient,
    args: UpdateMCCRSIDFormArgsType
): Promise<ContractType | NotFoundError | Error> {
    const { contractID, mccrsID } = args

    return runTransactionWithRowLock({
        client,
        operationName: 'updateMCCRSID',
        lock: async (tx) => await lockContractRowForUpdate(tx, contractID),
        transaction: async (tx) => {
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
        },
    })
}

export { updateMCCRSID }
export type { UpdateMCCRSIDFormArgsType }

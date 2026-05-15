import { findContractWithHistory } from './findContractWithHistory'
import { NotFoundError } from '../postgresErrors'

import type { ContractType } from '../../domain-models'
import { prismaUpdateContractFormDataFromDomain } from './prismaContractRateAdaptors'
import { includeFullRate } from './prismaFullContractRateHelpers'
import type { ExtendedPrismaClient } from '../prismaClient'
import type { UpdateContractArgsType } from './updateDraftContract'
import {
    lockContractRowForUpdate,
    runTransactionWithRowLock,
} from '../prismaHelpers'

// Update the given draft
// * can change the set of draftRates
// * set the formData
async function updateDraftContractFormData(
    client: ExtendedPrismaClient,
    args: UpdateContractArgsType
): Promise<ContractType | NotFoundError | Error> {
    const { contractID, formData } = args

    return runTransactionWithRowLock({
        client,
        operationName: 'updateDraftContractFormData',
        lock: async (tx) => await lockContractRowForUpdate(tx, contractID),
        transaction: async (tx) => {
            // Given all the Contracts associated with this draft, find the most recent submitted
            const currentContractRev = await tx.contractRevisionTable.findFirst(
                {
                    where: {
                        contractID: contractID,
                        submitInfoID: null,
                        undoUnlockInfoID: null,
                    },
                    include: {
                        contract: {
                            include: {
                                draftRates: {
                                    orderBy: {
                                        ratePosition: 'asc',
                                    },
                                    include: {
                                        rate: {
                                            include: includeFullRate,
                                        },
                                    },
                                },
                            },
                        },
                    },
                }
            )
            if (!currentContractRev) {
                return new NotFoundError(
                    `PRISMA ERROR: Cannot find the current rev to update with contract id: ${contractID}`
                )
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
        },
    })
}

export { updateDraftContractFormData }

import { findContractWithHistory } from './findContractWithHistory'
import { NotFoundError } from '../postgresErrors'

import type { ContractType } from '../../domain-models'
import { prismaUpdateContractFormDataFromDomain } from './prismaContractRateAdaptors'
import { includeFullRate } from './prismaFullContractRateHelpers'
import type { ExtendedPrismaClient } from '../prismaClient'
import type { UpdateContractArgsType } from './updateDraftContract'

// Update the given draft
// * can change the set of draftRates
// * set the formData
async function updateDraftContractFormData(
    client: ExtendedPrismaClient,
    args: UpdateContractArgsType
): Promise<ContractType | NotFoundError | Error> {
    const { contractID, formData } = args

    try {
        return await client.$transaction(async (tx) => {
            // Given all the Contracts associated with this draft, find the most recent submitted
            const currentContractRev = await tx.contractRevisionTable.findFirst(
                {
                    where: {
                        contractID: contractID,
                        submitInfoID: null,
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
        })
    } catch (err) {
        console.error('Prisma error updating contract', err)
        return err
    }
}

export { updateDraftContractFormData }

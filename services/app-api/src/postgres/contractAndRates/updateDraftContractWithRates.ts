import { findContractWithHistory } from './findContractWithHistory'
import { NotFoundError } from '../postgresErrors'
import type { PrismaClient } from '@prisma/client'
import type {
    RateRevisionType,
    ContractType,
    RateFormEditableType,
    ContractFormEditableType,
} from '../../domain-models/contractAndRates'
import { includeDraftRates } from './prismaDraftContractHelpers'
import { rateRevisionToDomainModel } from './prismaSharedContractRateHelpers'
import type { UpdateDraftContractRatesArgsType } from './updateDraftContractRates'
import { updateDraftContractRatesInTransaction } from './updateDraftContractRates'
import { prismaUpdateContractFormDataFromDomain } from './prismaContractRateAdaptors'

type UpdateContractArgsType = {
    contractID: string
    formData: ContractFormEditableType
    rateFormDatas?: RateFormEditableType[]
}

// going down the old path, from the updateHPFD code, we construct the new
// call to the new updateContractDraftRates API.
// no rates will be linked here, only updated/created
function makeUpdateCommandsFromOldContract(
    contractID: string,
    ratesFromDB: RateRevisionType[],
    ratesFromClient: RateFormEditableType[]
): UpdateDraftContractRatesArgsType {
    const updateArgs: UpdateDraftContractRatesArgsType = {
        contractID,
        rateUpdates: {
            create: [],
            update: [],
            link: [],
            unlink: [],
            delete: [],
        },
    }

    // all rates are child rates in the old world, only create/update.
    let thisPosition = 1
    for (const clientRateData of ratesFromClient) {
        const matchingDBRate = ratesFromDB.find(
            (dbRate) => dbRate.formData.rateID === clientRateData.id
        )

        if (matchingDBRate) {
            updateArgs.rateUpdates.update.push({
                rateID: matchingDBRate.rateID,
                formData: clientRateData,
                ratePosition: thisPosition,
            })
        } else {
            updateArgs.rateUpdates.create.push({
                formData: clientRateData,
                ratePosition: thisPosition,
            })
        }
        thisPosition++
    }

    // any rates that have been removed need to be deleted or unlinked.
    for (const dbRate of ratesFromDB) {
        const matchingClientRate = ratesFromClient.find(
            (clientRateData) => dbRate.formData.rateID === clientRateData.id
        )

        if (!matchingClientRate) {
            // if it's been submitted before, it's unlink, if not, it's delete
            if (dbRate.unlockInfo) {
                updateArgs.rateUpdates.unlink.push({
                    rateID: dbRate.rateID,
                })
            } else {
                updateArgs.rateUpdates.delete.push({
                    rateID: dbRate.rateID,
                })
            }
        }
    }

    return updateArgs
}

// Update the given draft
// * can change the set of draftRates
// * set the formData
async function updateDraftContractWithRates(
    client: PrismaClient,
    args: UpdateContractArgsType
): Promise<ContractType | NotFoundError | Error> {
    const { contractID, formData, rateFormDatas } = args

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
                        contract: true,
                        draftRates: {
                            include: includeDraftRates,
                        },
                    },
                }
            )
            if (!currentContractRev) {
                const err = `PRISMA ERROR: Cannot find the current rev to update with contract id: ${contractID}`
                console.error(err)
                return new NotFoundError(err)
            }

            const ratesFromDB: RateRevisionType[] = []

            // Convert all rates from DB to domain model
            for (const rate of currentContractRev.draftRates) {
                const domainRateRevision = rateRevisionToDomainModel(
                    rate.revisions[0]
                )

                if (domainRateRevision instanceof Error) {
                    return new Error(
                        `Error updating contract with rates: ${domainRateRevision.message}`
                    )
                }

                ratesFromDB.push(domainRateRevision)
            }

            // call new style rate updates.
            if (rateFormDatas) {
                const rateUpdateCommands: UpdateDraftContractRatesArgsType =
                    makeUpdateCommandsFromOldContract(
                        contractID,
                        ratesFromDB,
                        rateFormDatas
                    )
                const rateUpdates = await updateDraftContractRatesInTransaction(
                    tx,
                    rateUpdateCommands
                )
                if (rateUpdates instanceof Error) {
                    console.error(
                        'failed to update new style rates in old style update',
                        rateUpdates
                    )
                    return rateUpdates
                }
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

export { updateDraftContractWithRates }
export type { UpdateContractArgsType }

import type {
    ContractType,
    ContractRevisionWithRatesType,
} from '../../domain-models/contractAndRates'
import type { NotFoundError } from '../storeError'
import type { InsertRateArgsType } from './insertRate'
import type { PrismaClient } from '@prisma/client'
import { findContractWithHistory } from './findContractWithHistory'
import { includeFullRate } from './prismaSubmittedRateHelpers'
import type { RateFormEditable } from './updateDraftRate'

type UpdateDraftContractRatesType = {
    // Must be a draft contract.
    draftContract: ContractType & {
        draftRevision: ContractRevisionWithRatesType
    }
    createRates: InsertRateArgsType[]
    updateRateRevisions: RateFormEditable[]
    disconnectRates: string[]
}

async function updateDraftContractRates(
    client: PrismaClient,
    args: UpdateDraftContractRatesType
): Promise<ContractType | NotFoundError | Error> {
    const { draftContract, createRates, disconnectRates, updateRateRevisions } =
        args

    try {
        return await client.$transaction(async (tx) => {
            // Create new rates
            for (const rate of createRates) {
                const { latestStateRateCertNumber } = await tx.state.update({
                    data: {
                        latestStateRateCertNumber: {
                            increment: 1,
                        },
                    },
                    where: {
                        stateCode: rate.stateCode,
                    },
                })

                await tx.rateTable.create({
                    data: {
                        stateCode: rate.stateCode,
                        stateNumber: latestStateRateCertNumber,
                        revisions: {
                            create: {
                                rateType: rate.rateType,
                                rateCapitationType: rate.rateCapitationType,
                                rateDocuments: {
                                    create: rate.rateDocuments,
                                },
                                supportingDocuments: {
                                    create: rate.supportingDocuments,
                                },
                                rateDateStart: rate.rateDateStart,
                                rateDateEnd: rate.rateDateEnd,
                                rateDateCertified: rate.rateDateCertified,
                                amendmentEffectiveDateStart:
                                    rate.amendmentEffectiveDateStart,
                                amendmentEffectiveDateEnd:
                                    rate.amendmentEffectiveDateEnd,
                                rateProgramIDs: rate.rateProgramIDs,
                                rateCertificationName:
                                    rate.rateCertificationName,
                                certifyingActuaryContacts: {
                                    create: rate.certifyingActuaryContacts,
                                },
                                addtlActuaryContacts: {
                                    create: rate.addtlActuaryContacts,
                                },
                                actuaryCommunicationPreference:
                                    rate.actuaryCommunicationPreference,
                            },
                        },
                        draftContractRevisions: {
                            connect: {
                                id: draftContract.draftRevision.id,
                            },
                        },
                    },
                    include: includeFullRate,
                })
            }

            // Update rate revisions
            for (const rateRevision of updateRateRevisions) {
                // Make sure the rate revision is a draft revision
                //
                const currentRateRev = await tx.rateRevisionTable.findFirst({
                    where: {
                        id: rateRevision.id,
                        submitInfoID: null,
                    },
                })

                if (!currentRateRev) {
                    console.error('No Draft Rev!')
                    return new Error('cant find a draft rev to submit')
                }

                await tx.rateRevisionTable.update({
                    where: {
                        id: rateRevision.id,
                    },
                    data: {
                        rateType: rateRevision.rateType,
                        rateCapitationType: rateRevision.rateCapitationType,

                        rateDocuments: {
                            deleteMany: {},
                            create: rateRevision.rateDocuments,
                        },
                        supportingDocuments: {
                            deleteMany: {},
                            create: rateRevision.supportingDocuments,
                        },
                        certifyingActuaryContacts: {
                            deleteMany: {},
                            create: rateRevision.certifyingActuaryContacts,
                        },
                        addtlActuaryContacts: {
                            deleteMany: {},
                            create: rateRevision.addtlActuaryContacts,
                        },
                        rateDateStart: rateRevision.rateDateStart,
                        rateDateEnd: rateRevision.rateDateEnd,
                        rateDateCertified: rateRevision.rateDateCertified,
                        amendmentEffectiveDateStart:
                            rateRevision.amendmentEffectiveDateStart,
                        amendmentEffectiveDateEnd:
                            rateRevision.amendmentEffectiveDateEnd,
                        rateProgramIDs: rateRevision.rateProgramIDs,
                        rateCertificationName:
                            rateRevision.rateCertificationName,
                        actuaryCommunicationPreference:
                            rateRevision.actuaryCommunicationPreference,
                    },
                })
            }

            // Disconnect rates from draft contract revision
            await tx.contractRevisionTable.update({
                where: {
                    id: draftContract.draftRevision.id,
                },
                data: {
                    draftRates: {
                        disconnect: disconnectRates.map((id) => ({ id })),
                    },
                },
            })

            // Find and return the latest contract data
            return findContractWithHistory(tx, draftContract.id)
        })
    } catch (err) {
        console.error('Prisma error updating draft contracts rate', err)
        return err
    }
}

export type { UpdateDraftContractRatesType }
export { updateDraftContractRates }

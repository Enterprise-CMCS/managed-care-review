import type {
    ContractType,
    DraftContractType,
} from '../../domain-models/contractAndRates'
import { NotFoundError } from '../storeError'
import type { InsertRateArgsType } from './insertRate'
import type { PrismaClient } from '@prisma/client'
import { findContractWithHistory } from './findContractWithHistory'
import type { RateFormEditable } from './updateDraftRate'

type InsertOrConnectRateArgsType = InsertRateArgsType & { id?: string }

type UpdateDraftContractRatesType = {
    // Must be a draft contract.
    draftContract: DraftContractType
    connectOrCreate?: InsertOrConnectRateArgsType[]
    updateRateRevisions?: RateFormEditable[]
    disconnectRates?: string[]
}

const VALID_UNFINDABLE_UUID = '00000000-0000-0000-0000-000000000000'

async function updateDraftContractRates(
    client: PrismaClient,
    args: UpdateDraftContractRatesType
): Promise<ContractType | NotFoundError | Error> {
    const {
        draftContract,
        connectOrCreate,
        disconnectRates,
        updateRateRevisions,
    } = args

    try {
        return await client.$transaction(async (tx) => {
            // Create new rates
            if (connectOrCreate) {
                const result = await tx.state.findFirst({
                    where: {
                        stateCode: draftContract.stateCode,
                    },
                })

                if (!result) {
                    const err = `PRISMA ERROR: Cannot find state with stateCode: ${draftContract.stateCode}`
                    console.error(err)
                    return new NotFoundError(err)
                }

                // Current state rate cert number
                let latestStateRateCertNumber = result.latestStateRateCertNumber

                for (const rateRevision of connectOrCreate) {
                    await tx.rateTable.upsert({
                        where: {
                            id: rateRevision.rateID ?? VALID_UNFINDABLE_UUID,
                        },
                        update: {
                            draftContractRevisions: {
                                connect: {
                                    id: draftContract.draftRevision.id,
                                },
                            },
                        },
                        create: {
                            stateCode: rateRevision.stateCode,
                            stateNumber: latestStateRateCertNumber,
                            revisions: {
                                create: {
                                    rateType: rateRevision.rateType,
                                    rateCapitationType:
                                        rateRevision.rateCapitationType,
                                    rateDocuments: {
                                        create: rateRevision.rateDocuments,
                                    },
                                    supportingDocuments: {
                                        create: rateRevision.supportingDocuments,
                                    },
                                    rateDateStart: rateRevision.rateDateStart,
                                    rateDateEnd: rateRevision.rateDateEnd,
                                    rateDateCertified:
                                        rateRevision.rateDateCertified,
                                    amendmentEffectiveDateStart:
                                        rateRevision.amendmentEffectiveDateStart,
                                    amendmentEffectiveDateEnd:
                                        rateRevision.amendmentEffectiveDateEnd,
                                    rateProgramIDs: rateRevision.rateProgramIDs,
                                    rateCertificationName:
                                        rateRevision.rateCertificationName,
                                    certifyingActuaryContacts: {
                                        create: rateRevision.certifyingActuaryContacts,
                                    },
                                    addtlActuaryContacts: {
                                        create: rateRevision.addtlActuaryContacts,
                                    },
                                    actuaryCommunicationPreference:
                                        rateRevision.actuaryCommunicationPreference,
                                },
                            },
                            draftContractRevisions: {
                                connect: {
                                    id: draftContract.draftRevision.id,
                                },
                            },
                        },
                    })

                    // If operation succeeds and passed in rateRevision data did not contain a id, then it was a create
                    // operation, and we need to increment latestStateRateCertNumber
                    if (!rateRevision.id) {
                        latestStateRateCertNumber++
                    }
                }

                // This is the number of rates we have created
                const createdCount =
                    latestStateRateCertNumber - result.latestStateRateCertNumber

                // If we at least created one rate, we increment the count
                if (createdCount >= 1) {
                    await tx.state.update({
                        data: {
                            latestStateRateCertNumber: {
                                increment: createdCount,
                            },
                        },
                        where: {
                            stateCode: draftContract.stateCode,
                        },
                    })
                }
            }

            if (updateRateRevisions) {
                for (const rateRevision of updateRateRevisions) {
                    // Make sure the rate revision is a draft revision
                    const currentRateRev = await tx.rateRevisionTable.findFirst(
                        {
                            where: {
                                id: rateRevision.id,
                                submitInfoID: null,
                            },
                        }
                    )

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
            }

            if (disconnectRates) {
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
            }

            // Find and return the latest contract data
            return findContractWithHistory(tx, draftContract.id)
        })
    } catch (err) {
        console.error('Prisma error updating draft contracts rate', err)
        return err
    }
}

export type { UpdateDraftContractRatesType, InsertOrConnectRateArgsType }
export { updateDraftContractRates }

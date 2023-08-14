import type { PrismaClient } from '@prisma/client'
import type { RateType } from '../../domain-models/contractAndRates'
import type { RateFormEditable } from './insertRate'
import {
    contractFormDataToDomainModel,
    includeUpdateInfo,
    rateFormDataToDomainModel,
} from './prismaSharedContractRateHelpers'

// Update the given draft
// * can change the set of draftRates
// * set the formData

/*
     8.14.23 Hana Note - this is now a temporary implementation as entire function. We intend to
     - handle updateRate as a single query on the RateTable (not rate revision)
     - use similar behavior to updateContract via a shared find with history helper
*/

type UpdateRateArgsType = {
    rateID: string
    formData: RateFormEditable
    contractIDs: string[]
}

async function updateDraftRate(
    client: PrismaClient,
    args: UpdateRateArgsType
): Promise<RateType | Error> {
    const { rateID, formData, contractIDs } = args
    const {
        rateType,
        rateCapitationType,
        rateDocuments,
        supportingDocuments,
        rateDateStart,
        rateDateEnd,
        rateDateCertified,
        amendmentEffectiveDateStart,
        amendmentEffectiveDateEnd,
        rateProgramIDs,
        rateCertificationName,
        certifyingActuaryContacts,
        addtlActuaryContacts,
        actuaryCommunicationPreference,
    } = formData
    try {
        // Given all the Rates associated with this draft, find the most recent submitted
        // rateRevision to update.
        const currentRev = await client.rateRevisionTable.findFirst({
            where: {
                rateID: rateID,
                submitInfoID: null,
            },
        })
        if (!currentRev) {
            console.error('No Draft Rev!')
            return new Error('cant find a draft rev to submit')
        }

        await client.rateRevisionTable.update({
            where: {
                id: currentRev.id,
            },
            data: {
                rateType,
                rateCapitationType,
                rateDocuments: {
                    create: rateDocuments,
                },
                supportingDocuments: {
                    create: supportingDocuments,
                },
                rateDateStart,
                rateDateEnd,
                rateDateCertified,
                amendmentEffectiveDateStart,
                amendmentEffectiveDateEnd,
                rateProgramIDs,
                rateCertificationName,
                certifyingActuaryContacts: {
                    create: certifyingActuaryContacts,
                },
                addtlActuaryContacts: {
                    create: addtlActuaryContacts,
                },
                actuaryCommunicationPreference,
                draftContracts: {
                    set: contractIDs.map((rID) => ({
                        id: rID,
                    })),
                },
            },
            include: {
                rateDocuments: true,
                supportingDocuments: true,
                certifyingActuaryContacts: true,
                addtlActuaryContacts: true,
                draftContracts: true,
                contractRevisions: {
                    include: {
                        contractRevision: {
                            include: {
                                stateContacts: true,
                                contractDocuments: true,
                                supportingDocuments: true,
                            },
                        },
                    },
                },
            },
        })

        const updatedRate = await client.rateTable.findFirst({
            where: {
                id: rateID,
            },
            include: {
                revisions: {
                    include: {
                        rateDocuments: true,
                        supportingDocuments: true,
                        certifyingActuaryContacts: true,
                        addtlActuaryContacts: true,
                        submitInfo: includeUpdateInfo,
                        draftContracts: {
                            include: {
                                revisions: {
                                    include: {
                                        contractDocuments: true,
                                        supportingDocuments: true,
                                        stateContacts: true,
                                        draftRates: true,
                                    },
                                    where: {
                                        submitInfoID: { not: null },
                                    },
                                    take: 1,
                                    orderBy: {
                                        createdAt: 'desc',
                                    },
                                },
                            },
                        },
                    },
                },
            },
        })

        if (!updatedRate) {
            console.error('No updated rate!')
            return new Error('No updated rate!')
        }
        const finalRate: RateType = {
            id: updatedRate.id,
            status: 'DRAFT',
            stateCode: updatedRate.stateCode,
            stateNumber: updatedRate.stateNumber,
            revisions: updatedRate.revisions.map((rr) => ({
                id: rr.id,
                createdAt: rr.createdAt,
                updatedAt: rr.updatedAt,
                formData: rateFormDataToDomainModel(rr),

                contractRevisions: rr.draftContracts.map((contract) => ({
                    id: contract.id,
                    createdAt: contract.createdAt,
                    updatedAt: contract.updatedAt,
                    formData: contractFormDataToDomainModel(
                        contract.revisions[0]
                    ),
                })),
            })),
        }
        return finalRate
    } catch (err) {
        console.error('SUBMIT PRISMA ATe ERR', err)
        return err
    }
}

export { updateDraftRate }

import { PrismaClient } from '@prisma/client'
import { RateType } from '../../domain-models/contractAndRates'
import { findRateWithHistory } from './findRateWithHistory'
import { RateFormEditable } from './insertRate'

// Update the given draft
// * can change the set of draftRates
// * set the formData

type UpdateRateArgsType = {
    rateID: string,
    formData: RateFormEditable,
    contractIDs: string[]
}

async function updateDraftRate(
    client: PrismaClient,
    args: UpdateRateArgsType
): Promise<RateType | Error> {
    const {rateID, formData, contractIDs} = args
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
                    create:rateDocuments
                },
                supportingDocuments: {
                    create:supportingDocuments
                },
                rateDateStart,
                rateDateEnd,
                rateDateCertified,
                amendmentEffectiveDateStart,
                amendmentEffectiveDateEnd,
                rateProgramIDs,
                rateCertificationName,
                certifyingActuaryContacts: {
                    create: certifyingActuaryContacts
                },
                addtlActuaryContacts: {
                    create: addtlActuaryContacts
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

        return findRateWithHistory(client, rateID)
    } catch (err) {
        console.error('SUBMIT PRISMA CONTRACT ERR', err)
        return err
    }
}

export { updateDraftRate }

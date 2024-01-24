import { findRateWithHistory } from './findRateWithHistory'
import type { NotFoundError } from '../postgresErrors'
import type {
    RateFormDataType,
    RateType,
} from '../../domain-models/contractAndRates'
import type { PrismaTransactionType } from '../prismaTypes'
import { emptify, nullify } from '../prismaDomainAdaptors'

type RateFormEditable = Partial<RateFormDataType>

type UpdateRateArgsType = {
    rateID: string
    formData: RateFormEditable
    contractIDs: string[]
}

/*
   updateDraftRate

    This function calls two sequential rate revision updates in a transaciton
    The first deletes related resources from the revision entirely
    The second updates the Rate and re-creates/links for related resources (things like contacts and documents)

    This approach was used for following reasons at the time  of writing:
    - Prisma has no native upsertMany functionality. Looping through each related resource to upsert felt overkill
    - No need for version history, preserving dates on related resources in draft form
*/
async function updateDraftRate(
    client: PrismaTransactionType,
    args: UpdateRateArgsType
): Promise<RateType | NotFoundError | Error> {
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
        // Given all the Rates associated with this draft, find the most recent submitted to update.
        const currentRev = await client.rateRevisionTable.findFirst({
            where: {
                rateID: rateID,
                submitInfoID: null,
            },
            orderBy: {
                createdAt: 'desc',
            },
        })
        if (!currentRev) {
            console.error('No Draft Rev!')
            return new Error('cant find a draft rev to submit')
        }
        // Clear all related resources on the revision
        // Then update resource, adjusting all simple fields and creating new linked resources for fields holding relationships to other day
        await client.rateRevisionTable.update({
            where: {
                id: currentRev.id,
            },
            data: {
                rateType: nullify(rateType),
                rateCapitationType: nullify(rateCapitationType),

                rateDocuments: {
                    deleteMany: {},
                    create:
                        rateDocuments &&
                        rateDocuments.map((d, idx) => ({
                            position: idx,
                            ...d,
                        })),
                },
                supportingDocuments: {
                    deleteMany: {},
                    create:
                        supportingDocuments &&
                        supportingDocuments.map((d, idx) => ({
                            position: idx,
                            ...d,
                        })),
                },
                certifyingActuaryContacts: {
                    deleteMany: {},
                    create:
                        certifyingActuaryContacts &&
                        certifyingActuaryContacts.map((c, idx) => ({
                            position: idx,
                            ...c,
                        })),
                },
                addtlActuaryContacts: {
                    deleteMany: {},
                    create:
                        addtlActuaryContacts &&
                        addtlActuaryContacts.map((c, idx) => ({
                            position: idx,
                            ...c,
                        })),
                },
                rateDateStart: nullify(rateDateStart),
                rateDateEnd: nullify(rateDateEnd),
                rateDateCertified: nullify(rateDateCertified),
                amendmentEffectiveDateStart: nullify(
                    amendmentEffectiveDateStart
                ),
                amendmentEffectiveDateEnd: nullify(amendmentEffectiveDateEnd),
                rateProgramIDs: emptify(rateProgramIDs),
                rateCertificationName: nullify(rateCertificationName),
                actuaryCommunicationPreference: nullify(
                    actuaryCommunicationPreference
                ),
                draftContracts: {
                    set: contractIDs.map((rID) => ({
                        id: rID,
                    })),
                },
            },
        })
        return findRateWithHistory(client, rateID)
    } catch (err) {
        console.error('Prisma error updating rate', err)
        return err
    }
}

export { updateDraftRate }
export type { RateFormEditable, UpdateRateArgsType }

import { findRateWithHistory } from './findRateWithHistory'
import type { NotFoundError } from '../storeError'
import type { RateFormDataType, RateType } from '../../domain-models/contractAndRates'
import type { PrismaClient } from '@prisma/client'
import type { SubmissionDocument } from 'app-web/src/common-code/healthPlanFormDataType'

type GenericDocumentPrismaInput = Omit<SubmissionDocument, 'documentCategories'>

type RateFormEditable = Partial<RateFormDataType> & {
    rateDocuments?: GenericDocumentPrismaInput
    supportingDocuments?: GenericDocumentPrismaInput
}

type UpdateRateArgsType = {
    rateID: string
    formData: RateFormEditable
    contractIDs: string[]
}

// Create or update rateDocuments, supportingDocuments
const upsertDocuments = async (client: PrismaClient, docs: GenericDocumentPrismaInput[], table: 'rate' | 'supporting', rateRevisionID: string) =>{
    return client.$transaction(
    docs.map((doc) => {
        const upsertQuery = {
            where: {id: doc.id},
            create: {
                name: doc.name,
                sha256: doc.sha256,
                s3URL: doc.s3URL,
                rateRevision: {
                    connect: {
                        id: rateRevisionID
                    }
                }


            },
            update:{
                name: doc.name,
                sha256: doc.sha256,
                s3URL: doc.s3URL,
                id: doc.id
            }
        }

        return table === 'rate'? client.rateDocument.upsert(upsertQuery) :  client.rateSupportingDocument.upsert(upsertQuery)
    })
)}


async function updateDraftRate(
    client: PrismaClient,
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

        await client.$transaction([
            rateDocuments && upsertDocuments(client,  rateDocuments, 'rate',  currentRev.id),
            upsertDocuments(client, supportingDocuments, 'additional', currentRev.id ),

        ])

        await client.rateRevisionTable.update({
            where: {
                id: currentRev.id,
            },
            data: {
                rateType,
                rateCapitationType,
                // we have already created all the new things we need now we are just linking them or unsettings if values are empty
                // rateDocuments: upsertDocuments(rateDocuments),
                // supportingDocuments:
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
        })

        return findRateWithHistory(client, rateID)
    } catch (err) {
        console.error('SUBMIT PRISMA ATe ERR', err)
        return err
    }
}

export { updateDraftRate }
export type { RateFormEditable }

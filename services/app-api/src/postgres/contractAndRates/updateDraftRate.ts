import { findRateWithHistory } from './findRateWithHistory'
import type { NotFoundError } from '../storeError'
import type { RateFormDataType, RateType } from '../../domain-models/contractAndRates'
import type { Prisma, PrismaClient } from '@prisma/client'
import type { ActuaryContact, SubmissionDocument } from 'app-web/src/common-code/healthPlanFormDataType'

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

// Create or update certifyingActuaryContacts, addtlActuaryContacts
const updateContacts = async (client: PrismaClient, table: 'certifying' | 'additional', rateRevisionID: string, contacts?: ActuaryContact[]) => {
    if (!contacts || contacts.length === 0) {
        return Promise.resolve()
    }
    const upsertPromises = contacts.map((contact) => {
        const upsertQuery = {
            where: { id: contact.id },
            create: {
                name: contact.name,
                titleRole: contact.titleRole,
                email: contact.email,
                actuarialFirm: contact.actuarialFirm,
                actuaryFirmOther: contact.actuarialFirmOther,
                certifyingActuaryOnRateRevision: {
                    connect: {
                        id: rateRevisionID
                    }
                },
                rateRevision: {
                    connect: {
                        id: rateRevisionID
                    }
                }


            },
            update: {
                name: contact.name,
                titleRole: contact.titleRole,
                email: contact.email,
                actuarialFirm: contact.actuarialFirm,
                actuaryFirmOther: contact.actuarialFirmOther,
                id: contact.id
            }
        }
        return table === 'certifying' ? client.actuaryContact.upsert(upsertQuery) : client.rateSupportingDocument.upsert(upsertQuery)
    })
    return client.$transaction(upsertPromises)

}

// Create or update rateDocuments, supportingDocuments
const updateDocuments = (client: PrismaClient, table: 'rate' | 'supporting', rateRevisionID: string, docs?: GenericDocumentPrismaInput[]) => {
    if (!docs || docs.length === 0) {
        return Promise.resolve()
    }
    const upsertPromises = docs.map((doc) => {
        const upsertQuery = {
            where: { id: doc.id },
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
            update: {
                name: doc.name,
                sha256: doc.sha256,
                s3URL: doc.s3URL,
                id: doc.id
            }
        }

        return table === 'rate' ? client.rateDocument.upsert(upsertQuery) : client.rateSupportingDocument.upsert(upsertQuery)
    })

    return tx.$transaction(upsertPromises)
}

/*
MacRae feedback
- starting and ending a seperate transaction for each helper is not what we want
- instead of passing  `client` into these helpers, pass tx transaction
- possible delete step - inside upsert go through and delete anything that doesn't match the new docs
- delete and set
*/
async function updateDraftRate(
    client: PrismaClient,
    args: UpdateRateArgsType
): Promise<RateType | NotFoundError | Error> {
    const { rateID, formData, contractIDs } = args
    const {
        rateType,
        rateCapitationType,
        supportingDocuments ,
        rateDateStart,
        rateDateEnd,
        rateDateCertified,
        amendmentEffectiveDateStart,
        amendmentEffectiveDateEnd,
        rateProgramIDs,
        rateCertificationName,
        certifyingActuaryContacts ,
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

        await Promise.all([
            updateDocuments(client, 'rate', currentRev.id, supportingDocuments),
            updateDocuments(client, 'supporting', currentRev.id, supportingDocuments),
            updateContacts(client, 'certifying', currentRev.id, certifyingActuaryContacts),
            updateContacts(client, 'additional', currentRev.id, addtlActuaryContacts)
            //deleteAbandoned
        ])

        //
        await client.rateRevisionTable.update({
            where: {
                id: currentRev.id,
            },
            data: {
                rateType,
                rateCapitationType,
                rateDocuments: {
                    set: [] // look at deletions here
                },
                // supportingDocuments,
                rateDateStart,
                rateDateEnd,
                rateDateCertified,
                amendmentEffectiveDateStart,
                amendmentEffectiveDateEnd,
                rateProgramIDs,
                rateCertificationName,
                // certifyingActuaryContacts
                // addtlActuaryContacts
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

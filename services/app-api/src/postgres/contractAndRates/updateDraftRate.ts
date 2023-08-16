import { findRateWithHistory } from './findRateWithHistory'
import type { NotFoundError } from '../storeError'
import type {
    RateCapitationType,
    RateType as DomainRateType,
    ActuaryCommunicationType,
    ActuaryContact,
    SubmissionDocument,
} from 'app-web/src/common-code/healthPlanFormDataType'
import type { RateType } from '../../domain-models/contractAndRates'
import type { PrismaClient } from '@prisma/client'

type RateFormEditable = {
    rateType?: DomainRateType
    rateCapitationType?: RateCapitationType
    rateDocuments?: SubmissionDocument[]
    supportingDocuments?: SubmissionDocument[]
    rateDateStart?: Date
    rateDateEnd?: Date
    rateDateCertified?: Date
    amendmentEffectiveDateStart?: Date
    amendmentEffectiveDateEnd?: Date
    rateProgramIDs?: string[]
    rateCertificationName?: string
    certifyingActuaryContacts?: ActuaryContact[]
    addtlActuaryContacts?: ActuaryContact[]
    actuaryCommunicationPreference?: ActuaryCommunicationType
}

type UpdateRateArgsType = {
    rateID: string
    formData: RateFormEditable
    contractIDs: string[]
}
// Update the given draft
// * can change the set of draftRates
// * set the formData

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
        })

        return findRateWithHistory(client, rateID)
    } catch (err) {
        console.error('SUBMIT PRISMA ATe ERR', err)
        return err
    }
}

export { updateDraftRate }
export type { RateFormEditable }

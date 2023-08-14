import type {
    ActuaryCommunication,
    ActuaryContact,
    PrismaClient,
    RateCapitationType,
    RateDocument,
    RateSupportingDocument,
} from '@prisma/client'
import type {
    StateCodeType,
    RateType as DomainRateType,
} from 'app-web/src/common-code/healthPlanFormDataType'
import type { RateType } from '../../domain-models/contractAndRates'
import { parseRateWithHistory } from './parseRateWithHistory'
import { includeFullRate } from './prismaSubmittedRateHelpers'

type RateFormEditable = {
    rateType?: DomainRateType
    rateCapitationType?: RateCapitationType
    rateDocuments?: RateDocument[]
    supportingDocuments?: RateSupportingDocument[]
    rateDateStart?: Date
    rateDateEnd?: Date
    rateDateCertified?: Date
    amendmentEffectiveDateStart?: Date
    amendmentEffectiveDateEnd?: Date
    rateProgramIDs?: string[]
    rateCertificationName?: string
    certifyingActuaryContacts?: ActuaryContact[]
    addtlActuaryContacts?: ActuaryContact[]
    actuaryCommunicationPreference?: ActuaryCommunication
}
type InsertRateArgsType = RateFormEditable & {
    stateCode: StateCodeType
}

// creates a new rate, with a new revision
async function insertDraftRate(
    client: PrismaClient,
    args: InsertRateArgsType
): Promise<RateType | Error> {
    const {
        stateCode,
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
    } = args

    try {
        return await client.$transaction(async (tx) => {
            const { latestStateRateCertNumber } = await tx.state.update({
                data: {
                    latestStateRateCertNumber: {
                        increment: 1,
                    },
                },
                where: {
                    stateCode: args.stateCode,
                },
            })

            const rate = await tx.rateTable.create({
                data: {
                    stateCode: stateCode,
                    stateNumber: latestStateRateCertNumber,
                    revisions: {
                        create: {
                            rateType,
                            rateCapitationType: rateCapitationType,
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
                        },
                    },
                },
                include: includeFullRate,
            })

            return parseRateWithHistory(rate)
        })
    } catch (err) {
        console.error('RATE PRISMA ERR', err)
        return err
    }
}

export { insertDraftRate }
export type { RateFormEditable, InsertRateArgsType }

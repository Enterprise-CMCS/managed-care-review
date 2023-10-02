import type { StateCodeType } from 'app-web/src/common-code/healthPlanFormDataType'
import type { RateType } from '../../domain-models/contractAndRates'
import { parseRateWithHistory } from './parseRateWithHistory'
import { includeFullRate } from './prismaSubmittedRateHelpers'
import type { PrismaClient } from '@prisma/client'
import type { RateFormEditable } from './updateDraftRate'

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
                                create:
                                    rateDocuments &&
                                    rateDocuments.map((d, idx) => ({
                                        position: idx,
                                        ...d,
                                    })),
                            },
                            supportingDocuments: {
                                create:
                                    supportingDocuments &&
                                    supportingDocuments.map((d, idx) => ({
                                        position: idx,
                                        ...d,
                                    })),
                            },
                            rateDateStart,
                            rateDateEnd,
                            rateDateCertified,
                            amendmentEffectiveDateStart,
                            amendmentEffectiveDateEnd,
                            rateProgramIDs,
                            rateCertificationName,
                            certifyingActuaryContacts: {
                                create:
                                    certifyingActuaryContacts &&
                                    certifyingActuaryContacts.map((c, idx) => ({
                                        position: idx,
                                        ...c,
                                    })),
                            },
                            addtlActuaryContacts: {
                                create:
                                    addtlActuaryContacts &&
                                    addtlActuaryContacts.map((c, idx) => ({
                                        position: idx,
                                        ...c,
                                    })),
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
        console.error('Prisma error inserting rate', err)
        return err
    }
}

export { insertDraftRate }
export type { InsertRateArgsType }

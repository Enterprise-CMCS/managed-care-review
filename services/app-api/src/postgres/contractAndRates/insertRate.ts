import {
    ActuaryCommunication,
    ActuaryContact,
    PrismaClient,
    RateCapitationType,
    RateDocument,
    RateSupportingDocument,
} from '@prisma/client'
import {
    StateCodeType,
    RateType as DomainRateType,
} from 'app-web/src/common-code/healthPlanFormDataType'
import { RateType } from '../../domain-models/contractAndRates'
import {
    contractFormDataToDomainModel,
    includeUpdateInfo,
    rateFormDataToDomainModel,
} from './prismaSharedContractRateHelpers'

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

/*
    8.14.23 Hana Note - this is now a  temporary implementation as function is getting rewritten by MacRae to
    - use similar behavior to insertContract via a shared find with history helper
*/

// creates a new contract, with a new revision
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

            const finalRate: RateType = {
                id: rate.id,
                status: 'DRAFT',
                stateCode: rate.stateCode,
                stateNumber: rate.stateNumber,
                revisions: rate.revisions.map((rr) => ({
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
        })
    } catch (err) {
        console.error('RATE PRISMA ERR', err)
        return err
    }
}

export { insertDraftRate }
export type { RateFormEditable, InsertRateArgsType }

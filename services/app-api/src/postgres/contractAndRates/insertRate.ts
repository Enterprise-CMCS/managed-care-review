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
import { RateType } from '../../domain-models/contractAndRates/contractAndRatesZodSchema'
import {
    contractFormDataToDomainModel,
    rateFormDataToDomainModel,
} from './prismaSharedContractRateHelpers'

type InsertRateArgsType = {
    stateCode: StateCodeType
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

                    contractRevisions: rr.contractRevisions.map(
                        ({ contractRevision }) => ({
                            id: contractRevision.id,
                            createdAt: contractRevision.createdAt,
                            updatedAt: contractRevision.updatedAt,
                            formData:
                                contractFormDataToDomainModel(contractRevision),
                        })
                    ),
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

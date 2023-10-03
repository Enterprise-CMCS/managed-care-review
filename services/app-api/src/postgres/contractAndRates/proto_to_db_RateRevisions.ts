import type {
    PrismaClient,
    HealthPlanRevisionTable,
    Prisma,
    RateTable,
} from '@prisma/client'
import type { HealthPlanFormDataType } from 'app-web/src/common-code/healthPlanFormDataType'
import { includeFullRate } from './prismaSubmittedRateHelpers'

async function migrateRateInfo(
    client: PrismaClient,
    revision: HealthPlanRevisionTable,
    formData: HealthPlanFormDataType
): Promise<RateTable | Error> {
    // get the state info
    const stateCode = formData.stateCode
    const stateNumber = formData.stateNumber

    const state = await client.state.findUnique({
        where: { stateCode: stateCode },
    })

    if (!state) {
        const error = new Error(`State with code ${stateCode} not found`)
        return error
    }

    const rateRevisionData: Prisma.RateRevisionTableCreateWithoutRateInput[] =
        []
    for (const rateInfo of formData.rateInfos) {
        const dataToCopy: Prisma.RateRevisionTableCreateWithoutRateInput = {
            createdAt: revision.createdAt,
            amendmentEffectiveDateStart:
                rateInfo.rateAmendmentInfo?.effectiveDateStart ?? null,
            amendmentEffectiveDateEnd:
                rateInfo.rateAmendmentInfo?.effectiveDateEnd ?? null,
            actuaryCommunicationPreference:
                rateInfo.actuaryCommunicationPreference ?? null,
            rateType: rateInfo.rateType ?? null,
            rateCapitationType: rateInfo.rateCapitationType ?? null,
            rateDateStart: rateInfo.rateDateStart ?? null,
            rateDateEnd: rateInfo.rateDateEnd ?? null,
            rateDateCertified: rateInfo.rateDateCertified ?? null,
            rateProgramIDs: rateInfo.rateProgramIDs ?? [],
            rateCertificationName: rateInfo.rateCertificationName ?? null,
        }

        // Add the unlocked info to the table if it exists
        if (formData.status === 'SUBMITTED' && revision.unlockedBy) {
            const user = await client.user.findFirst({
                where: { email: revision.unlockedBy },
            })
            if (user) {
                dataToCopy.unlockInfo = {
                    create: {
                        updatedAt: revision.unlockedAt ?? formData.updatedAt, //TODO: not sure what we want to fall back to here
                        updatedByID: user.id,
                        updatedReason:
                            revision.unlockedReason ??
                            'Migrated from previous system',
                    },
                }
            } else {
                console.warn(
                    `User with email ${revision.unlockedBy} does not exist. Skipping unlockInfo creation.`
                )
            }
        }

        // add the submit info to the table if it exists
        if (formData.status === 'SUBMITTED' && revision.submittedBy) {
            const user = await client.user.findFirst({
                where: { email: revision.submittedBy },
            })
            if (user) {
                dataToCopy.submitInfo = {
                    create: {
                        updatedAt: formData.updatedAt,
                        updatedByID: user.id,
                        updatedReason:
                            revision.submittedReason ??
                            'Migrated from previous system',
                    },
                }
            } else {
                console.warn(
                    `User with email ${revision.submittedBy} does not exist. Skipping submitInfo creation.`
                )
            }
        }

        // add the actuary contacts
        if (rateInfo.actuaryContacts) {
            dataToCopy.certifyingActuaryContacts = {
                create: rateInfo.actuaryContacts,
            }
        }

        if (formData.addtlActuaryContacts) {
            dataToCopy.addtlActuaryContacts = {
                create: formData.addtlActuaryContacts,
            }
        }
        // handle rate documents
        let rateDocPos = 0
        const rateDocsArray = []
        for (const rateDoc of rateInfo.rateDocuments) {
            const rateDocument: Prisma.RateDocumentCreateWithoutRateRevisionInput =
                {
                    createdAt: revision.createdAt,
                    updatedAt: new Date(),
                    name: rateDoc.name,
                    s3URL: rateDoc.s3URL,
                    sha256: rateDoc.sha256,
                    position: rateDocPos,
                }
            rateDocsArray.push(rateDocument)
            rateDocPos++
        }
        dataToCopy.rateDocuments = {
            create: rateDocsArray,
        }

        // handle rate revision documents
        let rateRevDocPos = 0
        const rateRevDocsArray = []
        for (const supportRateDoc of rateInfo.supportingDocuments) {
            const rateSupportDocument: Prisma.RateSupportingDocumentCreateWithoutRateRevisionInput =
                {
                    createdAt: revision.createdAt,
                    updatedAt: new Date(),
                    name: supportRateDoc.name,
                    s3URL: supportRateDoc.s3URL,
                    sha256: supportRateDoc.sha256,
                    position: rateRevDocPos,
                }
            rateRevDocsArray.push(rateSupportDocument)
            rateRevDocPos++
        }
        dataToCopy.supportingDocuments = {
            create: rateRevDocsArray,
        }
        rateRevisionData.push(dataToCopy)
    }

    const insertRateData: Prisma.RateTableCreateInput = {
        state: {
            connect: {
                stateCode: stateCode,
            },
        },
        stateNumber: stateNumber,
        revisions: {
            create: rateRevisionData,
        },
    }

    try {
        const migratedRateTable = await client.rateTable.create({
            data: insertRateData,
            include: includeFullRate,
        })

        return migratedRateTable
    } catch (err) {
        return err
    }
}

/*
    try {
        let submitInfoID: string | null = null
        if (formData.status === 'SUBMITTED' && revision.submittedBy) {
            const user = await client.user.findFirst({
                where: { email: revision.submittedBy },
            })

            if (user) {
                const existingUpdateInfo =
                    await client.updateInfoTable.findFirst({
                        where: { updatedByID: user.id },
                    })

                if (existingUpdateInfo) {
                    submitInfoID = existingUpdateInfo.id
                } else {
                    const newUpdateInfo = await client.updateInfoTable.create({
                        data: {
                            updatedAt: formData.updatedAt,
                            updatedByID: user.id,
                            updatedReason: 'Migrated from previous system',
                        },
                    })
                    submitInfoID = newUpdateInfo.id
                }
            } else {
                console.warn(
                    `User with email ${revision.submittedBy} does not exist. Skipping submitInfo creation.`
                )
            }
        }

        // find the user if it has been unlocked
        let unlockInfoID: string | null = null
        if (formData.status === 'SUBMITTED' && revision.unlockedBy) {
            const user = await client.user.findFirst({
                where: { email: revision.unlockedBy },
            })

            if (user) {
                const existingUnlockInfo =
                    await client.updateInfoTable.findFirst({
                        where: { updatedByID: user.id },
                    })

                if (existingUnlockInfo) {
                    unlockInfoID = existingUnlockInfo.id
                } else {
                    const newUnlockInfo = await client.updateInfoTable.create({
                        data: {
                            updatedAt:
                                revision.unlockedAt ?? formData.updatedAt, //TODO: not sure what we want to fall back to here
                            updatedByID: user.id,
                            updatedReason:
                                revision.unlockedReason ??
                                'Migrated from previous system',
                        },
                    })
                    unlockInfoID = newUnlockInfo.id
                }
            } else {
                console.warn(
                    `User with email ${revision.unlockedBy} does not exist. Skipping unlockInfo creation.`
                )
            }
        }

        for (const rateInfo of formData.rateInfos) {
            const rateID = revision.pkgID // TODO: new IDs here

            const existingRate = await client.rateTable.findFirst({
                where: { id: rateID },
            })
            let createdRate: RateTable
            if (!existingRate) {
                createdRate = await client.rateTable.create({
                    data: {
                        id: rateID,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        stateCode: formData.stateCode,
                        stateNumber: formData.stateNumber,
                    },
                })
                results.rate = createdRate
            } else {
                createdRate = existingRate
                console.warn(
                    `Rate with ID ${rateID} already exists. Skipping...`
                )
            }

            const existingRateRevision =
                await client.rateRevisionTable.findFirst({
                    where: {
                        rateID: createdRate.id,
                        rateType: rateInfo.rateType,
                        rateCapitationType: rateInfo.rateCapitationType,
                        rateDateStart: rateInfo.rateDateStart,
                        rateDateEnd: rateInfo.rateDateEnd,
                    },
                })
            if (existingRateRevision) {
                console.warn(
                    `Rate revision for rate ID ${createdRate.id} with similar properties already exists. Skipping...`
                )
                continue
            }

            const rateRevisionId = uuid()

            const rateRevision: RateRevisionTable = {
                id: rateRevisionId,
                rateID: createdRate.id,
                createdAt: new Date(), // TODO: get this from the HP revision table
                updatedAt: new Date(),
                unlockInfoID: unlockInfoID,
                submitInfoID: submitInfoID,
                amendmentEffectiveDateStart:
                    rateInfo.rateAmendmentInfo?.effectiveDateStart ?? null,
                amendmentEffectiveDateEnd:
                    rateInfo.rateAmendmentInfo?.effectiveDateEnd ?? null,
                actuaryCommunicationPreference:
                    rateInfo.actuaryCommunicationPreference ?? null,
                rateType: rateInfo.rateType ?? null,
                rateCapitationType: rateInfo.rateCapitationType ?? null,
                rateDateStart: rateInfo.rateDateStart ?? null,
                rateDateEnd: rateInfo.rateDateEnd ?? null,
                rateDateCertified: rateInfo.rateDateCertified ?? null,
                rateProgramIDs: rateInfo.rateProgramIDs ?? [],
                rateCertificationName: rateInfo.rateCertificationName ?? null,
            }

            try {
                const createdRateRevision =
                    await client.rateRevisionTable.create({
                        data: rateRevision,
                    })
                results.rateRevisions.push(createdRateRevision)
            } catch (error) {
                console.error(`Error creating rate revision: ${error.message}`)
            }
        }

        return results
    } catch (err) {
        const error = new Error(
            `Error migrating rate info: ${JSON.stringify(err)}`
        )
        return error
    }
}
*/

export { migrateRateInfo }

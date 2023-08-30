import type {
    PrismaClient,
    RateTable,
    RateRevisionTable,
    HealthPlanRevisionTable,
} from '@prisma/client'
import { v4 as uuid } from 'uuid'
import type { HealthPlanFormDataType } from 'app-web/src/common-code/healthPlanFormDataType'

type MigrateRateInfoResult = {
    rate: RateTable
    rateRevisions: RateRevisionTable[]
}

async function migrateRateInfo(
    client: PrismaClient,
    revision: HealthPlanRevisionTable,
    formData: HealthPlanFormDataType
): Promise<MigrateRateInfoResult | Error> {
    //const results: (RateTable | RateRevisionTable | Error)[] = []
    const results: MigrateRateInfoResult = {
        rate: {} as RateTable,
        rateRevisions: [],
    }

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

        for (const rateInfo of formData.rateInfos) {
            const rateID = revision.pkgID

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
                createdAt: new Date(),
                updatedAt: new Date(),
                unlockInfoID: null,
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

export { migrateRateInfo }

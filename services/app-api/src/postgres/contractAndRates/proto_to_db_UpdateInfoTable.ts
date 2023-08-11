import type { PrismaClient, HealthPlanRevisionTable } from '@prisma/client'
import type { HealthPlanFormDataType } from '../../../../app-web/src/common-code/healthPlanFormDataType'

async function prepopulateUpdateInfo(
    client: PrismaClient,
    revision: HealthPlanRevisionTable,
    formData: HealthPlanFormDataType
): Promise<string | null> {
    try {
        const user = await client.user.findFirst({
            where: { email: { equals: revision.submittedBy ?? undefined } },
        })

        if (!user) {
            console.warn(
                `User with email ${revision.submittedBy} does not exist. Skipping UpdateInfoTable creation.`
            )
            return null
        }

        const updateInfo = await client.updateInfoTable.create({
            data: {
                updatedAt: formData.updatedAt,
                updatedByID: user.id,
                updatedReason: 'Migrated from previous system',
            },
        })

        return updateInfo.id
    } catch (error) {
        console.error(
            `Error pre-populating UpdateInfoTable: ${JSON.stringify(error)}`
        )
        return null
    }
}

export { prepopulateUpdateInfo }

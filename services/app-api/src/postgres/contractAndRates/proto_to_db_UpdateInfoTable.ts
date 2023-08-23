import type { PrismaClient, HealthPlanRevisionTable } from '@prisma/client'
import type { HealthPlanFormDataType } from '../../../../app-web/src/common-code/healthPlanFormDataType'

async function prepopulateUpdateInfo(
    client: PrismaClient,
    revision: HealthPlanRevisionTable,
    formData: HealthPlanFormDataType
): Promise<string | Error> {
    try {
        const user = await client.user.findFirst({
            where: { email: { equals: revision.submittedBy ?? undefined } },
        })

        if (!user) {
            const error = new Error(
                `User with email ${revision.submittedBy} does not exist. Skipping UpdateInfoTable creation.`
            )
            return error
        }

        const updateInfo = await client.updateInfoTable.create({
            data: {
                updatedAt: formData.updatedAt,
                updatedByID: user.id,
                updatedReason: 'Migrated from previous system',
            },
        })

        return updateInfo.id
    } catch (err) {
        const error = new Error(
            `Error pre-populating UpdateInfoTable: ${JSON.stringify(err)}`
        )
        return error
    }
}

export { prepopulateUpdateInfo }

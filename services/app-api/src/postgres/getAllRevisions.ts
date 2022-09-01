import { PrismaClient } from '@prisma/client'
import { HealthPlanPackageTable, HealthPlanRevisionTable } from '@prisma/client'
export type PackagesAndRevisions = (HealthPlanPackageTable & {
    revisions: HealthPlanRevisionTable[]
})[]

export async function getAllRevisions(
    client: PrismaClient
): Promise<HealthPlanRevisionTable[] | undefined> {
    const everything: HealthPlanRevisionTable[] =
        await client.healthPlanRevisionTable.findMany()
    return everything
}

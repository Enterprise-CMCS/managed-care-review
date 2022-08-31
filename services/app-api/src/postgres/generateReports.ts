import { PrismaClient } from '@prisma/client'
import { HealthPlanPackageTable, HealthPlanRevisionTable } from '@prisma/client'
export type PackagesAndRevisions = (HealthPlanPackageTable & {
    revisions: HealthPlanRevisionTable[]
})[]

export async function generateReports(
    client: PrismaClient
): Promise<PackagesAndRevisions | undefined> {
    const everything: PackagesAndRevisions =
        await client.healthPlanPackageTable.findMany({
            include: {
                revisions: true,
            },
        })
    return everything
}

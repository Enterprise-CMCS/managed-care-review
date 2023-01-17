import { PrismaClient } from '@prisma/client'
import { HealthPlanPackageTable, HealthPlanRevisionTable } from '@prisma/client'
import { StoreError } from '../storeError'
export type PackagesAndRevisions = (HealthPlanPackageTable & {
    revisions: HealthPlanRevisionTable[]
})[]

export async function findAllRevisions(
    client: PrismaClient
): Promise<HealthPlanRevisionTable[] | StoreError> {
    const allRevisions: HealthPlanRevisionTable[] =
        await client.healthPlanRevisionTable.findMany()
    if (allRevisions instanceof Error) {
        console.error('findAllRevisions error:', allRevisions)
    }
    return allRevisions
}

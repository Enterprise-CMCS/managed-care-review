import { PrismaClient } from '@prisma/client'
import { HealthPlanPackageTable, HealthPlanRevisionTable } from '@prisma/client'
import { StoreError } from './storeError'
export type PackagesAndRevisions = (HealthPlanPackageTable & {
    revisions: HealthPlanRevisionTable[]
})[]

export async function findAllRevisions(
    client: PrismaClient
): Promise<HealthPlanRevisionTable[] | StoreError> {
    const allRevisions: HealthPlanRevisionTable[] =
        await client.healthPlanRevisionTable.findMany({
            where: {
                pkg: {
                    stateCode: {
                        not: 'AS', // exclude test state as per ADR 019
                    },
                },
            },
        })
    if (allRevisions instanceof Error) {
        console.error('findAllRevisions error:', allRevisions)
    }
    return allRevisions
}

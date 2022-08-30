/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from '@prisma/client'

export async function generateReports(
    client: PrismaClient
): Promise<any | undefined> {
    const everything = await client.healthPlanPackageTable.findMany({
        include: {
            revisions: true,
        },
    })
    return everything
}

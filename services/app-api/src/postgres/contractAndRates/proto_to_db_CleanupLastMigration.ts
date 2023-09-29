import type { PrismaClient } from '@prisma/client'

// this function removes all the data that was previously migrated from Protos.
// the motivation here is that we want to run the migrator as many times as we want,
// but keeping track of what was migrated already and what has not been is complicated.
// Instead, remove it all and start fresh.
export async function cleanupLastMigration(
    client: PrismaClient
): Promise<void | Error> {
    try {
        const deleteManyResult = await client.$transaction([
            client.contractRevisionTable.deleteMany(),
            client.rateRevisionTable.deleteMany(),
            client.contractDocument.deleteMany(),
            client.rateDocument.deleteMany(),
            client.contractSupportingDocument.deleteMany(),
            client.rateSupportingDocument.deleteMany(),
            client.rateRevisionsOnContractRevisionsTable.deleteMany(),
            client.updateInfoTable.deleteMany(),

            // must be last due to foreign keys
            client.rateTable.deleteMany(),
            client.contractTable.deleteMany(),
        ])

        if (deleteManyResult instanceof Error) {
            const error = new Error(
                `Error removing data from tables: ${deleteManyResult.message}`
            )
            console.error(error)
            return error
        }
        return
    } catch (err) {
        console.error(err)
        return err
    }
}

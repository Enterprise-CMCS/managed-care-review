import type { PrismaTransactionType } from '../../postgres/prismaTypes'

export const migrateToDeleteContractOnlyRates = async (
    client: PrismaTransactionType
): Promise<Error | void> => {
    try {
        // find those empty submitted rates by their revision
        const badRateRevisions = await client.rateRevisionTable.findMany({
            where: {
                rateType: undefined,
                submitInfo: {
                    isNot: null,
                },
                unlockInfo: {
                    is: null, // has to be submitted revision that is not yet unlocked
                },
            },
        })
        console.info(
            `Found ${badRateRevisions.length} rate revisions to delete`
        )

        await client.rateRevisionTable.deleteMany({
            where: {
                id: {
                    in: badRateRevisions.map((rev) => rev.id),
                },
            },
        })

        // delete any empty rates
        await client.rateTable.deleteMany({
            where: {
                revisions: {
                    none: {},
                },
            },
        })
    } catch (error) {
        console.error(`Data migration ERROR: ${error}`)
    }
}

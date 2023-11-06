import type { PrismaTransactionType } from '../../postgres/prismaTypes'

export const migrate = async (
    tx: PrismaTransactionType
): Promise<Error | undefined> => {
    try {
        const initialRates = await tx.rateTable.findMany({
            where: {
                revisions: {
                    some: {
                        submitInfo: {
                            isNot: null,
                        },
                    },
                },
                stateCode: {
                    not: 'AS', // exclude test state as per ADR 019
                },
            },
        })
        console.info(
            ` ---- Prepare to migrate. Currently there are ${initialRates.length} rates`
        )

        const badRateRevisions = await tx.rateRevisionTable.findMany({
            where: {
                rateDateStart: null,
                rateDateEnd: null,
                rateDateCertified: null,
                rateType: null,
            },
        })

        console.info(`Found ${badRateRevisions.length} empty rate revisions`)

        await tx.rateRevisionTable.deleteMany({
            where: {
                id: {
                    in: badRateRevisions.map((rev) => rev.id),
                },
            },
        })

        const badRates = await tx.rateTable.findMany({
            where: {
                revisions: {
                    none: {},
                },
            },
        })

        console.info(`Found ${badRates.length} rates with empty revisions`)

        await tx.rateTable.deleteMany({
            where: {
                id: {
                    in: badRates.map((rate) => rate.id),
                },
            },
        })

        console.info(`Succesfully deleted ${badRates.length} empty rates`)

        const endingRates = await tx.rateTable.findMany({
            where: {
                revisions: {
                    some: {
                        submitInfo: {
                            isNot: null,
                        },
                    },
                },
                stateCode: {
                    not: 'AS', // exclude test state as per ADR 019
                },
            },
        })
        console.info(
            ` ---- End migration. Now there are ${endingRates.length} rates`
        )
        return
    } catch (error) {
        console.error(`Data migrationclean_empty_rates ERROR: ${error}`)
    }
}

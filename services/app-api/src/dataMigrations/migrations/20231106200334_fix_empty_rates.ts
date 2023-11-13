import type { PrismaTransactionType } from '../../postgres/prismaTypes'

export const migrate = async (
    tx: PrismaTransactionType
): Promise<Error | undefined> => {
    try {
        const initialRates = await tx.rateTable.findMany({
            where: {
                stateCode: {
                    not: 'AS', // exclude test state as per ADR 019
                },
            },
        })
        console.info(
            ` ---- Prepare to migrate. Currently there are ${initialRates.length} rates`
        )

        const badRateRevisionsDelete = await tx.rateRevisionTable.deleteMany({
            where: {
                rateDateStart: null,
                rateDateEnd: null,
                rateDateCertified: null,
                rateType: null,
                submitInfo: {
                    isNot: null,
                },
                contractRevisions: {
                    every: {
                        contractRevision: {
                            submissionType: 'CONTRACT_ONLY',
                        },
                    },
                },
            },
        })

        console.info(
            `Successfully deleted ${badRateRevisionsDelete.count} malformatted rate revisions`
        )

        const badRatesDelete = await tx.rateTable.deleteMany({
            where: {
                revisions: {
                    none: {},
                },
            },
        })

        console.info(`Successfully deleted ${badRatesDelete.count} empty rates`)

        const endingRates = await tx.rateTable.findMany({
            where: {
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
        return error
    }
}

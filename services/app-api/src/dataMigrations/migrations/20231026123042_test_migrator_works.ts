import type { PrismaTransactionType } from '../../postgres/prismaTypes'

export async function migrate(
    client: PrismaTransactionType
): Promise<Error | undefined> {
    const rateCount = await client.rateTable.count()
    const contractCount = await client.contractTable.count()

    console.info(
        `On first migration there are ${contractCount} Contracts and ${rateCount} Rates`
    )

    return undefined
}

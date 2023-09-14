import type { PrismaClient } from '@prisma/client'

async function migrateAssociations(
    client: PrismaClient
): Promise<void | Error> {
    try {
        // Retrieve all submitted ContractRevisions.
        const submittedContractRevisions =
            await client.contractRevisionTable.findMany({
                where: { NOT: { submitInfoID: null } },
            })

        // most of the logic here is for preventing duplicate insertions
        for (const contractRevision of submittedContractRevisions) {
            const associatedRateRevisions =
                await client.rateRevisionTable.findMany({
                    where: {
                        NOT: { submitInfoID: null },
                        rateID: contractRevision.contractID,
                    },
                })

            for (const rateRevision of associatedRateRevisions) {
                const existingAssociation =
                    await client.rateRevisionsOnContractRevisionsTable.findFirst(
                        {
                            where: {
                                rateRevisionID: rateRevision.id,
                                contractRevisionID: contractRevision.id,
                            },
                        }
                    )

                if (!existingAssociation) {
                    await client.rateRevisionsOnContractRevisionsTable.create({
                        data: {
                            rateRevisionID: rateRevision.id,
                            contractRevisionID: contractRevision.id,
                            validAfter: new Date(),
                        },
                    })
                } else {
                    console.warn(
                        `Association between rateRevisionID ${rateRevision.id} and contractRevisionID ${contractRevision.id} already exists. Skipping...`
                    )
                }
            }
        }
    } catch (err) {
        return new Error('Error migrating associations')
    }
}

export { migrateAssociations }

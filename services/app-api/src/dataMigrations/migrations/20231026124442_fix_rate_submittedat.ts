import type { PrismaTransactionType } from '../../postgres/prismaTypes'

export async function migrate(
    client: PrismaTransactionType,
    _contractIDs?: string[]
): Promise<Error | undefined> {
    // Everything that was migrated is busted
    // we need to take all the validAfters & submittedAts and set them to be the createdAt for the contract.
    // The migration on Prod was done 2023-10-10T20:14:35 -> 2023-10-10T20:14:40
    // there may be data we don't want to mess with on dev/val but I don't care
    // easy fix is to find all join table entries with validAfter before the migration and set their valid after to be created at on the contract.

    try {
        const joinEntries =
            await client.rateRevisionsOnContractRevisionsTable.findMany({
                where: {
                    validAfter: {
                        lt: new Date('2023-10-11'),
                    },
                },
                include: {
                    contractRevision: {
                        include: {
                            submitInfo: true,
                        },
                    },
                },
            })

        let lastContractRevID: string | undefined = undefined
        let repeatCount = 1
        for (const joinEntry of joinEntries) {
            // ONLY TRICK, is we don't have an explicit ordering for rate revisions yet. We use
            // validAfter as a hack to get ordering.
            // So IF a contractRevision has multiple rateRevisions associated with it, we need to
            // make sure they end up with validAt in the same order.

            // We'll by default make the initial validAt be 1 second before contractRev.createdAt
            // for additional revisions in the same contract, we can divide the subtracted amount by 2 repeatedly

            if (joinEntry.contractRevisionID !== lastContractRevID) {
                lastContractRevID = joinEntry.contractRevisionID
                repeatCount = 1
            } else {
                repeatCount++
            }

            const orderingDiscount = 1000 / repeatCount
            const revSubmittedAt =
                joinEntry.contractRevision.submitInfo?.updatedAt ||
                joinEntry.contractRevision.createdAt
            const newValidAfter = new Date(
                revSubmittedAt.getTime() - orderingDiscount
            )

            await client.rateRevisionsOnContractRevisionsTable.update({
                where: {
                    // this is a combined primary key
                    rateRevisionID_contractRevisionID_validAfter: {
                        rateRevisionID: joinEntry.rateRevisionID,
                        contractRevisionID: joinEntry.contractRevisionID,
                        validAfter: joinEntry.validAfter,
                    },
                },
                data: {
                    validAfter: newValidAfter,
                    rateRevision: {
                        update: {
                            submitInfo: {
                                update: {
                                    updatedAt: newValidAfter,
                                },
                            },
                        },
                    },
                },
            })
        }
    } catch (err) {
        console.error('Prisma Error: ', err)
        return err
    }

    return undefined
}

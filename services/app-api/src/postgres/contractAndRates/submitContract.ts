import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import { Contract } from './contractType'
import { findContract } from './findContract'

// Update the given revision
// * invalidate relationships of previous revision
// * set the ActionInfo
async function submitContract(
    client: PrismaClient,
    contractID: string,
    submittedByUserID: string,
    submitReason: string
): Promise<Contract | Error> {
    const groupTime = new Date()

    try {
        // Given all the Rates associated with this draft, find the most recent submitted
        // rateRevision to attach to this contract on submit.
        const currentRev = await client.contractRevisionTable.findFirst({
            where: {
                contractID: contractID,
                submitInfoID: null,
            },
            include: {
                draftRates: {
                    include: {
                        revisions: {
                            where: {
                                submitInfoID: { not: null },
                            },
                            take: 1,
                            orderBy: {
                                createdAt: 'desc',
                            },
                        },
                    },
                },
            },
        })
        if (!currentRev) {
            console.error('No Unsubmitted Rev!')
            return new Error('cant find the current rev to submit')
        }

        const submittedRateRevisions = currentRev.draftRates.map(
            (c) => c.revisions[0]
        )

        if (submittedRateRevisions.some((rev) => rev === undefined)) {
            console.error(
                'Attempted to submit a contract related to a rate that has not been submitted'
            )
            return new Error(
                'Attempted to submit a contract related to a rate that has not been submitted'
            )
        }

        const updated = await client.contractRevisionTable.update({
            where: {
                id: currentRev.id,
            },
            data: {
                submitInfo: {
                    create: {
                        id: uuidv4(),
                        updatedAt: groupTime,
                        updatedByID: submittedByUserID,
                        updatedReason: submitReason,
                    },
                },
                rateRevisions: {
                    createMany: {
                        data: submittedRateRevisions.map((rev) => ({
                            rateRevisionID: rev.id,
                            validAfter: groupTime,
                        })),
                    },
                },
            },
            include: {
                rateRevisions: {
                    include: {
                        rateRevision: true,
                    },
                },
            },
        })

        // oldRev is the previously submitted revision of this contract (the one just superseded by the update)
        // get the previous revision, to invalidate all relationships and add any removed entries to the join table.
        const oldRev = await client.contractRevisionTable.findFirst({
            where: {
                contractID: updated.contractID,
                NOT: {
                    id: updated.id,
                },
            },
            include: {
                rateRevisions: {
                    include: {
                        rateRevision: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        // on an initial submission, there won't be an oldRev
        // validUntil: null means it's current.  we invalidate the joins on the old revision by giving it a validUntil value
        if (oldRev) {
            // if any of the old rev's Rates aren't in the new Rates, add an entry
            // entry is for a previous rate to this new contractRev.
            const oldRateRevs = oldRev.rateRevisions
                .filter((rrevjoin) => !rrevjoin.validUntil)
                .map((rrevjoin) => rrevjoin.rateRevision)
            const removedRateRevs = oldRateRevs.filter(
                (rrev) =>
                    !currentRev.draftRates
                        .map((r) => r.id)
                        .includes(rrev.rateID)
            )

            if (removedRateRevs.length > 0) {
                await client.rateRevisionsOnContractRevisionsTable.createMany({
                    data: removedRateRevs.map((rrev) => ({
                        contractRevisionID: updated.id,
                        rateRevisionID: rrev.id,
                        validAfter: groupTime,
                        validUntil: groupTime,
                        isRemoval: true,
                    })),
                })
            }

            await client.rateRevisionsOnContractRevisionsTable.updateMany({
                where: {
                    contractRevisionID: oldRev.id,
                    validUntil: null,
                },
                data: {
                    validUntil: groupTime,
                    invalidatedByContractRevisionID: updated.id,
                },
            })
        }

        return findContract(client, contractID)
    } catch (err) {
        console.error('SUBMITeeee PRISMA CONTRACT ERR', err)
        return err
    }
}

export { submitContract }

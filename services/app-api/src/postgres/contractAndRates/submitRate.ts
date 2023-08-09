import { PrismaClient } from '@prisma/client'
import { RateType } from '../../domain-models/contractAndRates'
import { findRateWithHistory } from './findRateWithHistory'

// Update the given revision
// * invalidate relationships of previous revision
// * set the ActionInfo
async function submitRate(
    client: PrismaClient,
    rateID: string,
    submittedByUserID: string,
    submitReason: string
): Promise<RateType | Error> {
    const groupTime = new Date()

    try {
        return await client.$transaction(async (tx) => {
            // Given all the Contracts associated with this draft, find the most recent submitted
            // contractRevision to attach to this rate on submit.
            const currentRev = await tx.rateRevisionTable.findFirst({
                where: {
                    rateID: rateID,
                    submitInfoID: null,
                },
                include: {
                    draftContracts: {
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
                console.error('No Unsubmitted Rate Rev!')
                return new Error('cant find the current rev to submit')
            }

            const freshContractRevs = currentRev.draftContracts.map(
                (c) => c.revisions[0]
            )

            if (freshContractRevs.some((rev) => rev === undefined)) {
                console.error(
                    'Attempted to submit a rate related to a contract that has not been submitted'
                )
                return new Error(
                    'Attempted to submit a rate related to a contract that has not been submitted'
                )
            }

            const updated = await tx.rateRevisionTable.update({
                where: {
                    id: currentRev.id,
                },
                data: {
                    submitInfo: {
                        create: {
                            updatedAt: groupTime,
                            updatedByID: submittedByUserID,
                            updatedReason: submitReason,
                        },
                    },
                    contractRevisions: {
                        createMany: {
                            data: freshContractRevs.map((rev) => ({
                                contractRevisionID: rev.id,
                                validAfter: groupTime,
                            })),
                        },
                    },
                },
                include: {
                    contractRevisions: {
                        include: {
                            contractRevision: true,
                        },
                    },
                },
            })

            const oldRev = await tx.rateRevisionTable.findFirst({
                where: {
                    rateID: updated.rateID,
                    NOT: {
                        id: updated.id,
                    },
                },
                include: {
                    contractRevisions: {
                        include: {
                            contractRevision: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            })

            // invalidate all joins on the old revision
            if (oldRev) {
                // if any of the old rev's Rates aren't in the new Rates, add an entry
                const oldContractRevs = oldRev.contractRevisions
                    .filter((crevjoin) => !crevjoin.validUntil)
                    .map((crevjoin) => crevjoin.contractRevision)
                const removedContractRevs = oldContractRevs.filter(
                    (crev) =>
                        !currentRev.draftContracts
                            .map((c) => c.id)
                            .includes(crev.contractID)
                )

                if (removedContractRevs.length > 0) {
                    await tx.rateRevisionsOnContractRevisionsTable.createMany({
                        data: removedContractRevs.map((crev) => ({
                            rateRevisionID: updated.id,
                            contractRevisionID: crev.id,
                            validAfter: groupTime,
                            validUntil: groupTime,
                            isRemoval: true,
                        })),
                    })
                }

                await tx.rateRevisionsOnContractRevisionsTable.updateMany({
                    where: {
                        rateRevisionID: oldRev.id,
                        validUntil: null,
                    },
                    data: {
                        validUntil: groupTime,
                    },
                })
            }

            return findRateWithHistory(tx, rateID)
        })
    } catch (err) {
        console.error('SUBMIT PRISMA CONTRACT ERR', err)
        return err
    }
}

export { submitRate }

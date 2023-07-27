import { PrismaClient } from '@prisma/client'
import { ContractType } from '../../domain-models/contractAndRates/contractAndRatesZodSchema'
import { findContractWithHistory } from './findContractWithHistory'
import { StoreError, convertPrismaErrorToStoreError } from '../storeError'

// Update the given revision
// * invalidate relationships of previous revision
// * set the ActionInfo
async function submitContract(
    client: PrismaClient,
    contractID: string,
    submittedByUserID: string,
    submitReason: string
): Promise<ContractType | StoreError | Error> {
    const groupTime = new Date()

    try {
        return await client.$transaction(async (tx) => {
            // Given all the Rates associated with this draft, find the most recent submitted
            // rateRevision to attach to this contract on submit.
            const currentRev = await tx.contractRevisionTable.findFirstOrThrow({
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

            const updated = await tx.contractRevisionTable.update({
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
            const oldRev = await tx.contractRevisionTable.findFirst({
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
                    await tx.rateRevisionsOnContractRevisionsTable.createMany({
                        data: removedRateRevs.map((rrev) => ({
                            contractRevisionID: updated.id,
                            rateRevisionID: rrev.id,
                            validAfter: groupTime,
                            validUntil: groupTime,
                            isRemoval: true,
                        })),
                    })
                }

                // invalidate all revisions associated with the previous rev
                await tx.rateRevisionsOnContractRevisionsTable.updateMany({
                    where: {
                        contractRevisionID: oldRev.id,
                        validUntil: null,
                    },
                    data: {
                        validUntil: groupTime,
                    },
                })
            }

            return await findContractWithHistory(tx, contractID)
        })
    } catch (err) {
        console.error('PRISMA CONTRACT ERR', err)
        return convertPrismaErrorToStoreError(err)
    }
}

export { submitContract }

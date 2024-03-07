import type { PrismaClient } from '@prisma/client'
import type { ContractType } from '../../domain-models/contractAndRates'
import { findContractWithHistory } from './findContractWithHistory'
import { NotFoundError } from '../postgresErrors'
import type { UpdateInfoType } from '../../domain-models'
import { includeDraftRates } from './prismaDraftContractHelpers'

export type SubmitContractArgsType = {
    contractID: string // revision ID
    submittedByUserID: UpdateInfoType['updatedBy']
    submittedReason: UpdateInfoType['updatedReason']
}
// Update the given revision
// * invalidate relationships of previous revision by marking as outdated
// * set the UpdateInfo
export async function submitContract(
    client: PrismaClient,
    args: SubmitContractArgsType
): Promise<ContractType | NotFoundError | Error> {
    const { contractID, submittedByUserID, submittedReason } = args
    const currentDateTime = new Date()

    try {
        // find the current contract with related rates
        const currentRev = await client.contractRevisionTable.findFirst({
            where: {
                contractID: contractID,
                submitInfoID: null,
            },
            include: {
                draftRates: {
                    include: includeDraftRates,
                },
            },
        })

        if (!currentRev) {
            const err = `PRISMA ERROR: Cannot find the current rev to submit with contract id: ${contractID}`
            console.error(err)
            return new NotFoundError(err)
        }

        // get the related rate revisions and any unsubmitted rates
        const relatedRateRevs = currentRev.draftRates.map((c) => c.revisions[0])
        console.info(`currentRev: ${JSON.stringify(currentRev, null, '  ')}`)
        const unsubmittedRates = relatedRateRevs.filter(
            (rev) => rev.submitInfo === null
        )

        console.info(unsubmittedRates)

        return await client.$transaction(async (tx) => {
            // Create the submitInfo record in the updateInfoTable
            const submitInfo = await tx.updateInfoTable.create({
                data: {
                    updatedAt: currentDateTime,
                    updatedByID: submittedByUserID,
                    updatedReason: submittedReason,
                },
            })

            // Update the contract to include the submitInfo ID
            const updated = await tx.contractRevisionTable.update({
                where: {
                    id: currentRev.id,
                },
                data: {
                    submitInfo: {
                        connect: {
                            id: submitInfo.id,
                        },
                    },
                    rateRevisions: {
                        createMany: {
                            data: relatedRateRevs.map((rev, idx) => ({
                                rateRevisionID: rev.id,
                                // Since rates come out the other side ordered by validAfter, we need to order things on the way in that way.
                                validAfter: new Date(
                                    currentDateTime.getTime() -
                                        relatedRateRevs.length +
                                        idx +
                                        1
                                ),
                            })),
                        },
                    },
                    draftRates: {
                        set: [],
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

            // we only want to update the rateRevision's submit info if it has not already been submitted
            for (const rev of unsubmittedRates) {
                await tx.rateRevisionTable.update({
                    where: {
                        id: rev.id,
                    },
                    data: {
                        submitInfo: {
                            connect: {
                                id: submitInfo.id,
                            },
                        },
                    },
                })
            }

            // oldRev is the previously submitted revision of this contract (the one just superseded by the update)
            // on an initial submission, there won't be an oldRev
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

            // Take oldRev, invalidate all relationships and add any removed entries to the join table.
            if (oldRev) {
                // If any of the old rev's Rates aren't in the new Rates, add an entry in revisions join table
                // isRemoval field shows that this is a previous rate related with this contract that is now removed
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
                            validAfter: currentDateTime,
                            validUntil: currentDateTime,
                            isRemoval: true,
                        })),
                    })
                }

                // Invalidate old revision join table links by updating validUntil
                // these links are considered outdated going forward
                await tx.rateRevisionsOnContractRevisionsTable.updateMany({
                    where: {
                        contractRevisionID: oldRev.id,
                        validUntil: null,
                    },
                    data: {
                        validUntil: currentDateTime,
                    },
                })
            }

            return await findContractWithHistory(tx, contractID)
        })
    } catch (err) {
        const error = new Error(`Error submitting contract ${err}`)
        return error
    }
}

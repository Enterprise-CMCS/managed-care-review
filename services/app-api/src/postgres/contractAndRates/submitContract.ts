import type { PrismaClient } from '@prisma/client'
import type {
    ContractType,
    RateRevisionType,
    RateRevisionWithContractsType,
} from '../../domain-models/contractAndRates'
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
        return await client.$transaction(async (tx) => {
            // New C+R code
            const currentContract = await findContractWithHistory(
                tx,
                contractID
            )
            if (currentContract instanceof Error) {
                return currentContract
            }

            if (!currentContract.draftRevision || !currentContract.draftRates) {
                return new Error(
                    'Attempting to submit a contract that has no draft data'
                )
            }

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
            const relatedRates = currentContract.draftRates
            const relatedRateRevs = relatedRates
                ? relatedRates.map((r) => r.draftRevision || r.revisions[0])
                : []

            const unsubmittedRateRevs: RateRevisionType[] = relatedRates
                ? relatedRates
                      .map((r) => r.draftRevision)
                      .filter((rr): rr is RateRevisionWithContractsType => !!rr)
                : []

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
            await tx.rateRevisionTable.updateMany({
                where: {
                    id: {
                        in: unsubmittedRateRevs.map((rev) => rev.id),
                    },
                },
                data: {
                    submitInfoID: submitInfo.id,
                },
            })

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

            // NEW C+R HISTORY CODE
            // add an entry for this contract revision in the related submissions table
            await tx.contractRevisionTable.update({
                where: {
                    id: currentRev.id,
                },
                data: {
                    relatedSubmisions: {
                        connect: {
                            id: submitInfo.id,
                        },
                    },
                },
            })

            const draftRateRevisionIDs: {
                rateID: string
                revisionID: string
            }[] = currentContract.draftRates.map((r) => {
                // have to deal with the fact that the rate will have been submitted at this point but wasn't at the start
                const lastRev = r.draftRevision || r.revisions[0]
                return {
                    rateID: r.id,
                    revisionID: lastRev.id,
                }
            })

            const disconnectedRateRevs = []
            // if there is a previous submission, add any removed rates from that previous submission to the pile
            if (currentContract.packageSubmissions.length > 0) {
                const pastSubmission = currentContract.packageSubmissions[0]

                // get all related rate revisions that need to be linked to this submission
                const previousRateRevisions = pastSubmission.rateRevisions
                for (const previousRateRevision of previousRateRevisions) {
                    if (
                        !draftRateRevisionIDs.find(
                            (r) => r.rateID === previousRateRevision.rateID
                        )
                    ) {
                        // draftRateRevisionIDs.push({
                        //     rateID: previousRateRevision.rate.id,
                        //     revisionID: previousRateRevision.id,
                        // })
                        disconnectedRateRevs.push(previousRateRevision)
                    }
                }
            }

            // submitted contract+rates all get the submission pointed at them.
            // submitted contract+rates + related rates get a related revision
            // everything that gets a related revision, gets links to the current state of the world

            // all currently draft rates and disconnected rates have all their connections to old
            // contract revisions that are not this contract revision copied, in addition to the connection
            // (or disconnection) from the new contract revision.
            // get the related rates, all of their previously connected contracts need to
            // get links.
            const allRelatedRateRevisionsBefore =
                await tx.rateRevisionTable.findMany({
                    where: {
                        id: {
                            in: draftRateRevisionIDs.map((rr) => rr.revisionID),
                        },
                    },
                    include: {
                        relatedSubmissions: {
                            include: {
                                submissionPackages: {
                                    include: {
                                        contractRevision: true,
                                    },
                                },
                            },
                            orderBy: {
                                updatedAt: 'desc',
                            },
                        },
                    },
                })

            // all related rates get an entry in the relatedRates connection
            await tx.updateInfoTable.update({
                where: {
                    id: submitInfo.id,
                },
                data: {
                    relatedRates: {
                        connect: draftRateRevisionIDs.map((rr) => ({
                            id: rr.revisionID,
                        })),
                    },
                },
            })

            // now enter the new ones into the join table.
            // the full set of currently connected rates to this contract
            // plus any contracts that were connected to those rates, b/c those rates were changed with this submission.

            // Get all the rate -> contract links that need to be passed onto the new submission
            const repeatedLinks: {
                rateRevID: string
                contractRevID: string
                ratePosition: number
            }[] = []
            for (const rateRev of allRelatedRateRevisionsBefore) {
                // Find their last submission, and get all contracts that aren't this contract.

                if (
                    rateRev.relatedSubmissions &&
                    rateRev.relatedSubmissions.length > 1
                ) {
                    const previousSub = rateRev.relatedSubmissions[1]

                    for (const contractConnection of previousSub.submissionPackages) {
                        if (
                            contractConnection.contractRevision.contractID !==
                            currentContract.id
                        ) {
                            repeatedLinks.push({
                                rateRevID: rateRev.id,
                                contractRevID:
                                    contractConnection.contractRevision.id,
                                ratePosition: contractConnection.ratePosition,
                            })
                        }
                    }
                }
            }

            let ratePosition = 0
            const newLinks = draftRateRevisionIDs.map((rr) => {
                ratePosition++
                return {
                    rateRevID: rr.revisionID,
                    contractRevID: currentRev.id,
                    ratePosition,
                }
            })

            const allLinks = repeatedLinks.concat(newLinks)

            await tx.submissionPackageJoinTable.createMany({
                data: allLinks.map((link) => ({
                    submissionID: submitInfo.id,
                    contractRevisionID: link.contractRevID,
                    rateRevisionID: link.rateRevID,
                    ratePosition: link.ratePosition,
                })),
            })

            // delete Contract.draftRates
            await tx.draftRateJoinTable.deleteMany({
                where: { contractID: contractID },
            })

            return await findContractWithHistory(tx, contractID)
        })
    } catch (err) {
        const error = new Error(`Error submitting contract ${err}`)
        return error
    }
}

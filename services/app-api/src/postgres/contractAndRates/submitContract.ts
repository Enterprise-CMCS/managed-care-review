import type {
    ContractRevisionTable,
    PrismaClient,
    RateRevisionTable,
} from '@prisma/client'
import type { ContractType } from '../../domain-models/contractAndRates'
import { findContractWithHistory } from './findContractWithHistory'
import { NotFoundError } from '../postgresErrors'
import type { UpdateInfoType } from '../../domain-models'
import type { PrismaTransactionType } from '../prismaTypes'

async function submitContractInsideTransaction(
    tx: PrismaTransactionType,
    contractID: string,
    submittedByUserID: string,
    submittedReason: string
): Promise<ContractType | Error> {
    const currentDateTime = new Date()

    // New C+R code pre-submit
    const currentContract = await findContractWithHistory(tx, contractID)
    if (currentContract instanceof Error) {
        return currentContract
    }

    if (!currentContract.draftRevision || !currentContract.draftRates) {
        return new Error(
            'Attempting to submit a contract that has no draft data'
        )
    }

    // find the current contract with related rates
    const currentRev = await tx.contractRevisionTable.findFirst({
        where: {
            contractID: contractID,
            submitInfoID: null,
        },
    })

    if (!currentRev) {
        const err = `PRISMA ERROR: Cannot find the current rev to submit with contract id: ${contractID}`
        console.error(err)
        return new NotFoundError(err)
    }

    const unsubmittedChildRevs = []
    const linkedRateRevs = []
    for (const rate of currentContract.draftRates) {
        if (rate.parentContractID === contractID) {
            if (rate.draftRevision) {
                unsubmittedChildRevs.push(rate.draftRevision)
            } else {
                console.info(
                    'Strange, a child rate is not in a draft state. Shouldnt be true while we are unlocking child rates with contracts.'
                )
                const latestSubmittedRate = rate.revisions[0]
                if (!latestSubmittedRate) {
                    const msg = `Attempted to submit a contract connected to an unsubmitted child-rate. ContractID: ${contractID}`
                    return new Error(msg)
                }
                linkedRateRevs.push(latestSubmittedRate)
            }
        } else {
            // non-child rate
            const latestSubmittedRate = rate.revisions[0]
            if (!latestSubmittedRate) {
                const msg = `Attempted to submit a contract connected to an unsubmitted non-child-rate. ContractID: ${contractID}`
                return new Error(msg)
            }
            linkedRateRevs.push(latestSubmittedRate)
        }
    }

    // this is all the revs that the newly submitted contract will be connected to. Those to be submitted and those already submitted.
    // const draftRateRevs = unsubmittedChildRevs.concat(linkedRateRevs)

    // Create the submitInfo record in the updateInfoTable
    const submitInfo = await tx.updateInfoTable.create({
        data: {
            updatedAt: currentDateTime,
            updatedByID: submittedByUserID,
            updatedReason: submittedReason,
        },
    })

    // OLD SUBMIT STYLE
    // Update the contract to include the submitInfo ID
    await tx.contractRevisionTable.update({
        where: {
            id: currentRev.id,
        },
        data: {
            submitInfo: {
                connect: {
                    id: submitInfo.id,
                },
            },
        },
    })

    // we only want to update the rateRevision's submit info if it has not already been submitted
    await tx.rateRevisionTable.updateMany({
        where: {
            id: {
                in: unsubmittedChildRevs.map((rev) => rev.id),
            },
        },
        data: {
            submitInfoID: submitInfo.id,
        },
    })

    // oldRev is the previously submitted revision of this contract (the one just superseded by the update)
    // on an initial submission, there won't be an oldRev
    // const oldRev = await tx.contractRevisionTable.findFirst({
    //     where: {
    //         contractID: updated.contractID,
    //         NOT: {
    //             id: updated.id,
    //         },
    //     },
    //     include: {
    //         rateRevisions: {
    //             include: {
    //                 rateRevision: true,
    //             },
    //         },
    //     },
    //     orderBy: {
    //         createdAt: 'desc',
    //     },
    // })

    // Take oldRev, invalidate all relationships and add any removed entries to the join table.
    // if (oldRev) {
    //     // If any of the old rev's Rates aren't in the new Rates, add an entry in revisions join table
    //     // isRemoval field shows that this is a previous rate related with this contract that is now removed
    //     const oldRateRevs = oldRev.rateRevisions
    //         .filter((rrevjoin) => !rrevjoin.validUntil)
    //         .map((rrevjoin) => rrevjoin.rateRevision)
    //     const removedRateRevs = oldRateRevs.filter(
    //         (rrev) =>
    //             !currentRev.draftRates.map((r) => r.id).includes(rrev.rateID)
    //     )

    //     if (removedRateRevs.length > 0) {
    //         await tx.rateRevisionsOnContractRevisionsTable.createMany({
    //             data: removedRateRevs.map((rrev) => ({
    //                 contractRevisionID: updated.id,
    //                 rateRevisionID: rrev.id,
    //                 validAfter: currentDateTime,
    //                 validUntil: currentDateTime,
    //                 isRemoval: true,
    //             })),
    //         })
    //     }

    //     // Invalidate old revision join table links by updating validUntil
    //     // these links are considered outdated going forward
    //     await tx.rateRevisionsOnContractRevisionsTable.updateMany({
    //         where: {
    //             contractRevisionID: oldRev.id,
    //             validUntil: null,
    //         },
    //         data: {
    //             validUntil: currentDateTime,
    //         },
    //     })
    // }

    // NEW C+R HISTORY CODE post-submit (updateInfo placed in submitted revs.)

    // Tables--
    // updateInfo: updateInfoID
    // draftRates: contractID, rateID, position
    // contractRevision: contractID, submissionID
    // rateRevision: rateID, submissionID
    // relatedContractSubmissions: contractRevisionID, submissionID
    // relatedRateSubmissions: rateRevisionID, submissionID
    // packageSubmissions: submissionID, contractRevisionID, rateRevisionID

    const submissionRelatedContractRevs: ContractRevisionTable[] = []
    const submissionRelatedRateRevs: RateRevisionTable[] = []

    const linksToCreate: {
        rateRevID: string
        contractRevID: string
        ratePosition: number
    }[] = []

    // 1. This submitted contract
    // all draft rates: mark related, get a connection.
    const draftRates = await tx.draftRateJoinTable.findMany({
        where: {
            contractID: contractID,
        },
        include: {
            rate: {
                include: {
                    revisions: {
                        where: {
                            submitInfoID: {
                                not: null,
                            },
                        },
                        orderBy: {
                            createdAt: 'desc',
                        },
                        take: 1,
                    },
                },
            },
        },
    })
    const theseDraftRateIDs = draftRates.map((r) => r.rateID)
    for (const draftRateJoin of draftRates) {
        const draftRate = draftRateJoin.rate
        const draftRateRev = draftRate.revisions[0]
        if (!draftRateRev) {
            const msg = `attempted to submit connected to an UNsubmitted rate. contractID: ${contractID} rateID: ${draftRate.id}`
            console.error(msg)
            return new Error(msg)
        }

        // if not a newly submitted rate, add it to related rates.
        if (draftRateRev.submitInfoID !== submitInfo.id) {
            submissionRelatedRateRevs.push(draftRateRev)
        }

        // add a link.
        linksToCreate.push({
            contractRevID: currentRev.id,
            rateRevID: draftRateRev.id,
            ratePosition: draftRateJoin.ratePosition,
        })
    }

    // -- get previous connections, disconnected rate: mark related
    const prevRelatedSubmission = await tx.updateInfoTable.findFirst({
        where: {
            relatedContracts: {
                some: {
                    contractID: contractID,
                },
            },
        },
        orderBy: {
            updatedAt: 'desc',
        },
        include: {
            submissionPackages: {
                where: {
                    contractRevision: {
                        contractID: contractID,
                    },
                },
                include: {
                    rateRevision: true,
                },
            },
        },
    })

    if (prevRelatedSubmission) {
        for (const previousConnection of prevRelatedSubmission.submissionPackages) {
            if (
                !theseDraftRateIDs.includes(
                    previousConnection.rateRevision.rateID
                )
            ) {
                // this previous submission was connected to a now disconnected rate.
                submissionRelatedRateRevs.push(previousConnection.rateRevision)
            }
        }
    }

    // 2. these sumbittedrates
    // all draft contracts: mark related, get a connection
    const submittedRateDraftContracts = await tx.draftRateJoinTable.findMany({
        where: {
            rateID: {
                in: unsubmittedChildRevs.map((r) => r.rateID),
            },
        },
        include: {
            contract: {
                include: {
                    revisions: {
                        where: {
                            submitInfoID: {
                                not: null,
                            },
                        },
                        orderBy: {
                            createdAt: 'desc',
                        },
                        take: 1,
                    },
                },
            },
            rate: {
                include: {
                    revisions: {
                        where: {
                            submitInfoID: {
                                not: null,
                            },
                        },
                        orderBy: {
                            createdAt: 'desc',
                        },
                        take: 1,
                    },
                },
            },
        },
    })

    // per-submitted rate, the list of contractIDs it's connected to
    const currentSubmittedRateConnections: {
        [rateID: string]: string[]
    } = {}

    for (const draftContractJoin of submittedRateDraftContracts) {
        const submittedRate = draftContractJoin.rate
        const submittedRateRev = submittedRate.revisions[0]

        const draftContract = draftContractJoin.contract
        const draftContractRev = draftContract.revisions[0]

        if (!submittedRateRev) {
            const msg = `attempted to submit connected to a never submitted rate. contractID: ${draftContract.id} rateID: ${submittedRate.id}`
            console.error(msg)
            return new Error(msg)
        }

        if (!draftContractRev) {
            // If the related contract is draft and never submitted, then we have no links to update, it is not
            // actually affected by this submission.
            continue
        }

        if (!currentSubmittedRateConnections[submittedRate.id]) {
            currentSubmittedRateConnections[submittedRate.id] = []
        }
        currentSubmittedRateConnections[submittedRate.id].push(draftContract.id)

        // if not the newly submitted contract, add it to related contracts.
        if (
            draftContractRev.submitInfoID !== submitInfo.id &&
            !submissionRelatedContractRevs.find(
                (c) => c.contractID === draftContractRev.contractID
            )
        ) {
            submissionRelatedContractRevs.push(draftContractRev)
        }

        // add a link if it's not already added.
        if (
            !linksToCreate.find(
                (l) =>
                    l.contractRevID === draftContractRev.id &&
                    l.rateRevID === submittedRateRev.id
            )
        ) {
            linksToCreate.push({
                contractRevID: draftContractRev.id,
                rateRevID: submittedRateRev.id,
                ratePosition: draftContractJoin.ratePosition,
            })
        }
    }
    // -- get previous connections, disconnected contracts: mark related,
    for (const submittedRateRev of unsubmittedChildRevs) {
        const prevRelatedContractSubmissions =
            await tx.updateInfoTable.findFirst({
                where: {
                    relatedRates: {
                        some: {
                            rateID: submittedRateRev.rateID,
                        },
                    },
                },
                orderBy: {
                    updatedAt: 'desc',
                },
                include: {
                    submissionPackages: {
                        where: {
                            rateRevision: {
                                rateID: submittedRateRev.rateID,
                            },
                        },
                        include: {
                            contractRevision: true,
                        },
                    },
                },
            })

        if (prevRelatedContractSubmissions) {
            for (const previousConnection of prevRelatedContractSubmissions.submissionPackages) {
                if (
                    !currentSubmittedRateConnections[
                        submittedRateRev.rateID
                    ].includes(previousConnection.contractRevision.contractID)
                ) {
                    // this previous submission was connected to a now disconnected rate.
                    submissionRelatedContractRevs.push(
                        previousConnection.contractRevision
                    )
                }
            }
        }
    }

    // all related (not submitted) rates:
    for (const relatedRateRev of submissionRelatedRateRevs) {
        // -- get previous submision, previous connections
        const prevRelatedSubmission = await tx.updateInfoTable.findFirst({
            where: {
                relatedRates: {
                    some: {
                        rateID: relatedRateRev.rateID,
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
            include: {
                submissionPackages: {
                    where: {
                        rateRevision: {
                            rateID: relatedRateRev.rateID,
                        },
                    },
                    include: {
                        contractRevision: true,
                    },
                },
            },
        })

        if (!prevRelatedSubmission) {
            const msg = `Programming Error: Related Rate has no past submission. Should always have a submission. rateID: ${relatedRateRev.rateID}`
            console.error(msg)
            return new Error(msg)
        }

        // -- all connections that aren't this submitted contract, add connection
        for (const previousConnection of prevRelatedSubmission.submissionPackages) {
            if (previousConnection.contractRevision.contractID !== contractID) {
                // this previous submission has a link to be forwarded.

                linksToCreate.push({
                    contractRevID: previousConnection.contractRevisionID,
                    rateRevID: previousConnection.rateRevisionID,
                    ratePosition: previousConnection.ratePosition,
                })
            }
        }
    }

    // all related contracts:
    for (const relatedContract of submissionRelatedContractRevs) {
        // -- get previous submission, previous connections
        const prevRelatedSubmission = await tx.updateInfoTable.findFirst({
            where: {
                relatedContracts: {
                    some: {
                        contractID: relatedContract.contractID,
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
            include: {
                submissionPackages: {
                    where: {
                        contractRevision: {
                            contractID: relatedContract.contractID,
                        },
                    },
                    include: {
                        rateRevision: true,
                        contractRevision: true,
                    },
                },
            },
        })

        if (!prevRelatedSubmission) {
            const msg = `Programming Error: Related Contract has no past submission. Should always have a submission. contractID: ${relatedContract.contractID}`
            console.error(msg)
            return new Error(msg)
        }

        // -- all connections that aren't these submitted rates, add connection
        const submittedRateIDs = unsubmittedChildRevs.map((r) => r.rateID)

        for (const previousConnection of prevRelatedSubmission.submissionPackages) {
            if (
                !submittedRateIDs.includes(
                    previousConnection.rateRevision.rateID
                )
            ) {
                // this previous submission has a link to be forwarded.

                linksToCreate.push({
                    contractRevID: previousConnection.contractRevisionID,
                    rateRevID: previousConnection.rateRevisionID,
                    ratePosition: previousConnection.ratePosition,
                })
            }
        }
    }

    // Write the resulting data to the db
    // RelatedContractSubmission
    const allContractRevisionIDsRelatedToThisSubmission = [
        currentRev.id,
    ].concat(submissionRelatedContractRevs.map((r) => r.id))
    // RelatedRateSubmission
    const allRateRevisionIDsRelatedToThisSubmission = unsubmittedChildRevs
        .map((r) => r.id)
        .concat(submissionRelatedRateRevs.map((r) => r.id))
    // Links

    // filter out any duplicate links, we may have double counted since we went through
    // related contracts and rates
    const seenLinks: { [compoundKey: string]: boolean } = {}
    const uniqueLinks = linksToCreate.filter((link) => {
        const compoundKey = `${link.contractRevID}:${link.rateRevID}`
        if (seenLinks[compoundKey]) {
            return false
        }
        seenLinks[compoundKey] = true
        return true
    })
    // all in one!
    await tx.updateInfoTable.update({
        where: { id: submitInfo.id },
        data: {
            relatedContracts: {
                connect: allContractRevisionIDsRelatedToThisSubmission.map(
                    (id) => ({
                        id: id,
                    })
                ),
            },
            relatedRates: {
                connect: allRateRevisionIDsRelatedToThisSubmission.map(
                    (id) => ({
                        id: id,
                    })
                ),
            },
            submissionPackages: {
                create: uniqueLinks.map((l) => ({
                    contractRevisionID: l.contractRevID,
                    rateRevisionID: l.rateRevID,
                    ratePosition: l.ratePosition,
                })),
            },
        },
    })

    // delete draftRate Connections iff not still connected to other draft revisions.
    // we know that all of these submitted contract + rate pairs can be deleted.
    // if any of the thisContract -> Rate pairs, those rates have unsubmitted bits, then don't delete that.
    // same for rates.
    const currentDraftRateLinksForNewSubmissions =
        await tx.draftRateJoinTable.findMany({
            where: {
                OR: [
                    { contractID: contractID },
                    {
                        rateID: {
                            in: unsubmittedChildRevs.map((r) => r.rateID),
                        },
                    },
                ],
            },
            include: {
                contract: {
                    include: {
                        revisions: {
                            orderBy: {
                                createdAt: 'desc',
                            },
                        },
                    },
                },
                rate: {
                    include: {
                        revisions: {
                            orderBy: {
                                createdAt: 'desc',
                            },
                            take: 1,
                        },
                    },
                },
            },
        })

    // if this connection has no remaining drafts pointing towards it, delete it.
    // [contractID, rateID] tuple
    const connectionsToRemove: [string, string][] = []
    for (const draftLink of currentDraftRateLinksForNewSubmissions) {
        const latestContractRev = draftLink.contract.revisions[0]
        const notDraftContract = latestContractRev.submitInfoID !== null

        const latestRateRev = draftLink.rate.revisions[0]
        const notDraftRate = latestRateRev.submitInfoID !== null

        if (notDraftContract && notDraftRate) {
            connectionsToRemove.push([draftLink.contractID, draftLink.rateID])
        }
    }

    for (const connection of connectionsToRemove) {
        await tx.draftRateJoinTable.delete({
            where: {
                contractID_rateID: {
                    contractID: connection[0],
                    rateID: connection[1],
                },
            },
        })
    }

    return await findContractWithHistory(tx, contractID)
}

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

    try {
        return await client.$transaction(async (tx) => {
            const result = submitContractInsideTransaction(
                tx,
                contractID,
                submittedByUserID,
                submittedReason
            )
            if (result instanceof Error) {
                // if we get an error here, we need to throw it to kill the transaction.
                // then we catch it and return it as normal.
                throw result
            }
            return result
        })
    } catch (err) {
        console.error('Submit Prisma Error: ', err)
        return err
    }
}

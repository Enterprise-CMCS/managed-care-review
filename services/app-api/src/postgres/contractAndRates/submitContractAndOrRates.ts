import type { PrismaTransactionType } from '../prismaTypes'
import type { ContractRevisionTable, RateRevisionTable } from '@prisma/client'

async function submitContractAndOrRates(
    tx: PrismaTransactionType,
    contractID: string | undefined,
    rateIDs: string[],
    submittedByUserID: string,
    submittedReason: string
): Promise<undefined | Error> {
    const currentDateTime = new Date()

    // Create the submitInfo record in the updateInfoTable
    const submitInfo = await tx.updateInfoTable.create({
        data: {
            updatedAt: currentDateTime,
            updatedByID: submittedByUserID,
            updatedReason: submittedReason,
        },
    })

    let submittedContractRev: ContractRevisionTable | undefined = undefined
    if (contractID) {
        const submittedRev = await tx.contractRevisionTable.findFirst({
            where: {
                contractID: contractID,
                submitInfo: {
                    is: null,
                },
            },
        })

        if (!submittedRev) {
            return new Error(
                'attempted to submit contract with no draft revision: ' +
                    contractID
            )
        }

        submittedContractRev = submittedRev

        // Update the contract to include the submitInfo ID
        await tx.contractRevisionTable.update({
            where: {
                id: submittedContractRev.id,
            },
            data: {
                submitInfoID: submitInfo.id,
            },
        })
    }
    // next update the submitted rate revs
    const submittedRateRevs = await tx.rateRevisionTable.findMany({
        where: {
            rateID: {
                in: rateIDs,
            },
            submitInfo: {
                is: null,
            },
        },
    })

    if (submittedRateRevs.length !== rateIDs.length) {
        return new Error(
            'Not all rates to submit had draft revisions: ' + rateIDs.join(',')
        )
    }

    // we only want to update the rateRevision's submit info if it has not already been submitted
    await tx.rateRevisionTable.updateMany({
        where: {
            id: {
                in: submittedRateRevs.map((rev) => rev.id),
            },
        },
        data: {
            submitInfoID: submitInfo.id,
        },
    })

    const submissionRelatedContractRevs: ContractRevisionTable[] = []
    const submissionRelatedRateRevs: RateRevisionTable[] = []

    const linksToCreate: {
        rateRevID: string
        contractRevID: string
        ratePosition: number
    }[] = []

    if (submittedContractRev) {
        const contractID = submittedContractRev.contractID

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
                contractRevID: submittedContractRev.id,
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
                    submissionRelatedRateRevs.push(
                        previousConnection.rateRevision
                    )
                }
            }
        }
    }

    // 2. these sumbittedrates
    // all draft contracts: mark related, get a connection
    const submittedRateDraftContracts = await tx.draftRateJoinTable.findMany({
        where: {
            rateID: {
                in: rateIDs,
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
        // we only included revisions that are submitted, so this will be a submitted revision
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
    for (const submittedRateRev of submittedRateRevs) {
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

        for (const previousConnection of prevRelatedSubmission.submissionPackages) {
            if (!rateIDs.includes(previousConnection.rateRevision.rateID)) {
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
    const allContractRevisionIDsRelatedToThisSubmission =
        submissionRelatedContractRevs.map((r) => r.id)
    if (submittedContractRev) {
        allContractRevisionIDsRelatedToThisSubmission.push(
            submittedContractRev.id
        )
    }
    // RelatedRateSubmission
    const allRateRevisionIDsRelatedToThisSubmission: string[] = []
    allRateRevisionIDsRelatedToThisSubmission.push(
        ...submittedRateRevs.map((r) => r.id)
    )
    allRateRevisionIDsRelatedToThisSubmission.push(
        ...submissionRelatedRateRevs.map((r) => r.id)
    )
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
                            in: rateIDs,
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

    return
}

export { submitContractAndOrRates }

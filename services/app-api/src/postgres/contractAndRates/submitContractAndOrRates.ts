import type { PrismaTransactionType } from '../prismaTypes'
import type {
    Prisma,
    ContractRevisionTable,
    RateRevisionTable,
} from '@prisma/client'

const includeContractRevWithOnlyDocs = {
    submitInfo: true,
    contractDocuments: {
        orderBy: {
            position: 'asc',
        },
    },
    supportingDocuments: {
        orderBy: {
            position: 'asc',
        },
    },
} satisfies Prisma.ContractRevisionTableInclude

type ContractRevWithOnlyDocs = Prisma.ContractRevisionTableGetPayload<{
    include: typeof includeContractRevWithOnlyDocs
}>

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

    let submittedContractRev: ContractRevWithOnlyDocs | undefined = undefined
    if (contractID) {
        const allRevisions = await tx.contractRevisionTable.findMany({
            where: {
                contractID: contractID,
            },
            include: includeContractRevWithOnlyDocs,
            orderBy: {
                createdAt: 'desc',
            },
        })

        // Latest revision for use in submitting contract
        const latestRevision = allRevisions[0]

        //  If submit info already exists, then the latest revision is in a submitted state
        if (latestRevision.submitInfo) {
            return new Error(
                'attempted to submit contract with no draft revision: ' +
                    contractID
            )
        }

        // Set this for use outside this if
        submittedContractRev = latestRevision

        // Remove the latest draft submission and set prev revisions in ascending
        // order. We need to find the first time docs are submitted.
        const previousRevisions = allRevisions.slice(1).reverse()

        // Collect first date added for our documents from previous submissions
        const prevDocs: { [key: string]: Date | undefined } = {}
        for (const rev of previousRevisions) {
            const allRevDocs = [
                ...rev.contractDocuments,
                ...rev.supportingDocuments,
            ]
            allRevDocs.forEach((doc) => {
                if (!prevDocs[doc.sha256]) {
                    if (!doc.dateAdded && !rev.submitInfo?.updatedAt) {
                        return new Error(
                            'error attempting to set contracts document date added. A previous submission document has no date added or submitted date.'
                        )
                    }
                    prevDocs[doc.sha256] =
                        doc.dateAdded ?? rev.submitInfo?.updatedAt
                }
            })
        }

        // Update the contract to include the submitInfo ID and set date added.
        // doc dateAdded defaults to the first submission of this document, then fallback to current date time.
        await tx.contractRevisionTable.update({
            where: {
                id: submittedContractRev.id,
            },
            data: {
                submitInfoID: submitInfo.id,
                contractDocuments: {
                    updateMany: submittedContractRev.contractDocuments.map(
                        (doc) => ({
                            where: {
                                id: doc.id,
                            },
                            data: {
                                dateAdded:
                                    prevDocs[doc.sha256] ?? currentDateTime,
                            },
                        })
                    ),
                },
                supportingDocuments: {
                    updateMany: submittedContractRev.supportingDocuments.map(
                        (doc) => ({
                            where: {
                                id: doc.id,
                            },
                            data: {
                                dateAdded:
                                    prevDocs[doc.sha256] ?? currentDateTime,
                            },
                        })
                    ),
                },
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
        include: {
            rateDocuments: {
                orderBy: {
                    position: 'asc',
                },
            },
            supportingDocuments: {
                orderBy: {
                    position: 'asc',
                },
            },
        },
    })

    if (submittedRateRevs.length !== rateIDs.length) {
        return new Error(
            'Not all rates to submit had draft revisions: ' + rateIDs.join(',')
        )
    }

    const previousSubmissions = await tx.rateRevisionTable.findMany({
        where: {
            rateID: {
                in: rateIDs,
            },
            submitInfoID: {
                not: null,
            },
        },
        include: {
            submitInfo: true,
            rateDocuments: {
                orderBy: {
                    position: 'asc',
                },
            },
            supportingDocuments: {
                orderBy: {
                    position: 'asc',
                },
            },
        },
        orderBy: {
            createdAt: 'asc', // Need in asc order so dateAdded is set to when this doc was first submitted.
        },
    })

    // hashmap of unique docs by sha256 and dateAdded.
    // key of property is formatted as rateID-sha256. This narrows documents to the rate it was uploaded on.
    const prevRateDocs: { [key: string]: Date | undefined } = {}
    for (const rev of previousSubmissions) {
        const allRevDocs = [...rev.rateDocuments, ...rev.supportingDocuments]
        allRevDocs.forEach((doc) => {
            const hashKey = `${rev.rateID}-${doc.sha256}`
            if (!prevRateDocs[hashKey]) {
                if (!doc.dateAdded && !rev.submitInfo?.updatedAt) {
                    return new Error(
                        `error attempting to set rate documents date added. A previous submission document has no date added or submitted date. Rate: ${rev.rateID} Revision: ${rev.id}`
                    )
                }
                prevRateDocs[hashKey] =
                    doc.dateAdded ?? rev.submitInfo?.updatedAt
            }
        })
    }

    // Loop through each rate rev and add submit info and document date added.
    // Fallback on submission date if this doc was not previously submitted.
    for (const rev of submittedRateRevs) {
        await tx.rateRevisionTable.update({
            where: {
                id: rev.id,
            },
            data: {
                submitInfoID: submitInfo.id,
                rateDocuments: {
                    updateMany: rev.rateDocuments.map((doc) => ({
                        where: {
                            id: doc.id,
                        },
                        data: {
                            dateAdded:
                                prevRateDocs[`${rev.rateID}-${doc.sha256}`] ??
                                currentDateTime,
                        },
                    })),
                },
                supportingDocuments: {
                    updateMany: rev.supportingDocuments.map((doc) => ({
                        where: {
                            id: doc.id,
                        },
                        data: {
                            dateAdded:
                                prevRateDocs[`${rev.rateID}-${doc.sha256}`] ??
                                currentDateTime,
                        },
                    })),
                },
            },
        })
    }

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
                    ]?.includes(previousConnection.contractRevision.contractID)
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

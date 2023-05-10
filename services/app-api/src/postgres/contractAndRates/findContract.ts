import { PrismaClient, UpdateInfoTable } from '@prisma/client'
import { UpdateInfoType } from '../../domain-models'
import { Contract, ContractRevision } from './contractType'

function convertUpdateInfo(
    info: UpdateInfoTable | null
): UpdateInfoType | undefined {
    if (!info) {
        return undefined
    }

    return {
        updatedAt: info.updatedAt,
        updatedBy: info.updatedByID,
        updatedReason: info.updatedReason,
    }
}

async function findContract(
    client: PrismaClient,
    contractID: string
): Promise<Contract | Error> {
    try {
        const contractRevisions = await client.contractRevisionTable.findMany({
            where: {
                contractID: contractID,
            },
            orderBy: {
                createdAt: 'asc',
            },
            include: {
                submitInfo: true,
                unlockInfo: true,
                rateRevisions: {
                    include: {
                        rateRevision: {
                            include: {
                                submitInfo: true,
                                unlockInfo: true,
                            },
                        },
                    },
                },
            },
        })

        // so you get all the contract revisions. each one has a bunch of rates
        // each set of rates gets its own "revision" in the return list
        // further contractRevs naturally are their own "revision"

        const allContractRevisions: ContractRevision[] = []
        for (const contractRev of contractRevisions) {
            const addTimeline: {
                [date: string]: typeof contractRev.rateRevisions
            } = {}
            const removeTimeline: {
                [date: string]: typeof contractRev.rateRevisions
            } = {}

            // no drafts allowed
            if (!contractRev.submitInfo) {
                continue
            }

            // There will be an entry for this contract no matter what, so add an empty date there
            addTimeline[contractRev.submitInfo.updatedAt.toISOString()] = []

            for (const rateRev of contractRev.rateRevisions) {
                const addEntry = addTimeline[rateRev.validAfter.toISOString()]
                if (!addEntry) {
                    addTimeline[rateRev.validAfter.toISOString()] = [rateRev]
                } else {
                    addEntry.push(rateRev)
                }

                if (rateRev.validUntil) {
                    const removeEntry =
                        removeTimeline[rateRev.validUntil.toISOString()]
                    if (!removeEntry) {
                        removeTimeline[rateRev.validUntil.toISOString()] = [
                            rateRev,
                        ]
                    } else {
                        removeEntry.push(rateRev)
                    }
                }
            }

            const allDates = new Set(
                Object.keys(addTimeline).concat(Object.keys(removeTimeline))
            )
            const orderedDates = Array.from(allDates).sort()

            const lastRevisions: Set<typeof contractRev.rateRevisions[0]> =
                new Set()
            for (const date of orderedDates) {
                // each date here is a submission date.
                const addedRevs = addTimeline[date]
                const removedRevs = removeTimeline[date]

                let changedUpdateInfo: UpdateInfoType | undefined = undefined

                if (addedRevs) {
                    // figure out where this rev came from to get the right by/your/leave
                    if (
                        contractRev.submitInfo.updatedAt.toISOString() === date
                    ) {
                        // this is the initial addition, from this contract.
                        changedUpdateInfo = convertUpdateInfo(
                            contractRev.submitInfo
                        )
                    } else {
                        // ok, we have to assume then that this was added by the rateRev.
                        const newRev = addedRevs[0]
                        changedUpdateInfo = convertUpdateInfo(
                            newRev.rateRevision.submitInfo
                        )
                    }

                    for (const added of addedRevs) {
                        lastRevisions.add(added)
                    }
                }

                if (removedRevs) {
                    const removedRev = removedRevs[0]
                    // If this revision has been superceded by a new revision, we dont want
                    // this old rev to show up with no related rates so we skip it and move on
                    if (removedRev.invalidatedByContractRevisionID) {
                        continue
                    } else if (removedRev.invalidatedByRateRevisionID) {
                        const removedCause =
                            await client.rateRevisionTable.findUnique({
                                where: {
                                    id: removedRev.invalidatedByRateRevisionID,
                                },
                                include: { submitInfo: true },
                            })
                        if (!removedCause) {
                            return new Error('this should always be found.')
                        }
                        changedUpdateInfo = convertUpdateInfo(
                            removedCause.submitInfo
                        )
                    } else {
                        console.error(
                            'BIG ERROR, invalidated has to have a reason'
                        )
                        return new Error(
                            'Unexpected Data Integrity error. No cause for removal.'
                        )
                    }

                    for (const removed of removedRevs) {
                        lastRevisions.delete(removed)
                    }
                }

                const rev: ContractRevision = {
                    id: contractRev.id,
                    contractFormData: contractRev.name,
                    submitInfo: changedUpdateInfo,
                    rateRevisions: [...lastRevisions].map((rt) => {
                        return {
                            id: rt.rateRevisionID,
                            revisionFormData: rt.rateRevision.name,
                        }
                    }),
                }

                allContractRevisions.push(rev)
            }
        }

        return {
            id: contractID,
            revisions: allContractRevisions,
        }
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findContract }

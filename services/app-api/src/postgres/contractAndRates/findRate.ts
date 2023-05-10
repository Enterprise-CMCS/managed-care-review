import { PrismaClient, UpdateInfoTable } from '@prisma/client'
import { UpdateInfoType } from '../../domain-models'
import { Rate, RateRevision } from './rateType'

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

async function findRate(
    client: PrismaClient,
    rateID: string
): Promise<Rate | Error> {
    try {
        const rateRevisions = await client.rateRevisionTable.findMany({
            where: {
                rateID: rateID,
            },
            orderBy: {
                createdAt: 'asc',
            },
            include: {
                submitInfo: true,
                unlockInfo: true,
                contractRevisions: {
                    include: {
                        contractRevision: {
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

        const allRateRevisions: RateRevision[] = []
        for (const rateRev of rateRevisions) {
            const addTimeline: {
                [date: string]: typeof rateRev.contractRevisions
            } = {}
            const removeTimeline: {
                [date: string]: typeof rateRev.contractRevisions
            } = {}

            // no drafts allowed
            if (!rateRev.submitInfo) {
                continue
            }

            // There will be an entry for this contract no matter what, so add an empty date there
            addTimeline[rateRev.submitInfo.updatedAt.toISOString()] = []

            for (const contractRev of rateRev.contractRevisions) {
                const addEntry =
                    addTimeline[contractRev.validAfter.toISOString()]
                if (!addEntry) {
                    addTimeline[contractRev.validAfter.toISOString()] = [
                        contractRev,
                    ]
                } else {
                    addEntry.push(contractRev)
                }

                if (contractRev.validUntil) {
                    const removeEntry =
                        removeTimeline[contractRev.validUntil.toISOString()]
                    if (!removeEntry) {
                        removeTimeline[contractRev.validUntil.toISOString()] = [
                            contractRev,
                        ]
                    } else {
                        removeEntry.push(contractRev)
                    }
                }
            }

            const allDates = new Set(
                Object.keys(addTimeline).concat(Object.keys(removeTimeline))
            )
            const orderedDates = Array.from(allDates).sort()

            const lastRevisions: Set<typeof rateRev.contractRevisions[0]> =
                new Set()
            for (const date of orderedDates) {
                // each date here is a submission date.
                const addedRevs = addTimeline[date]
                const removedRevs = removeTimeline[date]

                let changedUpdateInfo: UpdateInfoType | undefined = undefined

                if (addedRevs) {
                    // figure out where this rev came from to get the right by/your/leave
                    if (rateRev.submitInfo.updatedAt.toISOString() === date) {
                        // this is the initial addition, from this contract.
                        changedUpdateInfo = convertUpdateInfo(
                            rateRev.submitInfo
                        )
                    } else {
                        // ok, we have to assume then that this was added by the contractRev.
                        const newRev = addedRevs[0]
                        changedUpdateInfo = convertUpdateInfo(
                            newRev.contractRevision.submitInfo
                        )
                    }

                    for (const added of addedRevs) {
                        lastRevisions.add(added)
                    }
                }

                if (removedRevs) {
                    const removedRev = removedRevs[0]
                    if (removedRev.invalidatedByRateRevisionID) {
                        continue
                    } else if (removedRev.invalidatedByContractRevisionID) {
                        const removedCause =
                            await client.contractRevisionTable.findUnique({
                                where: {
                                    id: removedRev.invalidatedByContractRevisionID,
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

                const rev: RateRevision = {
                    id: rateRev.id,
                    revisionFormData: rateRev.name,
                    submitInfo: changedUpdateInfo,
                    contractRevisions: [...lastRevisions].map((cr) => {
                        return {
                            id: cr.contractRevisionID,
                            contractFormData: cr.contractRevision.name,
                            rateRevisions: [],
                        }
                    }),
                }

                allRateRevisions.push(rev)
            }
        }

        return {
            id: rateID,
            revisions: allRateRevisions,
        }
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findRate }

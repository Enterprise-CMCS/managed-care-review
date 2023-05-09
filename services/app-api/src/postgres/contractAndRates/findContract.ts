import { PrismaClient, UpdateInfoTable } from "@prisma/client"
import { UpdateInfoType } from "../../domain-models"

interface Contract {
    id: string
    revisions: ContractRevision[]
}

// there needs to be a new contract revision after every set, even though the revision is the same?

// Revisions have descriptions by/when/reason ... maybe this pulls the rate revision if that made the change?
interface ContractRevision {
    // by/when/reason
    // contractFormData // this can be the same on different ones
    // rateRevisions, rateFormDatas?
    id: string
    unlockInfo?: UpdateInfoType,
    submitInfo?: UpdateInfoType,

    contractFormData: string
    rateRevisions: RateRevision[]
}

interface RateRevision {
    id: string
    unlockInfo?: UpdateInfoType,
    submitInfo?: UpdateInfoType,

    revisionFormData: string
    contractRevisions?: ContractRevision[]
}


function convertUpdateInfo(info: UpdateInfoTable | null ): UpdateInfoType | undefined {
    if (!info) {return undefined}

    return {
        updatedAt: info.updateAt,
        updatedBy: info.updateBy,
        updatedReason: info.updateReason,
    }

} 

async function findContractRevisions(client: PrismaClient, contractID: string): Promise<ContractRevision[] | Error> {

    try {
        const contractRevisions = await client.contractRevisionTable.findMany({
            where: {
                contractID: contractID,
            },
            orderBy: {
                createdAt: "asc"
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
                            }
                        },
                    },
                }
            }
        })

        // so you get all the contract revisions. each one has a bunch of rates
        // each set of rates gets its own "revision" in the return list
        // further contractRevs naturally are their own "revision"

        const allContractRevisions: ContractRevision[] = []
        for (const contractRev of contractRevisions) {

            const addTimeline: { [date: string]: (typeof contractRev.rateRevisions) } = {}
            const removeTimeline: { [date: string]: (typeof contractRev.rateRevisions) } = {}

            // no drafts allowed
            if (!contractRev.submitInfo) {
                console.log('skipping a draft revision.')
                continue
            }

            // There will be an entry for this contract no matter what, so add an empty date there
            addTimeline[contractRev.submitInfo.updateAt.toISOString()] = []

            for (const rateRev of contractRev.rateRevisions) {

                const addEntry = addTimeline[rateRev.validAfter.toISOString()]
                if (!addEntry) {
                    addTimeline[rateRev.validAfter.toISOString()] = [rateRev]
                } else {
                    addEntry.push(rateRev)
                }

                if (rateRev.validUntil) {
                    const removeEntry = removeTimeline[rateRev.validUntil.toISOString()]
                    if (!removeEntry) {
                        removeTimeline[rateRev.validUntil.toISOString()] = [rateRev]
                    } else {
                        removeEntry.push(rateRev)
                    }
                }
            }

            const allDates = new Set(Object.keys(addTimeline).concat(Object.keys(removeTimeline)))
            const orderedDates = Array.from(allDates).sort()

            const lastRevisions: Set<(typeof contractRev.rateRevisions[0])> = new Set()
            for (const date of orderedDates) { // each date here is a submission date.
                console.log('date', date)
                const addedRevs = addTimeline[date]
                const removedRevs = removeTimeline[date]

                let changedUpdateInfo: UpdateInfoType | undefined = undefined

                console.log('thisRevdate', contractRev.submitInfo?.updateAt?.toISOString())

                if (addedRevs) {
                    // figure out where this rev came from to get the right by/your/leave
                    if (contractRev.submitInfo.updateAt.toISOString() === date) {
                        // this is the initial addition, from this contract. 
                        console.log("our contract date matches", contractRev)
                        changedUpdateInfo = convertUpdateInfo(contractRev.submitInfo)
                    } else {
                        // ok, we have to assume then that this was added by the rateRev.
                        const newRev = addedRevs[0]
                        changedUpdateInfo = convertUpdateInfo(newRev.rateRevision.submitInfo)
                    }

                    for (const added of addedRevs) {
                        console.log('add', added)
                        lastRevisions.add(added)
                    }
                }

                if (removedRevs) {

                    const removedRev = removedRevs[0]
                    if (removedRev.invalidatedByContractRevisionID) {
                        console.log('superceeded!')
                        continue
                    } else if (removedRev.invalidatedByRateRevisionID) {
                        const removedCause = await client.rateRevisionTable.findUnique({ where: { id: removedRev.invalidatedByRateRevisionID }, include: {submitInfo: true}})
                        console.log('invalidated by rate', removedCause)
                        if (!removedCause) {
                            return new Error('this should always be found.')
                        }
                        changedUpdateInfo = convertUpdateInfo(removedCause.submitInfo)
                    } else {
                        console.log('BIG ERROR, invalidated has to have a reason')
                        return new Error('Unexpected Data Integrity error. No cause for removal.')
                    }


                    for (const removed of removedRevs) {
                        console.log('remove', removed)
                        lastRevisions.delete(removed)
                    }
                }

                const rev: ContractRevision = {
                    id: contractRev.id,
                    contractFormData: contractRev.name,
                    submitInfo: changedUpdateInfo,
                    rateRevisions: [...lastRevisions].map( (rt) => {
                        return {
                            id: rt.rateRevisionID,
                            revisionFormData: rt.rateRevision.rateCertURL || 'something blue',
                        }
                    })
                }

                allContractRevisions.push(rev)
            }

        }

        console.log("revisions", allContractRevisions)
        return allContractRevisions

    } catch(err) {
        console.log("PRISMA ERROR", err)
    }

    

    return new Error('no nothing')

}

export type {
    Contract,
    ContractRevision,
    RateRevision,
}

export {
    findContractRevisions
}

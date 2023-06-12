import {
    ContractRevisionTable,
    PrismaClient,
    RateRevisionTable,
    UpdateInfoTable,
} from '@prisma/client'
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

// this is for the internal building of individual revisions
// we convert them into ContractRevions to return them
interface ContractRevisionSet {
    contractRev: ContractRevisionTable
    submitInfo: UpdateInfoTable
    rateRevs: RateRevisionTable[]
}

async function findContractWithRates(
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
                    orderBy: {
                        validAfter: 'asc',
                    },
                },
            },
        })

        // each contract revision has a bunch of initial rates
        // each set of rates gets its own "revision" in the return list
        // further contractRevs naturally are their own "revision"

        const allEntries: ContractRevisionSet[] = []
        for (const contractRev of contractRevisions) {
            // no drafts allowed
            if (!contractRev.submitInfo) {
                continue
            }

            const initialEntry: ContractRevisionSet = {
                contractRev,
                submitInfo: contractRev.submitInfo,
                rateRevs: [],
            }

            allEntries.push(initialEntry)

            let lastEntry = initialEntry
            // go through every rate revision in the join table in order
            for (const rateRev of contractRev.rateRevisions) {
                if (!rateRev.rateRevision.submitInfo) {
                    return new Error(
                        'Programming Error: a contract is associated with an unsubmitted rate'
                    )
                }

                // if it's from before this contract was submitted, it's there at the beginning.
                if (rateRev.validAfter <= contractRev.submitInfo.updatedAt) {
                    if (!rateRev.isRemoval) {
                        initialEntry.rateRevs.push(rateRev.rateRevision)
                    }
                } else {
                    // if after, then it's always a new entry in the list
                    let lastRates = [...lastEntry.rateRevs]

                    // take out the previous rate revision this revision supersedes
                    lastRates = lastRates.filter(
                        (r) => r.rateID !== rateRev.rateRevision.rateID
                    )
                    if (!rateRev.isRemoval) {
                        lastRates.push(rateRev.rateRevision)
                    }

                    const newRev: ContractRevisionSet = {
                        contractRev,
                        submitInfo: rateRev.rateRevision.submitInfo,
                        rateRevs: lastRates,
                    }

                    lastEntry = newRev
                    allEntries.push(newRev)
                }
            }
        }

        const allRevisions: ContractRevision[] = allEntries.map((entry) => ({
            id: entry.contractRev.id,
            submitInfo: convertUpdateInfo(entry.submitInfo),
            contractFormData: entry.contractRev.name,
            rateRevisions: entry.rateRevs.map((rrev) => ({
                id: rrev.id,
                revisionFormData: rrev.name,
            })),
        }))

        return {
            id: contractID,
            revisions: allRevisions,
        }
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findContractWithRates as findContract }

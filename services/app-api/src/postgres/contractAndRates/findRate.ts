import {
    ContractRevisionTable,
    RateRevisionTable,
    UpdateInfoTable,
} from '@prisma/client'
import { UpdateInfoType } from '../../domain-models'
import { PrismaTransactionType } from '../prismaTypes'
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

// this is for the internal building of individual revisions
// we convert them into RateRevisons to return them
interface RateRevisionSet {
    rateRev: RateRevisionTable
    submitInfo: UpdateInfoTable
    contractRevs: ContractRevisionTable[]
}

async function findRateWithContracts(
    client: PrismaTransactionType,
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
                    orderBy: {
                        validAfter: 'asc',
                    },
                },
            },
        })

        // so you get all the rate revisions. each one has a bunch of contracts
        // each set of contracts gets its own "revision" in the return list
        // further rateRevs naturally are their own "revision"

        const allEntries: RateRevisionSet[] = []
        for (const rateRev of rateRevisions) {
            // no drafts allowed
            if (!rateRev.submitInfo) {
                continue
            }

            const initialEntry: RateRevisionSet = {
                rateRev,
                submitInfo: rateRev.submitInfo,
                contractRevs: [],
            }

            allEntries.push(initialEntry)

            let lastEntry = initialEntry
            // go through every contract revision with this rate
            for (const contractRev of rateRev.contractRevisions) {
                if (!contractRev.contractRevision.submitInfo) {
                    return new Error(
                        'Programming Error: a rate is associated with an unsubmitted contract'
                    )
                }

                // if it's from before this rate was submitted, it's there at the beginning.
                if (contractRev.validAfter <= rateRev.submitInfo.updatedAt) {
                    if (!contractRev.isRemoval) {
                        initialEntry.contractRevs.push(
                            contractRev.contractRevision
                        )
                    }
                } else {
                    // if after, then it's always a new entry in the list
                    let lastContracts = [...lastEntry.contractRevs]

                    // take out the previous contract revision this revision supersedes
                    lastContracts = lastContracts.filter(
                        (c) =>
                            c.contractID !==
                            contractRev.contractRevision.contractID
                    )
                    if (!contractRev.isRemoval) {
                        lastContracts.push(contractRev.contractRevision)
                    }

                    const newRev: RateRevisionSet = {
                        rateRev,
                        submitInfo: contractRev.contractRevision.submitInfo,
                        contractRevs: lastContracts,
                    }

                    lastEntry = newRev
                    allEntries.push(newRev)
                }
            }
        }

        const allRevisions: RateRevision[] = allEntries.map((entry) => ({
            id: entry.rateRev.id,
            submitInfo: convertUpdateInfo(entry.submitInfo),
            revisionFormData: entry.rateRev.name,
            contractRevisions: entry.contractRevs.map((crev) => ({
                id: crev.id,
                contractFormData: crev.name,
                rateRevisions: [],
            })),
        }))

        return {
            id: rateID,
            revisions: allRevisions,
        }
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findRateWithContracts as findRate }

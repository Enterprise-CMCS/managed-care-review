import { RateRevisionTable, UpdateInfoTable, User } from '@prisma/client'
import { PrismaTransactionType } from '../prismaTypes'
import {
    Rate,
    RateRevision,
} from '../../domain-models/contractAndRates/rateType'
import {
    contractFormDataToDomainModel,
    convertUpdateInfoToDomainModel,
} from './prismaToDomainModel'
import { ContractRevisionTableWithRelations } from '../prismaTypes'
import { updateInfoIncludeUpdater } from '../prismaHelpers'

// this is for the internal building of individual revisions
// we convert them into RateRevisons to return them
interface RateRevisionSet {
    rateRev: RateRevisionTable
    submitInfo: UpdateInfoTable & { updatedBy: User }
    unlockInfo: (UpdateInfoTable & { updatedBy: User }) | undefined
    contractRevs: ContractRevisionTableWithRelations[]
}

async function findRateWithHistory(
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
                submitInfo: updateInfoIncludeUpdater,
                unlockInfo: updateInfoIncludeUpdater,
                contractRevisions: {
                    include: {
                        contractRevision: {
                            include: {
                                submitInfo: updateInfoIncludeUpdater,
                                unlockInfo: updateInfoIncludeUpdater,
                                stateContacts: true,
                                contractDocuments: true,
                                supportingDocuments: true,
                                rateRevisions: {
                                    include: {
                                        rateRevision: true,
                                    },
                                },
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
                unlockInfo: rateRev.unlockInfo || undefined,
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
                        unlockInfo:
                            contractRev.contractRevision.unlockInfo ||
                            undefined,
                        contractRevs: lastContracts,
                    }

                    lastEntry = newRev
                    allEntries.push(newRev)
                }
            }
        }

        const allRevisions: RateRevision[] = allEntries.map((entry) => ({
            id: entry.rateRev.id,
            submitInfo: convertUpdateInfoToDomainModel(entry.submitInfo),
            unlockInfo:
                entry.unlockInfo &&
                convertUpdateInfoToDomainModel(entry.unlockInfo),
            revisionFormData: entry.rateRev.name,
            contractRevisions: entry.contractRevs.map((crev) => ({
                id: crev.id,
                createdAt: crev.createdAt,
                updatedAt: crev.updatedAt,
                formData: contractFormDataToDomainModel(crev),
                rateRevisions: crev.rateRevisions.map((rr) => ({
                    id: rr.rateRevisionID,
                    revisionFormData: rr.rateRevision.name,
                })),
            })),
        }))

        return {
            id: rateID,
            revisions: allRevisions.reverse(),
        }
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findRateWithHistory }

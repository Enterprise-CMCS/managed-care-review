import { UpdateInfoTable, User } from '@prisma/client'
import {
    PrismaTransactionType,
    RateRevisionTableWithFormData,
} from '../prismaTypes'
import {
    contractFormDataToDomainModel,
    convertUpdateInfoToDomainModel,
    rateFormDataToDomainModel,
} from './prismaToDomainModel'
import { ContractRevisionTableWithFormData } from '../prismaTypes'
import { updateInfoIncludeUpdater } from '../prismaHelpers'
import {
    RateRevisionWithContractsType,
    RateType,
} from '../../domain-models/contractAndRates/contractAndRatesZodSchema'

// this is for the internal building of individual revisions
// we convert them into RateRevisons to return them
interface RateRevisionSet {
    rateRev: RateRevisionTableWithFormData
    submitInfo: UpdateInfoTable & { updatedBy: User }
    unlockInfo: (UpdateInfoTable & { updatedBy: User }) | undefined
    contractRevs: ContractRevisionTableWithFormData[]
}

async function findRateWithHistory(
    client: PrismaTransactionType,
    rateID: string
): Promise<RateType | Error> {
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
                rateDocuments: true,
                supportingDocuments: true,
                certifyingActuaryContacts: true,
                addtlActuaryContacts: true,
                draftContracts: true,
                contractRevisions: {
                    include: {
                        contractRevision: {
                            include: {
                                submitInfo: updateInfoIncludeUpdater,
                                unlockInfo: updateInfoIncludeUpdater,
                                stateContacts: true,
                                contractDocuments: true,
                                supportingDocuments: true,
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

        const allRevisions: RateRevisionWithContractsType[] = allEntries.map(
            (entry) => ({
                id: entry.rateRev.id,
                createdAt: entry.rateRev.createdAt,
                updatedAt: entry.rateRev.updatedAt,
                submitInfo: convertUpdateInfoToDomainModel(entry.submitInfo),
                unlockInfo:
                    entry.unlockInfo &&
                    convertUpdateInfoToDomainModel(entry.unlockInfo),
                revisionFormData: rateFormDataToDomainModel(entry.rateRev),
                contractRevisions: entry.contractRevs.map((crev) => ({
                    id: crev.id,
                    createdAt: crev.createdAt,
                    updatedAt: crev.updatedAt,
                    formData: contractFormDataToDomainModel(crev),
                })),
            })
        )

        const finalRate: RateType = {
            id: rateID,
            status: 'SUBMITTED',
            stateCode: 'MN',
            stateNumber: 4,
            revisions: allRevisions.reverse(),
        }

        return finalRate
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findRateWithHistory }

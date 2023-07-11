import { RateRevisionTable } from '@prisma/client'
import {
    PrismaTransactionType,
    UpdateInfoTableWithUpdater,
    ContractRevisionTableWithRelations,
} from '../prismaTypes'
import {
    Contract,
    ContractRevision,
} from '../../domain-models/contractAndRates/contractType'
import {
    contractFormDataToDomainModel,
    convertUpdateInfoToDomainModel,
} from '../../domain-models/contractAndRates/contractRevision'
import { updateInfoIncludeUpdater } from '../prismaHelpers'

// ContractRevisionSet is for the internal building of individual revisions
// we convert them into ContractRevisions to return them
interface ContractRevisionSet {
    contractRev: ContractRevisionTableWithRelations
    submitInfo: UpdateInfoTableWithUpdater
    unlockInfo: UpdateInfoTableWithUpdater | undefined
    rateRevs: RateRevisionTable[]
}

// findContractWithHistory returns a ContractType with a full set of
// ContractRevisions in reverse chronological order. Each revision is a change to this
// Contract with submit and unlock info. Changes to the data of this contract, or changes
// to the data or relations of associate revisions will all surface as new ContractRevisions
async function findContractWithHistory(
    client: PrismaTransactionType,
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
                submitInfo: updateInfoIncludeUpdater,
                unlockInfo: updateInfoIncludeUpdater,
                rateRevisions: {
                    include: {
                        rateRevision: {
                            include: {
                                submitInfo: updateInfoIncludeUpdater,
                                unlockInfo: updateInfoIncludeUpdater,
                            },
                        },
                    },
                    orderBy: {
                        validAfter: 'asc',
                    },
                },
                stateContacts: true,
                addtlActuaryContacts: true,
                contractDocuments: true,
                supportingDocuments: true,
                contract: true,
            },
        })

        // We iterate through each contract revision in order, adding it as a revision in the history
        // then iterate through each of its rates, constructing a history of any rates that changed
        // between contract revision updates
        const allRevisionSets: ContractRevisionSet[] = []
        for (const contractRev of contractRevisions) {
            // We exclude the draft from this list, use findDraftContract to get the current draft
            if (!contractRev.submitInfo) {
                continue
            }

            const initialEntry: ContractRevisionSet = {
                contractRev,
                submitInfo: contractRev.submitInfo,
                unlockInfo: contractRev.unlockInfo || undefined,
                rateRevs: [],
            }

            allRevisionSets.push(initialEntry)

            let lastEntry = initialEntry
            // go through every rate revision in the join table in time order and construct a revisionSet
            // with (or without) the new rate revision in it.
            for (const rateRev of contractRev.rateRevisions) {
                if (!rateRev.rateRevision.submitInfo) {
                    return new Error(
                        'Programming Error: a contract is associated with an unsubmitted rate'
                    )
                }

                // if it's from before this contract was submitted, it's there at the beginning.
                if (
                    rateRev.rateRevision.submitInfo.updatedAt <=
                    contractRev.submitInfo.updatedAt
                ) {
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
                    // an isRemoval entry indicates that this rate was removed from this contract.
                    if (!rateRev.isRemoval) {
                        lastRates.push(rateRev.rateRevision)
                    }

                    const newRev: ContractRevisionSet = {
                        contractRev,
                        submitInfo: rateRev.rateRevision.submitInfo,
                        unlockInfo:
                            rateRev.rateRevision.unlockInfo || undefined,
                        rateRevs: lastRates,
                    }

                    lastEntry = newRev
                    allRevisionSets.push(newRev)
                }
            }
        }

        const allRevisions: ContractRevision[] = allRevisionSets.map(
            (entry) => ({
                id: entry.contractRev.id,
                submitInfo: convertUpdateInfoToDomainModel(entry.submitInfo),
                unlockInfo: entry.unlockInfo
                    ? convertUpdateInfoToDomainModel(entry.unlockInfo)
                    : undefined,
                createdAt: entry.contractRev.createdAt,
                updatedAt: entry.contractRev.updatedAt,
                formData: contractFormDataToDomainModel(entry.contractRev),
                rateRevisions: entry.rateRevs.map((rrev) => ({
                    id: rrev.id,
                    revisionFormData: rrev.name,
                })),
            })
        )

        return {
            id: contractID,
            status: 'SUBMITTED',
            stateCode: contractRevisions[0].contract.stateCode,
            stateNumber: contractRevisions[0].contract.stateNumber,
            revisions: allRevisions.reverse(),
        }
    } catch (err) {
        console.error('PRISMA ERROR', err)
        return err
    }
}

export { findContractWithHistory }

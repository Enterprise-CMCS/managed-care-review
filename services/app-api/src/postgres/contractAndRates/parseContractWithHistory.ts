import type {
    ContractType,
    ContractRevisionWithRatesType,
    ContractRevisionType,
} from '../../domain-models/contractAndRates'
import { contractSchema } from '../../domain-models/contractAndRates'
import { draftContractRevToDomainModel } from './prismaDraftContractHelpers'
import type {
    RateRevisionTableWithFormData,
    ContractRevisionTableWithFormData,
    UpdateInfoTableWithUpdater,
} from './prismaSharedContractRateHelpers'
import {
    contractFormDataToDomainModel,
    convertUpdateInfoToDomainModel,
    ratesRevisionsToDomainModel,
    getContractRateStatus,
} from './prismaSharedContractRateHelpers'
import type { ContractTableFullPayload } from './prismaSubmittedContractHelpers'

// parseContractWithHistory returns a ContractType with a full set of
// ContractRevisions in reverse chronological order. Each revision is a change to this
// Contract with submit and unlock info. Changes to the data of this contract, or changes
// to the data or relations of associate revisions will all surface as new ContractRevisions
function parseContractWithHistory(
    contract: ContractTableFullPayload
): ContractType | Error {
    const contractWithHistory = contractWithHistoryToDomainModel(contract)
    if (contractWithHistory instanceof Error) {
        console.warn(
            `ERROR: attempting to parse prisma contract with history failed: ${contractWithHistory.message}`
        )
        return contractWithHistory
    }

    const parseContract = contractSchema.safeParse(contractWithHistory)
    if (!parseContract.success) {
        const error = `ERROR: attempting to parse prisma contract with history failed: ${parseContract.error}`
        console.warn(error)
        return parseContract.error
    }

    return parseContract.data
}

// ContractRevisionSet is for the internal building of individual revisions
// we convert them into ContractRevisions to return them
interface ContractRevisionSet {
    contractRev: ContractRevisionTableWithFormData
    submitInfo: UpdateInfoTableWithUpdater
    unlockInfo: UpdateInfoTableWithUpdater | undefined
    rateRevisions: RateRevisionTableWithFormData[]
}

function contractSetsToDomainModel(
    revisions: ContractRevisionSet[]
): ContractRevisionWithRatesType[] | Error {
    const contractRevisions = []

    for (const revision of revisions) {
        const rateRevisions = ratesRevisionsToDomainModel(
            revision.rateRevisions
        )

        if (rateRevisions instanceof Error) {
            return rateRevisions
        }

        contractRevisions.push({
            ...contractRevisionToDomainModel(revision.contractRev),
            rateRevisions,
            // override this contractRevisions's update infos with the one that caused this revision to be created.
            submitInfo: convertUpdateInfoToDomainModel(revision.submitInfo),
            unlockInfo: convertUpdateInfoToDomainModel(revision.unlockInfo),
        })
    }

    return contractRevisions
}

function contractRevisionToDomainModel(
    revision: ContractRevisionTableWithFormData
): ContractRevisionType {
    return {
        id: revision.id,
        contract: revision.contract,
        createdAt: revision.createdAt,
        updatedAt: revision.updatedAt,
        submitInfo: convertUpdateInfoToDomainModel(revision.submitInfo),
        unlockInfo: convertUpdateInfoToDomainModel(revision.unlockInfo),

        formData: contractFormDataToDomainModel(revision),
    }
}

function contractRevisionsToDomainModels(
    contractRevisions: ContractRevisionTableWithFormData[]
): ContractRevisionType[] {
    return contractRevisions.map((crev) => contractRevisionToDomainModel(crev))
}

// contractWithHistoryToDomainModel constructs a history for this particular contract including changes to all of its
// revisions and all related rate revisions, including added and removed rates
function contractWithHistoryToDomainModel(
    contract: ContractTableFullPayload
): ContractType | Error {
    // We iterate through each contract revision in order, adding it as a revision in the history
    // then iterate through each of its rates, constructing a history of any rates that changed
    // between contract revision updates
    const allRevisionSets: ContractRevisionSet[] = []
    const contractRevisions = contract.revisions
    let draftRevision: ContractRevisionWithRatesType | Error | undefined =
        undefined

    for (const [contractRevIndex, contractRev] of contractRevisions.entries()) {
        // We set the draft revision aside, all ordered revisions are submitted
        if (!contractRev.submitInfo) {
            if (draftRevision) {
                return new Error(
                    'PROGRAMMING ERROR: a contract may not have multiple drafts simultaneously. ID: ' +
                        contract.id
                )
            }

            draftRevision = draftContractRevToDomainModel(contractRev)

            if (draftRevision instanceof Error) {
                return new Error(
                    `error converting draft contract revision with id ${contractRev.id} to domain model: ${draftRevision}`
                )
            }

            // skip the rest of the processing
            continue
        }

        // This initial entry is the first history record of this contract revision.
        // Then the for loop with it's rateRevisions are additional history records for each change in rate revisions.
        // This is why allRevisionSets could have more entries than contract revisions.
        const initialEntry: ContractRevisionSet = {
            contractRev,
            submitInfo: contractRev.submitInfo,
            unlockInfo: contractRev.unlockInfo || undefined,
            rateRevisions: [],
        }

        // This code below was used to construct rate change history and add into our contract revision history by pushing
        //  new contract revisions into the array. This however caused issues with the frontend apollo cache because we
        //  used duplicate contract revision ids to create new revisions for rate changes.
        // For now, we are commenting out the code until we are ready for this feature and leaving it intact.

        // let lastEntry = initialEntry
        // // Now we construct a revision history for each change in rate revisions.
        // // go through every rate revision in the join table in time order and construct a revisionSet
        // // with (or without) the new rate revision in it.
        // for (const rateRev of contractRev.rateRevisions) {
        //     if (!rateRev.rateRevision.submitInfo) {
        //         return new Error(
        //             'Programming Error: a contract is associated with an unsubmitted rate'
        //         )
        //     }
        //
        //     // if it's from before this contract was submitted, it's there at the beginning.
        //     if (
        //         rateRev.rateRevision.submitInfo.updatedAt <=
        //         contractRev.submitInfo.updatedAt
        //     ) {
        //         if (!rateRev.isRemoval) {
        //             initialEntry.rateRevisions.push(rateRev.rateRevision)
        //         }
        //     } else {
        //         // if after, then it's always a new entry in the list
        //         let lastRates = [...lastEntry.rateRevisions]
        //
        //         // take out the previous rate revision this revision supersedes
        //         lastRates = lastRates.filter(
        //             (r) => r.rateID !== rateRev.rateRevision.rateID
        //         )
        //         // an isRemoval entry indicates that this rate was removed from this contract.
        //         if (!rateRev.isRemoval) {
        //             lastRates.push(rateRev.rateRevision)
        //         }
        //
        //         const newRev: ContractRevisionSet = {
        //             contractRev,
        //             submitInfo: rateRev.rateRevision.submitInfo,
        //             unlockInfo: rateRev.rateRevision.unlockInfo || undefined,
        //             rateRevisions: lastRates,
        //         }
        //
        //         lastEntry = newRev
        //         allRevisionSets.push(newRev)
        //     }
        // }

        /**
         * Below a temporary approach to finding the matching rate revision to the contract revision. The correct way
         * for this is to build the actual contract and rate history. This will be done in the Rate Change History epic
         * https://qmacbis.atlassian.net/browse/MCR-3607
         *
         * The approach to finding the **single** rate revision for the submitted contract revision is to find
         * the latest rate revision submitted before the next contract revision unlock date. The latest rate revision
         * and not the one submitted with the contract, because rates and be unlocked and resubmitted independently of
         * the contract.
         *
         * The idea is that once a contract is unlocked again, the new contract revision created is now the "active"
         * revision with most up-to-date data and previous submitted contract revision is now historical and changes
         * should not be reflected on it, including rate changes.
         **/

        // Get next contract revision's unlockInfo.updatedAt. revisions are queried from DB in asc order by createdAt.
        const nextContractRev: ContractRevisionTableWithFormData | undefined =
            contractRevisions[contractRevIndex + 1]

        // rateRevisions from DB are in asc order by created at, we need it to be desc order to find the latest rev first.
        const rateRevisions = contractRev.rateRevisions.reverse()

        for (const rateRev of rateRevisions) {
            if (!rateRev.rateRevision.submitInfo) {
                return new Error(
                    'Programming Error: a contract is associated with an unsubmitted rate'
                )
            }

            // Check if rate revision submitted date is earlier than the proceeding contract revisions unlocked date.
            // If nextContractRev does not exist, then there is no date constraint.
            const isRateSubmittedDateValid = nextContractRev?.unlockInfo
                ? rateRev.rateRevision.submitInfo.updatedAt.getTime() <
                  nextContractRev.unlockInfo.updatedAt.getTime()
                : true

            // Does initial entries rateRevisions already include a revision for this rate
            const isRateIncluded = !!initialEntry.rateRevisions.find(
                (rr) => rr.rateID === rateRev.rateRevision.rateID
            )

            // Rate revision that belong to this contract revision has to be:
            // - Submitted before the next contract rev unlock date
            // - Not already in the initial entry. We are looping through this in desc order, so the first rate rev is the latest.
            // - Not removed from the contract
            if (
                isRateSubmittedDateValid &&
                !isRateIncluded &&
                !rateRev.isRemoval
            ) {
                // unshift rate revision into entries to asc order
                initialEntry.rateRevisions.unshift(rateRev.rateRevision)
            }
        }

        allRevisionSets.push(initialEntry)
    }

    const revisions = contractSetsToDomainModel(allRevisionSets)

    if (revisions instanceof Error) {
        return new Error(
            `error converting contract with id ${contract.id} to domain models: ${draftRevision}`
        )
    }

    return {
        id: contract.id,
        mccrsID: contract.mccrsID || undefined,
        status: getContractRateStatus(contract.revisions),
        stateCode: contract.stateCode,
        stateNumber: contract.stateNumber,
        draftRevision,
        revisions: revisions.reverse(),
    }
}

export {
    parseContractWithHistory,
    contractRevisionToDomainModel,
    contractRevisionsToDomainModels,
}

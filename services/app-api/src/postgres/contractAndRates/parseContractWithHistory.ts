import {
    ContractType,
    contractSchema,
    ContractRevisionWithRatesType,
} from '../../domain-models/contractAndRates'
import { draftContractRevToDomainModel } from './prismaDraftContractHelpers'
import {
    contractFormDataToDomainModel,
    convertUpdateInfoToDomainModel,
    getContractStatus,
    RateRevisionTableWithFormData,
    ratesRevisionsToDomainModel,
    UpdateInfoTableWithUpdater,
} from './prismaSharedContractRateHelpers'
import {
    ContractTableFullPayload,
    ContractRevisionTableWithRates,
} from './prismaSubmittedContractHelpers'

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
    contractRev: ContractRevisionTableWithRates
    submitInfo: UpdateInfoTableWithUpdater
    unlockInfo: UpdateInfoTableWithUpdater | undefined
    rateRevisions: RateRevisionTableWithFormData[]
}

function contractRevToDomainModel(
    revisions: ContractRevisionSet[]
): ContractRevisionWithRatesType[] {
    const contractRevisions = revisions.map((entry) => ({
        id: entry.contractRev.id,
        submitInfo: convertUpdateInfoToDomainModel(entry.submitInfo),
        unlockInfo: entry.unlockInfo
            ? convertUpdateInfoToDomainModel(entry.unlockInfo)
            : undefined,
        createdAt: entry.contractRev.createdAt,
        updatedAt: entry.contractRev.updatedAt,
        formData: contractFormDataToDomainModel(entry.contractRev),
        rateRevisions: ratesRevisionsToDomainModel(entry.rateRevisions),
    }))

    return contractRevisions
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
    let draftRevision: ContractRevisionWithRatesType | undefined = undefined
    for (const contractRev of contractRevisions) {
        // We set the draft revision aside, all ordered revisions are submitted
        if (!contractRev.submitInfo) {
            if (draftRevision) {
                return new Error(
                    'PROGRAMMING ERROR: a contract may not have multiple drafts simultaneously. ID: ' +
                        contract.id
                )
            }

            draftRevision = draftContractRevToDomainModel(contractRev)

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

        allRevisionSets.push(initialEntry)

        let lastEntry = initialEntry
        // Now we construct a revision history for each change in rate revisions.
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
                    initialEntry.rateRevisions.push(rateRev.rateRevision)
                }
            } else {
                // if after, then it's always a new entry in the list
                let lastRates = [...lastEntry.rateRevisions]

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
                    unlockInfo: rateRev.rateRevision.unlockInfo || undefined,
                    rateRevisions: lastRates,
                }

                lastEntry = newRev
                allRevisionSets.push(newRev)
            }
        }
    }

    const revisions = contractRevToDomainModel(allRevisionSets).reverse()

    return {
        id: contract.id,
        status: getContractStatus(contract.revisions),
        stateCode: contract.stateCode,
        stateNumber: contract.stateNumber,
        draftRevision: draftRevision,
        revisions: revisions,
    }
}

export { parseContractWithHistory }

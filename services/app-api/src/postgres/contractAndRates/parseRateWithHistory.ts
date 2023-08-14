import type {
    RateRevisionWithContractsType,
    RateType,
} from '../../domain-models/contractAndRates'
import { contractRevisionsToDomainModels } from './parseContractWithHistory'
import { draftRateRevToDomainModel } from './prismaDraftRatesHelpers'
import type {
    ContractRevisionTableWithFormData,
    RateRevisionTableWithFormData,
    UpdateInfoTableWithUpdater,
} from './prismaSharedContractRateHelpers'
import {
    convertUpdateInfoToDomainModel,
    getContractStatus,
    rateReivisionToDomainModel,
} from './prismaSharedContractRateHelpers'
import type { RateTableFullPayload } from './prismaSubmittedRateHelpers'

// this is for the internal building of individual revisions
// we convert them into RateRevisons to return them
interface RateRevisionSet {
    rateRev: RateRevisionTableWithFormData
    submitInfo: UpdateInfoTableWithUpdater
    unlockInfo: UpdateInfoTableWithUpdater | undefined
    contractRevs: ContractRevisionTableWithFormData[]
}

function rateSetsToDomainModel(
    entries: RateRevisionSet[]
): RateRevisionWithContractsType[] {
    const revisions = entries.map((entry) => ({
        ...rateReivisionToDomainModel(entry.rateRev),

        contractRevisions: contractRevisionsToDomainModels(entry.contractRevs),

        // override this contractRevisions's update infos with the one that caused this revision to be created.
        submitInfo: convertUpdateInfoToDomainModel(entry.submitInfo),
        unlockInfo: convertUpdateInfoToDomainModel(entry.unlockInfo),
    }))

    return revisions
}

function parseRateWithHistory(rate: RateTableFullPayload): RateType | Error {
    // so you get all the rate revisions. each one has a bunch of contracts
    // each set of contracts gets its own "revision" in the return list
    // further rateRevs naturally are their own "revision"

    const allEntries: RateRevisionSet[] = []
    const rateRevisions = rate.revisions
    let draftRevision: RateRevisionWithContractsType | undefined = undefined
    for (const rateRev of rateRevisions) {
        // no drafts allowed
        if (!rateRev.submitInfo) {
            if (draftRevision) {
                return new Error(
                    'PROGRAMMING ERROR: a contract may not have multiple drafts simultaneously. ID: ' +
                        rate.id
                )
            }

            draftRevision = draftRateRevToDomainModel(rateRev)

            // skip the rest of the processing
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
            if (
                contractRev.contractRevision.submitInfo.updatedAt <=
                rateRev.submitInfo.updatedAt
            ) {
                if (!contractRev.isRemoval) {
                    initialEntry.contractRevs.push(contractRev.contractRevision)
                }
            } else {
                // if after, then it's always a new entry in the list
                let lastContracts = [...lastEntry.contractRevs]

                // take out the previous contract revision this revision supersedes
                lastContracts = lastContracts.filter(
                    (c) =>
                        c.contractID !== contractRev.contractRevision.contractID
                )
                if (!contractRev.isRemoval) {
                    lastContracts.push(contractRev.contractRevision)
                }

                const newRev: RateRevisionSet = {
                    rateRev,
                    submitInfo: contractRev.contractRevision.submitInfo,
                    unlockInfo:
                        contractRev.contractRevision.unlockInfo || undefined,
                    contractRevs: lastContracts,
                }

                lastEntry = newRev
                allEntries.push(newRev)
            }
        }
    }

    const allRevisions: RateRevisionWithContractsType[] =
        rateSetsToDomainModel(allEntries)

    const finalRate: RateType = {
        id: rate.id,
        status: getContractStatus(rate.revisions),
        stateCode: rate.stateCode,
        stateNumber: rate.stateNumber,
        revisions: allRevisions.reverse(),
    }

    return finalRate
}

export { parseRateWithHistory }

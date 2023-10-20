import type {
    RateRevisionWithContractsType,
    RateType,
    RateRevisionType,
} from '../../domain-models/contractAndRates'
import { rateSchema } from '../../domain-models/contractAndRates'
import { contractRevisionsToDomainModels } from './parseContractWithHistory'
import { draftRateRevToDomainModel } from './prismaDraftRatesHelpers'
import type {
    ContractRevisionTableWithFormData,
    RateRevisionTableWithFormData,
    UpdateInfoTableWithUpdater,
} from './prismaSharedContractRateHelpers'
import {
    convertUpdateInfoToDomainModel,
    getContractRateStatus,
    rateFormDataToDomainModel,
} from './prismaSharedContractRateHelpers'
import type { RateTableFullPayload } from './prismaSubmittedRateHelpers'

function parseRateWithHistory(rate: RateTableFullPayload): RateType | Error {
    const rateWithHistory = rateWithHistoryToDomainModel(rate)

    if (rateWithHistory instanceof Error) {
        console.warn(
            `ERROR: attempting to parse prisma rate with history failed: ${rateWithHistory.message}`
        )
        return rateWithHistory
    }

    const parseRate = rateSchema.safeParse(rateWithHistory)

    if (!parseRate.success) {
        const error = `ERROR: attempting to parse prisma contract with history failed: ${parseRate.error}`
        console.warn(error)
        return parseRate.error
    }

    return parseRate.data
}

// RateRevisionSet is for the internal building of individual revisions
// we convert them into RateRevisions to return them
interface RateRevisionSet {
    rateRev: RateRevisionTableWithFormData
    submitInfo: UpdateInfoTableWithUpdater
    unlockInfo: UpdateInfoTableWithUpdater | undefined
    contractRevs: ContractRevisionTableWithFormData[]
}

function rateSetsToDomainModel(
    entries: RateRevisionSet[]
): RateRevisionWithContractsType[] | Error {
    const revisions: RateRevisionWithContractsType[] = []

    for (const entry of entries) {
        const domainRateRevision = rateRevisionToDomainModel(entry.rateRev)

        if (domainRateRevision instanceof Error) {
            return domainRateRevision
        }

        revisions.push({
            ...domainRateRevision,
            contractRevisions: contractRevisionsToDomainModels(
                entry.contractRevs
            ),

            // override this contractRevisions's update infos with the one that caused this revision to be created.
            submitInfo: convertUpdateInfoToDomainModel(entry.submitInfo),
            unlockInfo: convertUpdateInfoToDomainModel(entry.unlockInfo),
        })
    }

    return revisions
}
function rateRevisionToDomainModel(
    revision: RateRevisionTableWithFormData
): RateRevisionType | Error {
    const formData = rateFormDataToDomainModel(revision)

    if (formData instanceof Error) {
        return formData
    }

    return {
        id: revision.id,
        rate: revision.rate,
        createdAt: revision.createdAt,
        updatedAt: revision.updatedAt,
        submitInfo: convertUpdateInfoToDomainModel(revision.submitInfo),
        unlockInfo: convertUpdateInfoToDomainModel(revision.unlockInfo),
        formData,
    }
}

function rateRevisionsToDomainModels(
    rateRevisions: RateRevisionTableWithFormData[]
): RateRevisionType[] | Error {
    const domainRateRevisions: RateRevisionType[] = []

    for (const rateRevision of rateRevisions) {
        const domainRateRevision = rateRevisionToDomainModel(rateRevision)

        if (domainRateRevision instanceof Error) {
            return domainRateRevision
        }

        domainRateRevisions.push(domainRateRevision)
    }

    return domainRateRevisions
}

// rateWithHistoryToDomainModel constructs a history for this particular contract including changes to all of its
// revisions and all related rate revisions, including added and removed rates
function rateWithHistoryToDomainModel(
    rate: RateTableFullPayload
): RateType | Error {
    // so you get all the rate revisions. each one has a bunch of contracts
    // each set of contracts gets its own "revision" in the return list
    // further rateRevs naturally are their own "revision"

    const allEntries: RateRevisionSet[] = []
    const rateRevisions = rate.revisions
    let draftRevision: RateRevisionWithContractsType | Error | undefined =
        undefined
    for (const rateRev of rateRevisions) {
        // We have already set the draft revision aside, all ordered revisions here should be submitted
        if (!rateRev.submitInfo) {
            if (draftRevision) {
                return new Error(
                    'PROGRAMMING ERROR: a rate may not have multiple drafts simultaneously. ID: ' +
                        rate.id
                )
            }

            draftRevision = draftRateRevToDomainModel(rateRev)

            if (draftRevision instanceof Error) {
                return new Error(
                    `error converting draft rate revision with id ${rateRev.id} to domain model: ${draftRevision}`
                )
            }

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

        const lastEntry = initialEntry
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

                // For now, we just put the most current version of contracts on this rate
                // skip making entries for each contract revision
                initialEntry.contractRevs = lastContracts

                // const newRev: RateRevisionSet = {
                //     rateRev,
                //     submitInfo: contractRev.contractRevision.submitInfo,
                //     unlockInfo:
                //         contractRev.contractRevision.unlockInfo || undefined,
                //     contractRevs: lastContracts,
                // }

                // lastEntry = newRev
                // allEntries.push(newRev) // For now, don't make revisions out of contracts
            }
        }
    }

    const revisions = rateSetsToDomainModel(allEntries)

    if (revisions instanceof Error) {
        return new Error(
            `error converting rate with id ${rate.id} to domain models: ${draftRevision}`
        )
    }

    return {
        id: rate.id,
        createdAt: rate.createdAt,
        updatedAt: rate.updatedAt,
        status: getContractRateStatus(rateRevisions),
        stateCode: rate.stateCode,
        stateNumber: rate.stateNumber,
        draftRevision,
        revisions: revisions.reverse(),
    }
}
export {
    parseRateWithHistory,
    rateRevisionToDomainModel,
    rateRevisionsToDomainModels,
}

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
    for (const [currentRevIndex, rateRev] of rateRevisions.entries()) {
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

        /**
         * Below a temporary approach to finding the matching rate revision to the contract revision. The correct way
         * for this is to build the actual contract and rate history. This will be done in the Rate Change History epic
         * https://qmacbis.atlassian.net/browse/MCR-3607
         *
         * The approach to finding the **single** rate revision for the submitted contract revision is to find
         * the latest contract revision submitted before the next rate revision unlock date. The latest contract revision
         * and not the one submitted with the rate, because contracts can be unlocked and resubmitted independently of
         * the rate.
         *
         * The idea is that once a rate is unlocked again, the new rate revision created is now the "active"
         * revision with most up-to-date data and previous submitted rate revision is now historical and changes
         * should not be reflected on it, including contract changes.
         **/

        // Next rate revision in the array.
        const nextRateRev: RateRevisionTableWithFormData | undefined =
            rateRevisions[currentRevIndex + 1]

        // Reverse contractRevisions so it is in DESC order.
        const contractRevisions = rateRev.contractRevisions.reverse()

        for (const contractRev of contractRevisions) {
            if (!contractRev.contractRevision.submitInfo) {
                return new Error(
                    'Programming Error: a rate is associated with an unsubmitted contract'
                )
            }

            // Check if contract revision submitted date is earlier then the proceeding rate revision unlock date.
            // If nextRateRev does not exist, then there is no date constraint.
            const isContractSubmittedDateValid = nextRateRev?.unlockInfo
                ? contractRev.contractRevision.submitInfo.updatedAt.getTime() <
                  nextRateRev.unlockInfo.updatedAt.getTime()
                : true

            // Does initialEntry.contractRevs already include a revision for this contract
            const isContractIncluded = !!initialEntry.contractRevs.find(
                (cc) =>
                    cc.contractID === contractRev.contractRevision.contractID
            )

            // Contract revision that belong to this rate revision has to be:
            // - Submitted before the next contract rev unlock date
            // - Not already in the initial entry. We are looping through this in desc order, so the first contract rev is the latest.
            // - Not removed from contract
            if (
                isContractSubmittedDateValid &&
                !isContractIncluded &&
                !contractRev.isRemoval
            ) {
                initialEntry.contractRevs.unshift(contractRev.contractRevision)
            }
        }
    }

    const revisions = rateSetsToDomainModel(allEntries)

    if (revisions instanceof Error) {
        return new Error(
            `error converting rate with id ${rate.id} to domain models: ${draftRevision}`
        )
    }

    // Find this rate's parent contract. It'll be the contract it was initially submitted with
    // or the contract it is associated with as an initial draft. 
    const firstRevision = rate.revisions[0]
    const submission = firstRevision.submitInfo

    let parentContractID = undefined
    if (!submission) {
        // this is a draft, never submitted, rate
        if (rate.draftContracts.length !== 1) {
            const msg = 'programming error: its an unsubmitted rate with no draft contracts'
            console.error(msg)
            return new Error(msg)
        }
        const draftContract = rate.draftContracts[0]
        parentContractID = draftContract.contractID
    } else {
        // check the initial submission
        if (submission.submittedContracts.length !== 1) {
            const msg = 'programming error: its a submitted rate that was not submitted with a contract initially'
            console.error(msg)
            return new Error(msg)
        }
        const firstContract = submission.submittedContracts[0]
        parentContractID = firstContract.contractID
    }

    return {
        id: rate.id,
        createdAt: rate.createdAt,
        updatedAt: rate.updatedAt,
        status: getContractRateStatus(rateRevisions),
        stateCode: rate.stateCode,
        parentContractID: parentContractID,
        stateNumber: rate.stateNumber,
        draftRevision,
        revisions: revisions.reverse(),
    }
}
export {
    parseRateWithHistory,
    rateRevisionToDomainModel,
    rateRevisionsToDomainModels,
    rateWithHistoryToDomainModel,
}

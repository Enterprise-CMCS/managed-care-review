import type { ContractType } from '../domain-models'

type WithLatestTimestamps = {
    latestQuestionCreatedAt?: Date | string | null
    latestRateQuestionCreatedAt?: Date | string | null
    latestLinkedRateSubmitUpdatedAt?: Date | string | null // NEW
}

function toDate(d?: Date | string | null): Date | undefined {
    if (!d) return undefined
    return d instanceof Date ? d : new Date(d)
}

function latestDate(dates: Array<Date | undefined>): Date | undefined {
    let max: Date | undefined
    for (const d of dates)
        if (d && (!max || d.getTime() > max.getTime())) max = d
    return max
}

export function getLastUpdatedForDisplay(
    contract: Partial<ContractType & WithLatestTimestamps>
): Date | undefined {
    const contractUpdated = toDate(contract.updatedAt)
    const draftUpdated = toDate(contract.draftRevision?.updatedAt)
    const lastUnlocked = toDate(contract.draftRevision?.unlockInfo?.updatedAt)

    // Package submission (newest submitInfo on the contract, not rates)
    const lastSubmitted = latestDate(
        (contract.packageSubmissions ?? []).map((ps) =>
            toDate(ps?.contractRevision?.submitInfo?.updatedAt)
        )
    )

    // Review actions (newest)
    const latestReviewAction = latestDate(
        (contract.reviewStatusActions ?? []).map((a) => toDate(a?.updatedAt))
    )

    // Questions
    const latestContractQ = toDate(contract.latestQuestionCreatedAt)
    const latestRateQ = toDate(contract.latestRateQuestionCreatedAt)

    // NEW: when any related/linked rate is resubmitted (e.g., docs changed), use its submit timestamp
    const latestLinkedRateSubmit = toDate(
        contract.latestLinkedRateSubmitUpdatedAt
    )

    return latestDate([
        contractUpdated,
        draftUpdated,
        lastUnlocked,
        lastSubmitted,
        latestContractQ,
        latestRateQ,
        latestLinkedRateSubmit, // ← captures resubmits/edits on linked rates
        latestReviewAction,
    ])
}

import type { ContractType } from '../domain-models'

type WithLatestRates = {
    latestQuestionCreatedAt?: Date | string | null
    latestRateQuestionCreatedAt?: Date | string | null
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
    contract: Partial<ContractType & WithLatestRates>
): Date | undefined {
    const contractUpdated = toDate(contract.updatedAt)
    const draftUpdated = toDate(contract.draftRevision?.updatedAt)
    const lastUnlocked = toDate(contract.draftRevision?.unlockInfo?.updatedAt)
    const lastSubmitted = latestDate(
        (contract.packageSubmissions ?? []).map((ps) =>
            toDate(ps?.contractRevision?.submitInfo?.updatedAt)
        )
    )
    const latestReviewAction = latestDate(
        (contract.reviewStatusActions ?? []).map((a) => toDate(a?.updatedAt))
    )

    const latestContractQ = toDate(contract.latestQuestionCreatedAt)
    const latestRateQ = toDate(contract.latestRateQuestionCreatedAt)

    return latestDate([
        contractUpdated,
        draftUpdated,
        lastUnlocked,
        lastSubmitted,
        latestContractQ,
        latestRateQ,
        latestReviewAction,
    ])
}

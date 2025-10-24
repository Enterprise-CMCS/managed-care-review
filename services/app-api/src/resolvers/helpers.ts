import type { ContractType } from '../domain-models'

type WithLatest = {
    latestQuestionCreatedAt?: Date | string | null
    latestRateQuestionCreatedAt?: Date | string | null
    latestLinkedRateSubmitUpdatedAt?: Date | string | null
    latestQuestionResponseCreatedAt?: Date | string | null
    latestRateQuestionResponseCreatedAt?: Date | string | null
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
    contract: Partial<ContractType & WithLatest>
): Date | undefined {
    const contractUpdated = toDate(contract.updatedAt)
    const draftUpdated = toDate(contract.draftRevision?.updatedAt)
    const lastUnlocked = toDate(contract.draftRevision?.unlockInfo?.updatedAt)

    // Newest submit across package submissions
    const lastSubmitted = latestDate(
        (contract.packageSubmissions ?? []).map((ps) =>
            toDate(ps?.contractRevision?.submitInfo?.updatedAt)
        )
    )

    // Newest review action
    const latestReviewAction = latestDate(
        (contract.reviewStatusActions ?? []).map((a) => toDate(a?.updatedAt))
    )

    const latestContractQuestion = toDate(contract.latestQuestionCreatedAt)
    const latestRateQuestion = toDate(contract.latestRateQuestionCreatedAt)
    const latestLinkedRateSubmit = toDate(
        contract.latestLinkedRateSubmitUpdatedAt
    )

    const latestContractResponse = toDate(
        contract.latestQuestionResponseCreatedAt
    )
    const latestRateResponse = toDate(
        contract.latestRateQuestionResponseCreatedAt
    )

    return latestDate([
        contractUpdated,
        draftUpdated,
        lastUnlocked,
        lastSubmitted,
        latestReviewAction,
        latestContractQuestion,
        latestRateQuestion,
        latestLinkedRateSubmit,
        latestContractResponse,
        latestRateResponse,
    ])
}

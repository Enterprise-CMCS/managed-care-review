import type { Contract } from '../gen/gqlServer'

export function getLastUpdatedForDisplay(
    contract: Partial<Contract>
): Date | undefined {
    const contractUpdated = contract.updatedAt
    const draftUpdated = contract.draftRevision?.updatedAt

    let lastSubmitted
    if (contract.packageSubmissions) {
        lastSubmitted =
            contract.packageSubmissions?.length > 0
                ? contract?.packageSubmissions[0].contractRevision.submitInfo
                      ?.updatedAt
                : undefined
    }

    const lastUnlocked = contract.draftRevision?.unlockInfo?.updatedAt
    let latestUpdatedDate =
        lastUnlocked || lastSubmitted || draftUpdated || contractUpdated

    // With review actions, we compare if the review action has happened more recently or not than the latest submit action
    if (
        contract.reviewStatusActions &&
        contract.reviewStatusActions.length > 0
    ) {
        const latestAction = contract.reviewStatusActions[0].updatedAt
        if (latestAction && latestAction > latestUpdatedDate) {
            latestUpdatedDate = latestAction
        }
    }

    return latestUpdatedDate
}

import type {
    ContractPackageSubmissionType,
    RateRevisionType,
    RevisionDiffAddedRate,
    RevisionDiffRateChanges,
    RevisionDiffRemovedRate,
    RevisionDiffRevisedRate,
} from '../../domain-models'

function buildRateDisplayName(rateRevision: RateRevisionType): string {
    return rateRevision.formData.rateCertificationName ?? rateRevision.rateID
}

function isIncludedInAnotherSubmission(
    rateRevision: RateRevisionType,
    newerSubmissionSubmittedAt: Date
): boolean {
    const sharedPackages =
        rateRevision.formData.packagesWithSharedRateCerts ?? []

    if (sharedPackages.length > 0) {
        return true
    }

    return (
        rateRevision.submitInfo?.updatedAt.getTime() !== undefined &&
        rateRevision.submitInfo.updatedAt.getTime() <
            newerSubmissionSubmittedAt.getTime()
    )
}

function buildAddedRate(
    rateRevision: RateRevisionType,
    newerSubmissionSubmittedAt: Date
): RevisionDiffAddedRate {
    return {
        rateID: rateRevision.rateID,
        rateCertificationName: buildRateDisplayName(rateRevision),
        includedInAnotherSubmission: isIncludedInAnotherSubmission(
            rateRevision,
            newerSubmissionSubmittedAt
        ),
    }
}

function buildRemovedRate(
    rateRevision: RateRevisionType
): RevisionDiffRemovedRate {
    return {
        rateID: rateRevision.rateID,
        rateCertificationName: buildRateDisplayName(rateRevision),
    }
}

function buildRevisedRate(
    rateRevision: RateRevisionType
): RevisionDiffRevisedRate {
    return {
        rateID: rateRevision.rateID,
        rateCertificationName: buildRateDisplayName(rateRevision),
    }
}

function buildRateChanges(
    olderSubmission: ContractPackageSubmissionType,
    newerSubmission: ContractPackageSubmissionType
): RevisionDiffRateChanges | Error {
    const olderRatesByID = new Map(
        olderSubmission.rateRevisions.map((rateRevision) => [
            rateRevision.rateID,
            rateRevision,
        ])
    )
    const newerRatesByID = new Map(
        newerSubmission.rateRevisions.map((rateRevision) => [
            rateRevision.rateID,
            rateRevision,
        ])
    )

    if (olderRatesByID.size !== olderSubmission.rateRevisions.length) {
        return new Error(
            'Duplicate rateID encountered while building rate revision diff'
        )
    }

    if (newerRatesByID.size !== newerSubmission.rateRevisions.length) {
        return new Error(
            'Duplicate rateID encountered while building rate revision diff'
        )
    }

    const added: RevisionDiffAddedRate[] = []
    const removed: RevisionDiffRemovedRate[] = []
    const revised: RevisionDiffRevisedRate[] = []

    for (const [rateID, olderRateRevision] of olderRatesByID) {
        const newerRateRevision = newerRatesByID.get(rateID)

        if (!newerRateRevision) {
            removed.push(buildRemovedRate(olderRateRevision))
            continue
        }

        if (olderRateRevision.id !== newerRateRevision.id) {
            revised.push(buildRevisedRate(newerRateRevision))
        }
    }

    for (const [rateID, newerRateRevision] of newerRatesByID) {
        if (olderRatesByID.has(rateID)) {
            continue
        }

        added.push(
            buildAddedRate(
                newerRateRevision,
                newerSubmission.submitInfo.updatedAt
            )
        )
    }

    const sortByName = <TItem extends { rateCertificationName: string }>(
        left: TItem,
        right: TItem
    ) => left.rateCertificationName.localeCompare(right.rateCertificationName)

    return {
        added: added.sort(sortByName),
        removed: removed.sort(sortByName),
        revised: revised.sort(sortByName),
    }
}

export { buildRateChanges }

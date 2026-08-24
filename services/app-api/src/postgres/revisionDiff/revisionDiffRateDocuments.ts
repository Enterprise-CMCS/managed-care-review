import type {
    ContractPackageSubmissionType,
    RevisionDiffAddedRate,
    RevisionDiffDocumentListChanges,
    RevisionDiffRemovedRate,
    RevisionDiffRateDocumentChanges,
    RevisionDiffRevisedRate,
    RateRevisionType,
} from '../../domain-models'
import {
    buildDocumentListChanges,
    hasDocumentListChanges,
} from './revisionDiffPrimitives'

function buildRateDocumentChanges(
    previous: RateRevisionType | undefined,
    current: RateRevisionType | undefined
): RevisionDiffRateDocumentChanges | Error {
    const previousRateDocuments = previous?.formData.rateDocuments ?? []
    const currentRateDocuments = current?.formData.rateDocuments ?? []
    const previousRateSupportingDocuments =
        previous?.formData.supportingDocuments ?? []
    const currentRateSupportingDocuments =
        current?.formData.supportingDocuments ?? []

    const rateDocuments = buildDocumentListChanges(
        previousRateDocuments,
        currentRateDocuments
    )
    if (rateDocuments instanceof Error) {
        return rateDocuments
    }

    const supportingDocuments = buildDocumentListChanges(
        previousRateSupportingDocuments,
        currentRateSupportingDocuments
    )
    if (supportingDocuments instanceof Error) {
        return supportingDocuments
    }

    const rate = current ?? previous
    if (!rate) {
        return new Error(
            'Cannot build rate document changes without a rate revision'
        )
    }

    return {
        rateID: rate.rateID,
        rateCertificationName: rate.formData.rateCertificationName ?? undefined,
        rateDocuments,
        supportingDocuments,
    }
}

function hasRateDocumentListChanges(
    rateDocuments: RevisionDiffDocumentListChanges,
    supportingRateDocuments: RevisionDiffDocumentListChanges
): boolean {
    return (
        hasDocumentListChanges(rateDocuments) ||
        hasDocumentListChanges(supportingRateDocuments)
    )
}

function buildRateDocumentChangesFromRevisedRates(
    revisedRates: RevisionDiffRevisedRate[]
): RevisionDiffRateDocumentChanges[] {
    return revisedRates
        .filter((rate) =>
            hasRateDocumentListChanges(
                rate.rateDocuments,
                rate.supportingRateDocuments
            )
        )
        .map((rate) => ({
            rateID: rate.rateID,
            rateCertificationName: rate.rateCertificationName,
            rateDocuments: rate.rateDocuments,
            supportingDocuments: rate.supportingRateDocuments,
        }))
        .sort((leftGroup, rightGroup) =>
            (leftGroup.rateCertificationName ?? '').localeCompare(
                rightGroup.rateCertificationName ?? ''
            )
        )
}

function buildRateDocumentChangesFromRateChanges(
    olderSubmission: ContractPackageSubmissionType,
    newerSubmission: ContractPackageSubmissionType,
    addedRates: RevisionDiffAddedRate[],
    removedRates: RevisionDiffRemovedRate[],
    revisedRates: RevisionDiffRevisedRate[]
): RevisionDiffRateDocumentChanges[] | Error {
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

    const changedRateDocuments: RevisionDiffRateDocumentChanges[] = [
        ...buildRateDocumentChangesFromRevisedRates(revisedRates),
    ]

    for (const addedRate of addedRates) {
        const currentRateRevision = newerRatesByID.get(addedRate.rateID)

        if (!currentRateRevision) {
            return new Error(
                `Cannot build added-rate document changes without a current rate revision for ${addedRate.rateID}`
            )
        }

        const documentChanges = buildRateDocumentChanges(
            undefined,
            currentRateRevision
        )
        if (documentChanges instanceof Error) {
            return documentChanges
        }

        if (
            hasRateDocumentListChanges(
                documentChanges.rateDocuments,
                documentChanges.supportingDocuments
            )
        ) {
            changedRateDocuments.push(documentChanges)
        }
    }

    for (const removedRate of removedRates) {
        const previousRateRevision = olderRatesByID.get(removedRate.rateID)

        if (!previousRateRevision) {
            return new Error(
                `Cannot build removed-rate document changes without a previous rate revision for ${removedRate.rateID}`
            )
        }

        const documentChanges = buildRateDocumentChanges(
            previousRateRevision,
            undefined
        )
        if (documentChanges instanceof Error) {
            return documentChanges
        }

        if (
            hasRateDocumentListChanges(
                documentChanges.rateDocuments,
                documentChanges.supportingDocuments
            )
        ) {
            changedRateDocuments.push(documentChanges)
        }
    }

    return changedRateDocuments.sort((leftGroup, rightGroup) =>
        (leftGroup.rateCertificationName ?? '').localeCompare(
            rightGroup.rateCertificationName ?? ''
        )
    )
}

export {
    buildRateDocumentChanges,
    buildRateDocumentChangesFromRateChanges,
    buildRateDocumentChangesFromRevisedRates,
    hasRateDocumentListChanges,
}

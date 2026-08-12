import type {
    RevisionDiffDocumentListChanges,
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

export {
    buildRateDocumentChanges,
    buildRateDocumentChangesFromRevisedRates,
    hasRateDocumentListChanges,
}

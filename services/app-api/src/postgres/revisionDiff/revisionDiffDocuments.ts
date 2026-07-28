import type {
    ContractPackageSubmissionType,
    RevisionDiffDocumentChanges,
    RevisionDiffDocumentNameChanges,
    RevisionDiffRateDocumentChanges,
    RateRevisionType,
} from '../../domain-models'
import type { DocumentType } from '../../domain-models/contractAndRates'
import { diffCollectionByKey } from './revisionDiffPrimitives'

function buildDocumentNameChanges(
    previous: DocumentType[],
    current: DocumentType[]
): RevisionDiffDocumentNameChanges | Error {
    const changes = diffCollectionByKey({
        previous,
        current,
        getKey: (document) => `${document.sha256}::${document.name}`,
        buildChanges: () => [],
    })

    if (changes instanceof Error) {
        return changes
    }

    const added: string[] = []
    const removed: string[] = []

    for (const change of changes) {
        if (change.kind === 'added') {
            added.push(change.current.name)
        } else if (change.kind === 'removed') {
            removed.push(change.previous.name)
        }
    }

    return {
        added,
        removed,
    }
}

function hasDocumentNameChanges(
    changes: RevisionDiffDocumentNameChanges
): boolean {
    return changes.added.length > 0 || changes.removed.length > 0
}

function buildRateDocumentChanges(
    previous: RateRevisionType | undefined,
    current: RateRevisionType | undefined
): RevisionDiffRateDocumentChanges | Error {
    const previousRateDocuments = previous?.formData.rateDocuments ?? []
    const currentRateDocuments = current?.formData.rateDocuments ?? []
    const previousSupportingDocuments =
        previous?.formData.supportingDocuments ?? []
    const currentSupportingDocuments =
        current?.formData.supportingDocuments ?? []

    const rateDocuments = buildDocumentNameChanges(
        previousRateDocuments,
        currentRateDocuments
    )
    if (rateDocuments instanceof Error) {
        return rateDocuments
    }

    const supportingDocuments = buildDocumentNameChanges(
        previousSupportingDocuments,
        currentSupportingDocuments
    )
    if (supportingDocuments instanceof Error) {
        return supportingDocuments
    }

    const rate = current ?? previous
    if (!rate) {
        return new Error(
            'Cannot build document changes without a rate revision'
        )
    }

    return {
        rateID: rate.rateID,
        rateCertificationName:
            rate.formData.rateCertificationName ?? rate.rateID,
        rateDocuments,
        supportingDocuments,
    }
}

function buildRateDocumentGroups(
    previousRates: RateRevisionType[],
    currentRates: RateRevisionType[]
): RevisionDiffRateDocumentChanges[] | Error {
    const previousRatesByID = new Map(
        previousRates.map((rateRevision) => [rateRevision.rateID, rateRevision])
    )
    const currentRatesByID = new Map(
        currentRates.map((rateRevision) => [rateRevision.rateID, rateRevision])
    )

    if (previousRatesByID.size !== previousRates.length) {
        return new Error(
            'Duplicate rateID encountered while building rate document revision diff'
        )
    }

    if (currentRatesByID.size !== currentRates.length) {
        return new Error(
            'Duplicate rateID encountered while building rate document revision diff'
        )
    }

    const rateIDs = new Set([
        ...previousRatesByID.keys(),
        ...currentRatesByID.keys(),
    ])

    const groups: RevisionDiffRateDocumentChanges[] = []

    for (const rateID of rateIDs) {
        const group = buildRateDocumentChanges(
            previousRatesByID.get(rateID),
            currentRatesByID.get(rateID)
        )

        if (group instanceof Error) {
            return group
        }

        if (
            hasDocumentNameChanges(group.rateDocuments) ||
            hasDocumentNameChanges(group.supportingDocuments)
        ) {
            groups.push(group)
        }
    }

    return groups.sort((leftGroup, rightGroup) =>
        leftGroup.rateCertificationName.localeCompare(
            rightGroup.rateCertificationName
        )
    )
}

function buildDocumentChanges(
    olderSubmission: ContractPackageSubmissionType,
    newerSubmission: ContractPackageSubmissionType
): RevisionDiffDocumentChanges | Error {
    const contractDocuments = buildDocumentNameChanges(
        olderSubmission.contractRevision.formData.contractDocuments,
        newerSubmission.contractRevision.formData.contractDocuments
    )
    if (contractDocuments instanceof Error) {
        return contractDocuments
    }

    const contractSupportingDocuments = buildDocumentNameChanges(
        olderSubmission.contractRevision.formData.supportingDocuments,
        newerSubmission.contractRevision.formData.supportingDocuments
    )
    if (contractSupportingDocuments instanceof Error) {
        return contractSupportingDocuments
    }

    const rates = buildRateDocumentGroups(
        olderSubmission.rateRevisions,
        newerSubmission.rateRevisions
    )
    if (rates instanceof Error) {
        return rates
    }

    const totalAdded =
        contractDocuments.added.length +
        contractSupportingDocuments.added.length +
        rates.reduce(
            (sum, group) =>
                sum +
                group.rateDocuments.added.length +
                group.supportingDocuments.added.length,
            0
        )

    const totalRemoved =
        contractDocuments.removed.length +
        contractSupportingDocuments.removed.length +
        rates.reduce(
            (sum, group) =>
                sum +
                group.rateDocuments.removed.length +
                group.supportingDocuments.removed.length,
            0
        )

    return {
        contractDocuments,
        contractSupportingDocuments,
        rates,
        totalAdded,
        totalRemoved,
    }
}

export { buildDocumentChanges }

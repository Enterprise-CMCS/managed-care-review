import type {
    ContractPackageSubmissionType,
    RevisionDiffDocumentChanges,
    RevisionDiffRevisedRate,
} from '../../domain-models'
import { buildRateDocumentChangesFromRevisedRates } from './revisionDiffRateDocuments'
import { buildDocumentListChanges } from './revisionDiffPrimitives'

function buildDocumentChanges(
    olderSubmission: ContractPackageSubmissionType,
    newerSubmission: ContractPackageSubmissionType,
    revisedRates: RevisionDiffRevisedRate[]
): RevisionDiffDocumentChanges | Error {
    const contractDocuments = buildDocumentListChanges(
        olderSubmission.contractRevision.formData.contractDocuments,
        newerSubmission.contractRevision.formData.contractDocuments
    )
    if (contractDocuments instanceof Error) {
        return contractDocuments
    }

    const contractSupportingDocuments = buildDocumentListChanges(
        olderSubmission.contractRevision.formData.supportingDocuments,
        newerSubmission.contractRevision.formData.supportingDocuments
    )
    if (contractSupportingDocuments instanceof Error) {
        return contractSupportingDocuments
    }

    const ratesDocuments =
        buildRateDocumentChangesFromRevisedRates(revisedRates)

    const totalAdded =
        contractDocuments.added.length +
        contractSupportingDocuments.added.length +
        ratesDocuments.reduce(
            (sum, group) =>
                sum +
                group.rateDocuments.added.length +
                group.supportingDocuments.added.length,
            0
        )

    const totalRemoved =
        contractDocuments.removed.length +
        contractSupportingDocuments.removed.length +
        ratesDocuments.reduce(
            (sum, group) =>
                sum +
                group.rateDocuments.removed.length +
                group.supportingDocuments.removed.length,
            0
        )

    return {
        contractDocuments,
        contractSupportingDocuments,
        ratesDocuments,
        totalAdded,
        totalRemoved,
    }
}

export { buildDocumentChanges }

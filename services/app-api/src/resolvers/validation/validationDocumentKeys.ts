import { parseKey } from '../../s3'
import {
    evaluatePdfEligibility,
    type ValidationDocumentEligibilityReason,
} from './validationDocumentEligibility'

type ValidationDocument = {
    name?: string
    s3Key?: string
    s3BucketName?: string
    s3URL?: string
    contentType?: string | null
}

export type SkippedValidationDocumentDiagnostic = {
    documentName: string
    reason: Exclude<
        ValidationDocumentEligibilityReason,
        'eligible-pdf-extension'
    >
}

export type ValidationDocumentSelection = {
    eligibleDocuments: ValidationDocument[]
    skippedDocuments: SkippedValidationDocumentDiagnostic[]
}

export function selectEligibleValidationDocuments(
    documents: ValidationDocument[]
): ValidationDocumentSelection {
    const selection: ValidationDocumentSelection = {
        eligibleDocuments: [],
        skippedDocuments: [],
    }

    for (const document of documents) {
        const eligibility = evaluatePdfEligibility(document)

        if (eligibility.isEligible) {
            selection.eligibleDocuments.push(document)
        } else {
            selection.skippedDocuments.push({
                documentName: document.name ?? document.s3Key ?? 'unknown',
                reason: eligibility.reason,
            })
        }
    }

    return selection
}

export function getEffectiveValidationDocumentKeys(
    documents: ValidationDocument[],
    useLocalS3: boolean
): string[] {
    return documents.flatMap((document) => {
        if (!document.s3Key || !document.s3BucketName) {
            return []
        }

        if (!useLocalS3 || !document.s3URL) {
            return [document.s3Key]
        }

        const localUploadKey = parseKey(document.s3URL)

        // Local web uploads still store the fetchable object at the historical
        // key extracted from s3URL. Fall back to normalized s3Key if parsing
        // fails so deployed behavior and migrated records continue to work.
        return [
            localUploadKey instanceof Error || !localUploadKey
                ? document.s3Key
                : localUploadKey,
        ]
    })
}

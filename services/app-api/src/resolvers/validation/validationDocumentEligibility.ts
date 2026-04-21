export type ValidationDocumentEligibilityInput = {
    name?: string | null
    s3Key?: string | null
    s3BucketName?: string | null
    contentType?: string | null
}

export type ValidationDocumentEligibilityReason =
    | 'eligible-pdf-extension'
    | 'missing-s3-location'
    | 'missing-pdf-extension'
    | 'content-type-mismatch'

export type ValidationDocumentEligibility =
    | {
          isEligible: true
          reason: 'eligible-pdf-extension'
      }
    | {
          isEligible: false
          reason: Exclude<
              ValidationDocumentEligibilityReason,
              'eligible-pdf-extension'
          >
      }

const PDF_MIME_TYPE = 'application/pdf'

// This is a metadata-only candidate check. The worker still has to prove the
// object is parseable as a PDF before treating it as reviewed evidence.
export function evaluatePdfEligibility(
    document: ValidationDocumentEligibilityInput
): ValidationDocumentEligibility {
    if (!document.s3Key || !document.s3BucketName) {
        return {
            isEligible: false,
            reason: 'missing-s3-location',
        }
    }

    if (!hasPdfExtension(document.name) && !hasPdfExtension(document.s3Key)) {
        return {
            isEligible: false,
            reason: 'missing-pdf-extension',
        }
    }

    if (
        document.contentType &&
        document.contentType.trim().toLowerCase() !== PDF_MIME_TYPE
    ) {
        return {
            isEligible: false,
            reason: 'content-type-mismatch',
        }
    }

    return {
        isEligible: true,
        reason: 'eligible-pdf-extension',
    }
}

function hasPdfExtension(value?: string | null): boolean {
    return value?.trim().toLowerCase().endsWith('.pdf') ?? false
}

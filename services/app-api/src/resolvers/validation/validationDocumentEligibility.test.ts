import { describe, expect, it } from 'vitest'
import { evaluatePdfEligibility } from './validationDocumentEligibility'

describe('evaluatePdfEligibility', () => {
    it('treats a persisted document with a PDF name as eligible when content type is unavailable', () => {
        expect(
            evaluatePdfEligibility({
                name: 'Contract Amendment.PDF',
                s3BucketName: 'uploads-bucket',
                s3Key: 'allusers/uuid',
            })
        ).toEqual({
            isEligible: true,
            reason: 'eligible-pdf-extension',
        })
    })

    it('falls back to s3Key extension when document name is missing', () => {
        expect(
            evaluatePdfEligibility({
                s3BucketName: 'uploads-bucket',
                s3Key: 'allusers/uuid.pdf',
            })
        ).toEqual({
            isEligible: true,
            reason: 'eligible-pdf-extension',
        })
    })

    it('rejects documents without a persisted S3 location', () => {
        expect(
            evaluatePdfEligibility({
                name: 'contract.pdf',
                s3Key: 'allusers/uuid.pdf',
            })
        ).toEqual({
            isEligible: false,
            reason: 'missing-s3-location',
        })
    })

    it('rejects documents without a PDF extension', () => {
        expect(
            evaluatePdfEligibility({
                name: 'contract.docx',
                s3BucketName: 'uploads-bucket',
                s3Key: 'allusers/uuid.docx',
            })
        ).toEqual({
            isEligible: false,
            reason: 'missing-pdf-extension',
        })
    })

    it('rejects extension and content type mismatches when content type is present', () => {
        expect(
            evaluatePdfEligibility({
                name: 'contract.pdf',
                s3BucketName: 'uploads-bucket',
                s3Key: 'allusers/uuid.pdf',
                contentType:
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            })
        ).toEqual({
            isEligible: false,
            reason: 'content-type-mismatch',
        })
    })
})

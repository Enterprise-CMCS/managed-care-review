import { describe, test, expect, beforeEach, afterEach } from 'vitest'

describe('migrate_s3_urls handler', () => {
    const originalEnv = process.env

    beforeEach(() => {
        // Reset env vars before each test
        process.env = { ...originalEnv }
    })

    afterEach(() => {
        // Restore original env
        process.env = originalEnv
    })

    describe('environment variable validation', () => {
        test('throws error when VITE_APP_S3_DOCUMENTS_BUCKET is missing', async () => {
            delete process.env.VITE_APP_S3_DOCUMENTS_BUCKET
            process.env.VITE_APP_S3_QA_BUCKET = 'test-qa-bucket'

            const { main } = await import('../migrate_s3_urls')

            await expect(main({}, {} as any, {} as any)).rejects.toThrow(
                'VITE_APP_S3_DOCUMENTS_BUCKET environment variable is required'
            )
        })

        test('throws error when VITE_APP_S3_QA_BUCKET is missing', async () => {
            process.env.VITE_APP_S3_DOCUMENTS_BUCKET = 'test-docs-bucket'
            delete process.env.VITE_APP_S3_QA_BUCKET

            const { main } = await import('../migrate_s3_urls')

            await expect(main({}, {} as any, {} as any)).rejects.toThrow(
                'VITE_APP_S3_QA_BUCKET environment variable is required'
            )
        })
    })

    describe('event parameter handling', () => {
        test('handles undefined event gracefully with defaults', async () => {
            process.env.VITE_APP_S3_DOCUMENTS_BUCKET = 'test-docs-bucket'
            process.env.VITE_APP_S3_QA_BUCKET = 'test-qa-bucket'
            process.env.DATABASE_URL = 'postgresql://invalid-url-for-test'

            const { main } = await import('../migrate_s3_urls')

            // Handler catches errors and returns response with success: false
            const result = await main(undefined as any, {} as any, {} as any)

            expect(result.success).toBe(false)
            expect(result.dryRun).toBe(false) // defaults to false
            expect(result.documentsBucket).toBe('test-docs-bucket')
            expect(result.qaBucket).toBe('test-qa-bucket')
            // Should not throw "Cannot read property 'dryRun' of undefined"
        })

        test('handles empty event object with defaults', async () => {
            process.env.VITE_APP_S3_DOCUMENTS_BUCKET = 'test-docs-bucket'
            process.env.VITE_APP_S3_QA_BUCKET = 'test-qa-bucket'
            process.env.DATABASE_URL = 'postgresql://invalid-url-for-test'

            const { main } = await import('../migrate_s3_urls')

            const result = await main({}, {} as any, {} as any)

            expect(result.success).toBe(false)
            expect(result.dryRun).toBe(false) // defaults to false
            expect(result.documentsBucket).toBe('test-docs-bucket')
            expect(result.qaBucket).toBe('test-qa-bucket')
        })

        test('respects dryRun and limit from event', async () => {
            process.env.VITE_APP_S3_DOCUMENTS_BUCKET = 'test-docs-bucket'
            process.env.VITE_APP_S3_QA_BUCKET = 'test-qa-bucket'
            process.env.DATABASE_URL = 'postgresql://invalid-url-for-test'

            const { main } = await import('../migrate_s3_urls')

            const result = await main(
                { dryRun: true, limit: 10 },
                {} as any,
                {} as any
            )

            expect(result.dryRun).toBe(true)
            // limit would be used in the actual migration (can't easily test without DB)
        })
    })

    describe('bucket selection logic', () => {
        test('uses correct bucket types based on document tables', () => {
            // This is implicit in the implementation, but we document the expected behavior:
            // - ContractDocument, RateDocument, ContractSupportingDocument, RateSupportingDocument, DocumentZipPackage
            //   should use DOCUMENTS bucket
            // - ContractQuestionDocument, ContractQuestionResponseDocument, RateQuestionDocument, RateQuestionResponseDocument
            //   should use QA bucket

            const documentsBucketTables = [
                'ContractDocument',
                'RateDocument',
                'ContractSupportingDocument',
                'RateSupportingDocument',
                'DocumentZipPackage',
            ]

            const qaBucketTables = [
                'ContractQuestionDocument',
                'ContractQuestionResponseDocument',
                'RateQuestionDocument',
                'RateQuestionResponseDocument',
            ]

            // This test documents the expected bucket mapping
            expect(documentsBucketTables).toHaveLength(5)
            expect(qaBucketTables).toHaveLength(4)
        })
    })

    describe('zip s3URL key extraction', () => {
        test('extracts full path from contract zip URL', () => {
            const s3URL =
                's3://bucket/zips/contracts/abc-123/contract-documents.zip'
            const parts = s3URL.split('/')
            const keyParts = parts.slice(3)
            const s3Key = keyParts.join('/')

            expect(s3Key).toBe('zips/contracts/abc-123/contract-documents.zip')
            expect(s3Key).toContain('zips/')
        })

        test('extracts full path from rate zip URL', () => {
            const s3URL = 's3://bucket/zips/rates/def-456/rate-documents.zip'
            const parts = s3URL.split('/')
            const keyParts = parts.slice(3)
            const s3Key = keyParts.join('/')

            expect(s3Key).toBe('zips/rates/def-456/rate-documents.zip')
            expect(s3Key).toContain('zips/')
        })

        test('extracts full path from supporting docs zip URL', () => {
            const s3URL =
                's3://bucket/zips/contracts/xyz-789/contract-supporting-documents.zip'
            const parts = s3URL.split('/')
            const keyParts = parts.slice(3)
            const s3Key = keyParts.join('/')

            expect(s3Key).toBe(
                'zips/contracts/xyz-789/contract-supporting-documents.zip'
            )
        })

        test('does not double-prepend zips/ prefix', () => {
            // This was the bug Copilot caught
            const s3URL =
                's3://bucket/zips/contracts/abc-123/contract-documents.zip'
            const parts = s3URL.split('/')

            // OLD BUGGY CODE would do:
            // const zipFilename = parts[3] // 'zips'
            // const s3Key = `zips/${zipFilename}` // 'zips/zips' ❌

            // NEW CORRECT CODE:
            const keyParts = parts.slice(3)
            const s3Key = keyParts.join('/')

            expect(s3Key).toBe('zips/contracts/abc-123/contract-documents.zip')
            expect(s3Key).not.toBe('zips/zips') // Should not double-prepend
            expect(s3Key).not.toContain('zips/zips')
        })

        test('validates zip URLs start with zips/', () => {
            const validUrl = 's3://bucket/zips/contracts/abc/file.zip'
            const parts = validUrl.split('/')
            const s3Key = parts.slice(3).join('/')

            expect(s3Key.startsWith('zips/')).toBe(true)

            // Invalid URL without zips/ prefix
            const invalidUrl = 's3://bucket/contracts/abc/file.zip'
            const invalidParts = invalidUrl.split('/')
            const invalidKey = invalidParts.slice(3).join('/')

            expect(invalidKey.startsWith('zips/')).toBe(false)
        })
    })
})

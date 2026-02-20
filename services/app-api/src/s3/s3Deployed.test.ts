import { describe, test, expect, vi, beforeEach } from 'vitest'
import { newDeployedS3Client } from './s3Deployed'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3')
vi.mock('@aws-sdk/s3-request-presigner')

describe('newDeployedS3Client', () => {
    const mockBucketConfig = {
        HEALTH_PLAN_DOCS: 'test-docs-bucket',
        QUESTION_ANSWER_DOCS: 'test-qa-bucket',
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('getURL', () => {
        test('returns signed URL for migrated documents with full path', async () => {
            const mockSignedUrl =
                'https://s3.amazonaws.com/test-docs-bucket/allusers/uuid.pdf?presigned'
            vi.mocked(getSignedUrl).mockResolvedValue(mockSignedUrl)

            const s3Client = newDeployedS3Client(mockBucketConfig, 'us-east-1')

            // Migrated document with full path stored in s3Key field
            const result = await s3Client.getURL(
                'allusers/ceffb382-434e-4e31-a421-7372f2ce6726.pdf',
                'HEALTH_PLAN_DOCS'
            )

            expect(result).toBe(mockSignedUrl)
            expect(getSignedUrl).toHaveBeenCalledTimes(1)
        })

        test('returns signed URL for legacy documents (prepends allusers/)', async () => {
            const mockSignedUrl =
                'https://s3.amazonaws.com/test-docs-bucket/allusers/uuid.pdf?presigned'
            vi.mocked(getSignedUrl).mockResolvedValue(mockSignedUrl)

            const s3Client = newDeployedS3Client(mockBucketConfig, 'us-east-1')

            // Old document where getS3Key falls back to parseKey which returns just UUID
            const result = await s3Client.getURL(
                'ceffb382-434e-4e31-a421-7372f2ce6726.pdf',
                'HEALTH_PLAN_DOCS'
            )

            expect(result).toBe(mockSignedUrl)
            expect(getSignedUrl).toHaveBeenCalledTimes(1)
        })

        test('uses correct bucket from config', async () => {
            const mockSignedUrl =
                'https://s3.amazonaws.com/test-qa-bucket/allusers/doc.pdf?presigned'
            vi.mocked(getSignedUrl).mockResolvedValue(mockSignedUrl)

            const s3Client = newDeployedS3Client(mockBucketConfig, 'us-east-1')

            const result = await s3Client.getURL(
                'allusers/doc-123.pdf',
                'QUESTION_ANSWER_DOCS'
            )

            expect(result).toBe(mockSignedUrl)
            expect(getSignedUrl).toHaveBeenCalledTimes(1)
        })

        test('respects custom expiresIn parameter', async () => {
            const mockSignedUrl =
                'https://s3.amazonaws.com/presigned-url-custom'
            vi.mocked(getSignedUrl).mockResolvedValue(mockSignedUrl)

            const s3Client = newDeployedS3Client(mockBucketConfig, 'us-east-1')

            await s3Client.getURL(
                'allusers/doc-123.pdf',
                'HEALTH_PLAN_DOCS',
                7200
            )

            const options = vi.mocked(getSignedUrl).mock.calls[0][2]
            expect(options).toBeDefined()
            expect(options?.expiresIn).toBe(7200)
        })

        test('defaults to 3600 seconds when expiresIn not provided', async () => {
            const mockSignedUrl =
                'https://s3.amazonaws.com/presigned-url-default'
            vi.mocked(getSignedUrl).mockResolvedValue(mockSignedUrl)

            const s3Client = newDeployedS3Client(mockBucketConfig, 'us-east-1')

            await s3Client.getURL('allusers/doc-123.pdf', 'HEALTH_PLAN_DOCS')

            const options = vi.mocked(getSignedUrl).mock.calls[0][2]
            expect(options).toBeDefined()
            expect(options?.expiresIn).toBe(3600)
        })
    })

    describe('getZipURL', () => {
        test('returns signed URL for zip files', async () => {
            const mockSignedUrl =
                'https://s3.amazonaws.com/test-docs-bucket/zips/contract.zip?presigned'
            vi.mocked(getSignedUrl).mockResolvedValue(mockSignedUrl)

            const s3Client = newDeployedS3Client(mockBucketConfig, 'us-east-1')

            const result = await s3Client.getZipURL(
                'zips/contracts/abc-123/contract-documents.zip',
                'HEALTH_PLAN_DOCS'
            )

            expect(result).toBe(mockSignedUrl)
            expect(getSignedUrl).toHaveBeenCalledTimes(1)
        })
    })

    describe('getUploadURL', () => {
        test('returns signed URL for upload', async () => {
            const mockSignedUrl = 'https://s3.amazonaws.com/upload-url'
            vi.mocked(getSignedUrl).mockResolvedValue(mockSignedUrl)

            const s3Client = newDeployedS3Client(mockBucketConfig, 'us-east-1')

            const result = await s3Client.getUploadURL(
                'uuid-123.pdf',
                'HEALTH_PLAN_DOCS',
                'application/pdf',
                600
            )

            expect(result).toBe(mockSignedUrl)
            expect(getSignedUrl).toHaveBeenCalledTimes(1)

            const options = vi.mocked(getSignedUrl).mock.calls[0][2]
            expect(options).toBeDefined()
            expect(options?.expiresIn).toBe(600)
        })
    })
})

import { describe, test, expect } from 'vitest'
import { parseBucketName, parseKey, getS3Bucket, getS3Key } from './helpers'

describe('S3 URL parsing helpers', () => {
    describe('parseBucketName', () => {
        test('extracts bucket name from regular document URL', () => {
            const result = parseBucketName(
                's3://uploads-documents-prod-bucket/abc123.pdf/filename.pdf'
            )
            expect(result).toBe('uploads-documents-prod-bucket')
        })

        test('extracts bucket name from zip package URL', () => {
            const result = parseBucketName(
                's3://uploads-documents-prod-bucket/zips/contracts/uuid-123/contract-documents.zip'
            )
            expect(result).toBe('uploads-documents-prod-bucket')
        })

        test('throws error for invalid URL format', () => {
            expect(() => parseBucketName('not-an-s3-url')).toThrow(
                'Not valid S3URL for parsebucket'
            )
        })

        test('throws error for http URL', () => {
            expect(() => parseBucketName('http://bucket/key/file.pdf')).toThrow(
                'Not valid S3URL for parsebucket'
            )
        })
    })

    describe('parseKey', () => {
        describe('regular documents', () => {
            test('extracts UUID key from regular document URL', () => {
                const result = parseKey(
                    's3://bucket/ceffb382-434e-4e31-a421-7372f2ce6726.pdf/Specialty AHF.pdf'
                )
                expect(result).toBe('ceffb382-434e-4e31-a421-7372f2ce6726.pdf')
            })

            test('returns error for invalid S3 URL protocol', () => {
                const result = parseKey('http://bucket/key/file.pdf')
                expect(result).toBeInstanceOf(Error)
                expect((result as Error).message).toContain(
                    'Not valid S3URL for parsekey'
                )
            })

            test('returns error for document URL with too many segments', () => {
                // URL with 5 segments that's not a zip will fail validation
                const result = parseKey('s3://bucket/foo/bar/baz/file.pdf')
                expect(result).toBeInstanceOf(Error)
                expect((result as Error).message).toContain(
                    'Not valid S3URL for parsekey'
                )
            })

            test('returns error for document URL with too few segments', () => {
                const result = parseKey('s3://bucket/onlyone')
                expect(result).toBeInstanceOf(Error)
                expect((result as Error).message).toContain(
                    'Not valid S3URL for parsekey'
                )
            })
        })

        describe('zip packages', () => {
            test('extracts full path from contract zip URL', () => {
                const result = parseKey(
                    's3://uploads-prod-uploads-701789472057/zips/contracts/1d2537c1-fead-4845-ade8-bf8c3c210675/contract-documents.zip'
                )
                expect(result).toBe(
                    'zips/contracts/1d2537c1-fead-4845-ade8-bf8c3c210675/contract-documents.zip'
                )
            })

            test('extracts full path from rate zip URL', () => {
                const result = parseKey(
                    's3://uploads-documents-val-bucket/zips/rates/abc-123-def/rate-documents.zip'
                )
                expect(result).toBe('zips/rates/abc-123-def/rate-documents.zip')
            })

            test('extracts full path from contract supporting docs zip', () => {
                const result = parseKey(
                    's3://bucket/zips/contracts/uuid/contract-supporting-documents.zip'
                )
                expect(result).toBe(
                    'zips/contracts/uuid/contract-supporting-documents.zip'
                )
            })

            test('returns error for zip URL with too few segments', () => {
                const result = parseKey('s3://bucket/zips/file.zip')
                expect(result).toBeInstanceOf(Error)
                expect((result as Error).message).toContain(
                    'Not valid S3URL for parsekey'
                )
            })

            test('handles zip URLs with nested paths', () => {
                const result = parseKey(
                    's3://bucket/zips/contracts/nested/path/uuid/file.zip'
                )
                expect(result).toBe('zips/contracts/nested/path/uuid/file.zip')
            })

            test('handles production zip URL format that was failing', () => {
                // This is the exact URL format that broke production
                const prodZipUrl =
                    's3://uploads-prod-uploads-701789472057/zips/contracts/1d2537c1-fead-4845-ade8-bf8c3c210675/contract-documents.zip'
                const result = parseKey(prodZipUrl)
                expect(result).toBe(
                    'zips/contracts/1d2537c1-fead-4845-ade8-bf8c3c210675/contract-documents.zip'
                )
                expect(result).not.toBe('zips') // Should NOT return just first segment
            })
        })
    })

    describe('getS3Bucket', () => {
        test('returns s3BucketName when available', () => {
            const doc = {
                s3BucketName: 'uploads-documents-prod-bucket',
                s3URL: 's3://fallback-bucket/key/file.pdf',
            }
            const result = getS3Bucket(doc)
            expect(result).toBe('uploads-documents-prod-bucket')
        })

        test('falls back to parsing s3URL when s3BucketName is null', () => {
            const doc = {
                s3BucketName: null,
                s3URL: 's3://fallback-bucket/key/file.pdf',
            }
            const result = getS3Bucket(doc)
            expect(result).toBe('fallback-bucket')
        })

        test('falls back to parsing s3URL when s3BucketName is missing', () => {
            const doc = {
                s3URL: 's3://fallback-bucket/key/file.pdf',
            }
            const result = getS3Bucket(doc)
            expect(result).toBe('fallback-bucket')
        })

        test('throws error when s3URL is invalid', () => {
            const doc = {
                s3BucketName: null,
                s3URL: 'invalid-url',
            }
            // parseBucketName throws instead of returning an Error
            expect(() => getS3Bucket(doc)).toThrow(
                'Not valid S3URL for parsebucket'
            )
        })
    })

    describe('getS3Key', () => {
        describe('regular documents', () => {
            test('returns s3Key when available', () => {
                const doc = {
                    s3Key: 'allusers/abc-123.pdf',
                    s3URL: 's3://bucket/fallback/file.pdf',
                }
                const result = getS3Key(doc)
                expect(result).toBe('allusers/abc-123.pdf')
            })

            test('falls back to parsing s3URL when s3Key is null', () => {
                const doc = {
                    s3Key: null,
                    s3URL: 's3://bucket/abc-123.pdf/Original Filename.pdf',
                }
                const result = getS3Key(doc)
                expect(result).toBe('abc-123.pdf')
            })

            test('falls back to parsing s3URL when s3Key is missing', () => {
                const doc = {
                    s3URL: 's3://bucket/abc-123.pdf/Original Filename.pdf',
                }
                const result = getS3Key(doc)
                expect(result).toBe('abc-123.pdf')
            })
        })

        describe('zip packages', () => {
            test('returns zip s3Key when available', () => {
                const zip = {
                    s3Key: 'zips/contracts/uuid/contract-documents.zip',
                    s3URL: 's3://bucket/fallback/file.zip',
                }
                const result = getS3Key(zip)
                expect(result).toBe(
                    'zips/contracts/uuid/contract-documents.zip'
                )
            })

            test('falls back to parsing zip s3URL and returns full path', () => {
                const zip = {
                    s3Key: null,
                    s3URL: 's3://uploads-prod-uploads-701789472057/zips/contracts/1d2537c1-fead-4845-ade8-bf8c3c210675/contract-documents.zip',
                }
                const result = getS3Key(zip)
                expect(result).toBe(
                    'zips/contracts/1d2537c1-fead-4845-ade8-bf8c3c210675/contract-documents.zip'
                )
            })

            test('falls back to parsing rate zip s3URL', () => {
                const zip = {
                    s3Key: null,
                    s3URL: 's3://bucket/zips/rates/rate-id/rate-documents.zip',
                }
                const result = getS3Key(zip)
                expect(result).toBe('zips/rates/rate-id/rate-documents.zip')
            })
        })

        test('returns error when both s3Key and s3URL are missing', () => {
            const doc = {
                s3Key: null,
            }
            const result = getS3Key(doc)
            expect(result).toBeInstanceOf(Error)
            expect((result as Error).message).toContain(
                'Document missing both s3Key and s3URL'
            )
        })

        test('returns error when s3URL is invalid', () => {
            const doc = {
                s3Key: null,
                s3URL: 'invalid-url',
            }
            const result = getS3Key(doc)
            expect(result).toBeInstanceOf(Error)
        })
    })
})

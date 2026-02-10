import { describe, it, expect } from 'vitest'
import { parseAndValidateDocuments } from './documentHelpers'
import { GraphQLError } from 'graphql'

describe('parseAndValidateDocuments', () => {
    it('parses valid s3URLs and extracts bucket and key', () => {
        const docs = parseAndValidateDocuments([
            {
                name: 'test-document.pdf',
                s3URL: 's3://my-bucket/abc-123-uuid/test-document.pdf',
                sha256: 'abc123def456',
            },
        ])

        expect(docs).toHaveLength(1)
        expect(docs[0]).toEqual({
            name: 'test-document.pdf',
            s3URL: 's3://my-bucket/abc-123-uuid/test-document.pdf',
            s3BucketName: 'my-bucket',
            s3Key: 'abc-123-uuid',
            sha256: 'abc123def456',
        })
    })

    it('parses multiple documents correctly', () => {
        const docs = parseAndValidateDocuments([
            {
                name: 'contract.pdf',
                s3URL: 's3://bucket-1/key-1/contract.pdf',
            },
            {
                name: 'rate-cert.pdf',
                s3URL: 's3://bucket-2/key-2/rate-cert.pdf',
                sha256: 'xyz789',
            },
        ])

        expect(docs).toHaveLength(2)
        expect(docs[0]).toMatchObject({
            s3BucketName: 'bucket-1',
            s3Key: 'key-1',
        })
        expect(docs[1]).toMatchObject({
            s3BucketName: 'bucket-2',
            s3Key: 'key-2',
            sha256: 'xyz789',
        })
    })

    it('works without sha256 field', () => {
        const docs = parseAndValidateDocuments([
            {
                name: 'test.pdf',
                s3URL: 's3://my-bucket/my-key/test.pdf',
            },
        ])

        expect(docs[0]).toEqual({
            name: 'test.pdf',
            s3URL: 's3://my-bucket/my-key/test.pdf',
            s3BucketName: 'my-bucket',
            s3Key: 'my-key',
            sha256: undefined,
        })
    })

    it('throws GraphQLError for invalid s3URL format (missing s3:// protocol)', () => {
        expect(() =>
            parseAndValidateDocuments([
                {
                    name: 'invalid-doc.pdf',
                    s3URL: 'http://bucket/key/file.pdf',
                    sha256: 'abc123',
                },
            ])
        ).toThrow(GraphQLError)
    })

    it('throws GraphQLError for malformed s3URL (not enough segments)', () => {
        expect(() =>
            parseAndValidateDocuments([
                {
                    name: 'malformed-doc.pdf',
                    s3URL: 's3://bucket-only',
                    sha256: 'abc123',
                },
            ])
        ).toThrow(GraphQLError)
    })

    it('includes document name in error message', () => {
        expect(() =>
            parseAndValidateDocuments([
                {
                    name: 'my-important-document.pdf',
                    s3URL: 'invalid-url',
                },
            ])
        ).toThrow(/my-important-document\.pdf/)
    })

    it('includes document index in error message', () => {
        expect(() =>
            parseAndValidateDocuments([
                {
                    name: 'good-doc.pdf',
                    s3URL: 's3://bucket/key/good.pdf',
                },
                {
                    name: 'bad-doc.pdf',
                    s3URL: 'invalid-url',
                },
            ])
        ).toThrow(/index 1/)
    })

    it('includes the invalid s3URL value in error', () => {
        expect(() =>
            parseAndValidateDocuments([
                {
                    name: 'test.pdf',
                    s3URL: 'https://wrong-protocol.com/file.pdf',
                },
            ])
        ).toThrow(/https:\/\/wrong-protocol\.com\/file\.pdf/)
    })

    it('handles real-world s3URL format from frontend', () => {
        // This is the actual format the frontend sends
        const docs = parseAndValidateDocuments([
            {
                name: 'Contract Amendment.pdf',
                s3URL: 's3://bucketname/key/Contract Amendment.pdf',
                sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            },
        ])

        expect(docs[0]).toMatchObject({
            s3BucketName: 'bucketname',
            s3Key: 'key',
        })
    })

    it('throws error with extensions for GraphQL error handling', () => {
        try {
            parseAndValidateDocuments([
                {
                    name: 'test.pdf',
                    s3URL: 'bad-url',
                },
            ])
            expect.fail('Should have thrown')
        } catch (error) {
            expect(error).toBeInstanceOf(GraphQLError)
            const gqlError = error as GraphQLError
            expect(gqlError.extensions).toBeDefined()
            expect(gqlError.extensions.code).toBe('BAD_USER_INPUT')
        }
    })
})

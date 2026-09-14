import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { GraphQLClient } from '../src/client/graphqlClient'
import { UploadClient } from '../src/client/uploadClient'
import {
    documentFixtures,
    loadDocumentFixture,
} from '../src/fixtures/documents'

describe('UploadClient', () => {
    it('requests a unique URL, uploads fixture bytes, and returns real metadata', async () => {
        const graphqlFetch = vi.fn().mockResolvedValue(
            Response.json({
                data: {
                    generateUploadURL: {
                        uploadURL: 'https://uploads.example.com/presigned',
                        s3Key: 'contracts/unique-key.pdf',
                        bucket: 'qa-documents',
                        expiresIn: 900,
                        s3URL: 's3://qa-documents/contracts/unique-key.pdf',
                    },
                },
            })
        )
        const graphql = new GraphQLClient({
            endpoint: 'https://api.example.com/v1/graphql/external',
            accessToken: () => 'test-token',
            fetch: graphqlFetch,
        })
        const uploadFetch = vi
            .fn()
            .mockResolvedValueOnce(new Response('', { status: 503 }))
            .mockResolvedValueOnce(new Response('', { status: 200 }))
        const sleep = vi.fn().mockResolvedValue(undefined)
        const uploader = new UploadClient({
            graphql,
            fetch: uploadFetch,
            retry: { maxAttempts: 2, baseDelayMs: 1, sleep },
        })
        const fixture = documentFixtures.pdf.small
        const bytes = await loadDocumentFixture(fixture)

        const result = await uploader.upload({
            ...fixture,
            bytes,
            bucketName: 'HEALTH_PLAN_DOCS',
        })

        expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
        expect(result).toEqual({
            name: fixture.name,
            s3URL: 's3://qa-documents/contracts/unique-key.pdf',
            s3Key: 'contracts/unique-key.pdf',
            bucket: 'qa-documents',
            sha256: createHash('sha256').update(bytes).digest('hex'),
        })
        expect(uploadFetch).toHaveBeenCalledTimes(2)
        expect(sleep).toHaveBeenCalledWith(1)
        expect(uploadFetch.mock.calls[1][0]).toBe(
            'https://uploads.example.com/presigned'
        )
        expect(uploadFetch.mock.calls[1][1]).toEqual(
            expect.objectContaining({
                method: 'PUT',
                headers: { 'Content-Type': 'application/pdf' },
            })
        )
    })
})

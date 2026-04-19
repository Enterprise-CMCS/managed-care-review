import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
    cleanupExpiredValidationArtifacts,
    DEFAULT_VALIDATION_ARTIFACT_RETENTION_DAYS,
} from '../cleanup'

describe('cleanup handler AI artifact cleanup', () => {
    beforeEach(() => {
        vi.restoreAllMocks()
        vi.spyOn(console, 'info').mockImplementation(() => {})
    })

    test('skips AI artifact cleanup when the bucket is not configured', async () => {
        const infoSpy = vi.spyOn(console, 'info')

        const deletedCount = await cleanupExpiredValidationArtifacts({
            s3Client: {
                send: vi.fn(),
            } as any,
        })

        expect(deletedCount).toBe(0)
        expect(infoSpy).toHaveBeenCalledWith(
            'AI validation artifact bucket not configured, skipping artifact cleanup'
        )
    })

    test('deletes only expired rag-indexes objects', async () => {
        const send = vi
            .fn()
            .mockResolvedValueOnce({
                Contents: [
                    {
                        Key: 'rag-indexes/form-1/status.json',
                        LastModified: new Date('2026-03-01T00:00:00.000Z'),
                    },
                    {
                        Key: 'rag-indexes/form-2/chunks.json',
                        LastModified: new Date('2026-04-18T00:00:00.000Z'),
                    },
                    {
                        Key: 'other-prefix/file.json',
                        LastModified: new Date('2026-03-01T00:00:00.000Z'),
                    },
                ],
                IsTruncated: false,
            })
            .mockResolvedValueOnce({})

        const deletedCount = await cleanupExpiredValidationArtifacts({
            s3Client: { send } as any,
            bucket: 'ai-form-augmentation-artifacts',
            retentionDays: DEFAULT_VALIDATION_ARTIFACT_RETENTION_DAYS,
            now: new Date('2026-04-19T00:00:00.000Z'),
        })

        expect(deletedCount).toBe(1)
        expect(send).toHaveBeenCalledTimes(2)

        const deleteCommandInput = send.mock.calls[1][0].input
        expect(deleteCommandInput.Bucket).toBe('ai-form-augmentation-artifacts')
        expect(deleteCommandInput.Delete.Objects).toEqual([
            { Key: 'rag-indexes/form-1/status.json' },
        ])
    })

    test('walks through paginated artifact listings', async () => {
        const send = vi
            .fn()
            .mockResolvedValueOnce({
                Contents: [
                    {
                        Key: 'rag-indexes/form-1/status.json',
                        LastModified: new Date('2026-03-01T00:00:00.000Z'),
                    },
                ],
                IsTruncated: true,
                NextContinuationToken: 'page-2',
            })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({
                Contents: [
                    {
                        Key: 'rag-indexes/form-2/validation-result.json',
                        LastModified: new Date('2026-03-02T00:00:00.000Z'),
                    },
                ],
                IsTruncated: false,
            })
            .mockResolvedValueOnce({})

        const deletedCount = await cleanupExpiredValidationArtifacts({
            s3Client: { send } as any,
            bucket: 'ai-form-augmentation-artifacts',
            retentionDays: 30,
            now: new Date('2026-04-19T00:00:00.000Z'),
        })

        expect(deletedCount).toBe(2)
        expect(send.mock.calls[0][0].input.ContinuationToken).toBeUndefined()
        expect(send.mock.calls[2][0].input.ContinuationToken).toBe('page-2')
    })
})

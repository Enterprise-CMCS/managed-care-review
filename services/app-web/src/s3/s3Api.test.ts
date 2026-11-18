import type { ApolloClient } from '@apollo/client'
import { recordJSException } from '@mc-review/otel'
import {
    FetchS3DownloadUrlDocument,
    FetchUploadScanStatusDocument,
    GenerateUploadUrlDocument,
} from '../gen/gqlClient'
import { newApiS3Client, SCAN_TIMEOUT_MS } from './s3Api'

vi.mock('@mc-review/otel', () => ({ recordJSException: vi.fn() }))

const buckets = {
    HEALTH_PLAN_DOCS: 'documents-test',
    QUESTION_ANSWER_DOCS: 'questions-test',
}
const mutate = vi.fn()
const query = vi.fn()
const apollo = { mutate, query } as unknown as ApolloClient
const uploadFetch = vi.fn<typeof fetch>()
const upload = {
    uploadURL: 'https://uploads.example.test/presigned',
    s3Key: 'server-generated.pdf',
    contentType: 'application/pdf',
}

beforeEach(() => {
    vi.clearAllMocks()
    mutate.mockResolvedValue({ data: { generateUploadURL: upload } })
    query.mockResolvedValue({ data: { fetchUploadScanStatus: 'CLEAN' } })
    uploadFetch.mockResolvedValue({ ok: true, status: 200 } as Response)
    vi.stubGlobal('fetch', uploadFetch)
})
afterEach(() => vi.unstubAllGlobals())

for (const bucket of ['HEALTH_PLAN_DOCS', 'QUESTION_ANSWER_DOCS'] as const) {
    it(`uploads to ${bucket} with the backend's exact signed headers`, async () => {
        const client = newApiS3Client(buckets, apollo)
        const file = new File(['file bytes'], 'My Report.PDF', {
            type: 'application/pdf',
        })
        expect(await client.uploadFile(file, bucket)).toBe(
            'server-generated.pdf'
        )
        expect(mutate).toHaveBeenCalledWith({
            mutation: GenerateUploadUrlDocument,
            variables: {
                input: {
                    fileName: 'My Report.PDF',
                    fileType: 'PDF',
                    bucketName: bucket,
                    includeContentDisposition: true,
                },
            },
        })
        expect(uploadFetch).toHaveBeenCalledWith(upload.uploadURL, {
            method: 'PUT',
            body: file,
            credentials: 'omit',
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename=My%20Report.PDF',
                'If-None-Match': '*',
            },
        })
    })
}

it.each([
    ['CSV', 'text/csv'],
    ['XLTM', 'application/vnd.ms-excel.template.macroEnabled.12'],
    ['XLAM', 'application/vnd.ms-excel.addin.macroEnabled.12'],
])(
    'preserves %s uploads and uses the backend MIME type',
    async (fileType, contentType) => {
        const name = `report.${fileType.toLowerCase()}`
        mutate.mockResolvedValue({
            data: {
                generateUploadURL: { ...upload, s3Key: name, contentType },
            },
        })
        const client = newApiS3Client(buckets, apollo)
        expect(
            await client.uploadFile(
                new File(['bytes'], name),
                'HEALTH_PLAN_DOCS'
            )
        ).toBe(name)
        expect(mutate.mock.calls[0][0].variables.input.fileType).toBe(fileType)
        expect(uploadFetch.mock.calls[0][1]?.headers).toEqual(
            expect.objectContaining({ 'Content-Type': contentType })
        )
    }
)

it.each([409, 412])(
    'does not retry an overwrite on HTTP %s',
    async (status) => {
        uploadFetch.mockResolvedValue({ ok: false, status } as Response)
        const client = newApiS3Client(buckets, apollo)
        await expect(
            client.uploadFile(
                new File(['bytes'], 'report.pdf'),
                'HEALTH_PLAN_DOCS'
            )
        ).rejects.toThrow(`File upload failed (${status})`)
        expect(uploadFetch).toHaveBeenCalledTimes(1)
        expect(mutate).toHaveBeenCalledTimes(1)
    }
)

it('does not send bytes without a backend upload contract', async () => {
    mutate.mockResolvedValue({ data: null })
    const client = newApiS3Client(buckets, apollo)
    await expect(
        client.uploadFile(new File(['bytes'], 'report.pdf'), 'HEALTH_PLAN_DOCS')
    ).rejects.toThrow('Missing upload contract')
    expect(uploadFetch).not.toHaveBeenCalled()
})

it.each([new Error('Upload not authorized'), null, 'rejected'])(
    'normalizes rejected URL requests without uploading',
    async (error) => {
        mutate.mockRejectedValue(error)
        const client = newApiS3Client(buckets, apollo)
        await expect(
            client.uploadFile(
                new File(['bytes'], 'report.pdf'),
                'HEALTH_PLAN_DOCS'
            )
        ).rejects.toThrow('Unable to request an upload URL')
        expect(uploadFetch).not.toHaveBeenCalled()
    }
)

it('normalizes fetch network errors for the existing auth recheck path', async () => {
    uploadFetch.mockRejectedValue(
        new TypeError(`Failed to fetch ${upload.uploadURL}`)
    )
    const client = newApiS3Client(buckets, apollo)
    await expect(
        client.uploadFile(new File(['bytes'], 'report.pdf'), 'HEALTH_PLAN_DOCS')
    ).resolves.toEqual({
        code: 'NETWORK_ERROR',
        message: 'Error saving file to the cloud.',
    })
    expect(recordJSException).toHaveBeenCalledWith(
        expect.objectContaining({
            message: 'File upload network request failed',
        })
    )
})

it('does not start an upload that was already cancelled', async () => {
    const controller = new AbortController()
    controller.abort()
    const client = newApiS3Client(buckets, apollo)
    await expect(
        client.uploadFile(
            new File(['bytes'], 'report.pdf'),
            'HEALTH_PLAN_DOCS',
            controller.signal
        )
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(mutate).not.toHaveBeenCalled()
    expect(uploadFetch).not.toHaveBeenCalled()
})

it('cancels waiting for a URL even when GraphQL transport ignores the signal', async () => {
    mutate.mockReturnValue(new Promise(() => {}))
    const controller = new AbortController()
    const client = newApiS3Client(buckets, apollo)
    const pending = client.uploadFile(
        new File(['bytes'], 'report.pdf'),
        'HEALTH_PLAN_DOCS',
        controller.signal
    )
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(uploadFetch).not.toHaveBeenCalled()
    expect(recordJSException).not.toHaveBeenCalled()
})

it('passes cancellation to the presigned PUT', async () => {
    const controller = new AbortController()
    const client = newApiS3Client(buckets, apollo)
    await client.uploadFile(
        new File(['bytes'], 'report.pdf'),
        'HEALTH_PLAN_DOCS',
        controller.signal
    )
    expect(uploadFetch.mock.calls[0][1]?.signal).toBe(controller.signal)
})

it('preserves legacy S3 references and parses their object key', async () => {
    const client = newApiS3Client(buckets, apollo)
    const reference = await client.getS3URL(
        'server-generated.pdf',
        'Report.pdf',
        'HEALTH_PLAN_DOCS'
    )
    expect(reference).toBe(
        's3://documents-test/server-generated.pdf/Report.pdf'
    )
    expect(client.getKey(reference)).toBe('server-generated.pdf')
    expect(client.getKey('not-an-s3-url')).toBeNull()
})

for (const bucket of ['HEALTH_PLAN_DOCS', 'QUESTION_ANSWER_DOCS'] as const) {
    it(`requests fresh download URLs for ${bucket}`, async () => {
        query
            .mockResolvedValueOnce({
                data: { fetchS3DownloadURL: 'https://example.test/first' },
            })
            .mockResolvedValueOnce({
                data: { fetchS3DownloadURL: 'https://example.test/second' },
            })
        const client = newApiS3Client(buckets, apollo)
        expect(await client.getURL('file.pdf', bucket)).toBe(
            'https://example.test/first'
        )
        expect(await client.getURL('file.pdf', bucket)).toBe(
            'https://example.test/second'
        )
        expect(query).toHaveBeenCalledTimes(2)
        expect(query).toHaveBeenLastCalledWith({
            query: FetchS3DownloadUrlDocument,
            variables: { input: { key: 'file.pdf', bucketName: bucket } },
            fetchPolicy: 'no-cache',
        })
    })
}

it('rejects missing download URLs', async () => {
    query.mockResolvedValue({ data: null })
    await expect(
        newApiS3Client(buckets, apollo).getURL('file.pdf', 'HEALTH_PLAN_DOCS')
    ).rejects.toThrow('Missing document download URL')
})

it('does not expose request details in download errors', async () => {
    query.mockRejectedValue(new Error(upload.uploadURL))
    await expect(
        newApiS3Client(buckets, apollo).getURL('file.pdf', 'HEALTH_PLAN_DOCS')
    ).rejects.toThrow('Unable to request a document download URL')
    expect(recordJSException).toHaveBeenCalledWith(
        expect.objectContaining({
            message: 'Unable to request a document download URL',
        })
    )
})

describe('API scan polling', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    for (const bucket of [
        'HEALTH_PLAN_DOCS',
        'QUESTION_ANSWER_DOCS',
    ] as const) {
        it(`checks ${bucket} by object key before saving a document`, async () => {
            const scan = newApiS3Client(buckets, apollo).scanFile(
                'new.pdf',
                bucket
            )
            expect(query).not.toHaveBeenCalled()
            await vi.advanceTimersByTimeAsync(3000)
            await expect(scan).resolves.toBeUndefined()
            expect(query).toHaveBeenCalledWith({
                query: FetchUploadScanStatusDocument,
                variables: { input: { key: 'new.pdf', bucketName: bucket } },
                fetchPolicy: 'no-cache',
            })
            expect(vi.getTimerCount()).toBe(0)
            expect(uploadFetch).not.toHaveBeenCalled()
        })
    }

    it('polls PENDING without caching and resolves only when CLEAN', async () => {
        query
            .mockResolvedValueOnce({
                data: { fetchUploadScanStatus: 'PENDING' },
            })
            .mockResolvedValueOnce({
                data: { fetchUploadScanStatus: 'PENDING' },
            })
            .mockResolvedValueOnce({ data: { fetchUploadScanStatus: 'CLEAN' } })
        const scan = newApiS3Client(buckets, apollo).scanFile(
            'new.pdf',
            'HEALTH_PLAN_DOCS'
        )
        await vi.advanceTimersByTimeAsync(3000)
        expect(query).toHaveBeenCalledTimes(1)
        await vi.advanceTimersByTimeAsync(1000)
        expect(query).toHaveBeenCalledTimes(2)
        await vi.advanceTimersByTimeAsync(2000)
        await expect(scan).resolves.toBeUndefined()
        expect(query).toHaveBeenCalledTimes(3)
        expect(vi.getTimerCount()).toBe(0)
    })

    it.each([
        ['INFECTED', 'File failed malware scanning'],
        ['ERROR', 'File could not be scanned'],
        [undefined, 'Missing file scan status'],
    ])(
        'rejects a %s result instead of marking the upload complete',
        async (status, message) => {
            query.mockResolvedValue({ data: { fetchUploadScanStatus: status } })
            const scan = newApiS3Client(buckets, apollo).scanFile(
                'new.pdf',
                'HEALTH_PLAN_DOCS'
            )
            const rejection = expect(scan).rejects.toThrow(message)
            await vi.advanceTimersByTimeAsync(3000)
            await rejection
            expect(query).toHaveBeenCalledTimes(1)
            expect(vi.getTimerCount()).toBe(0)
        }
    )

    it('rejects lookup/network errors rather than treating them as PENDING', async () => {
        query.mockRejectedValue(new Error('S3 lookup failed'))
        const scan = newApiS3Client(buckets, apollo).scanFile(
            'new.pdf',
            'HEALTH_PLAN_DOCS'
        )
        const rejection = expect(scan).rejects.toThrow(
            'Unable to check file scan status'
        )
        await vi.advanceTimersByTimeAsync(3000)
        await rejection
        expect(query).toHaveBeenCalledTimes(1)
        expect(vi.getTimerCount()).toBe(0)
    })

    it('times out persistent PENDING results with a bounded backoff', async () => {
        query.mockResolvedValue({ data: { fetchUploadScanStatus: 'PENDING' } })
        const scan = newApiS3Client(buckets, apollo).scanFile(
            'new.pdf',
            'HEALTH_PLAN_DOCS'
        )
        const rejection = expect(scan).rejects.toMatchObject({
            name: 'TimeoutError',
        })
        await vi.advanceTimersByTimeAsync(SCAN_TIMEOUT_MS)
        await rejection
        expect(query.mock.calls.length).toBeLessThan(10)
        expect(vi.getTimerCount()).toBe(0)
    })

    it('also bounds an in-flight GraphQL request that never settles', async () => {
        query.mockReturnValue(new Promise(() => {}))
        const scan = newApiS3Client(buckets, apollo).scanFile(
            'new.pdf',
            'HEALTH_PLAN_DOCS'
        )
        const rejection = expect(scan).rejects.toMatchObject({
            name: 'TimeoutError',
        })
        await vi.advanceTimersByTimeAsync(SCAN_TIMEOUT_MS)
        await rejection
        expect(query).toHaveBeenCalledTimes(1)
        expect(vi.getTimerCount()).toBe(0)
    })

    it('cancels the initial delay without querying or logging a failure', async () => {
        const controller = new AbortController()
        const scan = newApiS3Client(buckets, apollo).scanFile(
            'new.pdf',
            'HEALTH_PLAN_DOCS',
            controller.signal
        )
        const rejection = expect(scan).rejects.toMatchObject({
            name: 'AbortError',
        })
        controller.abort()
        await rejection
        expect(query).not.toHaveBeenCalled()
        expect(vi.getTimerCount()).toBe(0)
        expect(recordJSException).not.toHaveBeenCalled()
    })

    it('cancels an in-flight scan read and starts no further polls', async () => {
        query.mockReturnValue(new Promise(() => {}))
        const controller = new AbortController()
        const scan = newApiS3Client(buckets, apollo).scanFile(
            'new.pdf',
            'HEALTH_PLAN_DOCS',
            controller.signal
        )
        const rejection = expect(scan).rejects.toMatchObject({
            name: 'AbortError',
        })
        await vi.advanceTimersByTimeAsync(3000)
        controller.abort()
        await rejection
        await vi.advanceTimersByTimeAsync(SCAN_TIMEOUT_MS)
        expect(query).toHaveBeenCalledTimes(1)
        expect(vi.getTimerCount()).toBe(0)
    })
})

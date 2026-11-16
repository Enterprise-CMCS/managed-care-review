import type { ApolloClient } from '@apollo/client'
import { Storage } from 'aws-amplify'
import { GenerateUploadUrlDocument } from '../gen/gqlClient'
import { newAmplifyS3Client } from './s3Amplify'

vi.mock('aws-amplify', () => ({ Storage: { get: vi.fn(), put: vi.fn() } }))
vi.mock('@mc-review/helpers', () => ({
    parseKey: vi.fn(),
    parseErrorToError: (err: unknown) =>
        err instanceof Error ? err : new Error(String(err)),
}))
vi.mock('@mc-review/otel', () => ({
    recordJSException: vi.fn(),
    recordJSExceptionWithContext: vi.fn(),
}))

const buckets = {
    HEALTH_PLAN_DOCS: 'documents-test',
    QUESTION_ANSWER_DOCS: 'questions-test',
}
const mutate = vi.fn()
const apollo = { mutate } as unknown as ApolloClient
const uploadFetch = vi.fn<typeof fetch>()
const upload = {
    uploadURL: 'https://uploads.example.test/presigned',
    s3Key: 'server-generated.pdf',
    contentType: 'application/pdf',
}

beforeEach(() => {
    vi.clearAllMocks()
    mutate.mockResolvedValue({ data: { generateUploadURL: upload } })
    uploadFetch.mockResolvedValue({ ok: true, status: 200 } as Response)
    vi.stubGlobal('fetch', uploadFetch)
})
afterEach(() => vi.unstubAllGlobals())

for (const bucket of ['HEALTH_PLAN_DOCS', 'QUESTION_ANSWER_DOCS'] as const) {
    it(`uploads to ${bucket} through the backend without browser AWS credentials`, async () => {
        const client = newAmplifyS3Client(buckets, apollo)
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
        expect(Storage.put).not.toHaveBeenCalled()
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
                generateUploadURL: {
                    ...upload,
                    s3Key: name,
                    contentType,
                },
            },
        })
        const client = newAmplifyS3Client(buckets, apollo)
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
    'does not fall back to unconditional upload on HTTP %s',
    async (status) => {
        uploadFetch.mockResolvedValue({ ok: false, status } as Response)
        const client = newAmplifyS3Client(buckets, apollo)
        await expect(
            client.uploadFile(
                new File(['bytes'], 'report.pdf'),
                'HEALTH_PLAN_DOCS'
            )
        ).rejects.toThrow(`File upload failed (${status})`)
        expect(uploadFetch).toHaveBeenCalledTimes(1)
        expect(mutate).toHaveBeenCalledTimes(1)
        expect(Storage.put).not.toHaveBeenCalled()
    }
)

it('does not send bytes without a backend upload contract', async () => {
    mutate.mockResolvedValue({ data: null })
    const client = newAmplifyS3Client(buckets, apollo)
    await expect(
        client.uploadFile(new File(['bytes'], 'report.pdf'), 'HEALTH_PLAN_DOCS')
    ).rejects.toThrow('Missing upload contract')
    expect(uploadFetch).not.toHaveBeenCalled()
})

it('does not upload after the backend rejects the request', async () => {
    mutate.mockRejectedValue(new Error('Upload not authorized'))
    const client = newAmplifyS3Client(buckets, apollo)
    await expect(
        client.uploadFile(new File(['bytes'], 'report.pdf'), 'HEALTH_PLAN_DOCS')
    ).rejects.toThrow('Upload not authorized')
    expect(uploadFetch).not.toHaveBeenCalled()
    expect(Storage.put).not.toHaveBeenCalled()
})

it('normalizes fetch network errors for the existing auth recheck path', async () => {
    uploadFetch.mockRejectedValue(new TypeError('Failed to fetch'))
    const client = newAmplifyS3Client(buckets, apollo)
    await expect(
        client.uploadFile(new File(['bytes'], 'report.pdf'), 'HEALTH_PLAN_DOCS')
    ).resolves.toEqual({
        code: 'NETWORK_ERROR',
        message: 'Error saving file to the cloud.',
    })
})

it('leaves the existing Amplify download path unchanged', async () => {
    vi.mocked(Storage.get).mockResolvedValue('https://example.test/download')
    const client = newAmplifyS3Client(buckets, apollo)
    expect(await client.getURL('file.pdf', 'QUESTION_ANSWER_DOCS')).toBe(
        'https://example.test/download'
    )
    expect(Storage.get).toHaveBeenCalledWith('file.pdf', {
        bucket: buckets.QUESTION_ANSWER_DOCS,
        expires: 3600,
    })
    expect(mutate).not.toHaveBeenCalled()
})

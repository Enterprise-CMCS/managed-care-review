import type { ApolloClient } from '@apollo/client'
import { newApiS3Client } from './s3Api'
import { FetchUploadScanStatusDocument } from '../gen/gqlClient'

const buckets = {
    HEALTH_PLAN_DOCS: 'documents',
    QUESTION_ANSWER_DOCS: 'questions',
}

function setup() {
    const query = vi.fn()
    const mutate = vi.fn()
    const client = { query, mutate } as unknown as ApolloClient
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    return { query, mutate, fetchMock, s3: newApiS3Client(buckets, client) }
}

afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
})

it('uses upload authorization and server MIME type for PUT, preserving the stable locator', async () => {
    const { s3, mutate, fetchMock } = setup()
    const file = new File(['document'], 'report name.docx') // browser MIME may be empty
    mutate.mockResolvedValue({
        data: {
            generateUploadURL: {
                uploadURL: 'https://uploads.example/put',
                s3Key: 'id.docx',
                contentType: 'application/docx',
            },
        },
    })
    expect(await s3.uploadFile(file, 'QUESTION_ANSWER_DOCS')).toBe('id.docx')
    expect(mutate.mock.calls[0][0].variables.input).toEqual({
        fileName: file.name,
        fileType: 'DOCX',
        bucketName: 'QUESTION_ANSWER_DOCS',
        includeContentDisposition: true,
    })
    expect(fetchMock).toHaveBeenCalledWith(
        'https://uploads.example/put',
        expect.objectContaining({
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': 'application/docx',
                'Content-Disposition':
                    'attachment; filename=report%20name.docx',
            },
        })
    )
    const locator = await s3.getS3URL(
        'id.docx',
        file.name,
        'QUESTION_ANSWER_DOCS'
    )
    expect(locator).toBe('s3://questions/id.docx/report name.docx')
    expect(s3.getKey(locator)).toBe('id.docx')
})

it.each(['XLTM', 'XLAM'])(
    'preserves accepted %s spreadsheet uploads',
    async (fileType) => {
        const { s3, mutate } = setup()
        mutate.mockResolvedValue({
            data: {
                generateUploadURL: {
                    uploadURL: 'https://uploads.example/put',
                    s3Key: 'spreadsheet',
                    contentType: 'application/vnd.ms-excel',
                },
            },
        })
        await s3.uploadFile(
            new File(['file'], `sheet.${fileType.toLowerCase()}`),
            'HEALTH_PLAN_DOCS'
        )
        expect(mutate.mock.calls[0][0].variables.input.fileType).toBe(fileType)
    }
)

it('rejects a failed PUT rather than reporting a successful upload', async () => {
    const { s3, mutate, fetchMock } = setup()
    mutate.mockResolvedValue({
        data: {
            generateUploadURL: {
                uploadURL: 'https://uploads.example/put',
                s3Key: 'id.pdf',
                contentType: 'application/pdf',
            },
        },
    })
    fetchMock.mockResolvedValue({ ok: false, status: 403 })
    await expect(
        s3.uploadFile(new File(['file'], 'report.pdf'), 'HEALTH_PLAN_DOCS')
    ).rejects.toThrow('Unable to upload')
})

it('polls fresh GraphQL status until clean without downloading the object', async () => {
    vi.useFakeTimers()
    const { s3, query, fetchMock } = setup()
    query
        .mockResolvedValueOnce({ data: { fetchUploadScanStatus: 'PENDING' } })
        .mockResolvedValueOnce({ data: { fetchUploadScanStatus: 'CLEAN' } })
    const scan = s3.scanFile('id.pdf', 'HEALTH_PLAN_DOCS')
    await vi.runAllTimersAsync()
    await expect(scan).resolves.toBeUndefined()
    expect(query).toHaveBeenCalledTimes(2)
    expect(query).toHaveBeenCalledWith(
        expect.objectContaining({
            query: FetchUploadScanStatusDocument,
            fetchPolicy: 'no-cache',
            variables: {
                input: { key: 'id.pdf', bucketName: 'HEALTH_PLAN_DOCS' },
            },
        })
    )
    expect(fetchMock).not.toHaveBeenCalled()
})

it.each(['INFECTED', 'ERROR', undefined])(
    'does not complete for a nonclean scan result: %s',
    async (status) => {
        const { s3, query } = setup()
        query.mockResolvedValue({ data: { fetchUploadScanStatus: status } })
        await expect(
            s3.scanFile('id.pdf', 'HEALTH_PLAN_DOCS')
        ).rejects.toThrow()
        expect(query).toHaveBeenCalledTimes(1)
    }
)

it('bounds pending retries and lets the user retry after a timeout', async () => {
    vi.useFakeTimers()
    const { s3, query } = setup()
    query.mockResolvedValue({ data: { fetchUploadScanStatus: 'PENDING' } })
    const assertion = expect(
        s3.scanFile('id.pdf', 'HEALTH_PLAN_DOCS')
    ).rejects.toThrow('timed out')
    await vi.runAllTimersAsync()
    await assertion
    expect(query).toHaveBeenCalledTimes(12)
})

it('times out and aborts a stalled status request', async () => {
    vi.useFakeTimers()
    const { s3, query } = setup()
    let requestSignal: AbortSignal | undefined
    query.mockImplementation(
        ({ context }) =>
            new Promise((_resolve, reject) => {
                requestSignal = context.fetchOptions.signal
                requestSignal?.addEventListener(
                    'abort',
                    () => reject(requestSignal?.reason),
                    { once: true }
                )
            })
    )
    const assertion = expect(
        s3.scanFile('id.pdf', 'HEALTH_PLAN_DOCS')
    ).rejects.toThrow('timed out')
    await vi.advanceTimersByTimeAsync(60_000)
    await assertion
    expect(requestSignal?.aborted).toBe(true)
    expect(query).toHaveBeenCalledTimes(1)
})

it('cancels polling during the backoff delay', async () => {
    vi.useFakeTimers()
    const { s3, query } = setup()
    query.mockResolvedValue({ data: { fetchUploadScanStatus: 'PENDING' } })
    const controller = new AbortController()
    const assertion = expect(
        s3.scanFile('id.pdf', 'HEALTH_PLAN_DOCS', controller.signal)
    ).rejects.toThrow()
    await vi.advanceTimersByTimeAsync(0)
    controller.abort()
    await assertion
    await vi.runAllTimersAsync()
    expect(query).toHaveBeenCalledTimes(1)
})

it('obtains short-lived document and ZIP URLs from GraphQL', async () => {
    const { s3, query, fetchMock } = setup()
    query.mockResolvedValue({
        data: { fetchS3DownloadURL: 'https://downloads.example/signed' },
    })
    expect(await s3.getURL('allusers/id.pdf', 'QUESTION_ANSWER_DOCS')).toBe(
        'https://downloads.example/signed'
    )
    expect(
        await s3.getZipURL(
            'zips/rates/id/rate-documents.zip',
            'HEALTH_PLAN_DOCS'
        )
    ).toBe('https://downloads.example/signed')
    expect(query.mock.calls[1][0].variables.input.key).toBe(
        'zips/rates/id/rate-documents.zip'
    )
    expect(fetchMock).not.toHaveBeenCalled()
})

import { renderHook } from '@testing-library/react'
import type { GenericDocument } from '../gen/gqlClient'
import { useDocument } from './useDocument'

const { getKey, getURL } = vi.hoisted(() => ({
    getKey: vi.fn(),
    getURL: vi.fn(),
}))
vi.mock('../contexts/S3Context', () => ({
    useS3: () => ({ getKey, getURL }),
}))

describe('useDocument canonical object keys', () => {
    const document: GenericDocument = {
        name: 'report.pdf',
        s3URL: 's3://bucket/legacy.pdf/report.pdf',
        s3Key: 'allusers/canonical.pdf',
        sha256: 'document-sha',
    }
    beforeEach(() => {
        vi.clearAllMocks()
        getKey.mockReturnValue('legacy.pdf')
        getURL.mockResolvedValue('https://example.com/download')
    })

    it('preserves the canonical key alongside a server-provided download URL', async () => {
        const { result } = renderHook(() => useDocument())
        expect(
            await result.current.getDocumentsWithS3KeyAndUrl(
                [{ ...document, downloadURL: 'https://example.com/server' }],
                'HEALTH_PLAN_DOCS'
            )
        ).toEqual([
            {
                ...document,
                downloadURL: 'https://example.com/server',
                url: 'https://example.com/server',
            },
        ])
        expect(getKey).not.toHaveBeenCalled()
        expect(getURL).not.toHaveBeenCalled()
    })

    it('fetches a missing download URL with the canonical key, not the legacy reference', async () => {
        const { result } = renderHook(() => useDocument())
        const documents = await result.current.getDocumentsWithS3KeyAndUrl(
            [document],
            'HEALTH_PLAN_DOCS'
        )
        expect(documents[0]).toMatchObject({
            s3Key: document.s3Key,
            url: 'https://example.com/download',
        })
        expect(getURL).toHaveBeenCalledWith(document.s3Key, 'HEALTH_PLAN_DOCS')
        expect(getKey).not.toHaveBeenCalled()
    })

    it.each([undefined, null, ''])(
        'retains legacy parsing when the stored key is %s',
        async (s3Key) => {
            const { result } = renderHook(() => useDocument())
            const documents = await result.current.getDocumentsWithS3KeyAndUrl(
                [{ ...document, s3Key }],
                'HEALTH_PLAN_DOCS'
            )
            expect(documents[0]).toMatchObject({ s3Key: 'legacy.pdf' })
            expect(getURL).toHaveBeenCalledWith(
                'legacy.pdf',
                'HEALTH_PLAN_DOCS'
            )
        }
    )
})

import { act, renderHook } from '@testing-library/react'
import { useFileUpload } from './useFileUpload'
import type { FileItemT } from '../components/FileUpload/FileProcessor/FileProcessor'

describe('pre-save document validation', () => {
    const document: FileItemT = {
        id: 'upload',
        name: 'report.pdf',
        key: 'report.pdf',
        s3URL: 's3://bucket/report.pdf/report.pdf',
        sha256: 'document-sha',
        status: 'UPLOAD_COMPLETE',
    }

    it.each([
        'PENDING',
        'SCANNING',
        'UPLOAD_ERROR',
        'SCANNING_ERROR',
        'DUPLICATE_NAME_ERROR',
    ] as const)(
        'does not persist a %s document, even if its S3 reference already exists',
        async (status) => {
            const { result } = renderHook(() => useFileUpload())
            await act(async () => {
                await result.current.onFileItemsUpdate({
                    fileItems: [{ ...document, status }],
                })
            })
            expect(result.current.hasValidFiles).toBe(false)
            expect(result.current.fileUploadError).toBeDefined()
            expect(result.current.cleanFileItemsBeforeSave()).toEqual([])
        }
    )

    it('preserves metadata only after upload and scan complete', async () => {
        const { result } = renderHook(() => useFileUpload())
        await act(async () => {
            await result.current.onFileItemsUpdate({ fileItems: [document] })
        })
        expect(result.current.hasValidFiles).toBe(true)
        expect(result.current.hasLoadingFiles).toBe(false)
        expect(result.current.fileUploadError).toBeUndefined()
        expect(result.current.cleanFileItemsBeforeSave()).toEqual([document])
    })
})

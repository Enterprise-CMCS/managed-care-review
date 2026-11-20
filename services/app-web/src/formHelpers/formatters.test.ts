import type { FileItemT } from '../components/FileUpload/FileProcessor/FileProcessor'
import { formatDocumentsForForm, formatDocumentsForGQL } from './formatters'

describe('formatDocumentsForGQL', () => {
    const document: FileItemT = {
        id: 'upload',
        name: 'report.pdf',
        key: 'report.pdf',
        s3URL: 's3://bucket/report.pdf/report.pdf',
        sha256: 'document-sha',
        status: 'UPLOAD_COMPLETE',
        dateAdded: new Date('2026-01-01T00:00:00Z'),
    }

    it.each([
        'PENDING',
        'SCANNING',
        'UPLOAD_ERROR',
        'SCANNING_ERROR',
        'DUPLICATE_NAME_ERROR',
    ] as const)(
        'excludes %s items even when the S3 reference and hash exist',
        (status) => {
            expect(formatDocumentsForGQL([{ ...document, status }])).toEqual([])
        }
    )

    it('preserves completed document metadata without mutating the item', () => {
        const before = { ...document }
        expect(formatDocumentsForGQL([document])).toEqual([
            {
                name: document.name,
                s3URL: document.s3URL,
                sha256: document.sha256,
                dateAdded: document.dateAdded,
            },
        ])
        expect(document).toEqual(before)
    })

    it.each(['s3URL', 'sha256'] as const)(
        'still rejects a completed item without %s',
        (field) => {
            expect(
                formatDocumentsForGQL([{ ...document, [field]: undefined }])
            ).toEqual([])
        }
    )

    it('does not restore a pending scan as complete after a draft round trip', () => {
        const saved = formatDocumentsForGQL([
            document,
            {
                ...document,
                id: 'pending',
                name: 'pending.pdf',
                status: 'SCANNING',
            },
        ])
        const restored = formatDocumentsForForm({
            documents: saved,
            getKey: () => 'report.pdf',
        })
        expect(restored).toHaveLength(1)
        expect(restored[0]).toMatchObject({
            name: document.name,
            status: 'UPLOAD_COMPLETE',
        })
    })
})

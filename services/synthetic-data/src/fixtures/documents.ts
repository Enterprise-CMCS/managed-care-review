import { readFile } from 'node:fs/promises'
import type { UploadFileType } from '../gen/gqlClient'

export type DocumentFixture = {
    name: string
    fileType: UploadFileType
    contentType: string
    sourceFile: string
}

export const documentFixtures = {
    pdf: {
        small: {
            name: 'mock-s.pdf',
            fileType: 'PDF',
            contentType: 'application/pdf',
            sourceFile: 'mock-s.pdf',
        },
        medium: {
            name: 'mock-m.pdf',
            fileType: 'PDF',
            contentType: 'application/pdf',
            sourceFile: 'mock-m.pdf',
        },
    },
    csv: {
        small: {
            name: 'mock-s.csv',
            fileType: 'CSV',
            contentType: 'text/csv',
            sourceFile: 'mock-s.csv',
        },
        medium: {
            name: 'mock-m.csv',
            fileType: 'CSV',
            contentType: 'text/csv',
            sourceFile: 'mock-m.csv',
        },
    },
    doc: {
        small: {
            name: 'mock-s.doc',
            fileType: 'DOC',
            contentType: 'application/msword',
            sourceFile: 'mock-s.doc',
        },
        medium: {
            name: 'mock-m.doc',
            fileType: 'DOC',
            contentType: 'application/msword',
            sourceFile: 'mock-m.doc',
        },
    },
    docx: {
        small: {
            name: 'mock-s.docx',
            fileType: 'DOCX',
            contentType:
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            sourceFile: 'mock-s.docx',
        },
        medium: {
            name: 'mock-m.docx',
            fileType: 'DOCX',
            contentType:
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            sourceFile: 'mock-m.docx',
        },
    },
    xls: {
        small: {
            name: 'mock-s.xls',
            fileType: 'XLS',
            contentType: 'application/vnd.ms-excel',
            sourceFile: 'mock-s.xls',
        },
        medium: {
            name: 'mock-m.xls',
            fileType: 'XLS',
            contentType: 'application/vnd.ms-excel',
            sourceFile: 'mock-m.xls',
        },
    },
    xlsx: {
        small: {
            name: 'mock-s.xlsx',
            fileType: 'XLSX',
            contentType:
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            sourceFile: 'mock-s.xlsx',
        },
        medium: {
            name: 'mock-m.xlsx',
            fileType: 'XLSX',
            contentType:
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            sourceFile: 'mock-m.xlsx',
        },
    },
} as const satisfies Record<
    string,
    Record<'small' | 'medium', DocumentFixture>
>

export async function loadDocumentFixture(
    fixture: DocumentFixture
): Promise<Uint8Array> {
    return readFile(
        new URL(
            `../../../postgres/files/${fixture.sourceFile}`,
            import.meta.url
        )
    )
}

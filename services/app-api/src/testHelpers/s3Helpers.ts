import type { S3ClientT } from '../s3'
import { parseKey } from '@mc-review/helpers'

export const testS3Client: () => S3ClientT = () => {
    let fakeKeyID = 0

    return {
        uploadFile: async (file: File): Promise<string> => {
            return `fakeS3Key${fakeKeyID++}-${file.name}`
        },
        scanFile: async (filename: string): Promise<void> => {
            return
        },
        getKey: (s3URL: string) => {
            const key = parseKey(s3URL)
            return key instanceof Error ? null : key
        },
        getS3URL: async (s3key: string, fileName: string): Promise<string> => {
            return `s3://fake-bucket/${s3key}/${fileName}`
        },
        getURL: async (s3key: string): Promise<string> => {
            return `https://fakes3.com/${s3key}?sekret=deadbeef`
        },
        getUploadURL: async (s3key: string, fileName: string): Promise<string> => {
            return `s3://fake-bucket/${s3key}/${fileName}`
        },
        getZipURL: async (s3key: string): Promise<string> => {
            return `https://fakes3.com/${s3key}?sekret=deadbeef`
        },
        generateDocumentZip: async (
            documents,
            outputPath,
            options
        ): Promise<{ s3URL: string; sha256: string } | Error> => {
            return {
                s3URL: `s3://fake-bucket/${outputPath}`,
                sha256: 'fake sha',
            }
        },
    }
}

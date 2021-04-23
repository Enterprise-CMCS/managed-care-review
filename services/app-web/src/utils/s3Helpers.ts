import { S3ClientT } from '../s3'

export const testS3Client: S3ClientT = {
    uploadFile: async (file: File): Promise<string> => {
        return `${Date.now()}-${file.name}`
    },
    deleteFile: async (filename: string): Promise<string> => {
        return `${Date.now()}-${filename}`
    },
    getS3URL: async (s3key: string, fileName: string): Promise<string> => {
            return `fakes3://fake-bucket/${s3key}/${fileName}`
    },
    getURL: async (s3key: string): Promise<string> => {
        return `https://fakes3.com/${s3key}?sekret=deadbeef`
    },
}

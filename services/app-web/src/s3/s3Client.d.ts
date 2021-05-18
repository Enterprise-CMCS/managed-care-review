import { S3Error } from './s3Error'

export type S3ClientT = {
    uploadFile: (file: File) => Promise<string | S3Error>
    deleteFile: (key: string) => Promise<void | S3Error>
    getKey: (S3URL: string) => string
    getURL: (key: string) => Promise<string>
    getS3URL:(key: string, filename: string) => Promise<string>
}

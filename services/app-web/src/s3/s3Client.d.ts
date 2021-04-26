import { S3Error } from './s3Error'

export type S3ClientT = {
    uploadFile: (f: File) => Promise<string | S3Error>
    deleteFile: (key: string) => Promise<void | S3Error>
    getURL: (s3key: string) => Promise<string>
    getS3URL:(s3ke4y: string, filename: string) => Promise<string>
}

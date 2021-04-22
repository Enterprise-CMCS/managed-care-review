import { S3Error } from './s3Error'

export type S3ClientT = {
    uploadFile: (f: File) => Promise<string | S3Error>
    getURL: (s3key: string) => Promise<string>
}

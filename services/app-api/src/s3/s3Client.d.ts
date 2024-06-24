import type { BucketShortName } from './s3Amplify'
import type { S3Error } from './s3Error'

export type S3ClientT = {
    uploadFile: (
        file: File,
        bucket: BucketShortName
    ) => Promise<string | S3Error>
    deleteFile: (
        key: string,
        bucket: BucketShortName
    ) => Promise<void | S3Error>
    scanFile: (key: string, bucket: BucketShortName) => Promise<void | S3Error>
    getKey: (S3URL: string) => string | null
    getURL: (key: string, bucket: BucketShortName) => Promise<string>
    getS3URL: (
        key: string,
        filename: string,
        bucket: BucketShortName
    ) => Promise<string>
    getBulkDlURL: (
        keys: string[],
        filename: string,
        bucket: BucketShortName
    ) => Promise<string | Error>
}

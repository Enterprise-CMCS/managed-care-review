import type { S3Error } from './s3Error'

export type BucketShortName = 'HEALTH_PLAN_DOCS' | 'QUESTION_ANSWER_DOCS'
export type S3BucketConfigType = { [K in BucketShortName]: string }

export type S3ClientT = {
    uploadFile: (
        file: File,
        bucket: BucketShortName,
        signal?: AbortSignal
    ) => Promise<string | S3Error>
    scanFile: (
        key: string,
        bucket: BucketShortName,
        signal?: AbortSignal
    ) => Promise<void | S3Error>
    getKey: (S3URL: string) => string | null
    getURL: (key: string, bucket: BucketShortName) => Promise<string>
    getS3URL: (
        key: string,
        filename: string,
        bucket: BucketShortName
    ) => Promise<string>
}

import type { BucketShortName } from './helpers'
import type { S3Error } from './s3Error'
import type { GenerateDocumentZipFunctionType } from '../zip'

export type S3ClientT = {
    uploadFile: (
        file: File,
        bucket: BucketShortName
    ) => Promise<string | S3Error>
    scanFile: (key: string, bucket: BucketShortName) => Promise<void | S3Error>
    /**
     * Read GuardDuty's verdict in AWS. The local adapter returns CLEAN without
     * scanning, so local results cannot be used to verify malware protection.
     */
    getScanStatus: (
        key: string,
        bucket: BucketShortName
    ) => Promise<'PENDING' | 'CLEAN' | 'INFECTED' | 'ERROR'>
    getKey: (S3URL: string) => string | null
    getURL: (
        key: string,
        bucket: BucketShortName,
        expiresIn?: number
    ) => Promise<string>
    getUploadURL: (
        key: string,
        bucket: BucketShortName,
        contentType: string,
        expiresIn: number,
        fileName?: string
    ) => Promise<string>
    getZipURL: (key: string, bucket: BucketShortName) => Promise<string>
    getS3URL: (
        key: string,
        filename: string,
        bucket: BucketShortName
    ) => Promise<string>
    generateDocumentZip?: GenerateDocumentZipFunctionType
}

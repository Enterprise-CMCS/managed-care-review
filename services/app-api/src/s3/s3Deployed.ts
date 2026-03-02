import {
    S3Client,
    GetObjectCommand,
    PutObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { parseKey } from './helpers'
import type { BucketShortName, S3BucketConfigType } from './helpers'

import type { S3ClientT } from './s3Client'
import type { S3Error } from './s3Error'

// newDeployedS3Client is used for calling S3 from app-api
// app-api does not use amplify for interfacing with S3
export function newDeployedS3Client(
    bucketConfig: S3BucketConfigType,
    region: string
): S3ClientT {
    const s3Client = new S3Client({ region })

    return {
        uploadFile: async (
            file: File,
            bucket: BucketShortName
        ): Promise<string | S3Error> => {
            const filename = `${Date.now()}-${file.name}`
            const command = new PutObjectCommand({
                Bucket: bucketConfig[bucket],
                Key: filename,
                Body: file,
            })

            try {
                if (file.name === 'upload_error.pdf') {
                    const err: S3Error = {
                        code: 'NETWORK_ERROR',
                        message: 'Network error',
                    }
                    throw err
                }
                await s3Client.send(command)

                return filename
            } catch (err) {
                if (err.code === 'NetworkingError') {
                    return {
                        code: 'NETWORK_ERROR',
                        message: 'Error saving file to the cloud.',
                    }
                }

                console.info('Log: Unexpected Error putting file to S3', err)
                return err
            }
        },
        getUploadURL: async (
            key: string,
            bucket: BucketShortName,
            contentType: string,
            expiresIn: number
        ): Promise<string> => {
            const command = new PutObjectCommand({
                Bucket: bucketConfig[bucket],
                Key: `allusers/${key}`,
                ContentType: contentType,
            })
            return getSignedUrl(s3Client, command, { expiresIn })
        },
        scanFile: async (
            s3Key: string,
            bucket: BucketShortName
        ): Promise<void | S3Error> => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve()
                }, 1000)
            })
        },
        getKey: (s3URL: string) => {
            const key = parseKey(s3URL)
            return key instanceof Error ? null : key
        },
        getS3URL: async (
            s3key: string,
            filename: string,
            bucket: BucketShortName
        ): Promise<string> => {
            // ignore what's passed in as the bucket and use whats in LocalS3Client
            return `s3://${bucketConfig[bucket]}/${s3key}/${filename}`
        },
        getURL: async (
            s3key: string,
            bucket: BucketShortName,
            expiresIn?: number
        ): Promise<string> => {
            // If the key already has a known path prefix (migrated docs store full path),
            // use it as-is. Otherwise, prepend 'allusers/' for backwards compatibility with
            // old docs that fall back to parseKey() which returns just the UUID part.
            const fullKey =
                s3key.startsWith('allusers/') || s3key.startsWith('zips/')
                    ? s3key
                    : `allusers/${s3key}`

            const command = new GetObjectCommand({
                Bucket: bucketConfig[bucket],
                Key: fullKey,
            })

            // Create the presigned URL.
            const signedUrl = await getSignedUrl(s3Client, command, {
                expiresIn: expiresIn || 3600,
            })
            return signedUrl
        },
        getZipURL: async (
            s3key: string,
            bucket: BucketShortName
        ): Promise<string> => {
            // zip files have paths like zips/contracts/{contractRevisionId}/contract-documents.zip
            const command = new GetObjectCommand({
                Bucket: bucketConfig[bucket],
                Key: s3key,
            })

            // Create the presigned URL.
            const signedUrl = await getSignedUrl(s3Client, command, {
                expiresIn: 3600,
            })
            return signedUrl
        },
    }
}

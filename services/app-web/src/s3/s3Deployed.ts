import {
    S3Client,
    GetObjectCommand,
    PutObjectCommand,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { parseKey } from '../common-code/s3URLEncoding'
import { BucketShortName, S3BucketConfigType } from './s3Amplify'

import type { S3ClientT } from './s3Client'
import type { S3Error } from './s3Error'

// newDeployedS3Client is used for calling S3 from app-api
// app-api does not use amplify for interfacing with S3
export function newDeployedS3Client(
    bucketConfig: S3BucketConfigType,
): S3ClientT {
    const s3Client = new S3Client({ region: 'us-east-1' })

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

        deleteFile: async (
            s3Key: string,
            bucket: BucketShortName
        ): Promise<void | S3Error> => {
            const command = new DeleteObjectCommand({
                Bucket: bucketConfig[bucket],
                Key: s3Key,
            })
            try {
                await s3Client.send(command)

                return
            } catch (err) {
                if (err.code === 'NetworkingError') {
                    return {
                        code: 'NETWORK_ERROR',
                        message: 'Error saving file to the cloud.',
                    }
                }

                console.info('Log: Unexpected Error deleting file on S3', err)
                return err
            }
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
            bucket: BucketShortName
        ): Promise<string> => {
            // uploads from app-web are prepended with '/allusers'
            // hardcode the 'allusers' into the key so that the path matches
            const command = new GetObjectCommand({
                Bucket: bucketConfig[bucket],
                Key: `allusers/${s3key}`,
            })

            // Create the presigned URL.
            const signedUrl = await getSignedUrl(s3Client, command)
            return signedUrl
        },
        getBulkDlURL: async (
            keys: string[],
            filename: string,
            bucket: BucketShortName
        ): Promise<string | Error> => {
            const command = new GetObjectCommand({
                Bucket: bucketConfig[bucket],
                Key: filename,
            })
            const signedUrl = await getSignedUrl(s3Client, command)
            return signedUrl
        },
    }
}

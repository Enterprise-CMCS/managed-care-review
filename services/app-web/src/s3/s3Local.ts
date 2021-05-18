import AWS from 'aws-sdk'

import { S3ClientT } from './s3Client'
import type { S3Error } from './s3Error'

export function newLocalS3Client(
    endpoint: string,
    bucketName: string
): S3ClientT {
    const s3Client = new AWS.S3({
        s3ForcePathStyle: true,
        apiVersion: '2006-03-01',
        accessKeyId: 'S3RVER', // This specific key is required when working offline
        secretAccessKey: 'S3RVER', // That's pre-set by serverless-s3-offline
        params: { Bucket: bucketName },
        endpoint: new AWS.Endpoint(endpoint),
    })

    return {
        uploadFile: async (file: File): Promise<string | S3Error> => {
            const filename = `${Date.now()}-${file.name}`

            try {
                await s3Client
                    .putObject({
                        Bucket: bucketName,
                        Key: filename,
                        Body: file,
                    })
                    .promise()

                return filename
            } catch (err) {
                if (err.code === 'NetworkingError') {
                    return {
                        code: 'NETWORK_ERROR',
                        message: 'Error saving file to the cloud.',
                    }
                }

                console.log('Log: Unexpected Error putting file to S3', err)
                return err
            }
        },

        deleteFile: async (s3Key: string): Promise<void | S3Error> => {
            try {
                 await s3Client
                    .deleteObject({
                        Bucket: bucketName,
                        Key: s3Key,
                    })
                    .promise()

                return 
            } catch (err) {
                if (err.code === 'NetworkingError') {
                    return {
                        code: 'NETWORK_ERROR',
                        message: 'Error saving file to the cloud.',
                    }
                }

                console.log('Log: Unexpected Error deleting file on S3', err)
                return err
            }
        },
        getKey: (s3URL: string) => {
            const match = s3URL.match(/s3?:\/\/[a-z0-9]+\/([a-z0-9]+)\/[a-z0-9]+$/g)
            if (!match) return 'NOT_VALID_S3_URL'
            return match[0]
        },
        getS3URL: async (s3key: string, filename: string,): Promise<string> => {
            // ignore what's passed in as the bucket and use whats in LocalS3Client
            return `s3://${bucketName}/${s3key}/${filename}`
        },
        getURL: async (s3key: string): Promise<string> => {
            const params = { Key: s3key }
            return s3Client.getSignedUrl('getObject', params)
        },
    }
}

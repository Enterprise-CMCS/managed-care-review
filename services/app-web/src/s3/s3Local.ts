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
                const putResult = await s3Client
                    .putObject({
                        Bucket: bucketName,
                        Key: filename,
                        Body: file,
                    })
                    .promise()

                console.log('data this worked', putResult)
                return filename
            } catch (err) {
                if (err.code === 'NetworkingError') {
                    return {
                        code: 'NETWORK_ERROR',
                        message: 'Error saving file to the cloud.',
                    }
                }

                console.log('Unexpected Error putting file to S3', err)
                throw err
            }
        },
        getURL: async (s3key: string): Promise<string> => {
            const params = { Key: s3key }
            return s3Client.getSignedUrl('getObject', params)
        },
    }
}

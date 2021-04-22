import AWS from 'aws-sdk'

import { S3ClientT } from './s3'

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
        uploadFile: async (file: File): Promise<string> => {
            const filename = `${Date.now()}-${file.name}`

            return new Promise((resolve, reject) => {
                s3Client.putObject(
                    {
                        Bucket: bucketName,
                        Key: filename,
                        Body: file,
                    },
                    (err, data) => {
                        if (err) {
                            console.log('ERROR::', err)
                            reject(err)
                            return
                        }
                        console.log('data this worked', data)
                        resolve(filename)
                    }
                )
            })
        },
        getURL: async (s3key: string): Promise<string> => {
            const params = { Key: s3key }
            return s3Client.getSignedUrl('getObject', params)
        },
    }
}

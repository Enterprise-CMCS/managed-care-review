import { Storage } from 'aws-amplify'

import type { S3ClientT } from './s3Client'
import type { S3Error } from './s3Error'

type s3PutResponse = {
    key: string
}

function assertIsS3PutResponse(val: unknown): asserts val is s3PutResponse {
    if (typeof val === 'object' && val && !('key' in val)) {
        throw new Error('We dont have a key in this response')
    }
}

export function newAmplifyS3Client(): S3ClientT {
    return {
        uploadFile: async (file: File): Promise<string | S3Error> => {
            const filename = `${Date.now()}-${file.name}`

            try {
                const stored = await Storage.vault.put(filename, file, {
                    contentType: file.type,
                })

                assertIsS3PutResponse(stored)

                return stored.key
            } catch (err) {
                if (err.name === 'Error' && err.message === 'Network Error') {
                    console.log('Error uploading file', err)
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
            const result = await Storage.vault.get(s3key)
            if (typeof result === 'string') {
                return result
            } else {
                throw new Error(
                    `Didn't get a string back from s3.get. We should have to use a different config for that.`
                )
            }
        },
    }
}

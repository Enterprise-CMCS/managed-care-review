import { Storage } from 'aws-amplify'
import { parseKey } from '../common-code/s3URLEncoding'
import type { S3ClientT } from './s3Client'
import type { S3Error } from './s3Error'

const waitFor = (delay: 1000) =>
    new Promise((resolve) => setTimeout(resolve, delay))

function retry(
    fn: () => Promise<void | S3Error>,
    retries = 5,
    err = null
): Promise<void | S3Error> {
    if (!retries) {
        return Promise.reject(err)
    }
    return fn().catch((err) => retry(fn, retries - 1, err))
}

type s3PutResponse = {
    key: string
}

function assertIsS3PutResponse(val: unknown): asserts val is s3PutResponse {
    if (typeof val === 'object' && val && !('key' in val)) {
        throw new Error('We dont have a key in this response')
    }
}

export function newAmplifyS3Client(bucketName: string): S3ClientT {
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

        deleteFile: async (filename: string): Promise<void | S3Error> => {
            try {
                await Storage.vault.remove(filename)
                return
            } catch (err) {
                if (err.name === 'Error' && err.message === 'Network Error') {
                    console.log('Error deleting file', err)
                    return {
                        code: 'NETWORK_ERROR',
                        message: 'Error deleting file from the cloud.',
                    }
                }

                console.log('Unexpected Error deleting file from S3', err)
                throw err
            }
        },
        /*  
            Poll for scanning completion
            - We poll up to 60 times, with 1 second pause, for scanning completion. This means each file could be up to 1 min in a loading state.
            - While the file is scanning, returns 403. When scanning is complete, the resource returns 200
        */
        scanFile: async (filename: string): Promise<void | S3Error> => {
            try {
                await retry(async () => {
                    await waitFor(1000)
                    await Storage.vault.get(filename, {
                        download: true,
                    })
                }, 60)
                return
            } catch (err) {
                if (err.name === 'Error' && err.message === 'Network Error') {
                    return {
                        code: 'NETWORK_ERROR',
                        message: 'Error fetching file from the cloud.',
                    }
                }
                throw err
            }
        },
        getS3URL: async (key: string, fileName: string): Promise<string> => {
            return `s3://${bucketName}/${key}/${fileName}`
        },
        getKey: (s3URL: string) => {
            const key = parseKey(s3URL)
            return key instanceof Error ? null : key
        },
        getURL: async (key: string): Promise<string> => {
            const result = await Storage.vault.get(key)
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

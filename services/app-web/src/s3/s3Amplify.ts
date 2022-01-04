import { parseKey } from '../common-code/s3URLEncoding'
import { Storage, API } from 'aws-amplify'
import { v4 as uuidv4 } from 'uuid'

import type { S3ClientT } from './s3Client'
import type { S3Error } from './s3Error'

// TYPES AND TYPE GUARDS
type s3PutError = {
    name: string
    message: string
}

type s3PutResponse = {
    key: string
}

function assertIsS3PutResponse(val: unknown): asserts val is s3PutResponse {
    if (typeof val === 'object' && val && !('key' in val)) {
        throw new Error('We dont have a key in this response')
    }
}

function assertIsS3PutError(val: unknown): asserts val is s3PutError {
    if (
        typeof val === 'object' &&
        val &&
        !('name' in val) &&
        !('message' in val)
    ) {
        throw new Error('We dont have a name and message in this response')
    }
}

// MAIN
function newAmplifyS3Client(bucketName: string): S3ClientT {
    return {
        uploadFile: async (file: File): Promise<string | S3Error> => {
            const uuid = uuidv4()
            const ext = file.name.split('.').pop()

            try {
                const stored = await Storage.put(`${uuid}.${ext}`, file, {
                    contentType: file.type,
                    contentDisposition: `attachment; filename=${file.name}`,
                })

                assertIsS3PutResponse(stored)
                return stored.key
            } catch (err) {
                assertIsS3PutError(err)
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
                await Storage.remove(filename)
                return
            } catch (err) {
                assertIsS3PutError(err)
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
            - We start polling after 20s, which is the estimated time it takes scanning to start to resolve.
            - In total, each file could be up to 40 sec in a loading state (20s wait for scanning + 8s of retries + extra time for uploading and scanning api requests to resolve)
            - While the file is scanning, returns 403. When scanning is complete, the resource returns 200
        */
        scanFile: async (filename: string): Promise<void | S3Error> => {
            try {
                await waitFor(20000)
                await retryWithBackoff(async () => {
                    await Storage.get(filename, {
                        download: true,
                    })
                })
                return
            } catch (err) {
                assertIsS3PutError(err)
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
            const result = await Storage.get(key)
            if (typeof result === 'string') {
                return result
            } else {
                throw new Error(
                    `Didn't get a string back from s3.get. We should have to use a different config for that.`
                )
            }
        },
        getBulkDlURL: async (
            keys: string[],
            filename: string
        ): Promise<string | Error> => {
            const prependedKeys = keys.map((key) => `allusers/${key}`)
            const prependedFilename = `allusers/${filename}`

            const zipRequestParams = {
                keys: prependedKeys,
                bucket: bucketName,
                zipFileName: prependedFilename,
            }

            try {
                await API.post('api', '/zip', {
                    response: true,
                    body: zipRequestParams,
                })
            } catch (err) {
                return new Error('Could not get a bulk DL URL: ' + err)
            }

            return await Storage.get(filename)
        },
    }
}

// HELPERS
const waitFor = (delay = 1000) =>
    new Promise((resolve) => setTimeout(resolve, delay))

/* 
 * Retry an asynchronous S3 function using exponential backoff approach
 * @param fn - async S3 function to retry recursively
 * @maxRetries - retr until this limit
 * @retryCount - counter of retries already attempted
 * @err - S3Error if Promise.rejects
 
 * Retries will continue until fn succeeds (Promise.resolve) or until maxRetries limit is reached
 * increase the time elapsed between retries in each cycle by order of 2^n; 
 * e.g. with default values for retryCount and maxRetries, attempt the request at 1s, 2s, 4s.
*/
const retryWithBackoff = async (
    fn: () => Promise<void | S3Error>,
    retryCount = 0,
    maxRetries = 6,
    err: null | S3Error = null
): Promise<void | S3Error> => {
    if (retryCount > maxRetries) {
        return Promise.reject(err)
    }
    const nextDelay = 2 ** retryCount * 1000
    await waitFor(nextDelay)
    return fn().catch((err) =>
        retryWithBackoff(fn, retryCount + 1, maxRetries, err)
    )
}

export { newAmplifyS3Client }

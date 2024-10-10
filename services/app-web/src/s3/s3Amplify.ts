import { parseKey } from '../common-code/s3URLEncoding'
import { Storage, API } from 'aws-amplify'
import { v4 as uuidv4 } from 'uuid'
import type { S3ClientT } from './s3Client'
import type { S3Error } from './s3Error'
import { recordJSException, recordJSExceptionWithContext } from '../otelHelpers'

// TYPES AND TYPE GUARDS
type s3PutError = {
    name: string
    message: string
}

type s3PutResponse = {
    key: string
}

type BucketShortName = 'HEALTH_PLAN_DOCS' | 'QUESTION_ANSWER_DOCS'
type S3BucketConfigType = {
    [K in BucketShortName]: string
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
// TODO clarify what gets3URL versus getURL are doing
function newAmplifyS3Client(bucketConfig: S3BucketConfigType): S3ClientT {
    return {
        uploadFile: async (
            file: File,
            bucket: BucketShortName
        ): Promise<string | S3Error> => {
            const uuid = uuidv4()
            const ext = file.name.split('.').pop()?.toLowerCase() || ''
            //encode file names and decoding done in bulk_downloads.ts
            const fileName = encodeURIComponent(file.name)
            try {
                const stored = await Storage.put(`${uuid}.${ext}`, file, {
                    bucket: bucketConfig[bucket],
                    contentType: file.type,
                    contentDisposition: `attachment; filename=${fileName}`,
                })
                assertIsS3PutResponse(stored)
                return stored.key
            } catch (err) {
                recordJSException(err)
                assertIsS3PutError(err)
                if (err.name === 'Error' && err.message === 'Network Error') {
                    console.info('Error uploading file', err)
                    return {
                        code: 'NETWORK_ERROR',
                        message: 'Error saving file to the cloud.',
                    }
                }

                console.info('Unexpected Error putting file to S3', err)
                throw err
            }
        },

        deleteFile: async (
            filename: string,
            bucket: BucketShortName
        ): Promise<void | S3Error> => {
            console.info(`Attempting to tag file as deleted: ${filename}`)
            let metadata

            try {
                const result = await Storage.getProperties(filename)
                metadata = result.metadata
            } catch (getPropertiesError) {
                console.error('Error in getProperties:', getPropertiesError)
                throw getPropertiesError
            }

            try {
                // Add or update the 'deleted' tag
                const updatedMetadata = {
                    ...metadata,
                    'x-amz-meta-deleted': 'true',
                    'x-amz-meta-deletedAt': new Date().toISOString(),
                }
                console.info(
                    `updatedMetadata: ${JSON.stringify(updatedMetadata)}`
                )

                // Update the file's metadata
                try {
                    const copyResult = await Storage.copy(
                        { key: filename },
                        { key: 'deleted/' + filename },
                        { metadata: updatedMetadata }
                    )
                    console.info(`File tagged: ${JSON.stringify(copyResult)}`)
                } catch (copyError) {
                    console.error('Error in Storage.copy:', copyError)
                    throw copyError
                }

                try {
                    console.info(`deleting file from allusers/: ${filename}`)
                    const delResult = await Storage.remove(filename)
                    console.info(`delete result: ${delResult}`)
                } catch (err) {
                    console.error('Error in Storage.delete: ${err}')
                    throw err
                }
                return
            } catch (err) {
                console.error(
                    `Error in tagFileAsDeleted for ${filename}: ${err}`
                )
                assertIsS3PutError(err)
                recordJSException(err)
                if (err.name === 'Error' && err.message === 'Network Error') {
                    console.info('Error deleting file', err)
                    return {
                        code: 'NETWORK_ERROR',
                        message: 'Error deleting file from the cloud.',
                    }
                }
                throw err
            }
        },
        /*  
            Poll for scanning completion
            - We start polling after 3s, which is the estimated time it takes scanning to start to resolve.
            - We then retry with an exponential backoff for up to 15s. Most scans take < 1s, plus some additional time for tagging and response, so by 15s a file should be tagged.
            - While the file is scanning, returns 403. When scanning is complete, the resource returns 200
        */
        scanFile: async (
            filename: string,
            bucket: BucketShortName
        ): Promise<void | S3Error> => {
            try {
                await waitFor(3000)
                try {
                    await retryWithBackoff(async () => {
                        await Storage.get(filename, {
                            bucket: bucketConfig[bucket],
                            download: true,
                        })
                    })
                } catch (err) {
                    recordJSExceptionWithContext(
                        err,
                        'scanFile.retryWithBackoff'
                    )
                    throw err
                }
                return
            } catch (err) {
                assertIsS3PutError(err)
                recordJSException(err)
                if (err.name === 'Error' && err.message === 'Network Error') {
                    return {
                        code: 'NETWORK_ERROR',
                        message: 'Error fetching file from the cloud.',
                    }
                }
                throw err
            }
        },
        getS3URL: async (
            key: string,
            fileName: string,
            bucket: BucketShortName
        ): Promise<string> => {
            return `s3://${bucketConfig[bucket]}/${key}/${fileName}`
        },
        getKey: (s3URL: string) => {
            const key = parseKey(s3URL)
            return key instanceof Error ? null : key
        },
        getURL: async (
            key: string,
            bucket: BucketShortName
        ): Promise<string> => {
            const result = await Storage.get(key, {
                bucket: bucketConfig[bucket],
                expires: 3600,
            })
            if (typeof result === 'string') {
                return result
            } else {
                const error = new Error(
                    `Didn't get a string back from s3.get. We should have to use a different config for that.`
                )
                recordJSException(error)
                throw error
            }
        },
        getBulkDlURL: async (
            keys: string[],
            filename: string,
            bucket: BucketShortName
        ): Promise<string | Error> => {
            const prependedKeys = keys.map((key) => `allusers/${key}`)
            const prependedFilename = `allusers/${filename}`

            const zipRequestParams = {
                keys: prependedKeys,
                bucket: bucketConfig[bucket],
                zipFileName: prependedFilename,
            }

            try {
                await API.post('api', '/zip', {
                    response: true,
                    body: zipRequestParams,
                })
            } catch (err) {
                const error = new Error('Could not get a bulk DL URL: ' + err)
                recordJSException(error)
                return error
            }

            return await Storage.get(filename, { expires: 3600 })
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
    maxRetries = 4,
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
export type { BucketShortName, S3BucketConfigType }

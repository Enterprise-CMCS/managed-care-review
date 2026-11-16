import { parseKey, parseErrorToError } from '@mc-review/helpers'
import { Storage } from 'aws-amplify'
import type { ApolloClient } from '@apollo/client'
import {
    GenerateUploadUrlDocument,
    type UploadFileType,
} from '../gen/gqlClient'
import type { S3ClientT } from './s3Client'
import type { S3Error } from './s3Error'
import {
    recordJSException,
    recordJSExceptionWithContext,
} from '@mc-review/otel'

// TYPES AND TYPE GUARDS
type s3PutError = {
    name: string
    message: string
}

type BucketShortName = 'HEALTH_PLAN_DOCS' | 'QUESTION_ANSWER_DOCS'
type S3BucketConfigType = {
    [K in BucketShortName]: string
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
function newAmplifyS3Client(
    bucketConfig: S3BucketConfigType,
    apolloClient: ApolloClient
): S3ClientT {
    return {
        uploadFile: async (
            file: File,
            bucket: BucketShortName
        ): Promise<string | S3Error> => {
            const ext = file.name.split('.').pop()?.toUpperCase() || ''
            try {
                const { data } = await apolloClient.mutate({
                    mutation: GenerateUploadUrlDocument,
                    variables: {
                        input: {
                            fileName: file.name,
                            fileType: ext as UploadFileType,
                            bucketName: bucket,
                            includeContentDisposition: true,
                        },
                    },
                })
                const upload = data?.generateUploadURL
                if (!upload) throw new Error('Missing upload contract')
                // Upload bytes directly using the backend's exact-key capability,
                // not browser AWS credentials. A retry cannot replace this key.
                const response = await fetch(upload.uploadURL, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': upload.contentType,
                        'Content-Disposition': `attachment; filename=${encodeURIComponent(file.name)}`,
                        'If-None-Match': '*',
                    },
                    body: file,
                    credentials: 'omit',
                })
                if (!response.ok) {
                    throw new Error(`File upload failed (${response.status})`)
                }
                return upload.s3Key
            } catch (err) {
                recordJSException(parseErrorToError(err))
                assertIsS3PutError(err)
                if (
                    err.name === 'NetworkingError' ||
                    err.name === 'TimeoutError' ||
                    [
                        'Network Error',
                        'Failed to fetch',
                        'fetch failed',
                        'NetworkError when attempting to fetch resource.',
                        'Load failed',
                    ].includes(err.message)
                ) {
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
                        parseErrorToError(err),
                        'scanFile.retryWithBackoff'
                    )
                    throw err
                }
                return
            } catch (err) {
                assertIsS3PutError(err)
                recordJSException(parseErrorToError(err))
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
        getZipURL: async (
            s3key: string,
            bucket: BucketShortName
        ): Promise<string> => {
            try {
                const result = await Storage.get(s3key, {
                    bucket: bucketConfig[bucket],
                    expires: 3600,
                })

                //Maybe overkill?
                if (typeof result !== 'string') {
                    const error = new Error(
                        `Unexpected result type from Storage.get for key: ${s3key}`
                    )
                    recordJSException(error)
                    throw error
                }

                return result
            } catch (err) {
                const error = new Error(`Could not retrieve zip URL: ${err}`)
                recordJSException(error)
                throw error
            }
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

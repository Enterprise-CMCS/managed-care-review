import { parseKey } from '@mc-review/helpers'
import type { ApolloClient } from '@apollo/client'
import {
    FetchS3DownloadUrlDocument,
    FetchUploadScanStatusDocument,
    GenerateUploadUrlDocument,
    type UploadFileType,
} from '../gen/gqlClient'
import type { BucketShortName, S3BucketConfigType, S3ClientT } from './s3Client'
import { recordJSException } from '@mc-review/otel'

// Covers both polling delays and time spent waiting for a status response.
export const SCAN_TIMEOUT_MS = 60_000

function throwIfAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
        throw (
            signal.reason ??
            new DOMException('File operation cancelled', 'AbortError')
        )
    }
}

// The legacy Amplify GraphQL transport does not forward AbortSignal. Stop
// waiting on cancellation even when the in-flight read itself cannot be aborted.
function abortable<T>(request: Promise<T>, signal?: AbortSignal): Promise<T> {
    if (!signal) return request
    return new Promise<T>((resolve, reject) => {
        const onAbort = () => {
            signal.removeEventListener('abort', onAbort)
            reject(
                signal.reason ??
                    new DOMException('File operation cancelled', 'AbortError')
            )
        }
        signal.addEventListener('abort', onAbort, { once: true })
        void request.then(
            (value) => {
                signal.removeEventListener('abort', onAbort)
                resolve(value)
            },
            (error) => {
                signal.removeEventListener('abort', onAbort)
                reject(error)
            }
        )
        if (signal.aborted) onAbort()
    })
}

// Removing a file cancels the sleep as well as the request, so no later poll starts.
function waitFor(delay: number, signal: AbortSignal): Promise<void> {
    throwIfAborted(signal)
    return new Promise((resolve, reject) => {
        const onAbort = () => {
            clearTimeout(timer)
            reject(
                signal.reason ??
                    new DOMException('File operation cancelled', 'AbortError')
            )
        }
        const timer = setTimeout(() => {
            signal.removeEventListener('abort', onAbort)
            resolve()
        }, delay)
        signal.addEventListener('abort', onAbort, { once: true })
    })
}

function storageError(message: string): Error {
    // Request errors can contain signed URLs. Report only our fixed messages.
    const error = new Error(message)
    recordJSException(error)
    return error
}

/**
 * Browser storage adapter: Apollo obtains upload/download URLs and scan status;
 * fetch transfers file bytes directly to S3. Apollo keeps its existing auth path.
 */
export function newApiS3Client(
    bucketConfig: S3BucketConfigType,
    apolloClient: ApolloClient
): S3ClientT {
    return {
        uploadFile: async (file, bucket, signal) => {
            // Get a server-generated key and exact signing contract before sending bytes.
            throwIfAborted(signal)
            let upload
            try {
                const { data } = await abortable(
                    apolloClient.mutate({
                        mutation: GenerateUploadUrlDocument,
                        variables: {
                            input: {
                                fileName: file.name,
                                fileType: (file.name
                                    .split('.')
                                    .pop()
                                    ?.toUpperCase() || '') as UploadFileType,
                                bucketName: bucket,
                                includeContentDisposition: true,
                            },
                        },
                    }),
                    signal
                )
                upload = data?.generateUploadURL
            } catch {
                throwIfAborted(signal)
                throw storageError('Unable to request an upload URL')
            }
            if (!upload?.uploadURL || !upload.s3Key || !upload.contentType) {
                throw storageError('Missing upload contract')
            }
            throwIfAborted(signal)

            // These headers must match the signed contract. The precondition
            // makes the key create-only, so retries cannot replace a scanned file.
            let response: Response
            try {
                response = await fetch(upload.uploadURL, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': upload.contentType,
                        'Content-Disposition': `attachment; filename=${encodeURIComponent(file.name)}`,
                        'If-None-Match': '*',
                    },
                    body: file,
                    credentials: 'omit',
                    ...(signal ? { signal } : {}),
                })
            } catch {
                throwIfAborted(signal)
                recordJSException(
                    new Error('File upload network request failed')
                )
                return {
                    code: 'NETWORK_ERROR',
                    message: 'Error saving file to the cloud.',
                }
            }
            if (!response.ok) {
                // A repeated/conflicting PUT must never fall back to overwrite.
                throw storageError(`File upload failed (${response.status})`)
            }
            throwIfAborted(signal)
            return upload.s3Key
        },

        scanFile: async (key, bucket, signal) => {
            // Uploads are scanned before any document row is saved, so poll by
            // object key. One controller combines caller cancellation and timeout.
            throwIfAborted(signal)
            const controller = new AbortController()
            const cancel = () =>
                controller.abort(
                    signal?.reason ??
                        new DOMException(
                            'File operation cancelled',
                            'AbortError'
                        )
                )
            signal?.addEventListener('abort', cancel, { once: true })
            const timeout = setTimeout(
                () =>
                    controller.abort(
                        new DOMException('File scan timed out', 'TimeoutError')
                    ),
                SCAN_TIMEOUT_MS
            )
            try {
                // Give GuardDuty time to start, then back off only while PENDING.
                await waitFor(3000, controller.signal)
                let delay = 1000
                while (true) {
                    throwIfAborted(controller.signal)
                    let status
                    try {
                        const { data } = await abortable(
                            apolloClient.query({
                                query: FetchUploadScanStatusDocument,
                                variables: {
                                    input: { key, bucketName: bucket },
                                },
                                // A cached PENDING result would hide scan completion.
                                fetchPolicy: 'no-cache',
                            }),
                            controller.signal
                        )
                        status = data?.fetchUploadScanStatus
                    } catch {
                        throwIfAborted(controller.signal)
                        throw storageError('Unable to check file scan status')
                    }
                    throwIfAborted(controller.signal)
                    // Only an explicit clean verdict completes the upload.
                    // Errors and missing results are never treated as scan success.
                    switch (status) {
                        case 'CLEAN':
                            return
                        case 'INFECTED':
                            throw storageError('File failed malware scanning')
                        case 'ERROR':
                            throw storageError('File could not be scanned')
                        case 'PENDING':
                            await waitFor(delay, controller.signal)
                            delay = Math.min(delay * 2, 15_000)
                            break
                        default:
                            throw storageError('Missing file scan status')
                    }
                }
            } finally {
                clearTimeout(timeout)
                signal?.removeEventListener('abort', cancel)
            }
        },

        getKey: (s3URL) => {
            const key = parseKey(s3URL)
            return key instanceof Error ? null : key
        },

        // Persisted metadata, not a fetchable URL. Preserve the legacy shape so
        // existing records and key parsers continue to agree.
        getS3URL: async (key, fileName, bucket) =>
            `s3://${bucketConfig[bucket]}/${key}/${fileName}`,

        // Ask the API each time: a cached signed URL may already be expired.
        getURL: async (key: string, bucket: BucketShortName) => {
            let url
            try {
                const { data } = await apolloClient.query({
                    query: FetchS3DownloadUrlDocument,
                    variables: { input: { key, bucketName: bucket } },
                    fetchPolicy: 'no-cache',
                })
                url = data?.fetchS3DownloadURL
            } catch {
                throw storageError('Unable to request a document download URL')
            }
            if (!url) throw storageError('Missing document download URL')
            return url
        },
    }
}

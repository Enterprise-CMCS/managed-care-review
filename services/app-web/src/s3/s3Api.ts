import type { ApolloClient } from '@apollo/client'
import { parseKey } from '@mc-review/helpers'
import {
    FetchS3DownloadUrlDocument,
    FetchUploadScanStatusDocument,
    GenerateUploadUrlDocument,
} from '../gen/gqlClient'
import type { UploadFileType } from '../gen/gqlClient'
import type { S3ClientT } from './s3Client'
import type { BucketShortName, S3BucketConfigType } from './s3Amplify'
import { ScanTimeoutError } from './s3Error'

function waitForScan(delay: number, signal?: AbortSignal): Promise<void> {
    signal?.throwIfAborted()
    return new Promise((resolve, reject) => {
        const onAbort = () => {
            clearTimeout(timer)
            reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'))
        }
        const timer = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort)
            resolve()
        }, delay)
        signal?.addEventListener('abort', onAbort, { once: true })
    })
}

/** Uses the existing authenticated GraphQL transport, not browser AWS credentials. */
export function newApiS3Client(
    bucketConfig: S3BucketConfigType,
    client: ApolloClient
): S3ClientT {
    const getURL = async (
        key: string,
        bucket: BucketShortName
    ): Promise<string> => {
        const result = await client.query({
            query: FetchS3DownloadUrlDocument,
            variables: { input: { key, bucketName: bucket } },
            fetchPolicy: 'no-cache',
        })
        if (!result.data?.fetchS3DownloadURL) {
            throw new Error('Unable to obtain a download URL')
        }
        return result.data.fetchS3DownloadURL
    }

    return {
        uploadFile: async (file, bucket, signal) => {
            signal?.throwIfAborted()
            const extension = file.name.split('.').pop()?.toUpperCase()
            if (
                ![
                    'PDF',
                    'DOC',
                    'DOCX',
                    'XLS',
                    'XLSX',
                    'XLSM',
                    'XLTM',
                    'XLAM',
                    'CSV',
                ].includes(extension ?? '')
            ) {
                throw new Error('Unsupported upload file type')
            }
            const result = await client.mutate({
                mutation: GenerateUploadUrlDocument,
                variables: {
                    input: {
                        fileName: file.name,
                        fileType: extension as UploadFileType,
                        bucketName: bucket,
                        includeContentDisposition: true,
                    },
                },
                context: { fetchOptions: { signal } },
            })
            const upload = result.data?.generateUploadURL
            if (!upload) throw new Error('Unable to obtain an upload URL')
            signal?.throwIfAborted()
            const response = await fetch(upload.uploadURL, {
                method: 'PUT',
                headers: {
                    'Content-Type': upload.contentType,
                    'Content-Disposition': `attachment; filename=${encodeURIComponent(file.name)}`,
                },
                body: file,
                signal,
            })
            if (!response.ok) throw new Error('Unable to upload file')
            return upload.s3Key
        },
        scanFile: async (key, bucket, callerSignal) => {
            callerSignal?.throwIfAborted()
            const controller = new AbortController()
            const signal = controller.signal
            const onAbort = () => controller.abort(callerSignal?.reason)
            callerSignal?.addEventListener('abort', onAbort, { once: true })
            // Bound the whole operation, including a stalled GraphQL request.
            const timeout = setTimeout(
                () => controller.abort(new ScanTimeoutError()),
                60_000
            )
            try {
                // No object download: poll only the small GraphQL status response.
                for (let attempt = 0; attempt < 12; attempt++) {
                    signal.throwIfAborted()
                    const result = await client.query({
                        query: FetchUploadScanStatusDocument,
                        variables: { input: { key, bucketName: bucket } },
                        fetchPolicy: 'no-cache',
                        context: { fetchOptions: { signal } },
                    })
                    signal.throwIfAborted()
                    const status = result.data?.fetchUploadScanStatus
                    if (status === 'CLEAN') return
                    if (status === 'INFECTED')
                        throw new Error('File failed virus scanning')
                    if (status !== 'PENDING')
                        throw new Error('Unable to verify virus scan result')
                    if (attempt < 11) {
                        await waitForScan(
                            Math.min(1000 * 2 ** attempt, 5000),
                            signal
                        )
                    }
                }
                throw new ScanTimeoutError()
            } catch (error) {
                if (signal.aborted) throw signal.reason
                throw error
            } finally {
                clearTimeout(timeout)
                callerSignal?.removeEventListener('abort', onAbort)
            }
        },
        getURL,
        getZipURL: getURL,
        getKey: (s3URL) => {
            const key = parseKey(s3URL)
            return key instanceof Error ? null : key
        },
        // Persist the same stable locator as the old adapter, never a signed URL.
        getS3URL: async (key, fileName, bucket) =>
            `s3://${bucketConfig[bucket]}/${key}/${fileName}`,
    }
}

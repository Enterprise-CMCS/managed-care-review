import type { PutObjectCommandInput } from '@aws-sdk/client-s3'
import {
    S3Client,
    GetObjectCommand,
    HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { Readable, PassThrough } from 'stream'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import Archiver from 'archiver'

const s3 = new S3Client({ region: 'us-east-1' })

// Configuration constants
const BATCH_SIZE = 10 // Process 10 files at a time
const FILE_TIMEOUT = 60000 // 1 minute timeout per file
const MAX_TOTAL_SIZE = 500 * 1024 * 1024 // 500MB limit
const MEMORY_LOG_INTERVAL = 5000 // Log memory usage every 5 seconds
const STREAM_CHUNK_SIZE = 1024 * 1024 // 1MB chunks for backpressure

interface S3BulkDownloadRequest {
    bucket: string
    keys: string[]
    zipFileName: string
}

// Wrap a stream with a timeout
const streamWithTimeout = (
    stream: Readable,
    timeout: number
): Promise<void> => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('Stream timeout'))
            stream.destroy()
        }, timeout)

        stream.on('end', () => {
            clearTimeout(timer)
            resolve()
        })

        stream.on('error', (err) => {
            clearTimeout(timer)
            reject(err)
        })
    })
}

// log memory usage
const startMemoryLogging = () => {
    return setInterval(() => {
        const used = process.memoryUsage()
        console.info('Memory usage:', {
            rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
        })
    }, MEMORY_LOG_INTERVAL)
}

const main: APIGatewayProxyHandler = async (event) => {
    console.info('Starting lambda with request size:', event.body?.length)
    const startTime = Date.now()
    let memoryLoggingInterval: NodeJS.Timeout | undefined

    const authProvider =
        event.requestContext.identity.cognitoAuthenticationProvider
    if (authProvider == undefined) {
        return {
            statusCode: 400,
            body:
                JSON.stringify({
                    code: 'NO_AUTH_PROVIDER',
                    message:
                        'Auth provider missing. This should always be taken care of by the API Gateway',
                }) + '\n',
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    }

    if (!event.body) {
        return {
            statusCode: 400,
            body: 'No body found in request',
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    }

    // Parse and validate request
    const bulkDlRequest: S3BulkDownloadRequest = JSON.parse(event.body)
    console.info('Bulk download request:', bulkDlRequest)

    if (
        !bulkDlRequest.bucket ||
        !bulkDlRequest.keys ||
        !bulkDlRequest.zipFileName
    ) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                code: 'BAD_REQUEST',
                message: 'Missing bucket, keys or zipFileName in request',
            }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    }

    // Initialize streams and counters
    let totalBytes = 0
    let processedFiles = 0
    const zippedStream = new PassThrough({
        highWaterMark: STREAM_CHUNK_SIZE,
    })

    try {
        // Start memory logging
        memoryLoggingInterval = startMemoryLogging()

        // Configure zip archive
        const zip = Archiver('zip', { zlib: { level: 5 } })

        // Set up zip event handlers
        zip.on('warning', (warn) => {
            console.info('Zip warning:', warn.message)
        })

        zip.on('entry', (entry) => {
            processedFiles++
            console.info(
                `Zip progress: ${processedFiles}/${bulkDlRequest.keys.length} files processed`
            )
            console.info('Current entry:', entry.name)
        })

        zip.on('error', (error: Archiver.ArchiverError) => {
            console.error('Zip error:', {
                name: error.name,
                code: error.code,
                message: error.message,
                path: error.path,
                stack: error.stack,
            })
            throw error
        })

        zip.on('progress', (progress) => {
            console.info('Zip progress:', progress)
        })

        // Set up upload to S3
        const input: PutObjectCommandInput = {
            ACL: 'private',
            Body: zippedStream,
            Bucket: bulkDlRequest.bucket,
            ContentType: 'application/zip',
            Key: bulkDlRequest.zipFileName,
            StorageClass: 'STANDARD',
        }

        const upload = new Upload({
            client: s3,
            params: input,
            tags: [
                {
                    Key: 'contentsPreviouslyScanned',
                    Value: 'TRUE',
                },
            ],
        })

        upload.on('httpUploadProgress', (progress) => {
            console.info('Upload progress:', progress)
        })

        // Connect zip to output stream
        zip.pipe(zippedStream)

        // Process files in batches
        for (let i = 0; i < bulkDlRequest.keys.length; i += BATCH_SIZE) {
            const batch = bulkDlRequest.keys.slice(i, i + BATCH_SIZE)

            // Process batch
            await Promise.all(
                batch.map(async (key) => {
                    console.info(
                        `Processing file ${i + batch.indexOf(key) + 1}/${bulkDlRequest.keys.length}: ${key}`
                    )

                    const params = { Bucket: bulkDlRequest.bucket, Key: key }

                    // Check file size first
                    const headCommand = new HeadObjectCommand(params)
                    const metadata = await s3.send(headCommand)

                    if (!metadata.ContentLength) {
                        throw new Error(
                            `Could not get content length for ${key}`
                        )
                    }

                    totalBytes += metadata.ContentLength
                    if (totalBytes > MAX_TOTAL_SIZE) {
                        throw new Error(
                            `Total size (${totalBytes} bytes) exceeds maximum allowed size (${MAX_TOTAL_SIZE} bytes)`
                        )
                    }

                    console.info(
                        `File ${key} size: ${metadata.ContentLength} bytes`
                    )

                    const getCommand = new GetObjectCommand(params)
                    const s3Item = await s3.send(getCommand)

                    if (!s3Item.Body || !(s3Item.Body instanceof Readable)) {
                        throw new Error(`Invalid stream for ${key}`)
                    }

                    const filename = parseContentDisposition(
                        metadata.ContentDisposition ?? key
                    )

                    // Add to zip with timeout wrapper
                    const streamPromise = streamWithTimeout(
                        s3Item.Body,
                        FILE_TIMEOUT
                    )
                    zip.append(s3Item.Body, {
                        name: decodeURIComponent(filename),
                    })

                    await streamPromise
                })
            )
        }

        // Finalize zip and wait for upload
        await zip.finalize()
        await upload.done()

        const processingTime = (Date.now() - startTime) / 1000
        console.info('Upload completed:', {
            processedFiles,
            totalFiles: bulkDlRequest.keys.length,
            totalBytes,
            processingTimeSeconds: processingTime,
        })

        return {
            statusCode: 200,
            body: JSON.stringify({
                code: 'SUCCESS',
                message: 'success',
                stats: {
                    files: processedFiles,
                    bytes: totalBytes,
                    timeSeconds: processingTime,
                },
            }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    } catch (error) {
        console.error('Error during processing:', {
            error,
            processedFiles,
            totalFiles: bulkDlRequest.keys.length,
            totalBytes,
            elapsedTime: (Date.now() - startTime) / 1000,
        })

        return {
            statusCode: 500,
            body: JSON.stringify({
                code: 'ERROR',
                message: error.message,
                details: {
                    processedFiles,
                    totalFiles: bulkDlRequest.keys.length,
                },
            }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    } finally {
        // Clean up memory logging
        if (memoryLoggingInterval) {
            clearInterval(memoryLoggingInterval)
        }
    }
}

// Helper to parse content-disposition header
function parseContentDisposition(cd: string): string {
    const [, filename] = cd.split('filename=')
    return filename
}

export { main }

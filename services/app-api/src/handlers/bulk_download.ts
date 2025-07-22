import type { PutObjectCommandInput } from '@aws-sdk/client-s3'
import {
    S3Client,
    GetObjectCommand,
    HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { Readable } from 'stream'
import type { APIGatewayProxyHandler } from 'aws-lambda'
import Archiver from 'archiver'
import * as fs from 'fs'
import * as path from 'path'
import { pipeline } from 'stream/promises'

const s3 = new S3Client({ region: 'us-east-1' })

// Configuration constants
const BATCH_SIZE = 50 // Increased batch size for parallel downloads
const BASE_TIMEOUT = 120000
const TIMEOUT_PER_MB = 1000
const MAX_TOTAL_SIZE = 1024 * 1024 * 1024 // 1GB limit
const MEMORY_LOG_INTERVAL = 5000
const TEMP_DIR = '/tmp/downloads' // Lambda temp directory

interface S3BulkDownloadRequest {
    bucket: string
    keys: string[]
    zipFileName: string
}

// Helper function to ensure temp directory exists
const ensureTempDir = () => {
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true })
    }
}

// Helper function to clean up temp directory
const cleanupTempDir = () => {
    if (fs.existsSync(TEMP_DIR)) {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true })
    }
}

interface DownloadedFile {
    path: string
    size: number
    originalFilename: string
}

// Helper function to download a single file
const downloadFile = async (
    bucket: string,
    key: string,
    timeout: number
): Promise<DownloadedFile> => {
    const params = { Bucket: bucket, Key: key }

    // Get metadata first to check content-disposition
    const headCommand = new HeadObjectCommand(params)
    const metadata = await s3.send(headCommand)
    const filename = parseContentDisposition(metadata.ContentDisposition ?? key)

    // Now get the actual file
    const getCommand = new GetObjectCommand(params)
    const s3Item = await s3.send(getCommand)

    if (!s3Item.Body || !(s3Item.Body instanceof Readable)) {
        throw new Error(`Invalid stream for ${key}`)
    }

    // Use a UUID for the temp file path to avoid collisions
    const tempName = `${Date.now()}-${Math.random().toString(36).substring(7)}`
    const filePath = path.join(TEMP_DIR, tempName)

    // Create write stream with proper encoding
    const writeStream = fs.createWriteStream(filePath)

    try {
        await pipeline(s3Item.Body, writeStream)
    } catch (error) {
        // Clean up partial file if download fails
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
        }
        const failedFileErr = new Error(
            `Failed to download file ${key} (${filename}): ${error.message}`
        )
        failedFileErr.stack = error.stack
        throw failedFileErr
    }

    const stats = fs.statSync(filePath)
    return { path: filePath, size: stats.size, originalFilename: filename }
}

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

    try {
        // Validate auth and request body
        const authProvider =
            event.requestContext.identity.cognitoAuthenticationProvider
        if (!authProvider) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    code: 'NO_AUTH_PROVIDER',
                    message: 'Auth provider missing',
                }),
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                },
            }
        }

        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    code: 'BAD_REQUEST',
                    message: 'No body found in request',
                }),
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                },
            }
        }

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
                    message: 'Missing required fields',
                }),
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                },
            }
        }

        // Start memory logging
        memoryLoggingInterval = startMemoryLogging()

        // Prepare temp directory
        ensureTempDir()

        // Download files in batches
        let totalBytes = 0
        const downloadedFiles: DownloadedFile[] = []

        for (let i = 0; i < bulkDlRequest.keys.length; i += BATCH_SIZE) {
            const batch = bulkDlRequest.keys.slice(i, i + BATCH_SIZE)
            console.info(
                `Processing batch ${i / BATCH_SIZE + 1}/${Math.ceil(bulkDlRequest.keys.length / BATCH_SIZE)}`
            )

            const batchResults = await Promise.all(
                batch.map(async (key) => {
                    const timeout = BASE_TIMEOUT + TIMEOUT_PER_MB * 1000 // Simplified timeout calculation
                    return downloadFile(bulkDlRequest.bucket, key, timeout)
                })
            )

            for (const result of batchResults) {
                totalBytes += result.size
                if (totalBytes > MAX_TOTAL_SIZE) {
                    const totalMB = (totalBytes / (1024 * 1024)).toFixed(2)
                    const maxMB = (MAX_TOTAL_SIZE / (1024 * 1024)).toFixed(2)
                    throw new Error(
                        `Total size (${totalMB}MB) exceeds maximum allowed size of ${maxMB}MB`
                    )
                }
                downloadedFiles.push(result)
            }
        }

        // Create zip file
        const zipPath = path.join(TEMP_DIR, 'output.zip')
        const zipStream = fs.createWriteStream(zipPath)
        const archive = Archiver('zip', { zlib: { level: 0 } })

        archive.pipe(zipStream)

        // Add files to zip with their original names
        for (const file of downloadedFiles) {
            archive.file(file.path, { name: file.originalFilename })
        }

        await archive.finalize()

        // Upload zip to S3
        const uploadParams: PutObjectCommandInput = {
            Bucket: bulkDlRequest.bucket,
            Key: bulkDlRequest.zipFileName,
            Body: fs.createReadStream(zipPath),
            ContentType: 'application/zip',
            ACL: 'private',
            StorageClass: 'STANDARD',
        }

        const upload = new Upload({
            client: s3,
            params: uploadParams,
            tags: [{ Key: 'contentsPreviouslyScanned', Value: 'TRUE' }],
        })

        await upload.done()

        const processingTime = (Date.now() - startTime) / 1000
        console.info('Upload completed:', {
            files: downloadedFiles.length,
            totalBytes,
            processingTimeSeconds: processingTime,
        })

        return {
            statusCode: 200,
            body: JSON.stringify({
                code: 'SUCCESS',
                message: 'success',
                stats: {
                    files: downloadedFiles.length,
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
        console.error('Error during processing:', error)
        return {
            statusCode: 500,
            body: JSON.stringify({
                code: 'ERROR',
                message: error.message,
            }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    } finally {
        // Clean up
        if (memoryLoggingInterval) {
            clearInterval(memoryLoggingInterval)
        }
        cleanupTempDir()
    }
}

// parses a content-disposition header for the filename
function parseContentDisposition(cd: string): string {
    if (!cd) return ''

    const matches = cd.match(/filename=["']?([^"';\n]*)["']?/i)
    if (matches && matches[1]) {
        return decodeURIComponent(matches[1].trim())
    }

    // If it's just a key/path, decode it directly
    try {
        return decodeURIComponent(cd.trim())
    } catch (error) {
        console.warn('Error decoding filename:', cd, error)
        return cd.trim()
    }
}

export const handler = main
module.exports = { main, handler }

import {
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as crypto from 'crypto'
import Archiver from 'archiver'
import { pipeline } from 'stream/promises'
import { logError } from '../../logger'

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
})

/**
 * Extracts bucket name from S3 URL
 */
function extractBucketName(s3URL: string): string | Error {
    try {
        if (s3URL.startsWith('s3://')) {
            // Format: s3://bucket-name/key
            return s3URL.split('/')[2]
        } else if (s3URL.includes('.s3.amazonaws.com')) {
            // Format: https://bucket-name.s3.amazonaws.com/key
            const urlParts = new URL(s3URL)
            return urlParts.hostname.split('.')[0]
        }
        return new Error(`Unsupported S3 URL format: ${s3URL}`)
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : String(error)
        return new Error(`Failed to extract bucket name: ${errorMessage}`)
    }
}

/**
 * Extracts key from S3 URL
 */
export function extractS3Key(s3URL: string): string | Error {
    try {
        if (s3URL.startsWith('s3://')) {
            // Format: s3://bucket-name/key
            const parts = s3URL.split('/')
            return parts.slice(3).join('/')
        } else if (s3URL.includes('.s3.amazonaws.com')) {
            // Format: https://bucket-name.s3.amazonaws.com/key
            const urlParts = new URL(s3URL)
            return urlParts.pathname.substring(1) // Remove leading slash
        }
        return new Error(`Unsupported S3 URL format: ${s3URL}`)
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : String(error)
        return new Error(`Failed to extract S3 key: ${errorMessage}`)
    }
}

/**
 * Generates a zip file containing the provided documents and uploads it to S3
 * Reimplemented from our zip lambda handler, bulk_downloads.ts
 *
 * @param documents Array of document information with s3URLs
 * @param outputPath The S3 path where the zip file should be stored
 * @returns Object with the S3 URL and SHA256 hash of the generated zip, or Error
 */
export async function generateDocumentZip(
    documents: Array<{ s3URL: string; name: string; sha256?: string }>,
    outputPath: string,
    options = {
        batchSize: 50,
        maxTotalSize: 1024 * 1024 * 1024, // 1GB default limit
        baseTimeout: 120000,
        timeoutPerMB: 1000,
    }
): Promise<{ s3URL: string; sha256: string } | Error> {
    if (documents.length === 0) {
        return new Error('No documents provided for zip generation')
    }

    // Create a temporary directory for our downloads
    let tempDir: string
    try {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'document-zip-'))
    } catch (err) {
        return new Error(`Failed to create temporary directory: ${err.message}`)
    }

    const zipPath = path.join(tempDir, 'output.zip')

    try {
        // Extract bucket information from first document
        const firstDocUrl = documents[0].s3URL
        const bucketResult = extractBucketName(firstDocUrl)

        if (bucketResult instanceof Error) {
            return bucketResult
        }
        const bucket = bucketResult

        // Prepare document keys for download
        const documentKeys = []
        for (const doc of documents) {
            const keyResult = extractS3Key(doc.s3URL)
            if (keyResult instanceof Error) {
                return keyResult
            }
            documentKeys.push({
                key: keyResult,
                name: doc.name,
            })
        }

        // Download files in batches
        let totalBytes = 0
        const downloadedFiles = []

        for (let i = 0; i < documentKeys.length; i += options.batchSize) {
            const batch = documentKeys.slice(i, i + options.batchSize)
            console.info(
                `Processing batch ${i / options.batchSize + 1}/${Math.ceil(documentKeys.length / options.batchSize)}`
            )

            const batchPromises = batch.map(async (docInfo) => {
                const timeout =
                    options.baseTimeout + options.timeoutPerMB * 1000
                const downloadResult = await downloadFile(
                    s3Client,
                    bucket,
                    docInfo.key,
                    tempDir,
                    timeout
                )

                if (downloadResult instanceof Error) {
                    return downloadResult
                }

                return {
                    path: downloadResult.path,
                    size: downloadResult.size,
                    name: docInfo.name,
                }
            })

            const batchResults = await Promise.all(batchPromises)

            // Check for errors in batch results
            for (const result of batchResults) {
                if (result instanceof Error) {
                    return result
                }

                totalBytes += result.size
                if (totalBytes > options.maxTotalSize) {
                    const totalMB = (totalBytes / (1024 * 1024)).toFixed(2)
                    const maxMB = (
                        options.maxTotalSize /
                        (1024 * 1024)
                    ).toFixed(2)
                    return new Error(
                        `Total size (${totalMB}MB) exceeds maximum allowed size of ${maxMB}MB`
                    )
                }

                downloadedFiles.push(result)
            }
        }

        // Create zip file
        const zipStream = fs.createWriteStream(zipPath)
        const archive = Archiver('zip', { zlib: { level: 0 } })

        archive.pipe(zipStream)

        // Add files to zip with their proper names
        for (const file of downloadedFiles) {
            archive.file(file.path, { name: file.name })
        }

        try {
            await archive.finalize()
        } catch (err) {
            return new Error(`Failed to create zip archive: ${err.message}`)
        }

        // Calculate SHA256 hash of zip file
        const hashResult = await calculateSHA256(zipPath)
        if (hashResult instanceof Error) {
            return hashResult
        }

        // Upload zip to S3
        const outputKey = outputPath
        try {
            await s3Client.send(
                new PutObjectCommand({
                    Bucket: bucket,
                    Key: outputKey,
                    Body: fs.createReadStream(zipPath),
                    ContentType: 'application/zip',
                })
            )
        } catch (err) {
            return new Error(`Failed to upload zip to S3: ${err.message}`)
        }

        return {
            s3URL: `s3://${bucket}/${outputKey}`,
            sha256: hashResult,
        }
    } catch (error) {
        logError('generateDocumentZip', error)
        return new Error(`Unexpected error generating zip: ${error.message}`)
    } finally {
        // Clean up temp directory
        try {
            fs.rmSync(tempDir, { recursive: true, force: true })
        } catch (cleanupError) {
            logError('generateDocumentZip cleanup', cleanupError)
        }
    }
}

/**
 * Downloads a file from S3 to a local path
 */
async function downloadFile(
    s3Client: S3Client,
    bucket: string,
    key: string,
    tempDir: string,
    timeout: number = 120000
): Promise<{ path: string; size: number } | Error> {
    // Create a unique filename to avoid conflicts
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}`
    const filePath = path.join(tempDir, filename)

    // Create a new abort controller for this request for interrupts
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
        const response = await s3Client.send(
            new GetObjectCommand({
                Bucket: bucket,
                Key: key,
            }),
            { abortSignal: controller.signal }
        )

        clearTimeout(timeoutId)

        if (!response.Body || !(response.Body instanceof Readable)) {
            return new Error(`Invalid stream for ${key}`)
        }

        const writeStream = fs.createWriteStream(filePath)

        try {
            await pipeline(response.Body, writeStream)
            const stats = fs.statSync(filePath)
            return { path: filePath, size: stats.size }
        } catch (error) {
            // Clean up partial file if download fails
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
            }
            return new Error(`Failed to download file ${key}: ${error.message}`)
        }
    } catch (error) {
        clearTimeout(timeoutId)

        if (error.name === 'AbortError') {
            return new Error(`Download timeout for ${key} after ${timeout}ms`)
        }
        return new Error(`S3 error downloading file ${key}: ${error.message}`)
    }
}

/**
 * Calculates SHA256 hash of a file
 */
function calculateSHA256(filePath: string): Promise<string | Error> {
    return new Promise((resolve) => {
        try {
            const hash = crypto.createHash('sha256')
            const stream = fs.createReadStream(filePath)

            stream.on('error', (err) => {
                resolve(
                    new Error(`Failed to read file for hashing: ${err.message}`)
                )
            })

            stream.on('data', (chunk) => hash.update(chunk))

            stream.on('end', () => resolve(hash.digest('hex')))
        } catch (error) {
            resolve(new Error(`Error calculating hash: ${error.message}`))
        }
    })
}

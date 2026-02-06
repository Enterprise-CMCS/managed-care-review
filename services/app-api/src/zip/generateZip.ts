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
import { logError } from '../logger'
import type { Store } from '../postgres'
import type {
    ContractRevisionType,
    ContractType,
    RateRevisionType,
} from '../domain-models'
import type { Span } from '@opentelemetry/api'
import { setErrorAttributesOnActiveSpan } from '../resolvers/attributeHelper'

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
})

// Maximum total size for document zip packages (1.5GB)
const MAX_ZIP_SIZE_BYTES = 1536 * 1024 * 1024

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

export type GenerateDocumentZipFunctionType = (
    documents: Array<{ s3URL: string; name: string; sha256?: string }>,
    outputPath: string,
    options?: Partial<{
        batchSize: number
        maxTotalSize: number
        baseTimeout: number
        timeoutPerMB: number
    }>
) => Promise<{ s3URL: string; sha256: string } | Error>

/**
 * Generates a zip file containing the provided documents and uploads it to S3
 *
 * @param documents Array of document information with s3URLs
 * @param outputPath The S3 path where the zip file should be stored
 * @param options Configuration options for zip generation
 * @returns Object with the S3 URL and SHA256 hash of the generated zip, or Error
 */
export const generateDocumentZip: GenerateDocumentZipFunctionType = async (
    documents,
    outputPath,
    options = {
        batchSize: 50,
        maxTotalSize: MAX_ZIP_SIZE_BYTES,
        baseTimeout: 120000,
        timeoutPerMB: 1000,
    }
) => {
    if (documents.length === 0) {
        return new Error('No documents provided for zip generation')
    }

    const mergedOptions = {
        batchSize: 50,
        maxTotalSize: MAX_ZIP_SIZE_BYTES,
        baseTimeout: 120000,
        timeoutPerMB: 1000,
        ...options, // Override with any provided values
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
            // NOTE: for some reason we don't store the actual s3 URL, we store some
            // weird s3URL concatenated with the original filename. We have to drop the
            // last /original.pdf off of the url to get the real s3URL[].
            const urlParts = doc.s3URL.split('/')
            const realS3URL = urlParts.slice(0, -1).join('/')
            const keyResult = extractS3Key(realS3URL)
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

        for (let i = 0; i < documentKeys.length; i += mergedOptions.batchSize) {
            const batch = documentKeys.slice(i, i + mergedOptions.batchSize)
            console.info(
                `Processing batch ${i / mergedOptions.batchSize + 1}/${Math.ceil(documentKeys.length / mergedOptions.batchSize)}`
            )

            const batchPromises = batch.map(async (docInfo) => {
                const timeout =
                    mergedOptions.baseTimeout +
                    mergedOptions.timeoutPerMB * 1000
                const downloadResult = await downloadFile(
                    s3Client,
                    bucket,
                    'allusers/' + docInfo.key,
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
                if (totalBytes > mergedOptions.maxTotalSize) {
                    const totalMB = (totalBytes / (1024 * 1024)).toFixed(2)
                    const maxMB = (
                        mergedOptions.maxTotalSize /
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
 * Mock version of generateDocumentZip for unit tests
 * Generates realistic s3URL and sha256 without actual S3 operations
 *
 * @param documents Array of document information with s3URLs
 * @param outputPath The S3 path where the zip file should be stored
 * @param options Configuration options for zip generation
 * @returns Object with the S3 URL and SHA256 hash of the generated zip, or Error
 */
export const localGenerateDocumentZip: GenerateDocumentZipFunctionType = async (
    documents,
    outputPath
) => {
    if (documents.length === 0) {
        return new Error('No documents provided for zip generation')
    }

    // Extract bucket name from first document (simulate real behavior)
    const bucketMatch = documents[0].s3URL.match(/^s3:\/\/([^/]+)/)
    if (!bucketMatch) {
        return new Error('Could not extract bucket name from S3 URL')
    }
    const bucket = bucketMatch[1]

    // Generate realistic s3URL
    const s3URL = `s3://${bucket}/${outputPath}`

    // Generate random 64-character hex string (SHA256 format)
    const sha256 = Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
    ).join('')

    // Simulate async processing delay
    await new Promise((resolve) => setTimeout(resolve, 10))

    return {
        s3URL,
        sha256,
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

export type DocumentZipService = {
    createContractZips: (
        contract: ContractType,
        span?: Span
    ) => Promise<Error | undefined>
    createRateZips: (
        contract: ContractType,
        span?: Span
    ) => Promise<Error[] | undefined>
    generateRateDocumentsZip: (
        rateRevision: RateRevisionType,
        span?: Span
    ) => Promise<void | Error>
    generateContractDocumentsZip: (
        contractRevision: ContractRevisionType,
        span?: Span
    ) => Promise<void | Error>
}

export function documentZipService(
    store: Store,
    generateDocumentZip: GenerateDocumentZipFunctionType
): DocumentZipService {
    const documentZipMethods: DocumentZipService = {
        createContractZips: async (contract, span) => {
            const contractRevision =
                contract.packageSubmissions[0]?.contractRevision

            if (!contractRevision) {
                return
            }

            // Only attempt to generate zip if there are actually documents to zip
            if (
                contractRevision.formData.contractDocuments &&
                contractRevision.formData.contractDocuments.length > 0
            ) {
                console.info(
                    `Generating zip for ${contractRevision.formData.contractDocuments.length} contract documents for contract revision ${contractRevision.id}`
                )

                const zipResult =
                    await documentZipMethods.generateContractDocumentsZip(
                        contractRevision,
                        span
                    )

                if (zipResult instanceof Error) {
                    const errorWithContext = new Error(
                        `Contract document zip generation failed for revision ${contractRevision.id}: ${zipResult.message}`
                    )

                    logError(
                        'createContractZips - contract documents zip generation failed',
                        errorWithContext
                    )
                    setErrorAttributesOnActiveSpan(
                        'contract documents zip generation failed',
                        span
                    )
                    console.warn(
                        `Contract document zip generation failed for revision ${contractRevision.id}, but continuing with submission process`
                    )

                    return errorWithContext
                } else {
                    console.info(
                        `Successfully generated contract document zip for revision ${contractRevision.id}`
                    )
                }
            } else {
                console.info(
                    `No contract documents found for revision ${contractRevision.id}, skipping zip generation`
                )
            }
            return
        },
        createRateZips: async (contract, span) => {
            if (!contract.packageSubmissions[0]?.rateRevisions) {
                return
            }

            const rateRevisions = contract.packageSubmissions[0].rateRevisions
            const errors: Error[] = []

            for (const rateRev of rateRevisions) {
                // Only attempt to generate a zip if there are actually documents to zip
                const hasRateDocuments =
                    rateRev.formData.rateDocuments &&
                    rateRev.formData.rateDocuments.length > 0
                const hasSupportingDocuments =
                    rateRev.formData.supportingDocuments &&
                    rateRev.formData.supportingDocuments.length > 0

                if (hasRateDocuments || hasSupportingDocuments) {
                    const totalDocs =
                        (rateRev.formData.rateDocuments?.length || 0) +
                        (rateRev.formData.supportingDocuments?.length || 0)

                    console.info(
                        `Generating zip for ${totalDocs} rate documents for rate revision ${rateRev.id}`
                    )

                    const zipResult =
                        await documentZipMethods.generateRateDocumentsZip(
                            rateRev,
                            span
                        )

                    if (zipResult instanceof Error) {
                        const errorWithContext = new Error(
                            `Rate document zip generation failed for revision ${rateRev.id}: ${zipResult.message}`
                        )
                        errors.push(errorWithContext)

                        logError(
                            'createRateZips - rate documents zip generation failed',
                            errorWithContext
                        )
                        setErrorAttributesOnActiveSpan(
                            'rate documents zip generation failed',
                            span
                        )
                        console.warn(
                            `Rate document zip generation failed for revision ${rateRev.id}, but continuing with other revisions`
                        )
                    } else {
                        console.info(
                            `Successfully generated rate document zip for revision ${rateRev.id}`
                        )
                    }
                } else {
                    console.info(
                        `No rate documents found for rate revision ${rateRev.id}, skipping zip generation`
                    )
                }
            }

            // Return errors if any occurred, otherwise return void
            return errors.length > 0 ? errors : undefined
        },
        generateRateDocumentsZip: async (rateRevision, span) => {
            const rateRevisionID = rateRevision.id

            // Get all rate-related documents
            // Adapt these field names as needed based on your actual data structure
            const rateDocuments = [
                ...(rateRevision.formData.rateDocuments || []),
                ...(rateRevision.formData.supportingDocuments || []),
            ]

            if (!rateDocuments || rateDocuments.length === 0) {
                // No documents to zip
                return
            }

            try {
                // Create an S3 key (destination path) for the zip file
                const s3DestinationKey = `zips/rates/${rateRevisionID}/rate-documents.zip`

                // Generate the zip file and upload it to S3
                const zipResult = await generateDocumentZip(
                    rateDocuments,
                    s3DestinationKey
                )

                if (zipResult instanceof Error) {
                    logError('generateRateDocumentsZip', zipResult)
                    if (span) {
                        setErrorAttributesOnActiveSpan(
                            'rate documents zip generation failed',
                            span
                        )
                    }
                    return zipResult
                }

                // Parse bucket and key from generated s3URL
                const bucket = extractBucketName(zipResult.s3URL)
                const key = extractS3Key(zipResult.s3URL)

                if (bucket instanceof Error || key instanceof Error) {
                    const err = new Error(
                        `Failed to parse generated zip s3URL: ${zipResult.s3URL}`
                    )
                    logError('generateRateDocumentsZip', err)
                    if (span) {
                        setErrorAttributesOnActiveSpan(
                            'failed to parse zip s3URL',
                            span
                        )
                    }
                    return err
                }

                // Store zip information in database
                const createResult = await store.createDocumentZipPackage({
                    s3URL: zipResult.s3URL,
                    sha256: zipResult.sha256,
                    s3BucketName: bucket,
                    s3Key: key,
                    rateRevisionID,
                    documentType: 'RATE_DOCUMENTS',
                })

                if (createResult instanceof Error) {
                    logError(
                        'generateRateDocumentsZip - database storage failed',
                        createResult
                    )
                    if (span) {
                        setErrorAttributesOnActiveSpan(
                            'rate documents zip database storage failed',
                            span
                        )
                    }
                    return createResult
                }

                console.info(
                    `Successfully generated zip for rate documents: ${zipResult.s3URL}`
                )
                return
            } catch (error: unknown) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error)
                const err = new Error(
                    `Unexpected error in generateRateDocumentsZip: ${errorMessage}`
                )
                logError('generateRateDocumentsZip', err)
                if (span) {
                    setErrorAttributesOnActiveSpan(
                        'rate documents zip generation failed',
                        span
                    )
                }
                return err
            }
        },
        generateContractDocumentsZip: async (contractRevision, span) => {
            const contractRevisionID = contractRevision.id
            const contractDocuments = [
                ...(contractRevision.formData.contractDocuments || []),
                ...(contractRevision.formData.supportingDocuments || []),
            ]

            if (!contractDocuments || contractDocuments.length === 0) {
                // No documents to zip
                return
            }

            try {
                // Create an S3 key (destination path) for the zip file. This is where
                // we are storing it in the S3 bucket.
                const s3DestinationKey = `zips/contracts/${contractRevisionID}/contract-documents.zip`

                // Generate the zip file and upload it to S3
                const zipResult = await generateDocumentZip(
                    contractDocuments,
                    s3DestinationKey
                )

                if (zipResult instanceof Error) {
                    // Return the error to the caller
                    logError('generateContractDocumentsZip', zipResult)
                    if (span) {
                        setErrorAttributesOnActiveSpan(
                            'contract documents zip generation failed',
                            span
                        )
                    }
                    return zipResult
                }

                // Parse bucket and key from generated s3URL
                const bucket = extractBucketName(zipResult.s3URL)
                const key = extractS3Key(zipResult.s3URL)

                if (bucket instanceof Error || key instanceof Error) {
                    const err = new Error(
                        `Failed to parse generated zip s3URL: ${zipResult.s3URL}`
                    )
                    logError('generateContractDocumentsZip', err)
                    if (span) {
                        setErrorAttributesOnActiveSpan(
                            'failed to parse zip s3URL',
                            span
                        )
                    }
                    return err
                }

                // Store zip information in database
                const createResult = await store.createDocumentZipPackage({
                    s3URL: zipResult.s3URL,
                    sha256: zipResult.sha256,
                    s3BucketName: bucket,
                    s3Key: key,
                    contractRevisionID,
                    documentType: 'CONTRACT_DOCUMENTS',
                })

                if (createResult instanceof Error) {
                    logError(
                        'generateContractDocumentsZip - database storage failed',
                        createResult
                    )
                    if (span) {
                        setErrorAttributesOnActiveSpan(
                            'contract documents zip database storage failed',
                            span
                        )
                    }
                    return createResult
                }

                console.info(
                    `Successfully generated zip for contract documents: ${zipResult.s3URL}`
                )
                return
            } catch (error: unknown) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error)
                const err = new Error(
                    `Unexpected error in generateContractDocumentsZip: ${errorMessage}`
                )
                logError('generateContractDocumentsZip', err)
                if (span) {
                    setErrorAttributesOnActiveSpan(
                        'contract documents zip generation failed',
                        span
                    )
                }
                return err
            }
        },
    }

    return documentZipMethods
}

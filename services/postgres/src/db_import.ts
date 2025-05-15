import { SecretsManager } from './secrets'
import * as path from 'path'
import * as fs from 'fs'
import { execSync } from 'child_process'
import {
    S3Client,
    ListObjectsV2Command,
    GetObjectCommand,
    PutObjectCommand,
    _Object,
} from '@aws-sdk/client-s3'
import { SecretDict } from './types'
import { createHash } from 'crypto'
import { PrismaClient } from '@prisma/client'

// Environment variables
const REGION = process.env.AWS_REGION || 'us-east-1'
const S3_BUCKET = process.env.S3_BUCKET // For DB dumps
const DOCS_S3_BUCKET = process.env.DOCS_S3_BUCKET // For documents
const DB_SECRET_ARN = process.env.DB_SECRET_ARN
const TMP_DIR = '/tmp'
const S3_PREFIX = 'db_dump'

// Content types for document uploads
const CONTENT_TYPES = {
    pdf: 'application/pdf',
}

const s3Client = new S3Client({ region: REGION })

// Paths to local mock PDFs
const MOCK_PDF_PATHS = {
    small: path.join(__dirname, '../files/mock-s.pdf'),
    medium: path.join(__dirname, '../files/mock-m.pdf'),
}

// Cache to keep track of SHA256 for our mock files (calculated once)
const mockFileSha256Cache: Record<string, string> = {}

/**
 * Calculate SHA-256 hash for a file
 */
function calculateFileSha256(filePath: string): string {
    // Check if we already calculated this file's hash
    if (mockFileSha256Cache[filePath]) {
        return mockFileSha256Cache[filePath]
    }

    const fileBuffer = fs.readFileSync(filePath)
    const hashSum = createHash('sha256')
    hashSum.update(fileBuffer)
    const hash = hashSum.digest('hex')

    // Cache the result
    mockFileSha256Cache[filePath] = hash

    return hash
}

/**
 * Get a mock PDF path based on document ID
 * Uses deterministic selection to ensure consistent replacement
 */
function getMockPDFPath(documentId: string): string {
    // Use the document ID to deterministically select a mock PDF
    const hash = createHash('md5').update(documentId).digest('hex')
    const hashNum = parseInt(hash.substring(0, 8), 16)

    // 50% chance of small, 50% chance of medium
    return hashNum % 2 === 0 ? MOCK_PDF_PATHS.small : MOCK_PDF_PATHS.medium
}

/**
 * Logs the S3 URL structure for debugging
 */
function debugS3Url(s3Url: string): void {
    console.info('Analyzing S3 URL structure:')
    console.info(`Original URL: ${s3Url}`)
    console.info(`URL length: ${s3Url.length}`)
    console.info(`URL starts with s3://: ${s3Url.startsWith('s3://')}`)
    console.info(`URL starts with https://: ${s3Url.startsWith('https://')}`)
    console.info(
        `URL includes s3.amazonaws.com: ${s3Url.includes('s3.amazonaws.com')}`
    )
    console.info(`URL contains slashes: ${s3Url.includes('/')}`)
    console.info(`Number of slashes: ${(s3Url.match(/\//g) || []).length}`)
    console.info(`URL ends with slash: ${s3Url.endsWith('/')}`)

    // Split by slashes to see the components
    const parts = s3Url.split('/')
    console.info('URL parts:')
    parts.forEach((part, i) => {
        console.info(`  Part ${i}: "${part}"`)
    })
}

/**
 * Logs sample document URLs from the database for debugging
 */
async function logSampleDocumentURLs(prisma: PrismaClient): Promise<void> {
    console.info('Logging sample document URLs from database...')

    // Get one sample from each document type
    const docs = await Promise.all([
        prisma.contractDocument.findFirst(),
        prisma.contractSupportingDocument.findFirst(),
        prisma.rateDocument.findFirst(),
        prisma.rateSupportingDocument.findFirst(),
    ])

    docs.forEach((doc, index) => {
        if (doc) {
            const types = [
                'ContractDocument',
                'ContractSupportingDocument',
                'RateDocument',
                'RateSupportingDocument',
            ]
            console.info(`${types[index]} sample:
  id: ${doc.id}
  name: ${doc.name}
  s3URL: ${doc.s3URL}
  ${Object.prototype.hasOwnProperty.call(doc, 'sha256') ? `sha256: ${doc.sha256}` : ''}
`)
            // Debug the S3 URL structure
            debugS3Url(doc.s3URL)
        }
    })
}

/**
 * Replace a document in S3 with a mock PDF
 */
async function replaceDocument(
    documentId: string,
    s3Url: string,
    originalFilename: string
): Promise<{ newSha256: string; replaced: boolean }> {
    try {
        console.info(`Processing document ID: ${documentId}`)
        console.info(`Original S3 URL: ${s3Url}`)
        console.info(`Original filename: ${originalFilename}`)

        // Instead of trying to parse the S3 URL, let's just use a consistent approach
        // Always put files in the allusers directory with the document ID as the filename
        const s3Key = `allusers/${documentId}/${originalFilename}`

        console.info(`Using standardized S3 Key: ${s3Key}`)

        // Get mock PDF path
        const mockPdfPath = getMockPDFPath(documentId)
        console.info(`Using mock PDF: ${mockPdfPath}`)

        // Calculate SHA-256 of the mock file
        const newSha256 = calculateFileSha256(mockPdfPath)

        // Read the mock file
        const fileContent = fs.readFileSync(mockPdfPath)

        // Determine content type (always PDF for now)
        const contentType = CONTENT_TYPES.pdf

        // Upload to S3
        console.info(`Uploading to S3 bucket: ${DOCS_S3_BUCKET}, key: ${s3Key}`)

        await s3Client.send(
            new PutObjectCommand({
                Bucket: DOCS_S3_BUCKET,
                Key: s3Key,
                Body: fileContent,
                ContentType: contentType,
                ContentDisposition: `attachment; filename="${originalFilename}"`,
            })
        )

        console.info(`Successfully replaced document ${documentId}`)
        return { newSha256, replaced: true }
    } catch (error) {
        console.error(`Error replacing document ${documentId}:`, error)
        console.error(`S3 URL was: ${s3Url}`)
        return { newSha256: '', replaced: false }
    }
}

/**
 * Process and replace all documents in the database using Prisma
 */
async function processAllDocuments(prisma: PrismaClient): Promise<void> {
    // Pre-check: Validate mock PDF files exist
    Object.entries(MOCK_PDF_PATHS).forEach(([size, filePath]) => {
        if (!fs.existsSync(filePath)) {
            console.error(`ERROR: Mock PDF file not found at ${filePath}`)
            throw new Error(`Mock PDF file missing: ${filePath}`)
        } else {
            console.info(`Verified mock ${size} PDF exists: ${filePath}`)
            // Pre-calculate and cache SHA256
            const sha256 = calculateFileSha256(filePath)
            console.info(`${size} PDF SHA256: ${sha256}`)
        }
    })

    // Log sample document URLs for debugging
    await logSampleDocumentURLs(prisma)

    // Process ContractDocument
    console.info('Processing ContractDocument files...')
    const contractDocuments = await prisma.contractDocument.findMany()
    console.info(`Found ${contractDocuments.length} contract documents`)

    for (const doc of contractDocuments) {
        try {
            const { newSha256, replaced } = await replaceDocument(
                doc.id,
                doc.s3URL,
                doc.name
            )
            if (replaced) {
                await prisma.contractDocument.update({
                    where: { id: doc.id },
                    data: { sha256: newSha256 },
                })
                console.info(`Updated contract document ${doc.id}`)
            }
        } catch (error) {
            console.error(
                `Error processing contract document ${doc.id}:`,
                error
            )
        }
    }

    // Process ContractSupportingDocument
    console.info('Processing ContractSupportingDocument files...')
    const contractSupportingDocuments =
        await prisma.contractSupportingDocument.findMany()
    console.info(
        `Found ${contractSupportingDocuments.length} contract supporting documents`
    )

    for (const doc of contractSupportingDocuments) {
        try {
            const { newSha256, replaced } = await replaceDocument(
                doc.id,
                doc.s3URL,
                doc.name
            )
            if (replaced) {
                await prisma.contractSupportingDocument.update({
                    where: { id: doc.id },
                    data: { sha256: newSha256 },
                })
                console.info(`Updated contract supporting document ${doc.id}`)
            }
        } catch (error) {
            console.error(
                `Error processing contract supporting document ${doc.id}:`,
                error
            )
        }
    }

    // Process RateDocument
    console.info('Processing RateDocument files...')
    const rateDocuments = await prisma.rateDocument.findMany()
    console.info(`Found ${rateDocuments.length} rate documents`)

    for (const doc of rateDocuments) {
        try {
            const { newSha256, replaced } = await replaceDocument(
                doc.id,
                doc.s3URL,
                doc.name
            )
            if (replaced) {
                await prisma.rateDocument.update({
                    where: { id: doc.id },
                    data: { sha256: newSha256 },
                })
                console.info(`Updated rate document ${doc.id}`)
            }
        } catch (error) {
            console.error(`Error processing rate document ${doc.id}:`, error)
        }
    }

    // Process RateSupportingDocument
    console.info('Processing RateSupportingDocument files...')
    const rateSupportingDocuments =
        await prisma.rateSupportingDocument.findMany()
    console.info(
        `Found ${rateSupportingDocuments.length} rate supporting documents`
    )

    for (const doc of rateSupportingDocuments) {
        try {
            const { newSha256, replaced } = await replaceDocument(
                doc.id,
                doc.s3URL,
                doc.name
            )
            if (replaced) {
                await prisma.rateSupportingDocument.update({
                    where: { id: doc.id },
                    data: { sha256: newSha256 },
                })
                console.info(`Updated rate supporting document ${doc.id}`)
            }
        } catch (error) {
            console.error(
                `Error processing rate supporting document ${doc.id}:`,
                error
            )
        }
    }

    console.info('All document types processed successfully')
}

/**
 * Finds the most recent database dump file in the S3 bucket
 * @returns The S3 key of the latest dump file
 */
async function findLatestDbDumpFile(): Promise<string> {
    console.info(`Listing files in s3://${S3_BUCKET}/${S3_PREFIX}/...`)

    const listResult = await s3Client.send(
        new ListObjectsV2Command({
            Bucket: S3_BUCKET,
            Prefix: S3_PREFIX,
        })
    )

    if (!listResult.Contents || listResult.Contents.length === 0) {
        throw new Error(
            `No dump files found in s3://${S3_BUCKET}/${S3_PREFIX}/`
        )
    }

    // Sort by last modified date, newest first
    const sortedFiles = listResult.Contents.sort((a: _Object, b: _Object) => {
        return (
            (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0)
        )
    })

    const latestDumpKey = sortedFiles[0].Key
    if (!latestDumpKey) {
        throw new Error('Failed to determine latest dump file key')
    }

    console.info(`Latest dump file: ${latestDumpKey}`)
    return latestDumpKey
}

/**
 * Downloads a file from S3 to the local filesystem
 * @param s3Key The S3 key of the file to download
 * @param localPath The local path to save the file to
 */
async function downloadS3File(
    s3Key: string,
    localPath: string,
    bucket: string
): Promise<void> {
    console.info(`Downloading s3://${bucket}/${s3Key} to ${localPath}...`)

    try {
        const getObjectCommand = new GetObjectCommand({
            Bucket: bucket,
            Key: s3Key,
        })

        const response = await s3Client.send(getObjectCommand)

        if (!response.Body) {
            throw new Error(`Empty response body from S3 for key: ${s3Key}`)
        }

        // Create a write stream to the file
        const fileStream = fs.createWriteStream(localPath)

        // Pipe the response body to the file stream
        // @ts-expect-error - AWS SDK types don't fully represent the pipe capability
        response.Body.pipe(fileStream)

        // Wait for the file to be fully written
        await new Promise<void>((resolve, reject) => {
            fileStream.on('finish', resolve)
            fileStream.on('error', reject)
        })

        console.info(`File downloaded successfully to ${localPath}`)
    } catch (error) {
        console.error('Error downloading file from S3:', error)
        throw new Error(
            `Failed to download file: ${error instanceof Error ? error.message : String(error)}`
        )
    }
}

/**
 * Get database credentials from Secrets Manager
 */
async function getDatabaseCredentials(): Promise<SecretDict> {
    if (!DB_SECRET_ARN) {
        throw new Error('DB_SECRET_ARN environment variable is not set')
    }

    console.info(`Getting secrets from ${DB_SECRET_ARN}...`)
    const sm = new SecretsManager()
    const dbCredentials: SecretDict = await sm.getSecretDict(
        DB_SECRET_ARN,
        'AWSCURRENT'
    )

    if (!dbCredentials || !dbCredentials.host) {
        throw new Error(
            `Invalid database credentials from secret ${DB_SECRET_ARN}`
        )
    }

    return dbCredentials
}

/**
 * Reset the database using the Prisma CLI
 */
async function resetDatabase(dbCredentials: SecretDict): Promise<void> {
    console.info('Resetting database using Prisma CLI...')

    try {
        // Set DATABASE_URL environment variable for Prisma
        process.env.DATABASE_URL = `postgresql://${dbCredentials.username}:${encodeURIComponent(dbCredentials.password)}@${dbCredentials.host}:${dbCredentials.port}/${dbCredentials.dbname}`

        const prismaBinary = '/opt/nodejs/node_modules/prisma/build/index.js'

        console.info(`Using Prisma CLI binary at: ${prismaBinary}`)

        // Make sure we have a schema.prisma file
        const schemaPath = '/opt/nodejs/prisma/schema.prisma'

        if (!fs.existsSync(schemaPath)) {
            throw new Error('Prisma schema not found at: ' + schemaPath)
        }

        // Run Prisma CLI command to reset the database
        // We need to use Node to execute the CLI since we may not have direct access to the binary
        const command = `${prismaBinary} migrate reset --force --schema=${schemaPath}`

        console.info(`Executing command: ${command}`)
        const prismaResult = execSync(command, {
            stdio: 'inherit',
            env: {
                ...process.env,
                DATABASE_URL: process.env.DATABASE_URL,
            },
        })

        console.info(
            `Database reset successfully using Prisma CLI: ${prismaResult}`
        )
    } catch (error) {
        const err = new Error(
            'Error resetting database with Prisma CLI:',
            error
        )
        console.error(err)
        throw err
    }
}

/**
 * Import the database dump file into PostgreSQL
 * @param dumpFilePath Path to the dump file
 * @param dbCredentials Database credentials
 */
function importDatabase(dumpFilePath: string, dbCredentials: SecretDict): void {
    const dbname = dbCredentials.dbname || 'postgres'
    const port = dbCredentials.port || '5432'

    console.info(`Importing database dump from ${dumpFilePath}...`)

    try {
        // Construct the psql command to import
        const psqlCmd = [
            'psql',
            `-h ${dbCredentials.host}`,
            `-p ${port}`,
            `-U ${dbCredentials.username}`,
            `-d ${dbname}`,
            `-f ${dumpFilePath}`,
            // Add the ON_ERROR_STOP flag to ensure psql stops on errors
            `-v ON_ERROR_STOP=1`,
        ].join(' ')

        // Execute psql with specific options for import
        process.env.PGPASSWORD = dbCredentials.password
        execSync(psqlCmd, {
            stdio: 'inherit',
            env: {
                ...process.env,
                PGOPTIONS: '-c client_min_messages=warning', // Reduce verbose output
            },
        })

        console.info('Database import completed successfully')
    } catch (error) {
        console.error('Error executing psql import:', error)
        throw new Error(
            `Database import failed: ${error instanceof Error ? error.message : String(error)}`
        )
    } finally {
        // Clear password from environment
        delete process.env.PGPASSWORD
    }
}

/**
 * Initialize Prisma client with database credentials
 */
async function initializePrisma(
    dbCredentials: SecretDict
): Promise<PrismaClient> {
    // Set DATABASE_URL environment variable for Prisma
    process.env.DATABASE_URL = `postgresql://${dbCredentials.username}:${encodeURIComponent(dbCredentials.password)}@${dbCredentials.host}:${dbCredentials.port}/${dbCredentials.dbname}`

    // Initialize Prisma client
    const prisma = new PrismaClient()

    // Test connection
    await prisma.$connect()
    console.info('Prisma connected to database successfully')

    return prisma
}

/**
 * Lambda handler function
 * Orchestrates the process of importing the database and replacing documents
 */
export const handler = async () => {
    console.info(
        'Starting combined database import and document replacement process...'
    )

    if (!S3_BUCKET) {
        throw new Error('S3_BUCKET environment variable is not set')
    }

    if (!DOCS_S3_BUCKET) {
        throw new Error('DOCS_S3_BUCKET environment variable is not set')
    }

    let prisma: PrismaClient | null = null

    try {
        // Get the database credentials
        const dbCredentials = await getDatabaseCredentials()

        // --- PHASE 1: DATABASE IMPORT ---
        console.info('Starting database import phase...')

        // Find the latest dump file in S3
        const latestDumpKey = await findLatestDbDumpFile()
        const dumpFilename = path.basename(latestDumpKey)
        const dumpFilePath = path.join(TMP_DIR, dumpFilename)

        // Download the dump file to the Lambda's temp directory
        await downloadS3File(latestDumpKey, dumpFilePath, S3_BUCKET)

        // Drop the existing database and create a fresh one
        await resetDatabase(dbCredentials)

        // Import the database dump
        importDatabase(dumpFilePath, dbCredentials)

        // Clean up temporary files
        if (fs.existsSync(dumpFilePath)) {
            fs.unlinkSync(dumpFilePath)
        }

        // Initialize Prisma after the database is populated
        prisma = await initializePrisma(dbCredentials)

        console.info('Database import phase completed successfully')

        // --- PHASE 2: DOCUMENT REPLACEMENT ---
        console.info('Starting document replacement phase...')

        // Process and replace all documents
        await processAllDocuments(prisma)

        console.info('Document replacement phase completed successfully')

        // Return success
        return {
            statusCode: 200,
            body: JSON.stringify({
                message:
                    'Combined database import and document replacement completed successfully',
                importedFile: dumpFilename,
                databaseName: dbCredentials.dbname || 'postgres',
            }),
        }
    } catch (err) {
        console.error('Error in combined import process:', err)

        // Make sure we clean up the password from environment in case of error
        delete process.env.PGPASSWORD

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error during combined import process',
                error: err instanceof Error ? err.message : String(err),
            }),
        }
    } finally {
        // Disconnect Prisma if connected
        if (prisma) {
            await prisma.$disconnect()
        }
    }
}

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
import axios from 'axios'

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

// URLs to public domain PDFs
const PUBLIC_DOMAIN_PDF_URLS = [
    'https://www.postgresql.org/files/documentation/pdf/17/postgresql-17-A4.pdf',
    'https://www.dhammatalks.org/Archive/Writings/Ebooks/Dhammapada200129.pdf',
    'https://www.planetebook.com/free-ebooks/anna-karenina.pdf',
    'https://www.planetebook.com/free-ebooks/the-iliad.pdf',
    'https://www.planetebook.com/free-ebooks/dracula.pdf',
]

// Cache to track downloaded PDFs
const pdfCache: Record<string, string> = {}

/**
 * Download a file from a URL to a local path using Axios
 * @param url The URL to download
 * @param destPath The local path to save the file to
 * @returns Promise that resolves when download is complete
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
    try {
        console.info(`Downloading file from ${url}...`)

        // Make a GET request with Axios, setting responseType to 'arraybuffer' for binary files
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 30000, // 30 second timeout
            headers: {
                'User-Agent': 'Mozilla/5.0 (Node.js Lambda Function)',
            },
        })

        // Write the response data to the file
        fs.writeFileSync(destPath, response.data)

        console.info(`Successfully downloaded file to ${destPath}`)
    } catch (error) {
        // Clean up the partial file if it exists
        if (fs.existsSync(destPath)) {
            fs.unlinkSync(destPath)
        }

        // Re-throw the error with additional context
        console.error(`Error downloading file from ${url}:`, error)
        throw new Error(
            `Failed to download file: ${error instanceof Error ? error.message : String(error)}`
        )
    }
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
 * Execute a PostgreSQL command with proper error handling
 * @param command The command to execute
 * @param description Description of what the command does (for error messages)
 * @param dbCredentials Database credentials
 * @returns The output of the command
 */
function executeDbCommand(
    command: string,
    description: string,
    dbCredentials: SecretDict
): string {
    try {
        // Set environment variables for psql
        process.env.PGPASSWORD = dbCredentials.password

        // Execute the command
        const result = execSync(command, { encoding: 'utf8' })
        return result
    } catch (error) {
        console.error(`Error ${description}:`, error)
        throw new Error(
            `Failed to ${description}: ${error instanceof Error ? error.message : String(error)}`
        )
    }
}

/**
 * Prepare the database for import (create if needed, drop existing tables)
 * @param dbCredentials Database credentials
 */
function prepareDatabase(dbCredentials: SecretDict): void {
    const dbname = dbCredentials.dbname || 'postgres'
    const port = dbCredentials.port || '5432'

    console.info('Checking if database exists...')

    // Check if database exists
    const checkDbCmd = [
        'psql',
        `-h ${dbCredentials.host}`,
        `-p ${port}`,
        `-U ${dbCredentials.username}`,
        `-d postgres`,
        `-c "SELECT 1 FROM pg_database WHERE datname = '${dbname}';"`,
    ].join(' ')

    const dbCheckResult = executeDbCommand(
        checkDbCmd,
        'check if database exists',
        dbCredentials
    )

    // If database doesn't exist, create it
    if (!dbCheckResult.includes('(1 row)')) {
        console.info(`Database ${dbname} does not exist, creating it...`)
        const createDbCmd = [
            'psql',
            `-h ${dbCredentials.host}`,
            `-p ${port}`,
            `-U ${dbCredentials.username}`,
            `-d postgres`,
            `-c "CREATE DATABASE ${dbname};"`,
        ].join(' ')

        executeDbCommand(createDbCmd, 'create database', dbCredentials)
        console.info(`Database ${dbname} created successfully`)
    } else {
        console.info(`Database ${dbname} already exists`)
    }

    // Check if database is empty or has tables already
    const checkTablesCmd = [
        'psql',
        `-h ${dbCredentials.host}`,
        `-p ${port}`,
        `-U ${dbCredentials.username}`,
        `-d ${dbname}`,
        `-c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"`,
    ].join(' ')

    const tableCheckResult = executeDbCommand(
        checkTablesCmd,
        'check existing tables',
        dbCredentials
    )
    const tableCount = parseInt(
        tableCheckResult.trim().split('\n')[2].trim(),
        10
    )

    if (tableCount > 0) {
        console.info(
            `Database ${dbname} has ${tableCount} existing tables. They will be replaced during import.`
        )

        // Drop all existing tables for a clean import
        const dropAllTablesCmd = [
            'psql',
            `-h ${dbCredentials.host}`,
            `-p ${port}`,
            `-U ${dbCredentials.username}`,
            `-d ${dbname}`,
            `-c "DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE'; END LOOP; END $$;"`,
        ].join(' ')

        executeDbCommand(
            dropAllTablesCmd,
            'drop existing tables',
            dbCredentials
        )
        console.info('Dropped all existing tables for clean import')
    } else {
        console.info(`Database ${dbname} is empty and ready for import`)
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
 * Calculate SHA-256 hash for a file
 */
function calculateFileSha256(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath)
    const hashSum = createHash('sha256')
    hashSum.update(fileBuffer)
    return hashSum.digest('hex')
}

/**
 * Get a replacement PDF URL based on document ID
 */
function getReplacementPDFUrl(documentId: string): string {
    // Use the document ID to deterministically select a PDF URL
    const hash = createHash('md5').update(documentId).digest('hex')
    const hashNum = parseInt(hash.substring(0, 8), 16)
    const selectedIndex = hashNum % PUBLIC_DOMAIN_PDF_URLS.length

    return PUBLIC_DOMAIN_PDF_URLS[selectedIndex]
}

/**
 * Download a PDF from a URL to the Lambda's /tmp directory with caching
 */
async function downloadPDF(url: string): Promise<string> {
    // Create a unique cache key for this PDF URL
    const cacheKey = url

    // If we've already downloaded this PDF, return the cached path
    if (pdfCache[cacheKey]) {
        console.info(`Using cached PDF for ${url} at ${pdfCache[cacheKey]}`)
        return pdfCache[cacheKey]
    }

    // Create a temporary filename for the PDF
    const urlHash = createHash('md5').update(url).digest('hex').substring(0, 8)
    const filename = `${urlHash}-${path.basename(url)}`
    const filePath = path.join(TMP_DIR, filename)

    // If the file already exists on disk (from a previous invocation that didn't set the cache)
    if (fs.existsSync(filePath)) {
        console.info(`PDF already exists at ${filePath}, using cached version`)
        pdfCache[cacheKey] = filePath
        return filePath
    }

    console.info(`Downloading PDF from ${url} to ${filePath}...`)

    try {
        await downloadFile(url, filePath)
        console.info(`PDF downloaded successfully to ${filePath}`)

        // Cache the file path
        pdfCache[cacheKey] = filePath

        return filePath
    } catch (error) {
        console.error(`Error downloading PDF from ${url}:`, error)
        throw new Error(
            `Failed to download PDF: ${error instanceof Error ? error.message : String(error)}`
        )
    }
}

/**
 * Replace a document in S3 with a public domain PDF
 */
async function replaceDocument(
    documentId: string,
    s3Url: string,
    originalFilename: string
): Promise<{ newSha256: string; replaced: boolean }> {
    try {
        // Extract the S3 key from the S3 URL
        const s3Key = s3Url.replace(
            `https://${DOCS_S3_BUCKET}.s3.amazonaws.com/`,
            ''
        )

        // Get replacement document URL
        const replacementPDFUrl = getReplacementPDFUrl(documentId)

        // Download the PDF (or get from cache)
        const pdfPath = await downloadPDF(replacementPDFUrl)

        // Calculate SHA-256 of the replacement file
        const newSha256 = calculateFileSha256(pdfPath)

        // Read the replacement file
        const fileContent = fs.readFileSync(pdfPath)

        // Determine content type (always PDF for now)
        const contentType = CONTENT_TYPES.pdf

        // Upload to S3
        await s3Client.send(
            new PutObjectCommand({
                Bucket: DOCS_S3_BUCKET,
                Key: s3Key,
                Body: fileContent,
                ContentType: contentType,
                ContentDisposition: `attachment; filename="${originalFilename}"`,
            })
        )

        console.info(`Replaced document ${documentId} at ${s3Key}`)
        return { newSha256, replaced: true }
    } catch (error) {
        console.error(`Error replacing document ${documentId}:`, error)
        return { newSha256: '', replaced: false }
    }
}

/**
 * Process and replace all documents in the database using Prisma
 */
async function processAllDocuments(prisma: PrismaClient): Promise<void> {
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

    // Process ContractQuestionDocument (no SHA update needed)
    console.info('Processing ContractQuestionDocument files...')
    const contractQuestionDocuments =
        await prisma.contractQuestionDocument.findMany()
    console.info(
        `Found ${contractQuestionDocuments.length} contract question documents`
    )

    for (const doc of contractQuestionDocuments) {
        try {
            await replaceDocument(doc.id, doc.s3URL, doc.name)
            console.info(`Updated contract question document ${doc.id}`)
        } catch (error) {
            console.error(
                `Error processing contract question document ${doc.id}:`,
                error
            )
        }
    }

    // Process ContractQuestionResponseDocument (no SHA update needed)
    console.info('Processing ContractQuestionResponseDocument files...')
    const contractQuestionResponseDocuments =
        await prisma.contractQuestionResponseDocument.findMany()
    console.info(
        `Found ${contractQuestionResponseDocuments.length} contract question response documents`
    )

    for (const doc of contractQuestionResponseDocuments) {
        try {
            await replaceDocument(doc.id, doc.s3URL, doc.name)
            console.info(
                `Updated contract question response document ${doc.id}`
            )
        } catch (error) {
            console.error(
                `Error processing contract question response document ${doc.id}:`,
                error
            )
        }
    }

    // Process RateQuestionDocument (no SHA update needed)
    console.info('Processing RateQuestionDocument files...')
    const rateQuestionDocuments = await prisma.rateQuestionDocument.findMany()
    console.info(
        `Found ${rateQuestionDocuments.length} rate question documents`
    )

    for (const doc of rateQuestionDocuments) {
        try {
            await replaceDocument(doc.id, doc.s3URL, doc.name)
            console.info(`Updated rate question document ${doc.id}`)
        } catch (error) {
            console.error(
                `Error processing rate question document ${doc.id}:`,
                error
            )
        }
    }

    // Process RateQuestionResponseDocument (no SHA update needed)
    console.info('Processing RateQuestionResponseDocument files...')
    const rateQuestionResponseDocuments =
        await prisma.rateQuestionResponseDocument.findMany()
    console.info(
        `Found ${rateQuestionResponseDocuments.length} rate question response documents`
    )

    for (const doc of rateQuestionResponseDocuments) {
        try {
            await replaceDocument(doc.id, doc.s3URL, doc.name)
            console.info(`Updated rate question response document ${doc.id}`)
        } catch (error) {
            console.error(
                `Error processing rate question response document ${doc.id}:`,
                error
            )
        }
    }

    console.info('All document types processed successfully')
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

    // Get the database credentials
    const dbCredentials = await getDatabaseCredentials()
    const prisma = await initializePrisma(dbCredentials)

    try {
        // --- PHASE 1: DATABASE IMPORT ---

        // Find the latest dump file in S3
        const latestDumpKey = await findLatestDbDumpFile()
        const dumpFilename = path.basename(latestDumpKey)
        const dumpFilePath = path.join(TMP_DIR, dumpFilename)

        // Download the dump file to the Lambda's temp directory
        await downloadS3File(latestDumpKey, dumpFilePath, S3_BUCKET)

        // Prepare the database for import
        prepareDatabase(dbCredentials)

        // Import the database dump
        importDatabase(dumpFilePath, dbCredentials)

        // Clean up temporary files
        fs.unlinkSync(dumpFilePath)
        console.info('Database import phase completed successfully')

        // --- PHASE 2: DOCUMENT REPLACEMENT ---

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

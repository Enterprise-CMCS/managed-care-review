import { SecretsManager } from './secrets'
import * as path from 'path'
import * as fs from 'fs'
import { execSync } from 'child_process'
import {
    S3Client,
    ListObjectsV2Command,
    GetObjectCommand,
    PutObjectCommand,
    DeleteObjectCommand,
    _Object,
} from '@aws-sdk/client-s3'
import { SecretDict } from './types'
import { createHash } from 'crypto'
import { PrismaClient } from '@prisma/client'

// Define a type for our required environment variables
interface RequiredEnvVars {
    S3_BUCKET: string
    DOCS_S3_BUCKET: string
    DB_SECRET_ARN: string
}

/**
 * Validate and return required environment variables with type safety
 */
function getValidatedEnvironment(): RequiredEnvVars {
    const s3Bucket = process.env.S3_BUCKET
    const docsS3Bucket = process.env.DOCS_S3_BUCKET
    const dbSecretArn = process.env.DB_SECRET_ARN

    if (!s3Bucket) {
        throw new Error('Missing required environment variable: S3_BUCKET')
    }
    if (!docsS3Bucket) {
        throw new Error('Missing required environment variable: DOCS_S3_BUCKET')
    }
    if (!dbSecretArn) {
        throw new Error('Missing required environment variable: DB_SECRET_ARN')
    }

    return {
        S3_BUCKET: s3Bucket,
        DOCS_S3_BUCKET: docsS3Bucket,
        DB_SECRET_ARN: dbSecretArn,
    }
}

const ENV = getValidatedEnvironment()

// Update the constants to use the validated environment
const REGION = process.env.AWS_REGION || 'us-east-1'
const S3_BUCKET = ENV.S3_BUCKET
const DOCS_S3_BUCKET = ENV.DOCS_S3_BUCKET
const DB_SECRET_ARN = ENV.DB_SECRET_ARN
const TMP_DIR = '/tmp'
const S3_PREFIX = 'db_dump'
const DRY_RUN = process.env.DRY_RUN === 'true'

<<<<<<< HEAD
=======
// Document processing constants
const PROCESSING_STATE_KEY = 'document_processing_state.json'
const TIME_BUFFER = 60000 // Stop processing 1 minute before timeout

>>>>>>> 542f4a33cad3222cc8fa0f9f1ef955f87c4c4401
const s3Client = new S3Client({ region: REGION })

// Cache to keep track of SHA256 for our mock files (calculated once)
const mockFileSha256Cache: Record<string, string> = {}
let mockFilesVerified = false

<<<<<<< HEAD
=======
// Document processing state interface
interface DocumentProcessingState {
    contractDocuments: { completed: boolean; total: number; processed: number }
    contractSupportingDocuments: {
        completed: boolean
        total: number
        processed: number
    }
    rateDocuments: { completed: boolean; total: number; processed: number }
    rateSupportingDocuments: {
        completed: boolean
        total: number
        processed: number
    }
    contractQuestionDocuments: {
        completed: boolean
        total: number
        processed: number
    }
    contractQuestionResponseDocuments: {
        completed: boolean
        total: number
        processed: number
    }
    rateQuestionDocuments: {
        completed: boolean
        total: number
        processed: number
    }
    rateQuestionResponseDocuments: {
        completed: boolean
        total: number
        processed: number
    }
    allCompleted: boolean
}

>>>>>>> 542f4a33cad3222cc8fa0f9f1ef955f87c4c4401
/**
 * Lambda handler function -- entry point for the lambda
 * Orchestrates the process of importing the database and replacing documents
 */
<<<<<<< HEAD
export const handler = async () => {
=======
export const handler = async (event?: { skipMainProcessing?: boolean }) => {
>>>>>>> 542f4a33cad3222cc8fa0f9f1ef955f87c4c4401
    console.info('Starting database import and document replacement process...')

    if (DRY_RUN) {
        console.info('DRY RUN MODE - No changes will be made')
    }

    let prisma: PrismaClient | null = null
    let latestDumpKey: string | null = null

    try {
        // Get DB credentials
        const dbCredentials = await getDatabaseCredentials()

        // Initialize Prisma
        prisma = await initializePrisma(dbCredentials)

<<<<<<< HEAD
        // Find latest dump file
        latestDumpKey = await findLatestDbDumpFile()
        const dumpFilename = path.basename(latestDumpKey)
        const dumpFilePath = path.join(TMP_DIR, dumpFilename)

        // Download the dump file
        await downloadS3File(latestDumpKey, dumpFilePath, S3_BUCKET)

        // Import database (this will overwrite all existing data)
        await importDatabase(dumpFilePath, dbCredentials)

        // Sanitize email addresses
        await sanitizeEmailAddresses(prisma)

        // Sanitize names
        await sanitizeUserNames(prisma)

        // Validate email sanitization
        await validateEmailSanitization(prisma)

        // Validate the import
        await validateImport(prisma)

        // Process and replace all documents
        await processAllDocuments(prisma)

        // Clean up the S3 export file after successful import
        if (latestDumpKey && !DRY_RUN) {
            await cleanupS3Export(latestDumpKey)
        }

        // Cleanup local temp file
        if (fs.existsSync(dumpFilePath)) {
            fs.unlinkSync(dumpFilePath)
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message:
                    'Database import and document replacement completed successfully. Val users will be created automatically on first login.',
                importedFile: dumpFilename,
                cleanedUpS3File: latestDumpKey,
            }),
=======
        // Check if we should skip the main processing (for document-only runs)
        if (!event?.skipMainProcessing) {
            // Find latest dump file
            latestDumpKey = await findLatestDbDumpFile()
            const dumpFilename = path.basename(latestDumpKey)
            const dumpFilePath = path.join(TMP_DIR, dumpFilename)

            // Download the dump file
            await downloadS3File(latestDumpKey, dumpFilePath, S3_BUCKET)

            // Import database (this will overwrite all existing data)
            await importDatabase(dumpFilePath, dbCredentials)

            // Sanitize email addresses
            await sanitizeEmailAddresses(prisma)

            // Sanitize names
            await sanitizeUserNames(prisma)

            // Validate email sanitization
            await validateEmailSanitization(prisma)

            // Validate the import
            await validateImport(prisma)

            // Cleanup local temp file
            if (fs.existsSync(dumpFilePath)) {
                fs.unlinkSync(dumpFilePath)
            }
        }

        // Process documents (resumable)
        const { completed, shouldContinue } =
            await processAllDocumentsResumable(prisma)

        if (completed) {
            // Clean up the S3 export file after successful completion
            if (latestDumpKey && !DRY_RUN) {
                await cleanupS3Export(latestDumpKey)
            }

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message:
                        'Database import and document replacement completed successfully. Val users will be created automatically on first login.',
                    importedFile: latestDumpKey
                        ? path.basename(latestDumpKey)
                        : 'resumed',
                    cleanedUpS3File: latestDumpKey,
                    documentsCompleted: true,
                }),
            }
        } else {
            return {
                statusCode: 202, // Accepted but not complete
                body: JSON.stringify({
                    message:
                        'Document processing in progress. Run lambda again to continue.',
                    documentsCompleted: false,
                    shouldContinue: shouldContinue,
                }),
            }
>>>>>>> 542f4a33cad3222cc8fa0f9f1ef955f87c4c4401
        }
    } catch (err) {
        console.error('Error in import process:', err)
        delete process.env.PGPASSWORD

<<<<<<< HEAD
        // Don't clean up S3 file if import failed - might need it for debugging
        console.info('Import failed - preserving S3 export file for debugging')

=======
>>>>>>> 542f4a33cad3222cc8fa0f9f1ef955f87c4c4401
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error during import process',
                error: err instanceof Error ? err.message : String(err),
                preservedS3File: latestDumpKey,
            }),
        }
    } finally {
        if (prisma) await prisma.$disconnect()
    }
}

/**
<<<<<<< HEAD
=======
 * Save processing state to S3
 */
async function saveProcessingState(
    state: DocumentProcessingState
): Promise<void> {
    try {
        await s3Client.send(
            new PutObjectCommand({
                Bucket: S3_BUCKET,
                Key: PROCESSING_STATE_KEY,
                Body: JSON.stringify(
                    {
                        ...state,
                        lastUpdated: new Date().toISOString(),
                    },
                    null,
                    2
                ),
                ContentType: 'application/json',
            })
        )
        console.info('Saved processing state to S3')
    } catch (error) {
        console.warn('Failed to save processing state:', error)
    }
}

/**
 * Load processing state from S3
 */
async function loadProcessingState(): Promise<DocumentProcessingState | null> {
    try {
        const response = await s3Client.send(
            new GetObjectCommand({
                Bucket: S3_BUCKET,
                Key: PROCESSING_STATE_KEY,
            })
        )

        if (response.Body) {
            const stateJson = await response.Body.transformToString()
            return JSON.parse(stateJson) as DocumentProcessingState
        }
    } catch (error) {
        console.info(
            `No existing processing state found, starting fresh: ${error}`
        )
    }
    return null
}

/**
 * Initialize processing state
 */
async function initializeProcessingState(
    prisma: PrismaClient
): Promise<DocumentProcessingState> {
    const [
        contractDocs,
        contractSupportingDocs,
        rateDocs,
        rateSupportingDocs,
        contractQuestionDocs,
        contractQuestionResponseDocs,
        rateQuestionDocs,
        rateQuestionResponseDocs,
    ] = await Promise.all([
        prisma.contractDocument.count(),
        prisma.contractSupportingDocument.count(),
        prisma.rateDocument.count(),
        prisma.rateSupportingDocument.count(),
        prisma.contractQuestionDocument.count(),
        prisma.contractQuestionResponseDocument.count(),
        prisma.rateQuestionDocument.count(),
        prisma.rateQuestionResponseDocument.count(),
    ])

    return {
        contractDocuments: {
            completed: false,
            total: contractDocs,
            processed: 0,
        },
        contractSupportingDocuments: {
            completed: false,
            total: contractSupportingDocs,
            processed: 0,
        },
        rateDocuments: { completed: false, total: rateDocs, processed: 0 },
        rateSupportingDocuments: {
            completed: false,
            total: rateSupportingDocs,
            processed: 0,
        },
        contractQuestionDocuments: {
            completed: false,
            total: contractQuestionDocs,
            processed: 0,
        },
        contractQuestionResponseDocuments: {
            completed: false,
            total: contractQuestionResponseDocs,
            processed: 0,
        },
        rateQuestionDocuments: {
            completed: false,
            total: rateQuestionDocs,
            processed: 0,
        },
        rateQuestionResponseDocuments: {
            completed: false,
            total: rateQuestionResponseDocs,
            processed: 0,
        },
        allCompleted: false,
    }
}

/**
 * Process documents with timeout checking - simplified version
 */
async function processDocuments<
    T extends { id: string; s3URL: string; name: string },
>(
    documents: T[],
    updateFunction: (doc: T, newSha256: string) => Promise<void>,
    startTime: number,
    hassha256: boolean = true
): Promise<{ processed: number; shouldStop: boolean }> {
    let processed = 0

    for (const doc of documents) {
        // Check if we're running out of time
        const elapsed = Date.now() - startTime
        if (elapsed > 900000 - TIME_BUFFER) {
            // 900000ms = 15 minutes
            console.info(
                `Stopping due to time limit. Processed ${processed}/${documents.length}`
            )
            return { processed, shouldStop: true }
        }

        try {
            const { newSha256, replaced } = await replaceDocument(
                doc.id,
                doc.s3URL,
                doc.name
            )

            if (replaced && hassha256) {
                await updateFunction(doc, newSha256)
            }

            processed++

            if (processed % 100 === 0) {
                console.info(`Progress: ${processed}/${documents.length}`)
            }
        } catch (error) {
            console.error(`Error processing document ${doc.id}:`, error)
        }
    }

    return { processed, shouldStop: false }
}

/**
 * Enhanced document processing with resumability
 */
async function processAllDocumentsResumable(
    prisma: PrismaClient
): Promise<{ completed: boolean; shouldContinue: boolean }> {
    if (DRY_RUN) {
        console.info('DRY RUN: Skipping document processing')
        return { completed: true, shouldContinue: false }
    }

    const startTime = Date.now()

    // Load or initialize processing state
    let state = await loadProcessingState()
    if (!state) {
        state = await initializeProcessingState(prisma)
        console.info('Initialized new processing state:', state)
    } else {
        console.info('Resuming from saved processing state:', state)
    }

    // Verify mock files exist
    await verifyMockFiles()

    // Process each document type in order
    const documentTypes = [
        {
            name: 'contractDocuments',
            query: () =>
                prisma.contractDocument.findMany({
                    skip: state!.contractDocuments.processed,
                    orderBy: { id: 'asc' },
                }),
            update: async (
                doc: { id: string; s3URL: string; name: string },
                newSha256: string
            ) => {
                await prisma.contractDocument.update({
                    where: { id: doc.id },
                    data: { sha256: newSha256 },
                })
            },
            hassha256: true,
        },
        {
            name: 'contractSupportingDocuments',
            query: () =>
                prisma.contractSupportingDocument.findMany({
                    skip: state!.contractSupportingDocuments.processed,
                    orderBy: { id: 'asc' },
                }),
            update: async (
                doc: { id: string; s3URL: string; name: string },
                newSha256: string
            ) => {
                await prisma.contractSupportingDocument.update({
                    where: { id: doc.id },
                    data: { sha256: newSha256 },
                })
            },
            hassha256: true,
        },
        {
            name: 'rateDocuments',
            query: () =>
                prisma.rateDocument.findMany({
                    skip: state!.rateDocuments.processed,
                    orderBy: { id: 'asc' },
                }),
            update: async (
                doc: { id: string; s3URL: string; name: string },
                newSha256: string
            ) => {
                await prisma.rateDocument.update({
                    where: { id: doc.id },
                    data: { sha256: newSha256 },
                })
            },
            hassha256: true,
        },
        {
            name: 'rateSupportingDocuments',
            query: () =>
                prisma.rateSupportingDocument.findMany({
                    skip: state!.rateSupportingDocuments.processed,
                    orderBy: { id: 'asc' },
                }),
            update: async (
                doc: { id: string; s3URL: string; name: string },
                newSha256: string
            ) => {
                await prisma.rateSupportingDocument.update({
                    where: { id: doc.id },
                    data: { sha256: newSha256 },
                })
            },
            hassha256: true,
        },
        {
            name: 'contractQuestionDocuments',
            query: () =>
                prisma.contractQuestionDocument.findMany({
                    skip: state!.contractQuestionDocuments.processed,
                    orderBy: { id: 'asc' },
                }),
            update: async () => {
                // No SHA256 update needed
            },
            hassha256: false,
        },
        {
            name: 'contractQuestionResponseDocuments',
            query: () =>
                prisma.contractQuestionResponseDocument.findMany({
                    skip: state!.contractQuestionResponseDocuments.processed,
                    orderBy: { id: 'asc' },
                }),
            update: async () => {
                // No SHA256 update needed
            },
            hassha256: false,
        },
        {
            name: 'rateQuestionDocuments',
            query: () =>
                prisma.rateQuestionDocument.findMany({
                    skip: state!.rateQuestionDocuments.processed,
                    orderBy: { id: 'asc' },
                }),
            update: async () => {
                // No SHA256 update needed
            },
            hassha256: false,
        },
        {
            name: 'rateQuestionResponseDocuments',
            query: () =>
                prisma.rateQuestionResponseDocument.findMany({
                    skip: state!.rateQuestionResponseDocuments.processed,
                    orderBy: { id: 'asc' },
                }),
            update: async () => {
                // No SHA256 update needed
            },
            hassha256: false,
        },
    ]

    // Process each document type
    for (const docType of documentTypes) {
        const stateKey = docType.name as keyof Omit<
            DocumentProcessingState,
            'allCompleted'
        >

        if (state[stateKey].completed) {
            console.info(`${docType.name} already completed, skipping...`)
            continue
        }

        console.info(
            `Processing ${docType.name}... (${state[stateKey].processed}/${state[stateKey].total} completed)`
        )

        // Get remaining documents for this type
        const documents = await docType.query()

        if (documents.length === 0) {
            state[stateKey].completed = true
            console.info(`✅ ${docType.name} completed!`)
            await saveProcessingState(state)
            continue
        }

        // Process all remaining documents for this type
        const { processed, shouldStop } = await processDocuments(
            documents,
            docType.update,
            startTime,
            docType.hassha256
        )

        state[stateKey].processed += processed
        console.info(
            `${docType.name}: ${state[stateKey].processed}/${state[stateKey].total} completed`
        )

        // Save progress
        await saveProcessingState(state)

        if (shouldStop) {
            console.info('Stopping due to time limit - progress saved')
            return { completed: false, shouldContinue: true }
        }

        if (state[stateKey].processed >= state[stateKey].total) {
            state[stateKey].completed = true
            console.info(`✅ ${docType.name} completed!`)
        } else {
            // If we didn't finish this type, we'll continue next time
            return { completed: false, shouldContinue: true }
        }
    }

    // Mark all as completed
    state.allCompleted = true
    await saveProcessingState(state)

    console.info('🎉 All document types processed successfully!')
    return { completed: true, shouldContinue: false }
}

/**
>>>>>>> 542f4a33cad3222cc8fa0f9f1ef955f87c4c4401
 * Validate the import was successful
 */
async function validateImport(prisma: PrismaClient): Promise<void> {
    console.info('Validating import...')

    // Check that we have states
    const stateCount = await prisma.state.count()
    if (stateCount === 0) {
        throw new Error('Import validation failed: No states found')
    }

    // Check that we have some data (contracts, rates, etc.)
    const contractCount = await prisma.contractTable.count()
    const rateCount = await prisma.rateTable.count()

    console.info(
        `Validation passed: ${stateCount} states, ${contractCount} contracts, ${rateCount} rates`
    )
    console.info(
        'Note: Val users will be created automatically when they first log in'
    )
}

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
<<<<<<< HEAD
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
=======
>>>>>>> 542f4a33cad3222cc8fa0f9f1ef955f87c4c4401
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
 * Import database from dump file
 */
async function importDatabase(
    dumpFilePath: string,
    dbCredentials: SecretDict
): Promise<void> {
    const dbname = dbCredentials.dbname || 'postgres'
    const port = dbCredentials.port || '5432'

    console.info(`Importing database dump from ${dumpFilePath}...`)

    if (DRY_RUN) {
        console.info('DRY RUN: Skipping actual database import')
        return
    }

    try {
        const importCmd = `psql -h ${dbCredentials.host} -p ${port} -U ${dbCredentials.username} -d ${dbname} -f ${dumpFilePath}`

        process.env.PGPASSWORD = dbCredentials.password
        console.info(`Executing import command: ${importCmd}`)

        execSync(importCmd, {
            stdio: 'inherit',
            env: { ...process.env },
        })

        console.info('Database import completed successfully')
    } catch (error) {
        console.error('Error executing database import:', error)
        throw new Error(`Database import failed: ${error.message}`)
    } finally {
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

// Predefined lists of fake names for generation
const FIRST_NAMES = [
    'Aang',
    'Katara',
    'Sokka',
    'Toph',
    'Zuko',
    'Iroh',
    'Azula',
    'Mai',
    'Ty Lee',
    'Suki',
    'Yue',
    'Jet',
    'Haru',
    'Bumi',
]

const LAST_NAMES = [
    'Beifong',
    'Bei Fong',
    'Fire Lord',
    'Earth King',
    'Chief',
    'Avatar',
    'Jasmine Dragon',
    'Kyoshi Warrior',
    'Equalist',
    'Metal Clan',
    'Earth Empire',
    'Ba Sing Se',
    'Omashu',
    'Gaoling',
]

/**
 * Generate a consistent fake name based on input string
 * Same input will always produce same fake name
 */
function generateFakeName(originalName: string): string {
    if (!originalName || originalName.trim() === '') {
        return originalName
    }

    // Create hash from original name for consistency
    const hash = createHash('md5')
        .update(originalName.toLowerCase())
        .digest('hex')

    // Use hash to select first and last names deterministically
    const firstIndex = parseInt(hash.substring(0, 4), 16) % FIRST_NAMES.length
    const lastIndex = parseInt(hash.substring(4, 8), 16) % LAST_NAMES.length

    return `${FIRST_NAMES[firstIndex]} ${LAST_NAMES[lastIndex]}`
}

/**
 * Sanitize user names, state contacts, and actuary contacts
 */
async function sanitizeUserNames(prisma: PrismaClient): Promise<void> {
    if (DRY_RUN) {
        console.info('DRY RUN: Skipping name sanitization')
        return
    }

    console.info('Starting user name sanitization...')

    // 1. Sanitize all User names (val users will be recreated on first login)
    console.info('Sanitizing User names...')
    const users = await prisma.user.findMany()

    // Batch update users using transaction
    const userUpdates = users.map((user) => {
        const fullName = `${user.givenName} ${user.familyName}`.trim()
        const fakeName = generateFakeName(fullName)
        const [fakeFirst, ...fakeLastParts] = fakeName.split(' ')
        const fakeLast = fakeLastParts.join(' ') || 'Doe'

        return prisma.user.update({
            where: { id: user.id },
            data: {
                givenName: fakeFirst,
                familyName: fakeLast,
            },
        })
    })

    await prisma.$transaction(userUpdates)
    console.info(`Updated ${users.length} user names`)

    // 2. StateContact table - name field
    console.info('Sanitizing StateContact names...')
    const stateContacts = await prisma.stateContact.findMany({
        where: { name: { not: null } },
    })

    const stateContactUpdates = stateContacts.map((contact) => {
        const fakeName = generateFakeName(contact.name!)
        return prisma.stateContact.update({
            where: { id: contact.id },
            data: { name: fakeName },
        })
    })

    await prisma.$transaction(stateContactUpdates)
    console.info(`Updated ${stateContacts.length} state contact names`)

    // 3. ActuaryContact table - name field
    console.info('Sanitizing ActuaryContact names...')
    const actuaryContacts = await prisma.actuaryContact.findMany({
        where: { name: { not: null } },
    })

    const actuaryContactUpdates = actuaryContacts.map((contact) => {
        const fakeName = generateFakeName(contact.name!)
        return prisma.actuaryContact.update({
            where: { id: contact.id },
            data: { name: fakeName },
        })
    })

    await prisma.$transaction(actuaryContactUpdates)
    console.info(`Updated ${actuaryContacts.length} actuary contact names`)

    console.info('User name sanitization completed')
}

// Content types for document uploads
const CONTENT_TYPES = {
    pdf: 'application/pdf',
    csv: 'text/csv',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

// Paths to local mock files for each supported type
const MOCK_FILE_PATHS = {
    pdf: {
        small: path.join(__dirname, '../files/mock-s.pdf'),
        medium: path.join(__dirname, '../files/mock-m.pdf'),
    },
    csv: {
        small: path.join(__dirname, '../files/mock-s.csv'),
        medium: path.join(__dirname, '../files/mock-m.csv'),
    },
    doc: {
        small: path.join(__dirname, '../files/mock-s.doc'),
        medium: path.join(__dirname, '../files/mock-m.doc'),
    },
    docx: {
        small: path.join(__dirname, '../files/mock-s.docx'),
        medium: path.join(__dirname, '../files/mock-m.docx'),
    },
    xls: {
        small: path.join(__dirname, '../files/mock-s.xls'),
        medium: path.join(__dirname, '../files/mock-m.xls'),
    },
    xlsx: {
        small: path.join(__dirname, '../files/mock-s.xlsx'),
        medium: path.join(__dirname, '../files/mock-m.xlsx'),
    },
}

/**
 * Verify all mock files exist
 */
async function verifyMockFiles(): Promise<void> {
    if (mockFilesVerified) return

    Object.entries(MOCK_FILE_PATHS).forEach(([fileType, sizes]) => {
        Object.entries(sizes).forEach(([size, filePath]) => {
            if (!fs.existsSync(filePath)) {
                console.error(
                    `ERROR: Mock ${fileType} file not found at ${filePath}`
                )
                throw new Error(`Mock ${fileType} file missing: ${filePath}`)
            } else {
                console.info(
                    `Verified mock ${fileType} (${size}) exists: ${filePath}`
                )
                const sha256 = calculateFileSha256(filePath)
                console.info(`${fileType} (${size}) SHA256: ${sha256}`)
            }
        })
    })

    mockFilesVerified = true
}

/**
 * Determine file type from filename or content type
 */
function getFileTypeFromName(filename: string): string {
    const ext = path.extname(filename).toLowerCase()
    const typeMap: Record<string, string> = {
        '.pdf': 'pdf',
        '.csv': 'csv',
        '.doc': 'doc',
        '.docx': 'docx',
        '.xls': 'xls',
        '.xlsx': 'xlsx',
    }
    return typeMap[ext] || 'pdf' // fallback to PDF
}

/**
 * Get a mock file path based on document ID and file type
 * Uses deterministic selection to ensure consistent replacement
 */
function getMockFilePath(documentId: string, fileType: string): string {
    // Use the document ID to deterministically select a mock file size
    const hash = createHash('md5').update(documentId).digest('hex')
    const hashNum = parseInt(hash.substring(0, 8), 16)

    // 50% chance of small, 50% chance of medium
    const size = hashNum % 2 === 0 ? 'small' : 'medium'

    // Get the file paths for this type
    const filePaths = MOCK_FILE_PATHS[fileType as keyof typeof MOCK_FILE_PATHS]
    if (!filePaths) {
        console.warn(
            `No mock files found for type ${fileType}, falling back to PDF`
        )
        return MOCK_FILE_PATHS.pdf[size]
    }

    return filePaths[size as keyof typeof filePaths]
}

/**
 * Replace a document in S3 with a mock file of the appropriate type
 */
async function replaceDocument(
    documentId: string,
    s3Url: string,
    originalFilename: string
): Promise<{ newSha256: string; replaced: boolean }> {
    if (DRY_RUN) {
        console.info(`DRY RUN: Would replace document ${documentId}`)
        return { newSha256: 'dry-run-hash', replaced: true }
    }

    try {
        console.info(`Processing document ID: ${documentId}`)
        console.info(`Original S3 URL: ${s3Url}`)
        console.info(`Original filename: ${originalFilename}`)

        // Determine file type from original filename
        const fileType = getFileTypeFromName(originalFilename)
        console.info(`Detected file type: ${fileType}`)

        // Extract bucket and UUID part from the S3 URL
        let bucket: string
        let uuidPart: string

        if (s3Url.startsWith('s3://')) {
            const parts = s3Url.substring(5).split('/', 1)
            bucket = parts[0]
            const fullPath = s3Url.substring(5 + bucket.length + 1)
            uuidPart = fullPath.split('/')[0]
            console.info(`Extracted UUID part: ${uuidPart}`)
        } else {
            console.error(`Cannot parse S3 URL: ${s3Url}`)
            return { newSha256: '', replaced: false }
        }

        if (!bucket || !uuidPart) {
            console.error(
                `Invalid bucket or UUID part: bucket=${bucket}, uuidPart=${uuidPart}`
            )
            return { newSha256: '', replaced: false }
        }

        bucket = DOCS_S3_BUCKET ?? ''
        const finalKey = `allusers/${uuidPart}`

        console.info(`Target S3 location: s3://${bucket}/${finalKey}`)

        // Get mock file path for the appropriate type
        const mockFilePath = getMockFilePath(documentId, fileType)
        console.info(`Using mock file: ${mockFilePath}`)

        // Calculate SHA-256 of the mock file
        const newSha256 = calculateFileSha256(mockFilePath)

        // Read the mock file
        const fileContent = fs.readFileSync(mockFilePath)

        // Determine content type
        const contentType =
            CONTENT_TYPES[fileType as keyof typeof CONTENT_TYPES] ||
            CONTENT_TYPES.pdf

        // Upload to S3
        await s3Client.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: finalKey,
                Body: fileContent,
                ContentType: contentType,
                ContentDisposition: `attachment; filename="${originalFilename}"`,
            })
        )

        console.info(
            `Successfully replaced document ${documentId} at s3://${bucket}/${finalKey}`
        )
        return { newSha256, replaced: true }
    } catch (error) {
        console.error(`Error replacing document ${documentId}:`, error)
        return { newSha256: '', replaced: false }
    }
}

/**
<<<<<<< HEAD
 * Process and replace all documents in the database using Prisma
 */
async function processAllDocuments(prisma: PrismaClient): Promise<void> {
    if (DRY_RUN) {
        console.info('DRY RUN: Skipping document processing')
        return
    }

    // Verify mock files exist
    await verifyMockFiles()

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
                doc.name // Original filename determines file type
            )
            if (replaced) {
                await prisma.contractDocument.update({
                    where: { id: doc.id },
                    data: { sha256: newSha256 },
                })
                console.info(
                    `Updated contract document ${doc.id} (${doc.name})`
                )
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
                doc.name // Original filename determines file type
            )
            if (replaced) {
                await prisma.contractSupportingDocument.update({
                    where: { id: doc.id },
                    data: { sha256: newSha256 },
                })
                console.info(
                    `Updated contract supporting document ${doc.id} (${doc.name})`
                )
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
                doc.name // Original filename determines file type
            )
            if (replaced) {
                await prisma.rateDocument.update({
                    where: { id: doc.id },
                    data: { sha256: newSha256 },
                })
                console.info(`Updated rate document ${doc.id} (${doc.name})`)
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
                console.info(
                    `Updated rate supporting document ${doc.id} (${doc.name})`
                )
            }
        } catch (error) {
            console.error(
                `Error processing rate supporting document ${doc.id}:`,
                error
            )
        }
    }

    // Process ContractQuestionDocument
    // Note: Q&A documents don't have a sha256 field
    console.info('Processing ContractQuestionDocument files...')
    const contractQuestionDocuments =
        await prisma.contractQuestionDocument.findMany()
    console.info(
        `Found ${contractQuestionDocuments.length} contract question documents`
    )

    for (const doc of contractQuestionDocuments) {
        try {
            const { replaced } = await replaceDocument(
                doc.id,
                doc.s3URL,
                doc.name
            )
            if (replaced) {
                // No SHA256 update needed for question documents
                console.info(
                    `Replaced contract question document ${doc.id} (${doc.name})`
                )
            }
        } catch (error) {
            console.error(
                `Error processing contract question document ${doc.id}:`,
                error
            )
        }
    }

    // Process ContractQuestionResponseDocument
    console.info('Processing ContractQuestionResponseDocument files...')
    const contractQuestionResponseDocuments =
        await prisma.contractQuestionResponseDocument.findMany()
    console.info(
        `Found ${contractQuestionResponseDocuments.length} contract question response documents`
    )

    for (const doc of contractQuestionResponseDocuments) {
        try {
            const { replaced } = await replaceDocument(
                doc.id,
                doc.s3URL,
                doc.name
            )
            if (replaced) {
                console.info(
                    `Replaced contract question response document ${doc.id} (${doc.name})`
                )
            }
        } catch (error) {
            console.error(
                `Error processing contract question response document ${doc.id}:`,
                error
            )
        }
    }

    // Process RateQuestionDocument
    console.info('Processing RateQuestionDocument files...')
    const rateQuestionDocuments = await prisma.rateQuestionDocument.findMany()
    console.info(
        `Found ${rateQuestionDocuments.length} rate question documents`
    )

    for (const doc of rateQuestionDocuments) {
        try {
            const { replaced } = await replaceDocument(
                doc.id,
                doc.s3URL,
                doc.name
            )
            if (replaced) {
                console.info(
                    `Replaced rate question document ${doc.id} (${doc.name})`
                )
            }
        } catch (error) {
            console.error(
                `Error processing rate question document ${doc.id}:`,
                error
            )
        }
    }

    // Process RateQuestionResponseDocument
    console.info('Processing RateQuestionResponseDocument files...')
    const rateQuestionResponseDocuments =
        await prisma.rateQuestionResponseDocument.findMany()
    console.info(
        `Found ${rateQuestionResponseDocuments.length} rate question response documents`
    )

    for (const doc of rateQuestionResponseDocuments) {
        try {
            const { replaced } = await replaceDocument(
                doc.id,
                doc.s3URL,
                doc.name
            )
            if (replaced) {
                console.info(
                    `Replaced rate question response document ${doc.id} (${doc.name})`
                )
            }
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
=======
>>>>>>> 542f4a33cad3222cc8fa0f9f1ef955f87c4c4401
 * Sanitize email addresses to use example.com domain
 */
function sanitizeEmail(email: string): string {
    if (!email || email.indexOf('@') === -1) return email

    // Keep the username but change the domain to mc-review.example.com
    const [username] = email.split('@')
    return `${username}@mc-review.example.com`
}

/**
 * Sanitize all email addresses in the database
 * No need to preserve val users - they'll be recreated on first login
 */
async function sanitizeEmailAddresses(prisma: PrismaClient): Promise<void> {
    if (DRY_RUN) {
        console.info('DRY RUN: Skipping email sanitization')
        return
    }

    console.info('Starting email address sanitization...')

    // 1. Sanitize ALL User emails (no exclusions needed)
    console.info('Sanitizing User emails...')
    const users = await prisma.user.findMany()

    const userEmailUpdates = users.map((user) => {
        const sanitizedEmail = sanitizeEmail(user.email)
        return prisma.user.update({
            where: { id: user.id },
            data: { email: sanitizedEmail },
        })
    })

    await prisma.$transaction(userEmailUpdates)
    console.info(`Updated ${users.length} user emails`)

    // 2. Sanitize StateContact emails
    console.info('Sanitizing StateContact emails...')
    const stateContacts = await prisma.stateContact.findMany({
        where: { email: { not: null } },
    })

    const stateContactEmailUpdates = stateContacts.map((contact) => {
        const sanitizedEmail = sanitizeEmail(contact.email!)
        return prisma.stateContact.update({
            where: { id: contact.id },
            data: { email: sanitizedEmail },
        })
    })

    await prisma.$transaction(stateContactEmailUpdates)
    console.info(`Updated ${stateContacts.length} state contact emails`)

    // 3. Sanitize ActuaryContact emails
    console.info('Sanitizing ActuaryContact emails...')
    const actuaryContacts = await prisma.actuaryContact.findMany({
        where: { email: { not: null } },
    })

    const actuaryContactEmailUpdates = actuaryContacts.map((contact) => {
        const sanitizedEmail = sanitizeEmail(contact.email!)
        return prisma.actuaryContact.update({
            where: { id: contact.id },
            data: { email: sanitizedEmail },
        })
    })

    await prisma.$transaction(actuaryContactEmailUpdates)
    console.info(`Updated ${actuaryContacts.length} actuary contact emails`)

    // 4. Sanitize EmailSettings
    console.info('Sanitizing EmailSettings...')
    const emailSettings = await prisma.emailSettings.findMany()

    for (const settings of emailSettings) {
        const updates: Partial<{
            emailSource: string
            devReviewTeamEmails: string[]
            cmsReviewHelpEmailAddress: string[]
            cmsRateHelpEmailAddress: string[]
            oactEmails: string[]
            dmcpReviewEmails: string[]
            dmcpSubmissionEmails: string[]
            dmcoEmails: string[]
            helpDeskEmail: string[]
        }> = {}

        // Sanitize single email fields
        if (settings.emailSource) {
            updates.emailSource = sanitizeEmail(settings.emailSource)
        }

        // Sanitize array email fields
        if (
            settings.devReviewTeamEmails &&
            settings.devReviewTeamEmails.length > 0
        ) {
            updates.devReviewTeamEmails =
                settings.devReviewTeamEmails.map(sanitizeEmail)
        }

        if (
            settings.cmsReviewHelpEmailAddress &&
            settings.cmsReviewHelpEmailAddress.length > 0
        ) {
            updates.cmsReviewHelpEmailAddress =
                settings.cmsReviewHelpEmailAddress.map(sanitizeEmail)
        }

        if (
            settings.cmsRateHelpEmailAddress &&
            settings.cmsRateHelpEmailAddress.length > 0
        ) {
            updates.cmsRateHelpEmailAddress =
                settings.cmsRateHelpEmailAddress.map(sanitizeEmail)
        }

        if (settings.oactEmails && settings.oactEmails.length > 0) {
            updates.oactEmails = settings.oactEmails.map(sanitizeEmail)
        }

        if (settings.dmcpReviewEmails && settings.dmcpReviewEmails.length > 0) {
            updates.dmcpReviewEmails =
                settings.dmcpReviewEmails.map(sanitizeEmail)
        }

        if (
            settings.dmcpSubmissionEmails &&
            settings.dmcpSubmissionEmails.length > 0
        ) {
            updates.dmcpSubmissionEmails =
                settings.dmcpSubmissionEmails.map(sanitizeEmail)
        }

        if (settings.dmcoEmails && settings.dmcoEmails.length > 0) {
            updates.dmcoEmails = settings.dmcoEmails.map(sanitizeEmail)
        }

        if (settings.helpDeskEmail && settings.helpDeskEmail.length > 0) {
            updates.helpDeskEmail = settings.helpDeskEmail.map(sanitizeEmail)
        }

        // Only update if we have changes
        if (Object.keys(updates).length > 0) {
            await prisma.emailSettings.update({
                where: { id: settings.id },
                data: updates,
            })
            console.info(`Updated EmailSettings ${settings.id}`)
        }
    }

    console.info('Email address sanitization completed')
}

/**
 * Validate that all emails have been properly sanitized
 * Excludes null, empty strings, and whitespace-only emails (legitimate "no contact" cases)
 */
async function validateEmailSanitization(prisma: PrismaClient): Promise<void> {
    console.info('Validating email sanitization...')

    // Check User emails - User.email is required (String), so no null check needed
    const invalidUserEmails = await prisma.user.findMany({
        where: {
            AND: [
                { email: { not: '' } },
                { email: { contains: '@' } }, // Must contain @ to be a valid email
                {
                    NOT: {
                        OR: [
                            { email: { contains: '@mc-review.example.com' } },
                            { email: { contains: '@example.com' } },
                            { email: { contains: '@truss.works' } },
                        ],
                    },
                },
            ],
        },
        select: { email: true, id: true },
    })

    if (invalidUserEmails.length > 0) {
        console.error(
            `Found ${invalidUserEmails.length} users with invalid email domains:`
        )
        invalidUserEmails.forEach((user) =>
            console.error(`  User ${user.id}: ${user.email}`)
        )
        throw new Error(
<<<<<<< HEAD
            `Email sanitization validation failed: ${invalidUserEmails.length} Users with invalid domains found`
=======
            'Email sanitization validation failed: Users with invalid domains found'
>>>>>>> 542f4a33cad3222cc8fa0f9f1ef955f87c4c4401
        )
    }

    // Check StateContact emails - StateContact.email is optional (String?), so need null check
    const invalidStateContactEmails = await prisma.stateContact.findMany({
        where: {
            AND: [
                { email: { not: null } },
                { email: { not: '' } },
                { email: { contains: '@' } }, // Must contain @ to be a valid email
                {
                    NOT: {
                        OR: [
                            { email: { contains: '@mc-review.example.com' } },
                            { email: { contains: '@example.com' } },
                            { email: { contains: '@truss.works' } },
                        ],
                    },
                },
            ],
        },
        select: { email: true, id: true },
    })

    if (invalidStateContactEmails.length > 0) {
        console.error(
            `Found ${invalidStateContactEmails.length} state contacts with invalid email domains:`
        )
        invalidStateContactEmails.forEach((contact) =>
            console.error(`  StateContact ${contact.id}: ${contact.email}`)
        )
        throw new Error(
            'Email sanitization validation failed: StateContacts with invalid domains found'
        )
    }

    // Check ActuaryContact emails - ActuaryContact.email is optional (String?), so need null check
    const invalidActuaryContactEmails = await prisma.actuaryContact.findMany({
        where: {
            AND: [
                { email: { not: null } },
                { email: { not: '' } },
                { email: { contains: '@' } }, // Must contain @ to be a valid email
                {
                    NOT: {
                        OR: [
                            { email: { contains: '@mc-review.example.com' } },
                            { email: { contains: '@example.com' } },
                            { email: { contains: '@truss.works' } },
                        ],
                    },
                },
            ],
        },
        select: { email: true, id: true },
    })

    if (invalidActuaryContactEmails.length > 0) {
        console.error(
            `Found ${invalidActuaryContactEmails.length} actuary contacts with invalid email domains:`
        )
        invalidActuaryContactEmails.forEach((contact) =>
            console.error(`  ActuaryContact ${contact.id}: ${contact.email}`)
        )
        throw new Error(
            'Email sanitization validation failed: ActuaryContacts with invalid domains found'
        )
    }

    console.info(
        'Email sanitization validation passed - all emails use allowed domains'
    )
}

/**
 * Clean up the S3 export file after successful import
 */
async function cleanupS3Export(s3Key: string): Promise<void> {
    try {
        console.info(`Cleaning up S3 export file: s3://${S3_BUCKET}/${s3Key}`)

        await s3Client.send(
            new DeleteObjectCommand({
                Bucket: S3_BUCKET,
                Key: s3Key,
            })
        )

        console.info(`Successfully deleted S3 export file: ${s3Key}`)
    } catch (error) {
        // Log the error but don't fail the whole import process
        console.error(`Failed to delete S3 export file ${s3Key}:`, error)
        console.info('Import completed successfully despite cleanup failure')
    }
}

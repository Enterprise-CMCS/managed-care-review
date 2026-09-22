/**
 * Lambda handler to reconcile persisted S3 locations with the CDK buckets.
 *
 * For each noncanonical document or zip record, this handler verifies the
 * object exists in the configured bucket. If it only exists in the legacy
 * bucket, the object is copied before the database pointer is updated. The
 * deprecated s3URL is rewritten too because clients still round-trip it.
 *
 * Runs are idempotent: existing target objects are reused, and database
 * pointers change only after the target object is confirmed.
 *
 * Canonical buckets are determined from environment variables:
 * - VITE_APP_S3_DOCUMENTS_BUCKET: contract/rate documents and zips
 * - VITE_APP_S3_QA_BUCKET: question/response documents
 *
 * Usage:
 *   aws lambda invoke --function-name app-api-{stage}-migrate-s3-urls response.json
 *
 * With options:
 *   aws lambda invoke --function-name app-api-{stage}-migrate-s3-urls \
 *     --payload '{"limit":100,"dryRun":true}' response.json
 */

import type { Handler } from 'aws-lambda'
import {
    CopyObjectCommand,
    GetObjectTaggingCommand,
    S3Client,
} from '@aws-sdk/client-s3'
import {
    NewPrismaClient,
    type ExtendedPrismaClient,
} from '../postgres/prismaClient'
import { getPostgresURL } from './configuration'
import { parseErrorToError } from '@mc-review/helpers'

const migrationS3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
})

export type MigrateS3UrlsEvent = {
    limit?: number // Optional: limit number of documents to migrate per table (default: all)
    dryRun?: boolean // Optional: just count, don't actually migrate (default: false)
}

export type MigrateS3UrlsResponse = {
    success: boolean
    dryRun: boolean
    documentsBucket: string
    qaBucket: string
    results: {
        contractDocuments: {
            processed: number
            failed: number
        }
        contractSupportingDocuments: {
            processed: number
            failed: number
        }
        rateDocuments: {
            processed: number
            failed: number
        }
        rateSupportingDocuments: {
            processed: number
            failed: number
        }
        contractQuestionDocuments: {
            processed: number
            failed: number
        }
        contractQuestionResponseDocuments: {
            processed: number
            failed: number
        }
        rateQuestionDocuments: {
            processed: number
            failed: number
        }
        rateQuestionResponseDocuments: {
            processed: number
            failed: number
        }
        documentZipPackages: {
            processed: number
            failed: number
        }
    }
    errors: string[]
}

/**
 * Extract the S3 key from the malformed s3URL
 * Input: s3://uploads-prod-uploads-123/ceffb382-434e-4e31-a421-7372f2ce6726.pdf/Specialty AHF.pdf
 * Output: allusers/ceffb382-434e-4e31-a421-7372f2ce6726.pdf
 */
function extractS3KeyFromMalformedUrl(s3URL: string): string | Error {
    try {
        // s3URL format: s3://bucket-name/uuid.ext/original-filename.ext
        const parts = s3URL.split('/')
        if (parts.length < 4) {
            return new Error(`Invalid s3URL format (too few parts): ${s3URL}`)
        }

        // parts[0] = "s3:"
        // parts[1] = ""
        // parts[2] = "bucket-name"
        // parts[3] = "uuid.ext"
        // parts[4+] = "original-filename.ext" (may contain slashes)

        const uuidWithExtension = parts[3]
        if (!uuidWithExtension) {
            return new Error(`Could not extract UUID from s3URL: ${s3URL}`)
        }

        return `allusers/${uuidWithExtension}`
    } catch (error) {
        return error instanceof Error
            ? error
            : new Error(`Unknown error parsing s3URL: ${s3URL}`)
    }
}

export const main: Handler = async (
    event: MigrateS3UrlsEvent = {}
): Promise<MigrateS3UrlsResponse> => {
    const dryRun = event?.dryRun ?? false
    const limit = event?.limit

    // Get bucket names from environment variables
    const documentsBucket = process.env.VITE_APP_S3_DOCUMENTS_BUCKET
    const qaBucket = process.env.VITE_APP_S3_QA_BUCKET

    if (!documentsBucket) {
        throw new Error(
            'VITE_APP_S3_DOCUMENTS_BUCKET environment variable is required'
        )
    }

    if (!qaBucket) {
        throw new Error(
            'VITE_APP_S3_QA_BUCKET environment variable is required'
        )
    }

    console.info('Starting S3 location reconciliation', {
        dryRun,
        limit,
        documentsBucket,
        qaBucket,
    })

    // Get configuration from environment variables
    const dbURL = process.env.DATABASE_URL
    const secretsManagerSecret = process.env.SECRETS_MANAGER_SECRET

    if (!dbURL) {
        throw new Error('Init Error: DATABASE_URL is required')
    }

    // Get database connection URL
    const dbConnResult = await getPostgresURL(dbURL, secretsManagerSecret)
    if (dbConnResult instanceof Error) {
        throw new Error(`Init Error: failed to get pg URL: ${dbConnResult}`)
    }

    const dbConnectionURL: string = dbConnResult

    // Initialize Prisma client
    const prismaClientResult = await NewPrismaClient(dbConnectionURL)
    if (prismaClientResult instanceof Error) {
        throw new Error(
            `Init Error: failed to create Prisma client: ${prismaClientResult}`
        )
    }

    const migrationPrismaClient =
        createMigrationPrismaClient(prismaClientResult)

    const response: MigrateS3UrlsResponse = {
        success: true,
        dryRun,
        documentsBucket,
        qaBucket,
        results: {
            contractDocuments: { processed: 0, failed: 0 },
            contractSupportingDocuments: {
                processed: 0,
                failed: 0,
            },
            rateDocuments: { processed: 0, failed: 0 },
            rateSupportingDocuments: { processed: 0, failed: 0 },
            contractQuestionDocuments: { processed: 0, failed: 0 },
            contractQuestionResponseDocuments: {
                processed: 0,
                failed: 0,
            },
            rateQuestionDocuments: { processed: 0, failed: 0 },
            rateQuestionResponseDocuments: {
                processed: 0,
                failed: 0,
            },
            documentZipPackages: { processed: 0, failed: 0 },
        },
        errors: [],
    }

    try {
        // Migrate ContractDocument (uses DOCUMENTS bucket)
        console.info('Migrating ContractDocument...')
        const contractDocsResult = await migrateDocumentTable(
            migrationPrismaClient,
            'contractDocument',
            documentsBucket,
            limit,
            dryRun
        )
        response.results.contractDocuments = contractDocsResult
        if (contractDocsResult.failed > 0) {
            response.errors.push(
                `ContractDocument: ${contractDocsResult.failed} failures`
            )
        }

        // Migrate ContractSupportingDocument (uses DOCUMENTS bucket)
        console.info('Migrating ContractSupportingDocument...')
        const contractSupportingDocsResult = await migrateDocumentTable(
            migrationPrismaClient,
            'contractSupportingDocument',
            documentsBucket,
            limit,
            dryRun
        )
        response.results.contractSupportingDocuments =
            contractSupportingDocsResult
        if (contractSupportingDocsResult.failed > 0) {
            response.errors.push(
                `ContractSupportingDocument: ${contractSupportingDocsResult.failed} failures`
            )
        }

        // Migrate RateDocument (uses DOCUMENTS bucket)
        console.info('Migrating RateDocument...')
        const rateDocsResult = await migrateDocumentTable(
            migrationPrismaClient,
            'rateDocument',
            documentsBucket,
            limit,
            dryRun
        )
        response.results.rateDocuments = rateDocsResult
        if (rateDocsResult.failed > 0) {
            response.errors.push(
                `RateDocument: ${rateDocsResult.failed} failures`
            )
        }

        // Migrate RateSupportingDocument (uses DOCUMENTS bucket)
        console.info('Migrating RateSupportingDocument...')
        const rateSupportingDocsResult = await migrateDocumentTable(
            migrationPrismaClient,
            'rateSupportingDocument',
            documentsBucket,
            limit,
            dryRun
        )
        response.results.rateSupportingDocuments = rateSupportingDocsResult
        if (rateSupportingDocsResult.failed > 0) {
            response.errors.push(
                `RateSupportingDocument: ${rateSupportingDocsResult.failed} failures`
            )
        }

        // Migrate ContractQuestionDocument (uses QA bucket)
        console.info('Migrating ContractQuestionDocument...')
        const contractQuestionDocsResult = await migrateDocumentTable(
            migrationPrismaClient,
            'contractQuestionDocument',
            qaBucket,
            limit,
            dryRun
        )
        response.results.contractQuestionDocuments = contractQuestionDocsResult
        if (contractQuestionDocsResult.failed > 0) {
            response.errors.push(
                `ContractQuestionDocument: ${contractQuestionDocsResult.failed} failures`
            )
        }

        // Migrate ContractQuestionResponseDocument (uses QA bucket)
        console.info('Migrating ContractQuestionResponseDocument...')
        const contractQuestionResponseDocsResult = await migrateDocumentTable(
            migrationPrismaClient,
            'contractQuestionResponseDocument',
            qaBucket,
            limit,
            dryRun
        )
        response.results.contractQuestionResponseDocuments =
            contractQuestionResponseDocsResult
        if (contractQuestionResponseDocsResult.failed > 0) {
            response.errors.push(
                `ContractQuestionResponseDocument: ${contractQuestionResponseDocsResult.failed} failures`
            )
        }

        // Migrate RateQuestionDocument (uses QA bucket)
        console.info('Migrating RateQuestionDocument...')
        const rateQuestionDocsResult = await migrateDocumentTable(
            migrationPrismaClient,
            'rateQuestionDocument',
            qaBucket,
            limit,
            dryRun
        )
        response.results.rateQuestionDocuments = rateQuestionDocsResult
        if (rateQuestionDocsResult.failed > 0) {
            response.errors.push(
                `RateQuestionDocument: ${rateQuestionDocsResult.failed} failures`
            )
        }

        // Migrate RateQuestionResponseDocument (uses QA bucket)
        console.info('Migrating RateQuestionResponseDocument...')
        const rateQuestionResponseDocsResult = await migrateDocumentTable(
            migrationPrismaClient,
            'rateQuestionResponseDocument',
            qaBucket,
            limit,
            dryRun
        )
        response.results.rateQuestionResponseDocuments =
            rateQuestionResponseDocsResult
        if (rateQuestionResponseDocsResult.failed > 0) {
            response.errors.push(
                `RateQuestionResponseDocument: ${rateQuestionResponseDocsResult.failed} failures`
            )
        }

        // Migrate DocumentZipPackage (uses DOCUMENTS bucket)
        console.info('Migrating DocumentZipPackage...')
        const documentZipPackagesResult = await migrateZipTable(
            migrationPrismaClient,
            documentsBucket,
            limit,
            dryRun
        )
        response.results.documentZipPackages = documentZipPackagesResult
        if (documentZipPackagesResult.failed > 0) {
            response.errors.push(
                `DocumentZipPackage: ${documentZipPackagesResult.failed} failures`
            )
        }

        response.success = response.errors.length === 0
        console.info('Migration complete', response)
        return response
    } catch (error) {
        const errorMessage = parseErrorToError(error).message
        console.error('Migration failed:', errorMessage)
        response.success = false
        response.errors.push(errorMessage)
        return response
    }
    // NOTE: Don't call $disconnect() - we use a singleton pattern to reuse connections
    // across warm Lambda invocations. AWS cleans up when the container terminates.
}

type MigrationS3Client = {
    send(command: GetObjectTaggingCommand | CopyObjectCommand): Promise<unknown>
}

type DocumentTableName =
    | 'contractDocument'
    | 'contractSupportingDocument'
    | 'rateDocument'
    | 'rateSupportingDocument'
    | 'contractQuestionDocument'
    | 'contractQuestionResponseDocument'
    | 'rateQuestionDocument'
    | 'rateQuestionResponseDocument'

type MigratableDocument = {
    id: string
    s3URL: string
    name: string
    s3BucketName: string | null
    s3Key: string | null
}

type MigratableZip = Omit<MigratableDocument, 'name'>

type MigrationCandidateFilter =
    | { s3BucketName: null }
    | { s3BucketName: { not: string } }
    | { s3Key: null }
    | { s3Key: { not: { startsWith: string } } }
    | { s3URL: { not: { startsWith: string } } }

type MigrationLocationUpdate = {
    where: { id: string }
    data: {
        s3URL: string
        s3BucketName: string
        s3Key: string
    }
}

type DocumentTableDelegate = {
    findMany(args: {
        where: { OR: MigrationCandidateFilter[] }
        select: {
            id: true
            s3URL: true
            name: true
            s3BucketName: true
            s3Key: true
        }
        take: number | undefined
    }): Promise<MigratableDocument[]>
    update(args: MigrationLocationUpdate): Promise<unknown>
}

type ZipTableDelegate = {
    findMany(args: {
        where: { OR: MigrationCandidateFilter[] }
        select: {
            id: true
            s3URL: true
            s3BucketName: true
            s3Key: true
        }
        take: number | undefined
    }): Promise<MigratableZip[]>
    update(args: MigrationLocationUpdate): Promise<unknown>
}

export type MigrationPrismaClient = Record<
    DocumentTableName,
    DocumentTableDelegate
> & {
    documentZipPackage: ZipTableDelegate
}

/**
 * Adapts each concrete Prisma model delegate independently. Keeping these
 * wrappers explicit lets TypeScript verify every generated delegate signature
 * without casting the Prisma client to a shared structural type.
 */
function createMigrationPrismaClient(
    prismaClient: ExtendedPrismaClient
): MigrationPrismaClient {
    return {
        contractDocument: {
            findMany: (args) => prismaClient.contractDocument.findMany(args),
            update: (args) => prismaClient.contractDocument.update(args),
        },
        contractSupportingDocument: {
            findMany: (args) =>
                prismaClient.contractSupportingDocument.findMany(args),
            update: (args) =>
                prismaClient.contractSupportingDocument.update(args),
        },
        rateDocument: {
            findMany: (args) => prismaClient.rateDocument.findMany(args),
            update: (args) => prismaClient.rateDocument.update(args),
        },
        rateSupportingDocument: {
            findMany: (args) =>
                prismaClient.rateSupportingDocument.findMany(args),
            update: (args) => prismaClient.rateSupportingDocument.update(args),
        },
        contractQuestionDocument: {
            findMany: (args) =>
                prismaClient.contractQuestionDocument.findMany(args),
            update: (args) =>
                prismaClient.contractQuestionDocument.update(args),
        },
        contractQuestionResponseDocument: {
            findMany: (args) =>
                prismaClient.contractQuestionResponseDocument.findMany(args),
            update: (args) =>
                prismaClient.contractQuestionResponseDocument.update(args),
        },
        rateQuestionDocument: {
            findMany: (args) =>
                prismaClient.rateQuestionDocument.findMany(args),
            update: (args) => prismaClient.rateQuestionDocument.update(args),
        },
        rateQuestionResponseDocument: {
            findMany: (args) =>
                prismaClient.rateQuestionResponseDocument.findMany(args),
            update: (args) =>
                prismaClient.rateQuestionResponseDocument.update(args),
        },
        documentZipPackage: {
            findMany: (args) => prismaClient.documentZipPackage.findMany(args),
            update: (args) => prismaClient.documentZipPackage.update(args),
        },
    }
}

function extractBucketFromS3URL(s3URL: string): string | Error {
    const parts = s3URL.split('/')
    const bucket = parts[2]
    if (parts[0] !== 's3:' || parts[1] !== '' || !bucket) {
        return new Error(`Invalid s3URL format: ${s3URL}`)
    }
    return bucket
}

function canonicalizeS3URL(
    s3URL: string,
    targetBucket: string
): string | Error {
    const sourceBucket = extractBucketFromS3URL(s3URL)
    if (sourceBucket instanceof Error) {
        return sourceBucket
    }
    return s3URL.replace(/^s3:\/\/[^/]+/, `s3://${targetBucket}`)
}

function isS3NotFoundError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
        return false
    }
    const s3Error = error as {
        name?: string
        $metadata?: { httpStatusCode?: number }
    }
    return (
        s3Error.name === 'NotFound' ||
        s3Error.name === 'NoSuchKey' ||
        s3Error.$metadata?.httpStatusCode === 404
    )
}

async function objectExists(
    s3Client: MigrationS3Client,
    bucket: string,
    key: string
): Promise<boolean> {
    try {
        // HeadObject is authorized as GetObject and can be denied while the
        // GuardDuty scan tag is absent. Tagging lookup verifies existence
        // without bypassing or misclassifying that download policy.
        await s3Client.send(
            new GetObjectTaggingCommand({
                Bucket: bucket,
                Key: key,
            })
        )
        return true
    } catch (error) {
        if (isS3NotFoundError(error)) {
            return false
        }
        throw error
    }
}

/**
 * Makes the target object available before its database pointer can change.
 * Reusing an existing target makes retries safe; a copied object is checked
 * again so a successful copy response alone cannot advance the database.
 */
async function ensureObjectInTargetBucket(
    s3Client: MigrationS3Client,
    sourceBucket: string,
    targetBucket: string,
    key: string
): Promise<void> {
    if (await objectExists(s3Client, targetBucket, key)) {
        return
    }

    if (sourceBucket === targetBucket) {
        throw new Error(
            `Object s3://${targetBucket}/${key} is missing from the canonical bucket`
        )
    }

    const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/')
    await s3Client.send(
        new CopyObjectCommand({
            Bucket: targetBucket,
            Key: key,
            CopySource: `${sourceBucket}/${encodedKey}`,
        })
    )

    if (!(await objectExists(s3Client, targetBucket, key))) {
        throw new Error(
            `Copied object s3://${sourceBucket}/${key} was not found in ${targetBucket}`
        )
    }
}

/**
 * A noncanonical stored bucket is the best source location. When that field is
 * missing or already canonical, the legacy s3URL may still identify the source
 * for a partially migrated record.
 */
function sourceBucketForRecord(
    storedBucket: string | null,
    s3URL: string,
    targetBucket: string
): string | Error {
    if (storedBucket && storedBucket !== targetBucket) {
        return storedBucket
    }
    return extractBucketFromS3URL(s3URL)
}

export async function migrateDocumentTable(
    prismaClient: MigrationPrismaClient,
    tableName: DocumentTableName,
    targetBucket: string,
    limit: number | undefined,
    dryRun: boolean,
    s3Client: MigrationS3Client = migrationS3Client
): Promise<{ processed: number; failed: number }> {
    const result = { processed: 0, failed: 0 }

    // A record is complete only when bucket, key, and deprecated URL all agree.
    // Checking each field catches partial migrations and later client roundtrips.
    const documents = await prismaClient[tableName].findMany({
        where: {
            OR: [
                { s3BucketName: null },
                { s3BucketName: { not: targetBucket } },
                { s3Key: null },
                { s3Key: { not: { startsWith: 'allusers/' } } },
                {
                    s3URL: {
                        not: { startsWith: `s3://${targetBucket}/` },
                    },
                },
            ],
        },
        select: {
            id: true,
            s3URL: true,
            name: true,
            s3BucketName: true,
            s3Key: true,
        },
        take: limit,
    })

    console.info(
        `Found ${documents.length} documents to migrate in ${tableName}`
    )

    for (const doc of documents) {
        try {
            const s3Key =
                doc.s3Key?.startsWith('allusers/') === true
                    ? doc.s3Key
                    : extractS3KeyFromMalformedUrl(doc.s3URL)
            if (s3Key instanceof Error) {
                throw s3Key
            }

            const sourceBucket = sourceBucketForRecord(
                doc.s3BucketName,
                doc.s3URL,
                targetBucket
            )
            if (sourceBucket instanceof Error) {
                throw sourceBucket
            }

            const canonicalS3URL = canonicalizeS3URL(doc.s3URL, targetBucket)
            if (canonicalS3URL instanceof Error) {
                throw canonicalS3URL
            }

            if (dryRun) {
                console.info(
                    `[DRY RUN] Would reconcile ${tableName} ${doc.id} (${doc.name}) from s3://${sourceBucket}/${s3Key} to s3://${targetBucket}/${s3Key}`
                )
                result.processed++
                continue
            }

            await ensureObjectInTargetBucket(
                s3Client,
                sourceBucket,
                targetBucket,
                s3Key
            )

            await prismaClient[tableName].update({
                where: { id: doc.id },
                data: {
                    s3URL: canonicalS3URL,
                    s3BucketName: targetBucket,
                    s3Key,
                },
            })

            result.processed++
            if (result.processed % 100 === 0) {
                console.info(
                    `Progress: ${result.processed}/${documents.length} documents migrated in ${tableName}`
                )
            }
        } catch (error) {
            const errorMessage = parseErrorToError(error).message
            console.error(
                `Failed to migrate ${tableName} ${doc.id}: ${errorMessage}`
            )
            result.failed++
        }
    }

    console.info(`${tableName} migration complete:`, result)
    return result
}

/**
 * Migrate DocumentZipPackage table - zip files are stored in zips/ folder
 * Input: s3://bucket/zips/contracts/uuid/contract-documents.zip
 * Output: s3Key = zips/contracts/uuid/contract-documents.zip
 */
export async function migrateZipTable(
    prismaClient: MigrationPrismaClient,
    targetBucket: string,
    limit: number | undefined,
    dryRun: boolean,
    s3Client: MigrationS3Client = migrationS3Client
): Promise<{ processed: number; failed: number }> {
    const result = { processed: 0, failed: 0 }

    // Zip records use the same completeness rule, with a zips/ key prefix.
    const zips = await prismaClient.documentZipPackage.findMany({
        where: {
            OR: [
                { s3BucketName: null },
                { s3BucketName: { not: targetBucket } },
                { s3Key: null },
                { s3Key: { not: { startsWith: 'zips/' } } },
                {
                    s3URL: {
                        not: { startsWith: `s3://${targetBucket}/` },
                    },
                },
            ],
        },
        select: {
            id: true,
            s3URL: true,
            s3BucketName: true,
            s3Key: true,
        },
        take: limit,
    })

    console.info(
        `Found ${zips.length} zip packages to migrate in DocumentZipPackage`
    )

    for (const zip of zips) {
        try {
            const parts = zip.s3URL.split('/')
            const parsedS3Key = parts.slice(3).join('/')
            const s3Key = zip.s3Key?.startsWith('zips/')
                ? zip.s3Key
                : parsedS3Key
            if (!s3Key.startsWith('zips/')) {
                throw new Error(
                    `Expected zip s3URL to have path starting with 'zips/', got: ${s3Key} for DocumentZipPackage ${zip.id}: ${zip.s3URL}`
                )
            }

            const sourceBucket = sourceBucketForRecord(
                zip.s3BucketName,
                zip.s3URL,
                targetBucket
            )
            if (sourceBucket instanceof Error) {
                throw sourceBucket
            }

            const canonicalS3URL = canonicalizeS3URL(zip.s3URL, targetBucket)
            if (canonicalS3URL instanceof Error) {
                throw canonicalS3URL
            }

            if (dryRun) {
                console.info(
                    `[DRY RUN] Would reconcile DocumentZipPackage ${zip.id} from s3://${sourceBucket}/${s3Key} to s3://${targetBucket}/${s3Key}`
                )
                result.processed++
                continue
            }

            await ensureObjectInTargetBucket(
                s3Client,
                sourceBucket,
                targetBucket,
                s3Key
            )

            await prismaClient.documentZipPackage.update({
                where: { id: zip.id },
                data: {
                    s3URL: canonicalS3URL,
                    s3BucketName: targetBucket,
                    s3Key,
                },
            })

            result.processed++
            if (result.processed % 100 === 0) {
                console.info(
                    `Progress: ${result.processed}/${zips.length} zip packages migrated`
                )
            }
        } catch (error) {
            const errorMessage = parseErrorToError(error).message
            console.error(
                `Failed to migrate DocumentZipPackage ${zip.id}: ${errorMessage}`
            )
            result.failed++
        }
    }

    console.info('DocumentZipPackage migration complete:', result)
    return result
}

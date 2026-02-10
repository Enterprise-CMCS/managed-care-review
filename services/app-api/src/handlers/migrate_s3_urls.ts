/**
 * Lambda handler to migrate s3URL fields to s3BucketName and s3Key
 *
 * This script populates the new s3BucketName and s3Key fields from the existing
 * malformed s3URL values. The s3URL format is: s3://bucket/uuid.ext/filename.ext
 * We extract the uuid.ext part and create proper S3 references.
 *
 * Buckets are determined from environment variables:
 * - VITE_APP_S3_DOCUMENTS_BUCKET: for contract/rate documents and zips
 * - VITE_APP_S3_QA_BUCKET: for question/response documents
 *
 * Usage:
 *   aws lambda invoke --function-name app-api-{stage}-migrate-s3-urls response.json
 *
 * With options:
 *   aws lambda invoke --function-name app-api-{stage}-migrate-s3-urls \
 *     --payload '{"limit":100,"dryRun":true}' response.json
 */

import type { Handler } from 'aws-lambda'
import { NewPrismaClient } from '../postgres/prismaClient'
import { getPostgresURL } from './configuration'

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

    console.info('Starting s3URL migration', {
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

    const prismaClient = prismaClientResult

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
            prismaClient,
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
            prismaClient,
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
            prismaClient,
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
            prismaClient,
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
            prismaClient,
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
            prismaClient,
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
            prismaClient,
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
            prismaClient,
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
            prismaClient,
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

        console.info('Migration complete', response)
        return response
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error)
        console.error('Migration failed:', errorMessage)
        response.success = false
        response.errors.push(errorMessage)
        return response
    } finally {
        await prismaClient.$disconnect()
    }
}

async function migrateDocumentTable(
    prismaClient: any,
    tableName:
        | 'contractDocument'
        | 'contractSupportingDocument'
        | 'rateDocument'
        | 'rateSupportingDocument'
        | 'contractQuestionDocument'
        | 'contractQuestionResponseDocument'
        | 'rateQuestionDocument'
        | 'rateQuestionResponseDocument',
    targetBucket: string,
    limit: number | undefined,
    dryRun: boolean
): Promise<{ processed: number; failed: number }> {
    const result = { processed: 0, failed: 0 }

    // Find all documents that need migration (s3BucketName is null)
    const documents = await prismaClient[tableName].findMany({
        where: {
            s3BucketName: null,
        },
        select: {
            id: true,
            s3URL: true,
            name: true,
        },
        take: limit,
    })

    console.info(
        `Found ${documents.length} documents to migrate in ${tableName}`
    )

    for (const doc of documents) {
        try {
            // Extract s3Key from malformed s3URL
            const s3Key = extractS3KeyFromMalformedUrl(doc.s3URL)

            if (s3Key instanceof Error) {
                console.error(
                    `Failed to extract S3 key for ${tableName} ${doc.id}: ${s3Key.message}`
                )
                result.failed++
                continue
            }

            if (dryRun) {
                console.info(
                    `[DRY RUN] Would update ${tableName} ${doc.id}: s3BucketName="${targetBucket}", s3Key="${s3Key}"`
                )
                result.processed++
                continue
            }

            // Update the document with new fields
            await prismaClient[tableName].update({
                where: { id: doc.id },
                data: {
                    s3BucketName: targetBucket,
                    s3Key: s3Key,
                },
            })

            result.processed++

            if (result.processed % 100 === 0) {
                console.info(
                    `Progress: ${result.processed}/${documents.length} documents migrated in ${tableName}`
                )
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
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
async function migrateZipTable(
    prismaClient: any,
    targetBucket: string,
    limit: number | undefined,
    dryRun: boolean
): Promise<{ processed: number; failed: number }> {
    const result = { processed: 0, failed: 0 }

    // Find all zips that need migration (s3BucketName is null)
    const zips = await prismaClient.documentZipPackage.findMany({
        where: {
            s3BucketName: null,
        },
        select: {
            id: true,
            s3URL: true,
        },
        take: limit,
    })

    console.info(
        `Found ${zips.length} zip packages to migrate in DocumentZipPackage`
    )

    for (const zip of zips) {
        try {
            // Extract the full S3 key from s3URL
            // s3URL format: s3://bucket-name/zips/contracts/uuid/file.zip
            // We want everything after the bucket: zips/contracts/uuid/file.zip
            const parts = zip.s3URL.split('/')
            if (parts.length < 4) {
                console.error(
                    `Invalid s3URL format for DocumentZipPackage ${zip.id}: ${zip.s3URL}`
                )
                result.failed++
                continue
            }

            // parts[0] = 's3:'
            // parts[1] = ''
            // parts[2] = bucket name
            // parts[3+] = the key path
            const keyParts = parts.slice(3) // Everything after bucket
            const s3Key = keyParts.join('/')

            if (!s3Key || !s3Key.startsWith('zips/')) {
                console.error(
                    `Expected zip s3URL to have path starting with 'zips/', got: ${s3Key} for DocumentZipPackage ${zip.id}: ${zip.s3URL}`
                )
                result.failed++
                continue
            }

            if (dryRun) {
                console.info(
                    `[DRY RUN] Would update DocumentZipPackage ${zip.id}: s3BucketName="${targetBucket}", s3Key="${s3Key}"`
                )
                result.processed++
                continue
            }

            // Update the zip package with new fields
            await prismaClient.documentZipPackage.update({
                where: { id: zip.id },
                data: {
                    s3BucketName: targetBucket,
                    s3Key: s3Key,
                },
            })

            result.processed++

            if (result.processed % 100 === 0) {
                console.info(
                    `Progress: ${result.processed}/${zips.length} zips migrated in DocumentZipPackage`
                )
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error)
            console.error(
                `Failed to migrate DocumentZipPackage ${zip.id}: ${errorMessage}`
            )
            result.failed++
        }
    }

    console.info('DocumentZipPackage migration complete:', result)
    return result
}

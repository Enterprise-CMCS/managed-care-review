import type {
    Handler,
    APIGatewayProxyResultV2,
    APIGatewayProxyEventV2,
} from 'aws-lambda'
import { generateDocumentZip } from '../zip'
import { createDocumentZipPackage } from '../postgres/documents/zip'
import { getPostgresURL } from './configuration'
import { initTracer, recordException } from '../../../uploads/src/lib/otel'
import { PrismaClient, type Prisma } from '@prisma/client'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'

interface MigrationConfig {
    dryRun: boolean
    batchSize: number
    stateCode?: string
    maxRuntimeMs?: number
}

interface MigrationStats {
    processedContracts: number
    processedRates: number
    skippedContracts: number
    skippedRates: number
    erroredContracts: number
    erroredRates: number
    timeoutExceeded: boolean
}

// Types that match our Prisma query results
type ContractRevisionWithRelations = Prisma.ContractRevisionTableGetPayload<{
    include: {
        contract: true
        documentZipPackage: true
        contractDocuments: true
        supportingDocuments: true
    }
}>

type RateRevisionWithRelations = Prisma.RateRevisionTableGetPayload<{
    include: {
        rate: true
        documentZipPackage: true
        rateDocuments: true
        supportingDocuments: true
    }
}>

const main: Handler = async (
    event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
    // Setup otel tracing
    const otelCollectorURL = process.env.API_APP_OTEL_COLLECTOR_URL
    if (!otelCollectorURL || otelCollectorURL === '') {
        const errMsg =
            'Configuration Error: API_APP_OTEL_COLLECTOR_URL must be set'
        return fmtError(errMsg)
    }
    const serviceName = 'migrate-document-zips'
    initTracer(serviceName, otelCollectorURL)

    // Get environment variables
    const dbURL = process.env.DATABASE_URL
    const secretsManagerSecret = process.env.SECRETS_MANAGER_SECRET
    const connectTimeout = process.env.CONNECT_TIMEOUT ?? '60'

    if (!dbURL) {
        const errMsg = 'Init Error: DATABASE_URL is required'
        recordException(errMsg, serviceName, 'dbURL')
        return fmtError(errMsg)
    }

    if (!secretsManagerSecret) {
        const errMsg = 'Init Error: SECRETS_MANAGER_SECRET is required'
        recordException(errMsg, serviceName, 'secretsManagerSecret')
        return fmtError(errMsg)
    }

    // Get database connection
    const dbConnResult = await getPostgresURL(dbURL, secretsManagerSecret)
    if (dbConnResult instanceof Error) {
        const errMsg = `Init Error: failed to get pg URL: ${dbConnResult}`
        recordException(errMsg, serviceName, 'getPostgresURL')
        return fmtError(errMsg)
    }

    const dbConnectionURL = dbConnResult + `&connect_timeout=${connectTimeout}`

    // Initialize S3 client for potential cleanup
    const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
    })

    // Parse configuration from query parameters
    const config = parseConfig(event.queryStringParameters || {})

    // Track start time for timeout monitoring
    const startTime = Date.now()

    console.info('Starting document zip migration')
    console.info('Configuration:', JSON.stringify(config))

    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: dbConnectionURL,
            },
        },
    })

    try {
        const stats = await runMigration(prisma, config, startTime, s3Client)

        const result = {
            success: true,
            message: 'Migration completed successfully',
            stats,
            config,
        }

        console.info('Migration completed:', JSON.stringify(result))

        return {
            statusCode: 200,
            body: JSON.stringify(result),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    } catch (error) {
        const errMsg = `Migration failed: ${error instanceof Error ? error.message : String(error)}`
        recordException(errMsg, serviceName, 'migration')
        console.error(errMsg)
        return fmtError(errMsg)
    } finally {
        await prisma.$disconnect()
    }
}

function parseConfig(
    queryParams: Record<string, string | undefined>
): MigrationConfig {
    return {
        dryRun: queryParams.dryRun === 'true',
        batchSize: queryParams.batchSize
            ? parseInt(queryParams.batchSize, 10)
            : 10,
        stateCode: queryParams.stateCode || undefined,
        maxRuntimeMs: queryParams.maxRuntimeMs
            ? parseInt(queryParams.maxRuntimeMs, 10)
            : 13 * 60 * 1000, // 13 minutes default
    }
}

async function runMigration(
    prisma: PrismaClient,
    config: MigrationConfig,
    startTime: number,
    s3Client: S3Client
): Promise<MigrationStats> {
    const stats: MigrationStats = {
        processedContracts: 0,
        processedRates: 0,
        skippedContracts: 0,
        skippedRates: 0,
        erroredContracts: 0,
        erroredRates: 0,
        timeoutExceeded: false,
    }

    // Helper function to check if we should continue processing
    const shouldContinue = (): boolean => {
        const elapsedTime = Date.now() - startTime
        const shouldStop = elapsedTime > config.maxRuntimeMs!
        if (shouldStop) {
            stats.timeoutExceeded = true
            console.warn(
                `Stopping migration - elapsed time: ${elapsedTime}ms exceeds max: ${config.maxRuntimeMs}ms`
            )
        }
        return !shouldStop
    }

    // Get all submitted contract revisions that don't have zip packages yet
    const contractRevisions = await prisma.contractRevisionTable.findMany({
        where: {
            AND: [
                { submitInfo: { isNot: null } }, // Only submitted revisions
                { documentZipPackage: { none: {} } }, // No existing zip packages
                ...(config.stateCode
                    ? [{ contract: { stateCode: config.stateCode } }] // use state code to limit processing
                    : []), // if no stateCode, process everything
            ],
        },
        include: {
            contract: true,
            documentZipPackage: true,
            contractDocuments: true,
            supportingDocuments: true,
        },
        orderBy: { createdAt: 'asc' },
    })

    // Get all submitted rate revisions that don't have zip packages yet
    const rateRevisions = await prisma.rateRevisionTable.findMany({
        where: {
            AND: [
                { submitInfo: { isNot: null } }, // Only submitted revisions
                { documentZipPackage: { none: {} } }, // No existing zip packages
                ...(config.stateCode
                    ? [{ rate: { stateCode: config.stateCode } }] // migrate based on state
                    : []), // if no stateCode, then migrate everything
            ],
        },
        include: {
            rate: true,
            documentZipPackage: true,
            rateDocuments: true,
            supportingDocuments: true,
        },
        orderBy: { createdAt: 'asc' },
    })

    console.info(
        `Found ${contractRevisions.length} contract revisions and ${rateRevisions.length} rate revisions to process`
    )

    // Process contract revisions in batches
    console.info('Processing contract revisions...')
    for (
        let i = 0;
        i < contractRevisions.length && shouldContinue();
        i += config.batchSize
    ) {
        const batch = contractRevisions.slice(i, i + config.batchSize)
        console.info(
            `Processing contract batch ${Math.floor(i / config.batchSize) + 1}/${Math.ceil(contractRevisions.length / config.batchSize)}`
        )

        for (const contractRev of batch) {
            if (!shouldContinue()) break

            try {
                const result = await processContractRevision(
                    prisma,
                    contractRev,
                    config.dryRun,
                    s3Client
                )
                if (result === 'processed') stats.processedContracts++
                else if (result === 'skipped') stats.skippedContracts++
            } catch (error) {
                stats.erroredContracts++
                console.error(
                    `Error processing contract ${contractRev.id}:`,
                    error.message
                )
            }
        }
    }

    // Process rate revisions in batches
    console.info('Processing rate revisions...')
    for (
        let i = 0;
        i < rateRevisions.length && shouldContinue();
        i += config.batchSize
    ) {
        const batch = rateRevisions.slice(i, i + config.batchSize)
        console.info(
            `Processing rate batch ${Math.floor(i / config.batchSize) + 1}/${Math.ceil(rateRevisions.length / config.batchSize)}`
        )

        for (const rateRev of batch) {
            if (!shouldContinue()) break

            try {
                const result = await processRateRevision(
                    prisma,
                    rateRev,
                    config.dryRun,
                    s3Client
                )
                if (result === 'processed') stats.processedRates++
                else if (result === 'skipped') stats.skippedRates++
            } catch (error) {
                stats.erroredRates++
                console.error(
                    `Error processing rate ${rateRev.id}:`,
                    error.message
                )
            }
        }
    }

    return stats
}

// Helper function to extract S3 key from URL and delete object
async function cleanupS3Object(
    s3Client: S3Client,
    s3URL: string
): Promise<void> {
    try {
        // Extract bucket and key from S3 URL
        const url = new URL(s3URL)
        const bucket = url.hostname.split('.')[0]
        const key = url.pathname.substring(1) // Remove leading slash

        await s3Client.send(
            new DeleteObjectCommand({
                Bucket: bucket,
                Key: key,
            })
        )

        console.info(`Cleaned up S3 object: ${s3URL}`)
    } catch (error) {
        console.error(`Failed to cleanup S3 object ${s3URL}:`, error)
        // Don't throw - cleanup is best effort
    }
}

async function processContractRevision(
    prisma: PrismaClient,
    contractRev: ContractRevisionWithRelations,
    dryRun: boolean,
    s3Client: S3Client
): Promise<'processed' | 'skipped'> {
    const contractDocuments = contractRev.contractDocuments || []
    const supportingDocuments = contractRev.supportingDocuments || []

    // Combine all documents for contract (we store as single CONTRACT_DOCUMENTS zip)
    const allDocuments = [...contractDocuments, ...supportingDocuments]

    if (allDocuments.length === 0) {
        console.info(`Skipping contract ${contractRev.id} - no documents`)
        return 'skipped'
    }

    console.info(
        `Contract ${contractRev.id} (${contractRev.contract.stateCode}): ${allDocuments.length} documents`
    )

    if (dryRun) {
        console.info(`[DRY RUN] Would create zip for contract documents`)
        return 'processed'
    }

    // Check if zip already exists before generating
    const existingZip = await prisma.documentZipPackage.findFirst({
        where: {
            contractRevisionID: contractRev.id,
            documentType: 'CONTRACT_DOCUMENTS',
        },
    })

    if (existingZip) {
        console.info(
            `Contract ${contractRev.id} already has zip package, skipping`
        )
        return 'skipped'
    }

    // Generate zip only if it doesn't exist
    const s3DestinationKey = `zips/contracts/${contractRev.id}/contract-documents.zip`
    const zipResult = await generateDocumentZip(allDocuments, s3DestinationKey)
    if (zipResult instanceof Error) {
        throw zipResult
    }

    try {
        // Use transaction only for the database write
        return await prisma.$transaction(async (tx): Promise<'processed'> => {
            const createResult = await createDocumentZipPackage(tx, {
                s3URL: zipResult.s3URL,
                sha256: zipResult.sha256,
                contractRevisionID: contractRev.id,
                documentType: 'CONTRACT_DOCUMENTS',
            })

            if (createResult instanceof Error) {
                throw createResult
            }

            console.info(`Created contract zip: ${zipResult.s3URL}`)
            return 'processed'
        })
    } catch (dbError) {
        // If database operation fails, cleanup the S3 object
        await cleanupS3Object(s3Client, zipResult.s3URL)
        throw dbError
    }
}

async function processRateRevision(
    prisma: PrismaClient,
    rateRev: RateRevisionWithRelations,
    dryRun: boolean,
    s3Client: S3Client
): Promise<'processed' | 'skipped'> {
    // Access documents directly from Prisma relations
    const rateDocuments = rateRev.rateDocuments || []
    const supportingDocuments = rateRev.supportingDocuments || []

    // Combine all documents for rate (we store as single RATE_DOCUMENTS zip)
    const allDocuments = [...rateDocuments, ...supportingDocuments]

    if (allDocuments.length === 0) {
        console.info(`Skipping rate ${rateRev.id} - no documents`)
        return 'skipped'
    }

    console.info(
        `Rate ${rateRev.id} (${rateRev.rate.stateCode}): ${allDocuments.length} documents`
    )

    if (dryRun) {
        console.info(`[DRY RUN] Would create zip for rate documents`)
        return 'processed'
    }

    // Check if zip already exists before generating
    const existingZip = await prisma.documentZipPackage.findFirst({
        where: {
            rateRevisionID: rateRev.id,
            documentType: 'RATE_DOCUMENTS',
        },
    })
    if (existingZip) {
        console.info(`Rate ${rateRev.id} already has zip package, skipping`)
        return 'skipped'
    }

    // Generate zip only if it doesn't exist
    const s3DestinationKey = `zips/rates/${rateRev.id}/rate-documents.zip`
    const zipResult = await generateDocumentZip(allDocuments, s3DestinationKey)
    if (zipResult instanceof Error) {
        throw zipResult
    }

    try {
        // Use transaction only for the database write
        return await prisma.$transaction(async (tx): Promise<'processed'> => {
            const createResult = await createDocumentZipPackage(tx, {
                s3URL: zipResult.s3URL,
                sha256: zipResult.sha256,
                rateRevisionID: rateRev.id,
                documentType: 'RATE_DOCUMENTS',
            })

            if (createResult instanceof Error) {
                throw createResult
            }

            console.info(`Created rate zip: ${zipResult.s3URL}`)
            return 'processed'
        })
    } catch (dbError) {
        // If database operation fails, cleanup the S3 object
        await cleanupS3Object(s3Client, zipResult.s3URL)
        throw dbError
    }
}

function fmtError(error: string): APIGatewayProxyResultV2 {
    return {
        statusCode: 500,
        body: JSON.stringify({
            success: false,
            error,
        }),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
    }
}

module.exports = { main }

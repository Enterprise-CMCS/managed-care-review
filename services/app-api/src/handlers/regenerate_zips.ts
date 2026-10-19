/**
 * Lambda handler to generate missing zip files and replace noncanonical ones.
 *
 * Submitted revisions with documents are selected when their zip package is
 * missing or still references a noncanonical S3 location.
 *
 * Regeneration uploads to the configured CDK documents bucket before replacing
 * existing package metadata. A generation failure leaves the old row unchanged.
 *
 * Usage:
 *   aws lambda invoke \
 *     --function-name app-api-{stage}-cdk-regenerate-zips response.json
 *
 * Or with a specific revision:
 *   aws lambda invoke \
 *     --function-name app-api-{stage}-cdk-regenerate-zips \
 *     --cli-binary-format raw-in-base64-out \
 *     --payload '{"contractRevisionID":"abc-123"}' response.json
 */

import { NewPostgresStore } from '../postgres'
import { getPostgresURL } from './configuration'
import {
    documentZipService,
    generateDocumentZip,
    type DocumentZipService,
} from '../zip/generateZip'
import type { Handler } from 'aws-lambda'
import {
    NewPrismaClient,
    type ExtendedPrismaClient,
} from '../postgres/prismaClient'
import { contractRevisionToDomainModel } from '../postgres/contractAndRates/parseContractWithHistory'
import { rateRevisionToDomainModel } from '../postgres/contractAndRates/parseRateWithHistory'
import {
    includeContractFormData,
    includeRateFormData,
} from '../postgres/contractAndRates/prismaSharedContractRateHelpers'
import { parseErrorToError } from '@mc-review/helpers'
import { initTracer, flushTracer } from '../otel/otel_handler'

export type RegenerateZipsEvent = {
    contractRevisionID?: string // Optional: regenerate for specific contract revision
    rateRevisionID?: string // Optional: regenerate for specific rate revision
    limit?: number // Optional: limit number of zips to generate (default: 100)
    dryRun?: boolean // Optional: just count, don't actually generate
}

export type RegenerateZipsResponse = {
    success: boolean
    contractsProcessed: number
    ratesProcessed: number
    contractsFailed: number
    ratesFailed: number
    errors: string[]
    dryRun?: boolean
}

export const main: Handler = async (
    event: RegenerateZipsEvent = {}
): Promise<RegenerateZipsResponse> => {
    // Get configuration from environment variables
    const dbURL = process.env.DATABASE_URL
    const secretsManagerSecret = process.env.SECRETS_MANAGER_SECRET
    const documentsBucket = process.env.VITE_APP_S3_DOCUMENTS_BUCKET
    if (!documentsBucket) {
        throw new Error('Init Error: VITE_APP_S3_DOCUMENTS_BUCKET is required')
    }

    if (!dbURL) {
        throw new Error('Init Error: DATABASE_URL is required')
    }

    // Initialize OpenTelemetry before creating the Prisma client so the Prisma
    // instrumentation is registered and db spans nest under zip.generate. This
    // emits spans under the same `app-api-<stage>` service as the submit path so
    // failures here are caught by the same Datadog zip monitor. initTracer
    // throws if `stage` or `DD_API_KEY` is missing, enforcing them at startup.
    initTracer('app-api-' + process.env.stage)

    // Get database connection URL
    const dbConnResult = await getPostgresURL(dbURL, secretsManagerSecret)
    if (dbConnResult instanceof Error) {
        throw new Error(`Init Error: failed to get pg URL: ${dbConnResult}`)
    }

    const dbConnectionURL: string = dbConnResult

    // Initialize Prisma client and store
    const prismaClientResult = await NewPrismaClient(dbConnectionURL)
    if (prismaClientResult instanceof Error) {
        throw new Error(
            `Init Error: failed to create Prisma client: ${prismaClientResult}`
        )
    }

    const prismaClient = prismaClientResult
    const postgresStore = NewPostgresStore(prismaClient)
    const zipService = documentZipService(postgresStore, generateDocumentZip)

    const limit = event.limit ?? 100
    const dryRun = event.dryRun ?? false

    const response: RegenerateZipsResponse = {
        success: true,
        contractsProcessed: 0,
        ratesProcessed: 0,
        contractsFailed: 0,
        ratesFailed: 0,
        errors: [],
    }

    if (dryRun) {
        response.dryRun = true
    }

    try {
        // Validate that both IDs are not provided at the same time
        if (event.contractRevisionID && event.rateRevisionID) {
            throw new Error(
                'Cannot specify both contractRevisionID and rateRevisionID in the same request. Please make separate requests for each.'
            )
        }

        // If specific IDs provided, only process those
        if (event.contractRevisionID) {
            console.info(
                `Regenerating zip for contract revision: ${event.contractRevisionID}`
            )
            const result = await regenerateContractZip(
                prismaClient,
                zipService,
                event.contractRevisionID,
                dryRun
            )
            if (result.success) {
                response.contractsProcessed++
            } else {
                response.contractsFailed++
                response.errors.push(result.error!)
                response.success = false
            }
            return response
        }

        if (event.rateRevisionID) {
            console.info(
                `Regenerating zip for rate revision: ${event.rateRevisionID}`
            )
            const result = await regenerateRateZip(
                prismaClient,
                zipService,
                event.rateRevisionID,
                dryRun
            )
            if (result.success) {
                response.ratesProcessed++
            } else {
                response.ratesFailed++
                response.errors.push(result.error!)
                response.success = false
            }
            return response
        }

        // Otherwise, generate missing zips and replace noncanonical packages.
        console.info('Finding contract revisions needing zips...')
        const contractRevisionsNeedingZips =
            await findContractRevisionsNeedingZips(
                prismaClient,
                documentsBucket,
                limit
            )
        console.info(
            `Found ${contractRevisionsNeedingZips.length} contract revisions needing zips`
        )

        let remainingLimit = limit

        for (const contractRev of contractRevisionsNeedingZips) {
            if (remainingLimit <= 0) {
                console.info(
                    `Reached limit of ${limit} total zips, stopping contract processing`
                )
                break
            }

            const result = await regenerateContractZip(
                prismaClient,
                zipService,
                contractRev.id,
                dryRun
            )
            if (result.success) {
                response.contractsProcessed++
                remainingLimit--
            } else {
                response.contractsFailed++
                response.errors.push(result.error!)
            }
        }

        console.info('Finding rate revisions needing zips...')
        const rateRevisionsNeedingZips = await findRateRevisionsNeedingZips(
            prismaClient,
            documentsBucket,
            remainingLimit
        )
        console.info(
            `Found ${rateRevisionsNeedingZips.length} rate revisions needing zips`
        )

        for (const rateRev of rateRevisionsNeedingZips) {
            if (remainingLimit <= 0) {
                console.info(
                    `Reached limit of ${limit} total zips, stopping rate processing`
                )
                break
            }

            const result = await regenerateRateZip(
                prismaClient,
                zipService,
                rateRev.id,
                dryRun
            )
            if (result.success) {
                response.ratesProcessed++
                remainingLimit--
            } else {
                response.ratesFailed++
                response.errors.push(result.error!)
            }
        }

        response.success = response.errors.length === 0

        console.info('Zip regeneration complete', response)
        return response
    } catch (error) {
        const errorMessage = parseErrorToError(error).message
        console.error('Zip regeneration failed:', errorMessage)
        response.success = false
        response.errors.push(errorMessage)
        return response
    } finally {
        // Flush queued zip.generate spans before the Lambda freezes. Swallow
        // flush errors so telemetry failures never fail a regeneration run.
        try {
            await flushTracer()
        } catch (flushErr) {
            console.warn('otel: flush failed', flushErr)
        }
    }
    // NOTE: Don't call $disconnect() - we use a singleton pattern to reuse connections
    // across warm Lambda invocations. AWS cleans up when the container terminates.
}

export async function findContractRevisionsNeedingZips(
    prismaClient: ExtendedPrismaClient,
    documentsBucket: string,
    limit: number
): Promise<Array<{ id: string }>> {
    return prismaClient.contractRevisionTable.findMany({
        where: {
            submitInfoID: { not: null },
            AND: [
                {
                    OR: [
                        { contractDocuments: { some: {} } },
                        { supportingDocuments: { some: {} } },
                    ],
                },
                {
                    OR: [
                        {
                            documentZipPackage: {
                                none: {
                                    documentType: 'CONTRACT_DOCUMENTS',
                                },
                            },
                        },
                        {
                            documentZipPackage: {
                                some: {
                                    documentType: 'CONTRACT_DOCUMENTS',
                                    OR: [
                                        { s3BucketName: null },
                                        {
                                            s3BucketName: {
                                                not: documentsBucket,
                                            },
                                        },
                                        { s3Key: null },
                                        {
                                            s3Key: {
                                                not: {
                                                    startsWith:
                                                        'zips/contracts/',
                                                },
                                            },
                                        },
                                        {
                                            s3URL: {
                                                not: {
                                                    startsWith: `s3://${documentsBucket}/zips/contracts/`,
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    ],
                },
            ],
        },
        select: { id: true },
        take: limit,
    })
}

export async function findRateRevisionsNeedingZips(
    prismaClient: ExtendedPrismaClient,
    documentsBucket: string,
    limit: number
): Promise<Array<{ id: string }>> {
    return prismaClient.rateRevisionTable.findMany({
        where: {
            submitInfoID: { not: null },
            AND: [
                {
                    OR: [
                        { rateDocuments: { some: {} } },
                        { supportingDocuments: { some: {} } },
                    ],
                },
                {
                    OR: [
                        {
                            documentZipPackage: {
                                none: { documentType: 'RATE_DOCUMENTS' },
                            },
                        },
                        {
                            documentZipPackage: {
                                some: {
                                    documentType: 'RATE_DOCUMENTS',
                                    OR: [
                                        { s3BucketName: null },
                                        {
                                            s3BucketName: {
                                                not: documentsBucket,
                                            },
                                        },
                                        { s3Key: null },
                                        {
                                            s3Key: {
                                                not: {
                                                    startsWith: 'zips/rates/',
                                                },
                                            },
                                        },
                                        {
                                            s3URL: {
                                                not: {
                                                    startsWith: `s3://${documentsBucket}/zips/rates/`,
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    ],
                },
            ],
        },
        select: { id: true },
        take: limit,
    })
}

async function regenerateContractZip(
    prismaClient: ExtendedPrismaClient,
    zipService: DocumentZipService,
    contractRevisionID: string,
    dryRun: boolean
): Promise<{ success: boolean; error?: string }> {
    try {
        if (dryRun) {
            console.info(
                `[DRY RUN] Would regenerate zip for contract revision ${contractRevisionID}`
            )
            return { success: true }
        }

        // Query the contract revision directly with all form data
        const revision = await prismaClient.contractRevisionTable.findFirst({
            where: {
                id: contractRevisionID,
                submitInfoID: {
                    not: null,
                },
            },
            include: includeContractFormData,
        })

        if (!revision) {
            return {
                success: false,
                error: `Contract revision ${contractRevisionID} not found or not submitted`,
            }
        }

        // Check if it has documents
        const hasDocuments =
            revision.contractDocuments.length > 0 ||
            revision.supportingDocuments.length > 0

        if (!hasDocuments) {
            console.info(
                `Contract revision ${contractRevisionID} has no documents, skipping`
            )
            return { success: true }
        }

        console.info(
            `Regenerating zip for contract revision ${contractRevisionID}...`
        )

        // Convert Prisma revision to domain model
        const domainRevision = contractRevisionToDomainModel(revision)

        if (domainRevision instanceof Error) {
            return {
                success: false,
                error: `Failed to parse revision: ${domainRevision.message}`,
            }
        }

        const zipResult = await zipService.generateContractDocumentsZip(
            domainRevision,
            'REPLACE'
        )

        if (zipResult instanceof Error) {
            return {
                success: false,
                error: `Failed to generate zip for ${contractRevisionID}: ${zipResult.message}`,
            }
        }

        console.info(
            `✓ Successfully generated zip for contract revision ${contractRevisionID}`
        )
        return { success: true }
    } catch (error) {
        const errorMessage = parseErrorToError(error).message
        return {
            success: false,
            error: `Exception regenerating contract zip ${contractRevisionID}: ${errorMessage}`,
        }
    }
}

async function regenerateRateZip(
    prismaClient: ExtendedPrismaClient,
    zipService: DocumentZipService,
    rateRevisionID: string,
    dryRun: boolean
): Promise<{ success: boolean; error?: string }> {
    try {
        if (dryRun) {
            console.info(
                `[DRY RUN] Would regenerate zip for rate revision ${rateRevisionID}`
            )
            return { success: true }
        }

        // Query the rate revision directly with all form data
        const revision = await prismaClient.rateRevisionTable.findFirst({
            where: {
                id: rateRevisionID,
                submitInfoID: {
                    not: null,
                },
            },
            include: includeRateFormData,
        })

        if (!revision) {
            return {
                success: false,
                error: `Rate revision ${rateRevisionID} not found or not submitted`,
            }
        }

        // Check if it has documents
        const hasDocuments =
            revision.rateDocuments.length > 0 ||
            revision.supportingDocuments.length > 0

        if (!hasDocuments) {
            console.info(
                `Rate revision ${rateRevisionID} has no documents, skipping`
            )
            return { success: true }
        }

        console.info(`Regenerating zip for rate revision ${rateRevisionID}...`)

        // Convert Prisma revision to domain model
        const domainRevision = rateRevisionToDomainModel(revision)

        if (domainRevision instanceof Error) {
            return {
                success: false,
                error: `Failed to parse revision: ${domainRevision.message}`,
            }
        }

        const zipResult = await zipService.generateRateDocumentsZip(
            domainRevision,
            'REPLACE'
        )

        if (zipResult instanceof Error) {
            return {
                success: false,
                error: `Failed to generate zip for ${rateRevisionID}: ${zipResult.message}`,
            }
        }

        console.info(
            `✓ Successfully generated zip for rate revision ${rateRevisionID}`
        )
        return { success: true }
    } catch (error) {
        const errorMessage = parseErrorToError(error).message
        return {
            success: false,
            error: `Exception regenerating rate zip ${rateRevisionID}: ${errorMessage}`,
        }
    }
}

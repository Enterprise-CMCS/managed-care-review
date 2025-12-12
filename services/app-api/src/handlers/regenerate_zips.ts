/**
 * Lambda handler to regenerate missing zip files for submitted contracts and rates
 *
 * This script finds all submitted contract/rate revisions that have documents but
 * are missing their zip files, and regenerates them.
 *
 * Usage:
 *   aws lambda invoke --function-name app-api-prod-cdk-regenerate-zips response.json
 *
 * Or with a specific revision:
 *   aws lambda invoke --function-name app-api-prod-cdk-regenerate-zips \
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

    if (!dbURL) {
        throw new Error('Init Error: DATABASE_URL is required')
    }

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
            }
            return response
        }

        // Otherwise, find all missing zips and regenerate them
        console.info('Finding contract revisions missing zips...')
        const missingContractZips = await findContractRevisionsMissingZips(
            prismaClient,
            limit
        )
        console.info(
            `Found ${missingContractZips.length} contract revisions missing zips`
        )

        if (dryRun) {
            console.info(
                '[DRY RUN] Would regenerate zips for these contract revisions:',
                missingContractZips.map((c) => c.id)
            )
        } else {
            for (const contractRev of missingContractZips) {
                const result = await regenerateContractZip(
                    prismaClient,
                    zipService,
                    contractRev.id,
                    false
                )
                if (result.success) {
                    response.contractsProcessed++
                } else {
                    response.contractsFailed++
                    response.errors.push(result.error!)
                }
            }
        }

        console.info('Finding rate revisions missing zips...')
        const missingRateZips = await findRateRevisionsMissingZips(
            prismaClient,
            limit
        )
        console.info(
            `Found ${missingRateZips.length} rate revisions missing zips`
        )

        if (dryRun) {
            console.info(
                '[DRY RUN] Would regenerate zips for these rate revisions:',
                missingRateZips.map((r) => r.id)
            )
        } else {
            for (const rateRev of missingRateZips) {
                const result = await regenerateRateZip(
                    prismaClient,
                    zipService,
                    rateRev.id,
                    false
                )
                if (result.success) {
                    response.ratesProcessed++
                } else {
                    response.ratesFailed++
                    response.errors.push(result.error!)
                }
            }
        }

        console.info('Zip regeneration complete', response)
        return response
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error)
        console.error('Zip regeneration failed:', errorMessage)
        response.success = false
        response.errors.push(errorMessage)
        return response
    } finally {
        // Always disconnect Prisma client to prevent connection leaks in Lambda
        await prismaClient.$disconnect()
    }
}

async function findContractRevisionsMissingZips(
    prismaClient: ExtendedPrismaClient,
    limit: number
): Promise<Array<{ id: string }>> {
    // Query directly for contract revisions that are submitted, have documents, but no zips
    const revisionsWithoutZips =
        await prismaClient.contractRevisionTable.findMany({
            where: {
                submitInfoID: {
                    not: null, // Only submitted revisions
                },
                OR: [
                    {
                        contractDocuments: {
                            some: {}, // Has at least one contract document
                        },
                    },
                    {
                        supportingDocuments: {
                            some: {}, // Has at least one supporting document
                        },
                    },
                ],
                documentZipPackages: {
                    none: {}, // No zip packages exist
                },
            },
            select: {
                id: true,
            },
            take: limit,
        })

    return revisionsWithoutZips
}

async function findRateRevisionsMissingZips(
    prismaClient: ExtendedPrismaClient,
    limit: number
): Promise<Array<{ id: string }>> {
    // Query directly for rate revisions that are submitted, have documents, but no zips
    const revisionsWithoutZips = await prismaClient.rateRevisionTable.findMany({
        where: {
            submitInfoID: {
                not: null, // Only submitted revisions
            },
            OR: [
                {
                    rateDocuments: {
                        some: {}, // Has at least one rate document
                    },
                },
                {
                    supportingDocuments: {
                        some: {}, // Has at least one supporting document
                    },
                },
            ],
            documentZipPackages: {
                none: {}, // No zip packages exist
            },
        },
        select: {
            id: true,
        },
        take: limit,
    })

    return revisionsWithoutZips
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

        const zipResult =
            await zipService.generateContractDocumentsZip(domainRevision)

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
        const errorMessage =
            error instanceof Error ? error.message : String(error)
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

        const zipResult =
            await zipService.generateRateDocumentsZip(domainRevision)

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
        const errorMessage =
            error instanceof Error ? error.message : String(error)
        return {
            success: false,
            error: `Exception regenerating rate zip ${rateRevisionID}: ${errorMessage}`,
        }
    }
}

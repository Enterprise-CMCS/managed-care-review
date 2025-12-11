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

import { NewPostgresStore, type Store } from '../postgres'
import { getPostgresURL } from './configuration'
import {
    documentZipService,
    generateDocumentZip,
    type DocumentZipService,
} from '../zip/generateZip'
import type { ContractRevisionType, RateRevisionType } from '../domain-models'
import type { Handler } from 'aws-lambda'
import { NewPrismaClient } from '../postgres/prismaClient'

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
    const prismaClient = NewPrismaClient(dbConnectionURL)
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
                postgresStore,
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
                postgresStore,
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
            postgresStore,
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
                    postgresStore,
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
            postgresStore,
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
                    postgresStore,
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
    }
}

async function findContractRevisionsMissingZips(
    store: Store,
    limit: number
): Promise<Array<{ id: string }>> {
    // Find all submitted contracts
    const allContractsResult =
        await store.findAllContractsWithHistoryBySubmitInfo()
    if (allContractsResult instanceof Error) {
        throw new Error(
            `Failed to find contracts: ${allContractsResult.message}`
        )
    }

    const missingZips: Array<{ id: string }> = []

    for (const item of allContractsResult) {
        // Each item is { contractID: string, contract: ContractType | Error }
        if (item.contract instanceof Error) {
            console.warn(
                'Error loading contract, skipping:',
                item.contract.message
            )
            continue
        }

        const contract = item.contract

        // Check each submission for missing zips
        for (const submission of contract.packageSubmissions) {
            const revision = submission.contractRevision

            // Skip if no documents
            const hasDocuments =
                (revision.formData.contractDocuments &&
                    revision.formData.contractDocuments.length > 0) ||
                (revision.formData.supportingDocuments &&
                    revision.formData.supportingDocuments.length > 0)

            if (!hasDocuments) {
                continue
            }

            // Check if zip exists
            const zipsResult =
                await store.findDocumentZipPackagesByContractRevision(
                    revision.id,
                    'CONTRACT_DOCUMENTS'
                )

            if (zipsResult instanceof Error) {
                console.warn(
                    `Error checking zips for ${revision.id}, skipping:`,
                    zipsResult.message
                )
                continue
            }

            if (zipsResult.length === 0) {
                missingZips.push({ id: revision.id })

                if (missingZips.length >= limit) {
                    return missingZips
                }
            }
        }
    }

    return missingZips
}

async function findRateRevisionsMissingZips(
    store: Store,
    limit: number
): Promise<Array<{ id: string }>> {
    // Find all submitted rates
    const allRatesResult = await store.findAllRatesWithHistoryBySubmitInfo()
    if (allRatesResult instanceof Error) {
        throw new Error(`Failed to find rates: ${allRatesResult.message}`)
    }

    const missingZips: Array<{ id: string }> = []

    for (const item of allRatesResult) {
        // Each item is { rateID: string, rate: RateType | Error }
        if (item.rate instanceof Error) {
            console.warn('Error loading rate, skipping:', item.rate.message)
            continue
        }

        const rate = item.rate

        // Check each submission for missing zips
        for (const submission of rate.packageSubmissions) {
            const revision = submission.rateRevision

            // Skip if no documents
            const hasDocuments =
                (revision.formData.rateDocuments &&
                    revision.formData.rateDocuments.length > 0) ||
                (revision.formData.supportingDocuments &&
                    revision.formData.supportingDocuments.length > 0)

            if (!hasDocuments) {
                continue
            }

            // Check if zip exists
            const zipsResult =
                await store.findDocumentZipPackagesByRateRevision(
                    revision.id,
                    'RATE_DOCUMENTS'
                )

            if (zipsResult instanceof Error) {
                console.warn(
                    `Error checking zips for ${revision.id}, skipping:`,
                    zipsResult.message
                )
                continue
            }

            if (zipsResult.length === 0) {
                missingZips.push({ id: revision.id })

                if (missingZips.length >= limit) {
                    return missingZips
                }
            }
        }
    }

    return missingZips
}

async function regenerateContractZip(
    store: Store,
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

        // Fetch the contract with its revision
        const contractResult =
            await store.findContractWithHistory(contractRevisionID)
        if (contractResult instanceof Error) {
            return {
                success: false,
                error: `Failed to find contract: ${contractResult.message}`,
            }
        }

        const contract = contractResult
        const revision =
            contract.draftRevision ??
            contract.packageSubmissions[0]?.contractRevision

        if (!revision || revision.id !== contractRevisionID) {
            return {
                success: false,
                error: `Could not find revision ${contractRevisionID} in contract ${contract.id}`,
            }
        }

        // Check if it has documents
        const hasDocuments =
            (revision.formData.contractDocuments &&
                revision.formData.contractDocuments.length > 0) ||
            (revision.formData.supportingDocuments &&
                revision.formData.supportingDocuments.length > 0)

        if (!hasDocuments) {
            console.info(
                `Contract revision ${contractRevisionID} has no documents, skipping`
            )
            return { success: true }
        }

        console.info(
            `Regenerating zip for contract revision ${contractRevisionID}...`
        )
        const zipResult = await zipService.generateContractDocumentsZip(
            revision as ContractRevisionType
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
        const errorMessage =
            error instanceof Error ? error.message : String(error)
        return {
            success: false,
            error: `Exception regenerating contract zip ${contractRevisionID}: ${errorMessage}`,
        }
    }
}

async function regenerateRateZip(
    store: Store,
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

        // Fetch the rate with its revision
        const rateResult = await store.findRateWithHistory(rateRevisionID)
        if (rateResult instanceof Error) {
            return {
                success: false,
                error: `Failed to find rate: ${rateResult.message}`,
            }
        }

        const rate = rateResult
        const revision =
            rate.draftRevision ?? rate.packageSubmissions[0]?.rateRevision

        if (!revision || revision.id !== rateRevisionID) {
            return {
                success: false,
                error: `Could not find revision ${rateRevisionID} in rate ${rate.id}`,
            }
        }

        // Check if it has documents
        const hasDocuments =
            (revision.formData.rateDocuments &&
                revision.formData.rateDocuments.length > 0) ||
            (revision.formData.supportingDocuments &&
                revision.formData.supportingDocuments.length > 0)

        if (!hasDocuments) {
            console.info(
                `Rate revision ${rateRevisionID} has no documents, skipping`
            )
            return { success: true }
        }

        console.info(`Regenerating zip for rate revision ${rateRevisionID}...`)
        const zipResult = await zipService.generateRateDocumentsZip(
            revision as RateRevisionType
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
        const errorMessage =
            error instanceof Error ? error.message : String(error)
        return {
            success: false,
            error: `Exception regenerating rate zip ${rateRevisionID}: ${errorMessage}`,
        }
    }
}

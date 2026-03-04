/**
 * Lambda handler to restore Infrequent Access files to S3 Standard storage
 *
 * IMPORTANT LIMITATIONS:
 * - Works for: STANDARD_IA, ONEZONE_IA, INTELLIGENT_TIERING
 * - Does NOT work for: GLACIER, DEEP_ARCHIVE (skipped - cannot restore without S3 Batch Operations)
 *
 * This script will scan all files, report what storage classes are found, and
 * successfully restore only IA files. Glacier files are counted but skipped.
 * For Glacier files, use AWS S3 Batch Operations to restore them first.
 *
 * Usage:
 *   aws lambda invoke --function-name app-api-{stage}-restore-ia-to-standard response.json
 *
 * With options:
 *   aws lambda invoke --function-name app-api-{stage}-restore-ia-to-standard \
 *     --payload '{"dryRun":true}' response.json
 *
 * Or to process specific bucket:
 *   aws lambda invoke --function-name app-api-{stage}-restore-ia-to-standard \
 *     --payload '{"bucket":"uploads-prod-uploads-documents-123456789","dryRun":false}' response.json
 */

import type { Handler } from 'aws-lambda'
import {
    S3Client,
    ListObjectsV2Command,
    type ListObjectsV2CommandOutput,
    CopyObjectCommand,
} from '@aws-sdk/client-s3'

export type RestoreIAToStandardEvent = {
    bucket?: string // Optional: specific bucket to process (default: process both buckets)
    dryRun?: boolean // Optional: just report, don't actually restore (default: true for safety)
    maxKeys?: number // Optional: max objects to process per bucket (default: all)
}

export type BucketRestoreResult = {
    bucket: string
    scanned: number
    glacierFiles: number // Counted but skipped (cannot restore without S3 Batch Operations)
    infrequentAccessFiles: number
    restored: number
    skipped: number // Glacier files skipped
    failed: number
    errors: string[]
}

export type RestoreIAToStandardResponse = {
    success: boolean
    dryRun: boolean
    results: BucketRestoreResult[]
    summary: {
        totalScanned: number
        totalGlacierFiles: number // For reporting only - these are skipped
        totalInfrequentAccessFiles: number
        totalRestored: number
        totalSkipped: number
        totalFailed: number
    }
}

const s3Client = new S3Client({})

/**
 * Main handler function
 */
export const main: Handler = async (
    event: RestoreIAToStandardEvent = {}
): Promise<RestoreIAToStandardResponse> => {
    const dryRun = event?.dryRun ?? true // Default to dry run for safety
    const maxKeys = event?.maxKeys

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

    console.info('Starting IA to Standard storage restoration', {
        dryRun,
        maxKeys,
        documentsBucket,
        qaBucket,
        specificBucket: event.bucket,
    })

    const results: BucketRestoreResult[] = []

    try {
        // Determine which buckets to process
        const bucketsToProcess = event.bucket
            ? [event.bucket]
            : [documentsBucket, qaBucket]

        // Process each bucket
        for (const bucket of bucketsToProcess) {
            console.info(`Processing bucket: ${bucket}`)
            const bucketResult = await processBucket(bucket, dryRun, maxKeys)
            results.push(bucketResult)
        }

        // Calculate summary
        const summary = {
            totalScanned: results.reduce((sum, r) => sum + r.scanned, 0),
            totalGlacierFiles: results.reduce(
                (sum, r) => sum + r.glacierFiles,
                0
            ),
            totalInfrequentAccessFiles: results.reduce(
                (sum, r) => sum + r.infrequentAccessFiles,
                0
            ),
            totalRestored: results.reduce((sum, r) => sum + r.restored, 0),
            totalSkipped: results.reduce((sum, r) => sum + r.skipped, 0),
            totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
        }

        console.info('IA to Standard restoration complete', {
            summary,
            results,
        })

        return {
            success: true,
            dryRun,
            results,
            summary,
        }
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error)
        console.error('IA to STANDARD restoration failed:', errorMessage)
        throw error
    }
}

/**
 * Process a single bucket - scan and restore files from Glacier
 */
async function processBucket(
    bucket: string,
    dryRun: boolean,
    maxKeys: number | undefined
): Promise<BucketRestoreResult> {
    const result: BucketRestoreResult = {
        bucket,
        scanned: 0,
        glacierFiles: 0,
        infrequentAccessFiles: 0,
        restored: 0,
        skipped: 0,
        failed: 0,
        errors: [],
    }

    try {
        let continuationToken: string | undefined = undefined
        let totalProcessed = 0

        // Paginate through all objects in the bucket
        do {
            // Stop if we've hit maxKeys limit
            if (maxKeys && totalProcessed >= maxKeys) {
                console.info(`Reached maxKeys limit of ${maxKeys}`)
                break
            }

            const remainingKeys = maxKeys ? maxKeys - totalProcessed : undefined
            const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
                Bucket: bucket,
                ContinuationToken: continuationToken,
                MaxKeys: remainingKeys
                    ? Math.min(1000, Math.max(1, remainingKeys))
                    : 1000,
            })

            const listResponse: ListObjectsV2CommandOutput =
                await s3Client.send(listCommand)
            const objects = listResponse.Contents || []

            console.info(
                `Scanning ${objects.length} objects in ${bucket} (scanned so far: ${result.scanned})`
            )

            // Process each object
            for (const obj of objects) {
                if (!obj.Key) continue

                result.scanned++
                totalProcessed++

                // Check storage class
                const storageClass = obj.StorageClass || 'STANDARD'

                if (
                    storageClass === 'GLACIER' ||
                    storageClass === 'DEEP_ARCHIVE'
                ) {
                    // Count Glacier files but skip them - they cannot be restored without S3 Batch Operations
                    result.glacierFiles++
                    result.skipped++

                    // Only log first 10 Glacier files to reduce CloudWatch costs
                    if (result.glacierFiles <= 10) {
                        console.info(
                            `Skipping Glacier file (cannot restore): ${obj.Key} (${storageClass})`
                        )
                    }
                } else if (
                    storageClass === 'STANDARD_IA' ||
                    storageClass === 'ONEZONE_IA' ||
                    storageClass === 'INTELLIGENT_TIERING'
                ) {
                    result.infrequentAccessFiles++

                    // Only log every 100th IA file to reduce CloudWatch costs
                    if (result.infrequentAccessFiles % 100 === 0) {
                        console.info(
                            `Found IA file ${result.infrequentAccessFiles}: ${obj.Key} (${storageClass})`
                        )
                    }

                    if (!dryRun) {
                        const restored = await restoreToStandard(
                            bucket,
                            obj.Key
                        )
                        if (restored instanceof Error) {
                            result.failed++
                            result.errors.push(
                                `${obj.Key}: ${restored.message}`
                            )
                        } else {
                            result.restored++
                        }
                    }
                }

                // Log progress every 1000 files
                if (result.scanned % 1000 === 0) {
                    console.info(
                        `Progress: ${result.scanned} files scanned, ${result.glacierFiles} Glacier (skipped), ${result.infrequentAccessFiles} IA, ${result.restored} restored`
                    )
                }
            }

            continuationToken = listResponse.NextContinuationToken
        } while (continuationToken)

        console.info(`Bucket ${bucket} processing complete:`, result)
        return result
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error)
        console.error(`Failed to process bucket ${bucket}: ${errorMessage}`)
        result.errors.push(`Bucket processing error: ${errorMessage}`)
        return result
    }
}

/**
 * Change storage class to STANDARD for Infrequent Access files
 * NOTE: This will FAIL for Glacier/Deep Archive files with InvalidObjectState
 * Glacier files must be restored first using S3 Batch Operations
 */
async function restoreToStandard(
    bucket: string,
    key: string
): Promise<true | Error> {
    try {
        // Copy object to itself with STANDARD storage class
        // This works for IA files but fails for Glacier (needs restore first)
        // URL encode the key but preserve forward slashes
        const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/')
        const copyCommand = new CopyObjectCommand({
            Bucket: bucket,
            Key: key,
            CopySource: `${bucket}/${encodedKey}`,
            StorageClass: 'STANDARD',
            MetadataDirective: 'COPY', // Preserve existing metadata
            TaggingDirective: 'COPY', // Preserve existing tags
        })

        await s3Client.send(copyCommand)
        console.info(`Successfully restored ${key} to STANDARD storage`)
        return true
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error)
        console.error(`Failed to restore ${key}: ${errorMessage}`)
        return new Error(errorMessage)
    }
}

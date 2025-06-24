import { Context } from 'aws-lambda'
import { NewS3UploadsClient, S3UploadsClient } from '../deps/s3'
import { virusScanStatus } from '../lib/tags'
import { _Object, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import { fromUtf8, toUtf8 } from '@aws-sdk/util-utf8-node'

interface ScanFilesInput {
    bucket: string
    keys: string[]
}

export interface ScanFilesOutput {
    infectedKeys: string[]
}

// Generic function type that scans a list of s3 objects and returns any infected keys.
export type listInfectedFilesFn = (
    input: ScanFilesInput
) => Promise<ScanFilesOutput | Error>

// NewLambdaInfectedFilesLister returns an async function that will invoke a lambda
// to scan a set of files for viruses.
function NewLambdaInfectedFilesLister(lambdaName: string): listInfectedFilesFn {
    return async (input: ScanFilesInput): Promise<ScanFilesOutput | Error> => {
        const lambdaClient = new LambdaClient({})

        console.info('Invoking Worker Lambda: ', lambdaName)

        const payloadJSON = fromUtf8(JSON.stringify(input))
        const invocation = new InvokeCommand({
            FunctionName: lambdaName,
            Payload: payloadJSON,
        })

        try {
            const res = await lambdaClient.send(invocation)
            if (res.Payload) {
                const lambdaResult = JSON.parse(toUtf8(res.Payload))

                if (lambdaResult.errorType) {
                    const errMsg = `Got an error back from the worker lambda: ${JSON.stringify(
                        lambdaResult
                    )}`
                    console.error(errMsg)
                    return new Error(errMsg)
                }

                if (!lambdaResult.infectedKeys) {
                    const errMsg = `Didn't get back a list of keys from the lambda: ${JSON.stringify(
                        lambdaResult
                    )}`
                    console.error(errMsg)
                    return new Error(errMsg)
                }

                return lambdaResult as ScanFilesOutput
            }
            return new Error(
                `Failed to get correct results out of lambda: ${JSON.stringify(res)}`
            )
        } catch (err) {
            console.error('Error invoking worker lambda', err)
            return err instanceof Error
                ? err
                : new Error('Unknown error occurred')
        }
    }
}

// process objects in batches
async function listAndProcessBucketObjects(
    client: S3Client,
    bucketName: string,
    processor: (objects: _Object[]) => Promise<void | Error>,
    batchSize: number = 100
): Promise<void | Error> {
    let continuationToken: string | undefined
    let totalProcessed = 0

    try {
        do {
            const listCmd = new ListObjectsV2Command({
                Bucket: bucketName,
                ContinuationToken: continuationToken,
                MaxKeys: Math.min(batchSize, 1000), // S3 max is 1000
            })

            const listFilesResult = await client.send(listCmd)

            if (
                listFilesResult.Contents &&
                listFilesResult.Contents.length > 0
            ) {
                const result = await processor(listFilesResult.Contents)
                if (result instanceof Error) {
                    return result
                }
                totalProcessed += listFilesResult.Contents.length
            }

            continuationToken = listFilesResult.NextContinuationToken
            console.info(`Processed batch. Total processed: ${totalProcessed}`)
        } while (continuationToken)

        console.info(`Successfully processed all ${totalProcessed} objects`)
        return undefined
    } catch (err) {
        console.error(`Error in streaming processing:`, err)
        return err instanceof Error ? err : new Error('Unknown error')
    }
}

// Re-scan files that have problematic scan statuses (ERROR or no scan tag)
export async function rescanFailedFiles(
    s3Client: S3UploadsClient,
    fileScanner: listInfectedFilesFn,
    bucketName: string
): Promise<string[] | Error> {
    console.info('Starting streaming rescan of failed files...')

    let allInfectedFiles: string[] = []
    const filesToRescan: _Object[] = []
    const BATCH_SIZE = 50 // Process 50 files at a time

    // Process objects in streaming fashion
    const objectProcessor = async (
        objects: _Object[]
    ): Promise<void | Error> => {
        // Filter for files that need rescanning
        const validSizeObjects = objects.filter(
            (o) => o.Size && o.Size <= 314572800
        )

        // Check each object's scan status
        for (const obj of validSizeObjects) {
            if (!obj.Key) continue

            const tags = await s3Client.getObjectTags(obj.Key, bucketName)
            if (tags instanceof Error) {
                console.error(`Failed to get tags for ${obj.Key}:`, tags)
                continue
            }

            const scanStatus = virusScanStatus(tags)

            // Add to rescan list if needed
            if (
                scanStatus === 'ERROR' ||
                scanStatus === undefined ||
                scanStatus instanceof Error
            ) {
                console.info(
                    `File needs rescanning - Status: ${scanStatus || 'NONE'}, Key: ${obj.Key}`
                )
                filesToRescan.push(obj)

                // Process batch when we reach batch size
                if (filesToRescan.length >= BATCH_SIZE) {
                    const batchResult = await processBatch(
                        filesToRescan.splice(0, BATCH_SIZE)
                    )
                    if (batchResult instanceof Error) {
                        return batchResult
                    }
                    allInfectedFiles = allInfectedFiles.concat(batchResult)
                }
            }
        }
        return undefined
    }

    // Helper function to process a batch of files
    const processBatch = async (
        batch: _Object[]
    ): Promise<string[] | Error> => {
        const keys = batch
            .map((obj) => obj.Key)
            .filter((key): key is string => key !== undefined)

        console.info(`Processing batch of ${keys.length} files`)

        const result = await fileScanner({
            bucket: bucketName,
            keys,
        })

        if (result instanceof Error) {
            console.error('Failed to scan batch of files', result)
            return result
        }

        console.info('Infected files in batch:', result.infectedKeys)
        return result.infectedKeys
    }

    const extendedS3Client = {
        ...s3Client,
        listAndProcessBucketObjects: (
            processor: (objects: _Object[]) => Promise<void | Error>
        ) =>
            listAndProcessBucketObjects(
                new S3Client({}),
                bucketName,
                processor
            ),
    }

    // Process all objects in streaming fashion
    const streamResult =
        await extendedS3Client.listAndProcessBucketObjects(objectProcessor)
    if (streamResult instanceof Error) {
        return streamResult
    }

    // Process any remaining files in the last batch
    if (filesToRescan.length > 0) {
        const finalBatchResult = await processBatch(filesToRescan)
        if (finalBatchResult instanceof Error) {
            return finalBatchResult
        }
        allInfectedFiles = allInfectedFiles.concat(finalBatchResult)
    }

    console.info(
        `Streaming rescan complete! Found ${allInfectedFiles.length} infected files`
    )

    return allInfectedFiles
}

async function main(_event: unknown, _context: Context): Promise<string> {
    console.info('-----Start Rescan Coordinator function-----')

    // Check required environment variables
    const auditBucketName = process.env.AUDIT_BUCKET_NAME
    if (!auditBucketName || auditBucketName === '') {
        throw new Error('Configuration Error: AUDIT_BUCKET_NAME must be set')
    }

    const workerLambdaName = process.env.RESCAN_WORKER_LAMBDA_NAME
    if (!workerLambdaName || workerLambdaName === '') {
        throw new Error(
            'Configuration Error: RESCAN_WORKER_LAMBDA_NAME must be set'
        )
    }

    const s3Client = NewS3UploadsClient()
    const fileScanner = NewLambdaInfectedFilesLister(workerLambdaName)

    console.info(`Rescanning failed files in bucket: ${auditBucketName}`)

    const result = await rescanFailedFiles(
        s3Client,
        fileScanner,
        auditBucketName
    )

    if (result instanceof Error) {
        throw result
    }

    const message = `RESCAN COMPLETE - Processed files with failed/missing scan status using parallel workers. Found ${result.length} infected files.`
    console.info(message)
    return message
}

module.exports = { main }

import { Context } from 'aws-lambda'
import { NewS3UploadsClient, S3UploadsClient } from '../deps/s3'
import { virusScanStatus } from '../lib/tags'
import { _Object } from '@aws-sdk/client-s3'
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

// Chunk the objects by file size. Process files in small batches for parallel processing
function chunkS3Objects(objects: _Object[]): _Object[][] {
    const maxChunkSize = 100_000_000 // 100 MB in bytes

    const chunks: _Object[][] = []
    let currentChunk: _Object[] = []
    let currentChunkSize = 0

    for (const obj of objects) {
        const size = obj.Size || maxChunkSize
        if (
            size + currentChunkSize > maxChunkSize ||
            currentChunk.length === 5 // Process 5 files per chunk
        ) {
            chunks.push(currentChunk)
            currentChunk = []
            currentChunkSize = 0
        }

        currentChunk.push(obj)
        currentChunkSize += size
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk)
    }

    return chunks
}

// Re-scan files that have problematic scan statuses (ERROR or no scan tag)
export async function rescanFailedFiles(
    s3Client: S3UploadsClient,
    fileScanner: listInfectedFilesFn,
    bucketName: string
): Promise<string[] | Error> {
    console.info('Starting rescan of failed files...')

    // List all objects in bucket
    const objects = await s3Client.listBucketObjects(bucketName)
    if (objects instanceof Error) {
        console.error('Failed to list files', objects)
        return objects
    }

    console.info(`Found ${objects.length} total objects in bucket`)

    // For now, skip oversized file handling - focus on core rescan functionality
    const validSizeObjects = objects.filter(
        (o) => o.Size && o.Size <= 314572800
    )

    console.info(`${validSizeObjects.length} files are valid size for scanning`)

    // Find files that need to be rescanned
    const filesToRescan: _Object[] = []

    for (const obj of validSizeObjects) {
        if (!obj.Key) continue

        const tags = await s3Client.getObjectTags(obj.Key, bucketName)
        if (tags instanceof Error) {
            console.error(`Failed to get tags for ${obj.Key}:`, tags)
            continue
        }

        const scanStatus = virusScanStatus(tags)

        // Rescan files that have ERROR status or no scan status at all
        if (scanStatus === 'ERROR' || scanStatus === undefined) {
            console.info(
                `File needs rescanning - Status: ${scanStatus || 'NONE'}, Key: ${obj.Key}`
            )
            filesToRescan.push(obj)
        } else if (scanStatus instanceof Error) {
            console.info(
                `File has invalid scan status, needs rescanning - Key: ${obj.Key}`
            )
            filesToRescan.push(obj)
        }
    }

    console.info(
        `Found ${filesToRescan.length} files that need to be rescanned`
    )

    if (filesToRescan.length === 0) {
        console.info('No files need rescanning!')
        return []
    }

    // Chunk the files to rescan
    const chunks = chunkS3Objects(filesToRescan)
    console.info(
        'Created chunks of sizes:',
        chunks.map((c) => c.length)
    )

    let allInfectedFiles: string[] = []

    // Process chunks in parallel by invoking worker lambdas
    const scanPromises: Promise<ScanFilesOutput | Error>[] = []
    for (const chunk of chunks) {
        const keys = chunk
            .map((obj) => obj.Key)
            .filter((key): key is string => key !== undefined)

        console.info(
            `Queuing chunk with ${keys.length} files for parallel processing`
        )

        scanPromises.push(
            fileScanner({
                bucket: bucketName,
                keys,
            })
        )
    }

    console.info(
        `Starting parallel processing of ${scanPromises.length} chunks`
    )
    const chunkResults = await Promise.all(scanPromises)

    // Compile results
    for (const chunkRes of chunkResults) {
        if (chunkRes instanceof Error) {
            console.error('Failed to scan chunk of files', chunkRes)
            return chunkRes
        }

        console.info('Infected files in chunk:', chunkRes.infectedKeys)
        allInfectedFiles = allInfectedFiles.concat(chunkRes.infectedKeys)
    }

    console.info(
        `Rescan complete! Processed ${filesToRescan.length} files in parallel, found ${allInfectedFiles.length} infected files`
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

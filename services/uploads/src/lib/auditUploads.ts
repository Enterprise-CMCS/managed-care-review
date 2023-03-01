import { S3UploadsClient } from '../deps/s3'
import { generateVirusScanTagSet, virusScanStatus, ScanStatus } from './tags'
import { _Object } from '@aws-sdk/client-s3'
import { listInfectedFilesFn, ScanFilesOutput } from '../lambdas/avAuditFiles'

// Chunk the objects, by file size. Prevent chunks from having more than 20 objects in them, or from being greater than 500 megs.
// doing it simple, not trying to get into bin packing here
function chunkS3Objects(objects: _Object[]): _Object[][] {
    const maxChunkSize = 500_000_000 // Size is reported in Bytes, this is 500 megs, less than the max allowed download size.

    const chunks: _Object[][] = []
    let currentChunk: _Object[] = []
    let currentChunkSize = 0
    for (const obj of objects) {
        const size = obj.Size || maxChunkSize
        if (
            size + currentChunkSize > maxChunkSize ||
            currentChunk.length === 20
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

// This pulls the current tagging for the given object and verifies that the scan status tag is what we expect
async function verifyTag(
    s3Client: S3UploadsClient,
    bucketName: string,
    key: string,
    expectedTag: ScanStatus
): Promise<'WAS_CORRECT' | 'CORRECTED' | Error> {
    const tags = await s3Client.getObjectTags(key, bucketName)
    if (tags instanceof Error) {
        console.error('Failed to get tags for key: ', key)
        return tags
    }

    const scanStatus = virusScanStatus(tags)

    if (scanStatus === expectedTag) {
        return 'WAS_CORRECT'
    }

    console.info(
        `BAD: File Is mistagged. Expected: ${expectedTag} Actual: ${scanStatus} Key: ${key}`
    )

    const infectedTags = generateVirusScanTagSet(expectedTag)
    const tag = await s3Client.tagObject(key, bucketName, infectedTags)
    if (tag instanceof Error) {
        const errMsg = `Failed to set infected tags for: ${key}, got: ${tag}`
        console.error(errMsg)
        return tag
    }
    console.info('Corrected tags for ', key)

    return 'CORRECTED'
}

// audit bucket returns a list of keys that are INFECTED that were previously marked CLEAN
async function auditBucket(
    s3Client: S3UploadsClient,
    fileScanner: listInfectedFilesFn,
    bucketName: string
): Promise<string[] | Error> {
    // list all objects in bucket, TODO: with pagination probably
    const objects = await s3Client.listBucketObjects(bucketName)
    if (objects instanceof Error) {
        console.error('failed to list files', objects)
        return objects
    }

    // If any single file is too big, make sure it's marked SKIPPED and skip it.
    const tooBigFiles = objects.filter((o) => !o.Size || o.Size > 314572800)
    const allValidObjects = objects.filter((o) => o.Size && o.Size <= 314572800)

    // Verify the tags on files that are too big. If there are errors, we'll just log them since
    // they aren't being scanned one way or another
    for (const bigFileKey of tooBigFiles
        .map((obj) => obj.Key)
        .filter((key): key is string => key !== undefined)) {
        const result = await verifyTag(
            s3Client,
            bucketName,
            bigFileKey,
            'SKIPPED'
        )
        if (result instanceof Error) {
            console.error('Error attempting to verify tags on a SKIPPED file')
        } else if (result === 'CORRECTED') {
            console.error('had to correct a SKIPPED file', bigFileKey)
        }
    }

    // chunk objects into groups by filesize and count
    const chunks = chunkS3Objects(allValidObjects)
    console.info(
        'made chunks of size: ',
        chunks.map((c) => c.length)
    )

    let allInfectedFiles: string[] = []
    // Download files chunk by chunk by invoking a lambda
    const scanPromises: Promise<ScanFilesOutput | Error>[] = []
    for (const chunk of chunks) {
        console.info('scanning a chunk of documents')
        const keys = chunk
            .map((obj) => obj.Key)
            .filter((key): key is string => key !== undefined)

        scanPromises.push(
            fileScanner({
                bucket: bucketName,
                keys,
            })
        )
    }

    const chunkResults = await Promise.all(scanPromises)

    // now all the lambdas are done, compile all the infected files
    for (const chunkRes of chunkResults) {
        if (chunkRes instanceof Error) {
            console.error('failed to scan chunk of files', chunkRes)
            return chunkRes
        }

        console.info('Infected Files In Chunk:', chunkRes)
        allInfectedFiles = allInfectedFiles.concat(chunkRes.infectedKeys)
    }

    console.info(
        `scanned all chunks, found ${allInfectedFiles.length} infected files: ${allInfectedFiles}`
    )

    // Now for all the infected files, determine if they have their tags set incorrectly
    const misTaggedInfectedFiles: string[] = []
    const taggingErrors: Error[] = []
    for (const infectedFile of allInfectedFiles) {
        const tagResult = await verifyTag(
            s3Client,
            bucketName,
            infectedFile,
            'INFECTED'
        )
        if (tagResult instanceof Error) {
            taggingErrors.push(tagResult)
        } else if (tagResult === 'CORRECTED') {
            misTaggedInfectedFiles.push(infectedFile)
        }
    }

    if (taggingErrors.length > 0) {
        console.error(
            'All Errors from attempting to update tags',
            taggingErrors
        )
        return new Error(
            'We encountered errors trying to fix the tags for improperly tagged objects'
        )
    }

    if (misTaggedInfectedFiles.length === 0) {
        console.info('No mistagged files found. Audit is clean.')
        return []
    }

    console.info(
        `Found ${misTaggedInfectedFiles.length} mistagged infected files: ${misTaggedInfectedFiles} and correctly marked them as INFECTED`
    )

    return misTaggedInfectedFiles
}

export { auditBucket }

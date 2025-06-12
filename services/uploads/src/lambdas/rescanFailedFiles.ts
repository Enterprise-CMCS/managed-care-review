import { Context } from 'aws-lambda'
import { NewS3UploadsClient, S3UploadsClient } from '../deps/s3'
import { NewClamAV, ClamAV } from '../deps/clamAV'
import { virusScanStatus, generateVirusScanTagSet } from '../lib/tags'
import { _Object } from '@aws-sdk/client-s3'
import { mkdtemp, rm } from 'fs/promises'
import crypto from 'crypto'
import path from 'path'

// Chunk the objects by file size. Prevent chunks from having more than 20 objects in them,
// or from being greater than 500 megs.
function chunkS3Objects(objects: _Object[]): _Object[][] {
    const maxChunkSize = 500_000_000 // 500 MB in bytes

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

// Scan a chunk of files and return the infected keys (virus scanning only, skip MIME validation)
async function scanFileChunk(
    s3Client: S3UploadsClient,
    clamAV: ClamAV,
    keys: string[],
    bucketName: string
): Promise<string[] | Error> {
    const tmpScanDir = await mkdtemp('/tmp/scanFiles-')

    try {
        // Download files for scanning
        const filemap: { [filename: string]: string } = {}

        for (const key of keys) {
            console.info('Downloading file to be scanned', key)
            const scanFileName = `${crypto.randomUUID()}.tmp`
            const scanFilePath = path.join(tmpScanDir, scanFileName)

            filemap[scanFileName] = key

            const err = await s3Client.downloadFileFromS3(
                key,
                bucketName,
                scanFilePath
            )
            if (err instanceof Error) {
                console.error('failed to download one of the scan files', err)
                return err
            }
        }

        // Perform ONLY virus scan (skip MIME type validation for rescan)
        console.info('Scanning Files for viruses')
        const virusScanResult = clamAV.scanForInfectedFiles(tmpScanDir)
        console.info('VIRUS SCAN RESULT', virusScanResult)
        console.info('Files in scan directory:', Object.keys(filemap))
        console.info('File mapping:', filemap)

        if (virusScanResult instanceof Error) {
            return virusScanResult
        }

        // Map infected filenames back to S3 keys
        const infectedKeys = virusScanResult.map((filename) => {
            console.info(
                `Mapping infected file ${filename} to key ${filemap[filename]}`
            )
            return filemap[filename]
        })

        console.info('Final infected keys:', infectedKeys)
        return infectedKeys
    } finally {
        // Always clean up the temp directory
        await rm(tmpScanDir, { force: true, recursive: true })
    }
}

// Re-scan files that have problematic scan statuses (ERROR or no scan tag)
export async function rescanFailedFiles(
    s3Client: S3UploadsClient,
    clamAV: ClamAV,
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
    let totalFilesProcessed = 0

    // Process each chunk sequentially to avoid overwhelming the system
    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const keys = chunk
            .map((obj) => obj.Key)
            .filter((key): key is string => key !== undefined)

        console.info(
            `Scanning chunk ${i + 1}/${chunks.length} with ${keys.length} files`
        )

        const chunkResult = await scanFileChunk(
            s3Client,
            clamAV,
            keys,
            bucketName
        )

        if (chunkResult instanceof Error) {
            console.error(`Failed to scan chunk ${i + 1}:`, chunkResult)
            return chunkResult
        }

        // Tag all files in this chunk with their scan results
        for (const key of keys) {
            const isInfected = chunkResult.includes(key)
            const scanStatus = isInfected ? 'INFECTED' : 'CLEAN'

            console.info(`Tagging ${key} as ${scanStatus}`)

            try {
                const newTags = generateVirusScanTagSet(scanStatus)
                const currentTags = await s3Client.getObjectTags(
                    key,
                    bucketName
                )
                if (currentTags instanceof Error) {
                    console.error(
                        `Failed to get current tags for ${key}:`,
                        currentTags
                    )
                    continue
                }

                // Filter out existing virus scan tags and add the new ones
                const nonVirusScanTags = currentTags.filter(
                    (tag) =>
                        tag.Key !== 'virusScanStatus' &&
                        tag.Key !== 'virusScanTimestamp'
                )
                const updatedTags = {
                    TagSet: nonVirusScanTags.concat(newTags.TagSet),
                }

                console.info(`Updating tags for ${key}:`, updatedTags)
                const tagResult = await s3Client.tagObject(
                    key,
                    bucketName,
                    updatedTags
                )
                if (tagResult instanceof Error) {
                    console.error(`Failed to tag ${key}:`, tagResult)
                } else {
                    console.info(`Successfully tagged ${key} as ${scanStatus}`)
                }
            } catch (error) {
                console.error(`Exception while tagging ${key}:`, error)
            }
        }

        totalFilesProcessed += keys.length
        console.info(
            `Processed ${totalFilesProcessed}/${filesToRescan.length} files`
        )

        console.info(`Infected files in chunk ${i + 1}:`, chunkResult)
        allInfectedFiles = allInfectedFiles.concat(chunkResult)
    }

    console.info(
        `Rescan complete! Processed ${totalFilesProcessed} files, found ${allInfectedFiles.length} infected files`
    )

    return allInfectedFiles
}

async function main(_event: unknown, _context: Context): Promise<string> {
    console.info('-----Start Rescan Failed Files function-----')

    // Check required environment variables
    const clamAVBucketName = process.env.CLAMAV_BUCKET_NAME
    if (!clamAVBucketName || clamAVBucketName === '') {
        throw new Error('Configuration Error: CLAMAV_BUCKET_NAME must be set')
    }

    const clamAVDefinitionsPath = process.env.PATH_TO_AV_DEFINITIONS
    if (!clamAVDefinitionsPath || clamAVDefinitionsPath === '') {
        throw new Error(
            'Configuration Error: PATH_TO_AV_DEFINITIONS must be set'
        )
    }

    const auditBucketName = process.env.AUDIT_BUCKET_NAME
    if (!auditBucketName || auditBucketName === '') {
        throw new Error('Configuration Error: AUDIT_BUCKET_NAME must be set')
    }

    // Initialize clients
    const s3Client = NewS3UploadsClient()
    const clamAV = NewClamAV(
        {
            bucketName: clamAVBucketName,
            definitionsPath: clamAVDefinitionsPath,
        },
        s3Client
    )

    console.info(`Rescanning failed files in bucket: ${auditBucketName}`)

    const result = await rescanFailedFiles(s3Client, clamAV, auditBucketName)

    if (result instanceof Error) {
        throw result
    }

    const message = `RESCAN COMPLETE - Processed files with failed/missing scan status. Found ${result.length} infected files.`
    console.info(message)
    return message
}

module.exports = { main }

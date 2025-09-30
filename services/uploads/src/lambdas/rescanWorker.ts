import { Context } from 'aws-lambda'
import { NewS3UploadsClient } from '../deps/s3'
import { NewClamAV } from '../deps/clamAV'
import { generateVirusScanTagSet } from '../lib/tags'
import { mkdtemp, rm } from 'fs/promises'
import crypto from 'crypto'
import path from 'path'

interface ScanFilesInput {
    bucket: string
    keys: string[]
}

export interface ScanFilesOutput {
    infectedKeys: string[]
}

// Scan a list of files and return the infected keys (scan files individually to avoid ClamAV directory issues)
async function scanAndTagFiles(
    bucketName: string,
    keys: string[]
): Promise<string[] | Error> {
    // Check required environment variables
    const clamAVDefinitionsPath = process.env.PATH_TO_AV_DEFINITIONS
    if (!clamAVDefinitionsPath || clamAVDefinitionsPath === '') {
        throw new Error(
            'Configuration Error: PATH_TO_AV_DEFINITIONS must be set'
        )
    }

    // Initialize clients
    const s3Client = NewS3UploadsClient()
    const clamAV = NewClamAV(
        {
            definitionsPath: clamAVDefinitionsPath,
        },
        s3Client
    )

    const infectedKeys: string[] = []

    // Process each file individually to avoid ClamAV "File tree walk aborted" errors
    for (const key of keys) {
        console.info('Downloading and scanning individual file:', key)

        // Create a unique temp file for this specific scan
        const individualScanDir = await mkdtemp('/tmp/individual-scan-')
        const scanFileName = `${crypto.randomUUID()}.tmp`
        const scanFilePath = path.join(individualScanDir, scanFileName)

        try {
            // Download the file
            const downloadErr = await s3Client.downloadFileFromS3(
                key,
                bucketName,
                scanFilePath
            )
            if (downloadErr instanceof Error) {
                console.error(`Failed to download ${key}:`, downloadErr)
                continue // Skip this file but continue with others
            }

            // Scan just this one file
            console.info(`Scanning individual file: ${key}`)
            const virusScanResult =
                clamAV.scanForInfectedFiles(individualScanDir)

            if (virusScanResult instanceof Error) {
                console.error(`Failed to scan ${key}:`, virusScanResult)
                continue // Skip this file but continue with others
            }

            // Determine scan status
            let scanStatus: 'CLEAN' | 'INFECTED'
            if (Array.isArray(virusScanResult) && virusScanResult.length > 0) {
                console.info(`File ${key} is infected:`, virusScanResult)
                scanStatus = 'INFECTED'
                infectedKeys.push(key)
            } else {
                console.info(`File ${key} is clean`)
                scanStatus = 'CLEAN'
            }

            // Tag the file with scan result
            console.info(`Tagging ${key} as ${scanStatus}`)

            try {
                const tags = generateVirusScanTagSet(scanStatus)
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
                    TagSet: nonVirusScanTags.concat(tags.TagSet),
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
        } catch (fileError) {
            console.error(`Error processing individual file ${key}:`, fileError)
            continue // Skip this file but continue with others
        } finally {
            // Clean up individual scan directory
            await rm(individualScanDir, { force: true, recursive: true })
        }
    }

    console.info(
        'Individual file scanning complete. Infected files:',
        infectedKeys
    )
    return infectedKeys
}

async function main(
    event: ScanFilesInput,
    _context: Context
): Promise<ScanFilesOutput> {
    console.info('-----Start Rescan Worker function-----')
    console.info(
        `Scanning ${event.keys.length} files in bucket ${event.bucket}`
    )

    const result = await scanAndTagFiles(event.bucket, event.keys)

    if (result instanceof Error) {
        console.error('Error scanning files', result)
        throw result
    }

    return {
        infectedKeys: result,
    }
}

module.exports = { main }

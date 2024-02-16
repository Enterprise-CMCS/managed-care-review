import path from 'path'
import { spawnSync } from 'child_process'
import { readdir } from 'fs/promises'

import { S3UploadsClient } from '../s3'
import { generateUploadedAtTagSet } from '../../lib/tags'

interface ClamAV {
    downloadAVDefinitions: () => Promise<undefined | Error>
    uploadAVDefinitions: (workdir: string) => Promise<undefined | Error>
    scanForInfectedFiles: (path: string) => string[] | Error
    fetchAVDefinitionsWithFreshclam: (
        workdir: string
    ) => Promise<undefined | Error>
}

interface ClamAVConfig {
    bucketName: string
    definitionsPath: string
    pathToClamav: string
    pathToFreshclam: string
    pathToConfig: string
    pathToDefintions: string

    pathToClamdScan: string
    pathToClamdConfig: string
}

function NewClamAV(config: Partial<ClamAVConfig>, s3Client: S3UploadsClient) {
    if (!config.bucketName || !config.definitionsPath) {
        throw new Error('BucketName and DefinitionsPath are required')
    }

    const fullConfig: ClamAVConfig = {
        bucketName: config.bucketName,
        definitionsPath: config.definitionsPath,

        pathToClamav: config.pathToClamav || '/opt/bin/clamscan',
        pathToFreshclam: config.pathToFreshclam || '/opt/bin/freshclam',
        pathToConfig: config.pathToConfig || '/opt/bin/freshclam.conf',
        pathToDefintions: config.pathToDefintions || '/tmp',

        pathToClamdScan: config.pathToClamdScan || '/opt/bin/clamdscan',
        pathToClamdConfig: config.pathToClamdConfig || '/opt/clamd.conf',
    }

    return {
        downloadAVDefinitions: () =>
            downloadAVDefinitions(fullConfig, s3Client),
        uploadAVDefinitions: (workdir: string) =>
            uploadAVDefinitions(fullConfig, s3Client, workdir),
        scanForInfectedFiles: (path: string) =>
            scanForInfectedFiles(fullConfig, path),
        fetchAVDefinitionsWithFreshclam: (workdir: string) =>
            fetchAVDefinitionsWithFreshclam(fullConfig, workdir),
    }
}

/**
 * Uploads the AV definitions to the S3 bucket.
 */
async function uploadAVDefinitions(
    config: ClamAVConfig,
    s3Client: S3UploadsClient,
    workdir: string
) {
    // delete all the definitions currently in the bucket.
    // first list them.
    console.info('Uploading Definitions')
    const s3AllFullKeys = await s3Client.listBucketFiles(config.bucketName)
    if (s3AllFullKeys instanceof Error) {
        console.error('Error listing current defs')
        return s3AllFullKeys
    }

    const s3DefinitionFileFullKeys = s3AllFullKeys.filter((key) =>
        key.startsWith(config.definitionsPath)
    )

    // If there are any s3 Definition files in the s3 bucket, delete them.
    if (s3DefinitionFileFullKeys.length != 0) {
        const res = await s3Client.deleteObjects(
            s3DefinitionFileFullKeys,
            config.bucketName
        )
        if (res) {
            console.error('Error deleting previous definitions', res)
            return res
        }
    }

    // list all the files in the work dir for upload
    const definitionFiles = await readdir(workdir)
    console.info('defs to upload', definitionFiles)

    const uploadPromises = definitionFiles.map((filenameToUpload) => {
        console.info(
            `Uploading updated definitions for file ${filenameToUpload} ---`
        )

        const key = `${config.definitionsPath}/${filenameToUpload}`
        const filepath = path.join(workdir, filenameToUpload)

        // In addition to uploading the object, tag it with the current time
        // this is used in testing to determine when to re-run freshclam
        return s3Client
            .uploadObject(key, config.bucketName, filepath)
            .then(() => {
                const tags = generateUploadedAtTagSet()

                return s3Client.tagObject(key, config.bucketName, tags)
            })
    })

    try {
        await Promise.all(uploadPromises)
        console.info('all files uploaded')
        return undefined
    } catch (err) {
        console.error('Failed to upload all files', err)
        return err
    }
}

// downloads AV definition files from the bucket for local scanning
async function downloadAVDefinitions(
    config: ClamAVConfig,
    s3Client: S3UploadsClient
): Promise<undefined | Error> {
    console.info('Downloading AV Definitions from S3')

    const allFileKeys = await s3Client.listBucketFiles(config.bucketName)
    if (allFileKeys instanceof Error) {
        return allFileKeys
    }

    const definitionFileKeys = allFileKeys.filter((key) =>
        key.startsWith(config.definitionsPath)
    )

    if (definitionFileKeys.length === 0) {
        return new Error(
            `No AV Definitions found to download in bucket: ${config.bucketName}`
        )
    }

    const res = await s3Client.downloadAllFiles(
        definitionFileKeys,
        config.bucketName,
        config.pathToDefintions
    )
    if (res) {
        return res
    }

    console.info('Downloaded all AV definition files locally')
    return
}

// parses the output from clamscan for a failed scan run and returns the list of bad files
function parseInfectedFiles(clamscanOutput: string): string[] {
    const infectedFiles = []
    for (const line of clamscanOutput.split('\n')) {
        if (line.includes('FOUND')) {
            const [filepath] = line.split(':')
            infectedFiles.push(path.basename(filepath))
        }
    }
    return infectedFiles
}

/**
 * Function to scan the given file(s). This function requires ClamAV and the definitions to be available.
 * This function does not download the file so the file should also be accessible.
 *
 * Returns a list of infected files, returning [] means no files are infected.
 *
 */
function scanForInfectedFiles(
    config: ClamAVConfig,
    pathToScan: string
): string[] | Error {
    try {
        console.info('Executing clamav')

        // use clamdscan to connect to our clamavd server
        const avResult = spawnSync(config.pathToClamdScan, [
            '--stdout',
            '-v',
            `--config-file=${config.pathToClamdConfig}`,
            '--stream',
            pathToScan,
        ])

        console.info('stderror', avResult.stderr && avResult.stderr.toString())
        console.info('stdout', avResult.stdout && avResult.stdout.toString())
        console.info('err', avResult.error)

        // Exit status 1 means file is infected
        if (avResult.status === 1) {
            console.info('SUCCESSFUL SCAN, FILE INFECTED')

            return parseInfectedFiles(avResult.stdout.toString())
        } else if (avResult.status !== 0) {
            console.info('SCAN FAILED WITH ERROR')
            return (
                avResult.error ||
                new Error(`Failed to scan file: ${avResult.stderr.toString()}`)
            )
        }

        console.info('SUCCESSFUL SCAN, FILE CLEAN')

        return []
    } catch (err) {
        console.error('-- SCAN FAILED ERR --')
        console.error(err)
        return err
    }
}

/**
 * Updates the definitions using freshclam.
 *
 * It will download the latest definitions to the current work dir
 */
async function fetchAVDefinitionsWithFreshclam(
    config: ClamAVConfig,
    workdir: string
): Promise<undefined | Error> {
    try {
        console.info('config.pathToConfig', config.pathToConfig, workdir)

        // freshclam does not handle long arguments the unix way, the equal signs are required here
        const executionResult = spawnSync(config.pathToFreshclam, [
            `--config-file=${config.pathToConfig}`,
            `--datadir=${workdir}`,
        ])

        if (executionResult.status !== 0) {
            console.info('Freshclam Error', executionResult)
            console.error(
                'stderror',
                executionResult.stderr && executionResult.stderr.toString()
            )
            console.error(
                'stdout',
                executionResult.stdout && executionResult.stdout.toString()
            )
            console.error('err', executionResult.error)
            return (
                executionResult.error ||
                new Error(
                    `Failed to scan file: ${executionResult.stderr.toString()}`
                )
            )
        }

        console.info('Update message')
        console.info(executionResult.stdout.toString())

        const files = await readdir(workdir)

        console.info('Downloaded:', files)

        if (executionResult.stderr) {
            console.error('stderr: ', executionResult.stderr.toString())
        }

        return undefined
    } catch (err) {
        console.error('Error running freshclam', err)
        return err
    }
}

export { NewClamAV, ClamAV, parseInfectedFiles }

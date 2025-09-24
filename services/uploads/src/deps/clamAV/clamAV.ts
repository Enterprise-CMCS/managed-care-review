import path from 'path'
import { spawnSync, SpawnSyncReturns } from 'child_process'
import { readdir } from 'fs/promises'

import { S3UploadsClient } from '../s3'

interface ClamAV {
    scanForInfectedFiles: (path: string) => string[] | Error
    fetchAVDefinitionsWithFreshclam: (
        workdir: string
    ) => Promise<undefined | Error>
}

interface ClamAVConfig {
    definitionsPath: string
    pathToClamav: string
    pathToFreshclam: string
    pathToConfig: string
    pathToDefintions: string

    pathToClamdScan: string
    pathToClamdConfig: string

    isLocal: boolean
}

function NewClamAV(config: Partial<ClamAVConfig>, s3Client: S3UploadsClient) {
    if (!config.definitionsPath) {
        throw new Error('DefinitionsPath are required')
    }

    const fullConfig: ClamAVConfig = {
        definitionsPath: config.definitionsPath,

        pathToClamav: config.pathToClamav || '/opt/bin/clamscan',
        pathToFreshclam: config.pathToFreshclam || '/opt/bin/freshclam',
        pathToConfig: config.pathToConfig || '/opt/bin/freshclam.conf',
        pathToDefintions: config.pathToDefintions || '/tmp',

        pathToClamdScan: config.pathToClamdScan || '/opt/bin/clamdscan',
        pathToClamdConfig: config.pathToClamdConfig || '/var/task/clamd.conf',
        isLocal: config.isLocal || false,
    }

    const avScan: AVScan = fullConfig.isLocal
        ? new ClamscanLocal(fullConfig)
        : new ClamdscanLambda(fullConfig)

    return {
        scanForInfectedFiles: (path: string) =>
            scanForInfectedFiles(fullConfig, avScan, path),
        fetchAVDefinitionsWithFreshclam: (workdir: string) =>
            fetchAVDefinitionsWithFreshclam(fullConfig, workdir),
    }
}

interface AVScan {
    scan(pathToScan: string): SpawnSyncReturns<Buffer>
}

class ClamscanLocal implements AVScan {
    constructor(private config: ClamAVConfig) {}

    scan(pathToScan: string): SpawnSyncReturns<Buffer> {
        return spawnSync(this.config.pathToClamav, [
            '--stdout',
            '-v',
            pathToScan,
        ])
    }
}

class ClamdscanLambda implements AVScan {
    constructor(private config: ClamAVConfig) {}

    scan(pathToScan: string): SpawnSyncReturns<Buffer> {
        return spawnSync(this.config.pathToClamdScan, [
            '--stdout',
            '-v',
            `--config-file=${this.config.pathToClamdConfig}`,
            '--stream',
            pathToScan,
        ])
    }
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
    avscan: AVScan,
    pathToScan: string
): string[] | Error {
    try {
        console.info('Executing clamav')
        // use clamdscan to connect to our clamavd server
        const avResult = avscan.scan(pathToScan)

        if (avResult.stderr) {
            console.info('stderror', avResult.stderr.toString())
        }
        if (avResult.stdout) {
            console.info('stdout', avResult.stdout.toString())
        }
        if (avResult.error) {
            console.error('error', avResult.error)
        }

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

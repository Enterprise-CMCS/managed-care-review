import path from 'path'
import { spawnSync } from 'child_process'
import { readdir } from 'fs/promises'

import { S3UploadsClient } from './s3'

type ClamAVScanResult = 'CLEAN' | 'INFECTED'

interface ClamAV {
    downloadAVDefinitions: () => Promise<undefined | Error>
    uploadAVDefinitions: (workdir: string) => Promise<undefined | Error>
    scanLocalFile: (path: string) => ClamAVScanResult | Error
    fetchAVDefinitionsWithFreshclam: (workdir: string) => Promise<undefined | Error>
}

interface ClamAVConfig {
    bucketName: string
    definitionsPath: string
    pathToClamav: string
    pathToFreshclam: string
    pathToConfig: string
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
        pathToConfig: config.pathToConfig || '/opt/bin/freshclam.conf'
    }

    return {
        downloadAVDefinitions: () => downloadAVDefinitions(fullConfig, s3Client),
        uploadAVDefinitions: (workdir: string) => uploadAVDefinitions(fullConfig, s3Client, workdir),
        scanLocalFile: (path: string) => scanLocalFile(fullConfig, path),
        fetchAVDefinitionsWithFreshclam: (workdir: string) => fetchAVDefinitionsWithFreshclam(fullConfig, workdir),
    }
}

/**
 * Uploads the AV definitions to the S3 bucket.
 */
async function uploadAVDefinitions(config: ClamAVConfig, s3Client: S3UploadsClient, workdir: string) {
    // delete all the definitions currently in the bucket.
    // first list them.
    console.info('Uploading Definitions');
    const s3AllFullKeys = await s3Client.listBucketFiles(config.bucketName);
    if (s3AllFullKeys instanceof Error) {
        console.error('Error listing current defs')
        return s3AllFullKeys
    }

    const s3DefinitionFileFullKeys = s3AllFullKeys.filter((key) =>
        key.startsWith(config.definitionsPath)
    );

    // If there are any s3 Definition files in the s3 bucket, delete them.
    if (s3DefinitionFileFullKeys.length != 0) {
        const res = await s3Client.deleteObjects(s3DefinitionFileFullKeys, config.bucketName)
        if (res) {
            console.error('Error deleting previous definitions', res)
            return res
        }
    }

    // list all the files in the work dir for upload
    const definitionFiles = await readdir(workdir);
    console.info('defs to upload', definitionFiles)

    const uploadPromises = definitionFiles.map((filenameToUpload) => {
        console.info(
            `Uploading updated definitions for file ${filenameToUpload} ---`
        );

        const key = `${config.definitionsPath}/${filenameToUpload}`
        const filepath = path.join(workdir, filenameToUpload)

        
        return s3Client.uploadObject(key, config.bucketName, filepath)
    });

    try {
        await Promise.all(uploadPromises)
        console.info('all files uploaded')
        return undefined
    } catch (err) {
        console.error('Failed to upload all files', err)
        return err
    }
}


async function downloadAVDefinitions(config: ClamAVConfig, s3Client: S3UploadsClient): Promise<undefined | Error> {
    console.info('Downloading AV Definitions from S3')

    const allFileKeys = await s3Client.listBucketFiles(config.bucketName)
    if (allFileKeys instanceof Error) {
        return allFileKeys
    }

    const definitionFileKeys = allFileKeys
        .filter((key) => key.startsWith(config.definitionsPath))


    const downloadPromises = []
    for (const defFileKey of definitionFileKeys) {
        let destinationFile = path.join('/tmp/', defFileKey)

        console.info(`Downloading ${defFileKey} from S3 to ${destinationFile}`)

        const filename = path.basename(defFileKey)
        const localPath = path.join('/tmp/', filename)

        const downloadPromise = s3Client.downloadFileFromS3(defFileKey, config.bucketName, localPath)

        downloadPromises.push(downloadPromise)
    }

    await Promise.all(downloadPromises)
    console.log('Downloaded all AV definition files locally')
    return

}

/**
 * Function to scan the given file. This function requires ClamAV and the definitions to be available.
 * This function does not download the file so the file should also be accessible.
 *
 * Three possible case can happen:
 * - The file is clean, the clamAV command returns 0 and the function return "CLEAN"
 * - The file is infected, the clamAV command returns 1 and this function will return "INFECTED"
 * - Any other error and the function will return an Error
 *
 */
function scanLocalFile(config: ClamAVConfig, pathToFile: string): ClamAVScanResult | Error {
    try {
        let avResult = spawnSync(config.pathToClamav, [
            '--stdout',
            '-v',
            '-a',
            '-d',
            '/tmp',
            pathToFile,
        ])

        // Exit status 1 means file is infected
        if (avResult.status === 1) {
            console.info('SUCCESSFUL SCAN, FILE INFECTED')
            return 'INFECTED'
        } else if (avResult.status !== 0) {
            console.info('SCAN FAILED WITH ERROR')
            console.error('stderror', avResult.stderr && avResult.stderr.toString())
            console.error('stdout', avResult.stdout && avResult.stdout.toString())
            console.error('err', avResult.error)
            return avResult.error || new Error(`Failed to scan file: ${avResult.stderr.toString()}`)
        }

         console.info('SUCCESSFUL SCAN, FILE CLEAN')
         console.info(avResult.stdout.toString())

         return 'CLEAN'

    } catch (err) {
        console.info('-- SCAN FAILED ERR --')
        console.log(err)
        return err
    }
}

/**
 * Updates the definitions using freshclam.
 *
 * It will download the latest definitions to the current work dir
 */
async function fetchAVDefinitionsWithFreshclam(config: ClamAVConfig, workdir: string): Promise<undefined | Error> {
    try {

        console.log('config.pathToConfig', config.pathToConfig, workdir)

        // freshclam does not handle long arguments the unix way, the equal signs are required here
        let executionResult = spawnSync(config.pathToFreshclam, [
            `--config-file=${config.pathToConfig}`, 
            `--datadir=${workdir}`,
        ])

        if (executionResult.status !== 0) {
             console.info('Freshclam Error', executionResult)
             console.error('stderror', executionResult.stderr && executionResult.stderr.toString())
             console.error('stdout', executionResult.stdout && executionResult.stdout.toString())
             console.error('err', executionResult.error)
             return executionResult.error || new Error(`Failed to scan file: ${executionResult.stderr.toString()}`)
        }

        console.info('Update message')
        console.log(executionResult.toString())

        console.log(
            'Downloaded:',
            await readdir(workdir)
        )

        if (executionResult.stderr) {
            console.error('stderr: ', executionResult.stderr.toString())
        }

        return undefined
    } catch (err) {
        console.error('Error running freshclam', err)
        return err
    }
}

export {
    NewClamAV,
    ClamAV,
}

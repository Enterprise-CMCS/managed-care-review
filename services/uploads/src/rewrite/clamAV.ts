import path from 'path'
import { spawnSync } from 'child_process'

import { listBucketFiles, downloadFileFromS3 } from './s3'

const PATH_TO_CLAMAV = '/opt/bin/clamscan'

type ClamAVScanResult = 'CLEAN' | 'INFECTED'

interface ClamAV {
    downloadAVDefinitions: () => Promise<undefined | Error>
    scanLocalFile: (path: string) => ClamAVScanResult | Error
}


interface ClamAVConfig {
    bucketName: string
    definitionsPath: string
}

function NewClamAV(config: ClamAVConfig) {
    return {
        downloadAVDefinitions: () => downloadAVDefinitions(config),
        scanLocalFile: (path: string) => scanLocalFile(config, path),
    }
}


/**
 * Function to scan the given file. This function requires ClamAV and the definitions to be available.
 * This function does not download the file so the file should also be accessible.
 *
 * Three possible case can happen:
 * - The file is clean, the clamAV command returns 0 and the function return "CLEAN"
 * - The file is infected, the clamAV command returns 1 and this function will return "INFECTED"
 * - Any other error and the function will return null; (falsey)
 *
 */
function scanLocalFile(config: ClamAVConfig, pathToFile: string): ClamAVScanResult | Error {
    try {
        let avResult = spawnSync(PATH_TO_CLAMAV, [
            '--stdout',
            '-v',
            '-a',
            `-d ${pathToFile}`,
        ]);

        console.info('SUCCESSFUL SCAN, FILE CLEAN');
        console.log(avResult.toString());

        return 'CLEAN';
    } catch (err) {
        // Error status 1 means that the file is infected.
        if (err.status === 1) {
            console.info('SUCCESSFUL SCAN, FILE INFECTED');
            return 'INFECTED'
        } else {
            console.info('-- SCAN FAILED --');
            console.log(err);
            return err;
        }
    }
}

async function downloadAVDefinitions(config: ClamAVConfig): Promise<undefined | Error> {
    console.info('Downloading AV Definitions from S3')

    const allFileKeys = await listBucketFiles(config.bucketName);
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

        const downloadPromise = downloadFileFromS3(defFileKey, config.bucketName, localPath)

        downloadPromises.push(downloadPromise)
    }

    await Promise.all(downloadPromises)
    console.log('Downloaded all AV definition files locally')
    return

}

export {
    NewClamAV,
    ClamAV,
}

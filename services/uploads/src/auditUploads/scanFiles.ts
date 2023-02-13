import { Context, S3Event } from 'aws-lambda';
// import { rm, readdir } from 'fs/promises'
// import path from 'path'

// import { NewS3UploadsClient, S3UploadsClient } from '../s3'

// import { NewClamAV, ClamAV } from '../clamAV'


interface ScanFilesInput {
    bucket: string
    keys: string[]
}

interface ScanFilesOutput {
    infectedKeys: string[]
}


/*
 * scanFilesLambda returns a list of all the given files in S3 that fail antivirus scanning
 */
async function scanFilesLambda(event: S3Event, _context: Context) {

    // get a list of keys out of the event

    console.log('EVENT: ', event)

    //download and scan files


    // return error or list of files


    return {
        infectedKeys: ['onefile.txt', 'twofile.txt']
    }
}

// async function executeScanFilesLambda()



export {
    scanFilesLambda,
    ScanFilesInput,
    ScanFilesOutput,
}

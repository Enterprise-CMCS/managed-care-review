import { Context, S3Event } from 'aws-lambda';
import { rm, stat, readdir } from 'fs/promises'
import path from 'path'

import { NewS3UploadsClient, S3UploadsClient } from './s3'

import { NewClamAV, ClamAV } from './clamAV'

export async function auditUploadsLambda(event: S3Event, _context: Context) {
    console.info('-----Start Audit Uploads function-----')

    // Check on the values for our required config
    const clamAVBucketName = process.env.CLAMAV_BUCKET_NAME
    if (!clamAVBucketName || clamAVBucketName === '') {
        throw new Error('Configuration Error: CLAMAV_BUCKET_NAME must be set')
    }

    const clamAVDefintionsPath = process.env.PATH_TO_AV_DEFINITIONS
    if (!clamAVDefintionsPath || clamAVDefintionsPath === '') {
        throw new Error('Configuration Error: PATH_TO_AV_DEFINITIONS must be set')
    }

    const auditBucketName = process.env.AUDIT_BUCKET_NAME
    if (!auditBucketName || auditBucketName === '') {
        throw new Error('Configuration Error: AUDIT_BUCKET_NAME must be set')
    } 

    const s3Client = NewS3UploadsClient()

    const clamAV = NewClamAV({
        bucketName: clamAVBucketName,
        definitionsPath: clamAVDefintionsPath
    }, s3Client)

    console.info('Updating ', clamAVBucketName)
    const err = await auditBucket(s3Client, clamAV, auditBucketName)

    if (err) {
        throw err
    }

    return 'FILE SCANNED'
}

async function emptyWorkdir(workdir: string): Promise<undefined | Error> {

    console.info('cleaning workdir: ', workdir)
    try {

        const files = await readdir(workdir)
        console.log('files before: ', files)

        for (const file of files) {
            const filePath = path.join(workdir, file)
            await rm(filePath)
        }

        const filesAfter = await readdir(workdir)
        console.log('files after: ', filesAfter)

    } catch (err) {
        console.error('FS Error cleaning workdir', err)
        return err
    }
}

// audit bucket returns a list of keys that are INFECTED that were previously marked CLEAN
async function auditBucket(s3Client: S3UploadsClient, clamAV: ClamAV, bucketName: string): Promise<undefined | Error> {

    // list all objects in bucket, with pagination probably -- 200 is our max right now, can skip that.
    const objects = await s3Client.listBucketFiles(bucketName)
    if (objects instanceof Error) {
        console.error('failed to list files', objects)
        return objects
    }

    // chunk objects into arrays of 10 or less
    const chunks: string[][] = []
    const chunkSize = 10
    for (let i = 0; i < objects.length; i += chunkSize ) {
        chunks.push(objects.slice(i, i + chunkSize))
    }

    // Download files chunk by chunk
    for (const chunk of chunks) {
        console.info('scanning a chunk of documents')

        const downloadRes = await s3Client.downloadAllFiles(chunk, bucketName, '/tmp/download')
        if (downloadRes) {
            console.error('couldnt get this chunk of files', chunk)
            return downloadRes
        }

        const scanRes = clamAV.scanLocalFile('/tmp/download')
        if (scanRes !== 'CLEAN') {
            console.error('something in this chunk is dirty', chunk, bucketName)
            return new Error(`Encountered a dirty file in ${chunk}`)
        }

        console.log('that chunk is clean')

        // remove the scanned files locally
        const eraseRes = await emptyWorkdir('/tmp/download')
        if (eraseRes) {
            console.error('failed to erase scanned files')
            return eraseRes
        }
    }

    console.info('scanned all chunks, all files clean: count', objects.length)

    return undefined

}

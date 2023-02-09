import { Context, S3Event } from 'aws-lambda';
import { rm, stat, readdir } from 'fs/promises'
import path from 'path'

import { NewS3UploadsClient, S3UploadsClient } from './s3'

import { NewClamAV, ClamAV } from './clamAV'

export async function updateAVDefinitionsLambda(event: S3Event, _context: Context) {
    console.info('-----Start Update AV Definitions function-----')

    // Check on the values for our required config
    const clamAVBucketName = process.env.CLAMAV_BUCKET_NAME
    if (!clamAVBucketName || clamAVBucketName === '') {
        throw new Error('Configuration Error: CLAMAV_BUCKET_NAME must be set')
    }

    const clamAVDefintionsPath = process.env.PATH_TO_AV_DEFINITIONS
    if (!clamAVDefintionsPath || clamAVDefintionsPath === '') {
        throw new Error('Configuration Error: PATH_TO_AV_DEFINITIONS must be set')
    } 

    const s3Client = NewS3UploadsClient()

    const clamAV = NewClamAV({
        bucketName: clamAVBucketName,
        definitionsPath: clamAVDefintionsPath
    }, s3Client)

    console.info('Updating ', clamAVBucketName)
    const err = await updateAVDefinitions(s3Client, clamAV, '/tmp')

    if (err) {
        throw err
    }

    return 'FILE SCANNED'
}

async function emptyWorkdir(workdir: string): Promise<undefined | Error> {

    console.info('cleaning workdir: ', workdir)
    try {

        const files = await readdir(workdir)

        for (const file of files) {
            const filePath = path.join(workdir, file)
            await rm(filePath)
        }

    } catch (err) {
        console.error('FS Error cleaning workdir', err)
        return err
    }
}

async function updateAVDefinitions(s3Client: S3UploadsClient, clamAV: ClamAV, workdir: string): Promise<undefined | Error> {

    // cleanup the workdir
    const res = await emptyWorkdir(workdir)
    if (res) {
        return res
    }

    // run freshclam, fetching the latest virus definition files from ClamAV
    const freshErr = await clamAV.fetchAVDefinitionsWithFreshclam(workdir)
    if (freshErr) {
        return freshErr
    }

    // upload the new definitions to the definitions bucket
    const uploadErr = await clamAV.uploadAVDefinitions(workdir)
    if (uploadErr) {
        return uploadErr
    }
}

export {
    updateAVDefinitions
}

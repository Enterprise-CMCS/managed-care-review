import { Context, S3Event } from 'aws-lambda';
import { rm, readdir } from 'fs/promises'
import path from 'path'

import { NewS3UploadsClient, S3UploadsClient } from '../s3'

import { NewClamAV, ClamAV } from '../clamAV'
import { scanFiles } from '../scanFiles';
import { generateVirusScanTagSet, virusScanStatus } from '../tags';

export async function auditUploadsLambda(_event: S3Event, _context: Context) {
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
    const err = await auditBucket(s3Client, clamAV, auditBucketName, '/tmp/download')

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

// audit bucket returns a list of keys that are INFECTED that were previously marked CLEAN
async function auditBucket(s3Client: S3UploadsClient, clamAV: ClamAV, bucketName: string, scanFolder: string): Promise<undefined | Error> {

    // get the virus definition files
    const defsRes = await clamAV.downloadAVDefinitions()
    if (defsRes) {
        console.error('failed to fetch definitions')
        return defsRes
    }

    // list all objects in bucket, with pagination probably -- 200 is our max right now, can skip that.
    const objects = await s3Client.listBucketFiles(bucketName)
    if (objects instanceof Error) {
        console.error('failed to list files', objects)
        return objects
    }

    // chunk objects into arrays of 10 or less
    const chunks: string[][] = []
    const chunkSize = 20
    for (let i = 0; i < objects.length; i += chunkSize ) {
        chunks.push(objects.slice(i, i + chunkSize))
    }

    let allInfectedFiles: string[] = []
    // Download files chunk by chunk
    for (const chunk of chunks) {
        console.info('scanning a chunk of documents')


        const infectedFilesInChunk = await scanFiles(s3Client, clamAV, chunk, bucketName, scanFolder)
        if (infectedFilesInChunk instanceof Error) {
            console.error('failed to scan chunk of files', infectedFilesInChunk)
            return infectedFilesInChunk
        }

        console.info('Infected Files In Chunk:', infectedFilesInChunk)

        allInfectedFiles = allInfectedFiles.concat(infectedFilesInChunk)

        // remove the scanned files locally
        const eraseRes = await emptyWorkdir(scanFolder)
        if (eraseRes) {
            console.error('failed to erase scanned files')
            return eraseRes
        }
    }

    console.info(`scanned all chunks, found ${allInfectedFiles.length} infected files: ${allInfectedFiles}`)

    // Now for all the infected files, determine if they have their tags set incorrectly
    const misTaggedInfectedFiles: string[] = []
    const taggingErrors: Error[] = []
    for (const infectedFile of allInfectedFiles) {

        const tags = await s3Client.getObjectTags(infectedFile, bucketName)
        if (tags instanceof Error) {
            console.error('Failed to get tags for key: ', infectedFile)
            taggingErrors.push(tags)
            continue
        }
        console.log('tags for ', infectedFile, tags)

        const scanStatus = virusScanStatus(tags)

        if (scanStatus === 'INFECTED') {
            console.log('Infected File is marked Infected')
            continue
        }

        if (scanStatus === 'CLEAN') {
            console.info('BAD: Infected File Is Marked CLEAN: ', infectedFile)
            misTaggedInfectedFiles.push(infectedFile)

            const infectedTags = generateVirusScanTagSet('INFECTED')
            const tag = await s3Client.tagObject(infectedFile, bucketName, infectedTags)
            if (tag instanceof Error) {
                const errMsg = `Failed to set infected tags for: ${infectedFile}, got: ${tag}`
                console.error(errMsg)
                taggingErrors.push(new Error(errMsg))
            }
            console.info('Corrected tags for ', infectedFile)

            continue
        }

        const errMsg = `Unable to verify tags for file: ${infectedFile}, got: ${scanStatus}`
        console.error(errMsg)
        taggingErrors.push(new Error(errMsg))

    }

    if (taggingErrors.length >0) {
        console.error('All Errors from attempting to update tags', taggingErrors)
        return new Error('We encountered errors trying to fix the tags for improperly tagged objects')
    }

    console.info(`Found ${misTaggedInfectedFiles.length} mistagged infected files: ${misTaggedInfectedFiles} and correctly marked them as INFECTED`)

    return undefined

}

export {
    auditBucket
}

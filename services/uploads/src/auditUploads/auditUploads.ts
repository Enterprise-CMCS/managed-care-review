import { Context } from 'aws-lambda';
import { NewS3UploadsClient, S3UploadsClient } from '../s3'
import { NewClamAV, ClamAV } from '../clamAV'
import { generateVirusScanTagSet, virusScanStatus } from '../tags';
import { _Object } from '@aws-sdk/client-s3';
import { invokeListInfectedFiles, listInfectedFilesFn, ScanFilesOutput } from './scanFiles';

export async function auditUploadsLambda(_event: unknown, _context: Context) {
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

    const fileScanner = invokeListInfectedFiles

    console.info('Updating ', clamAVBucketName)
    const err = await auditBucket(s3Client, clamAV, fileScanner, auditBucketName)

    if (err) {
        throw err
    }

    return 'FILES SCANNED'
}

// Chunk the objects, by file size. Prevent chunks from having more than 20 objects in them, or from being greater than 500 megs.
// doing it simple, not trying to get into bin packing here
function chunkS3Objects(objects: _Object[]): _Object[][] {

    const maxChunkSize = 500_000_000 // Size is reported in Bytes, this is 500 megs, less than the max allowed download size.

    const chunks: _Object[][] = []
    let currentChunk: _Object[] = []
    let currentChunkSize = 0
    for (const obj of objects) {
        console.log('chunking ojbec', obj.Size)
        const size = obj.Size || maxChunkSize
        if ((size + currentChunkSize) > maxChunkSize || currentChunk.length === 20) {
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

// audit bucket returns a list of keys that are INFECTED that were previously marked CLEAN
async function auditBucket(s3Client: S3UploadsClient, clamAV: ClamAV, fileScanner: listInfectedFilesFn, bucketName: string): Promise<undefined | Error> {

    // get the virus definition files
    const defsRes = await clamAV.downloadAVDefinitions()
    if (defsRes) {
        console.error('failed to fetch definitions')
        return defsRes
    }

    // list all objects in bucket, TODO: with pagination probably
    const objects = await s3Client.listBucketObjects(bucketName)
    if (objects instanceof Error) {
        console.error('failed to list files', objects)
        return objects
    }

    // TODO: If any single file is too big, make sure it's marked SKIPPED and skip it.

    // chunk objects into groups by filesize and count
    const chunks = chunkS3Objects(objects)
    console.log('make chunks of size: ', chunks.map((c) => c.length))

    let allInfectedFiles: string[] = []
    // Download files chunk by chunk by invoking a lambda
    const scanPromises: Promise<ScanFilesOutput | Error>[] = []
    for (const chunk of chunks) {
        console.info('scanning a chunk of documents')
        const keys = chunk.map((obj) => obj.Key).filter((key): key is string => key !== undefined)

        scanPromises.push(fileScanner({
            bucket: bucketName,
            keys
        }))
    }

    const chunkResults = await Promise.all(scanPromises)

    // now all the lambdas are done, compile all the infected files
    for (const chunkRes of chunkResults) {
        if (chunkRes instanceof Error) {
            console.error('failed to scan chunk of files', chunkRes)
            return chunkRes
        }

        console.info('Infected Files In Chunk:', chunkRes)
        allInfectedFiles = allInfectedFiles.concat(chunkRes.infectedKeys)
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

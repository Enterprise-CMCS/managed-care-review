import {
    S3Client,
    HeadObjectCommand,
    ListObjectsV2Command,
    GetObjectCommand,
    PutObjectCommand,
    GetObjectTaggingCommand,
    PutObjectTaggingCommand,
    DeleteObjectsCommand,
    Tagging,
    Tag,
    _Object,
    HeadObjectOutput,
} from '@aws-sdk/client-s3'

import fs from 'fs'
import { fileTypeFromBuffer } from 'file-type'
import { readFile } from 'fs/promises'
import path from 'path'
import { Readable } from 'stream'

interface S3UploadsClient {
    headObject: (
        key: string,
        bucket: string
    ) => Promise<HeadObjectOutput | Error>
    sizeOf: (key: string, bucket: string) => Promise<number | Error>
    listBucketFiles: (bucketName: string) => Promise<string[] | Error>
    listBucketObjects: (bucketName: string) => Promise<_Object[] | Error>
    downloadFileFromS3: (
        s3ObjectKey: string,
        s3ObjectBucket: string,
        destinationPath: string
    ) => Promise<string | Error>
    downloadAllFiles: (
        keys: string[],
        bucket: string,
        targetDir: string
    ) => Promise<undefined | Error>
    getObjectTags: (key: string, bucket: string) => Promise<Tag[] | Error>
    getObjectContentType: (
        key: string,
        bucket: string
    ) => Promise<{ ContentType?: string } | Error>
    getOriginalFilename: (
        key: string,
        bucket: string
    ) => Promise<string | Error>
    tagObject: (
        key: string,
        bucket: string,
        tagSet: Tagging
    ) => Promise<undefined | Error>
    deleteObjects: (
        keys: string[],
        bucket: string
    ) => Promise<undefined | Error>
    uploadObject: (
        key: string,
        bucket: string,
        filepath: string
    ) => Promise<undefined | Error>
}

function uploadsClient(s3Client: S3Client): S3UploadsClient {
    return {
        headObject: (key, bucket) => headObject(s3Client, key, bucket),
        sizeOf: (key, bucket) => sizeOf(s3Client, key, bucket),
        listBucketFiles: (bucketName) => listBucketFiles(s3Client, bucketName),
        listBucketObjects: (bucketName) =>
            listBucketObjects(s3Client, bucketName),
        downloadFileFromS3: (s3ObjectKey, s3ObjectBucket, destinationPath) =>
            downloadFileFromS3(
                s3Client,
                s3ObjectKey,
                s3ObjectBucket,
                destinationPath
            ),
        downloadAllFiles: (keys, bucket, targetDir) =>
            downloadAllFiles(s3Client, keys, bucket, targetDir),
        getObjectTags: (key, bucket) => getObjectTags(s3Client, key, bucket),
        getObjectContentType: (key, bucket) =>
            getObjectContentType(s3Client, key, bucket),
        getOriginalFilename: (key, bucket) =>
            getOriginalFileName(s3Client, key, bucket),
        tagObject: (key, bucket, tagSet) =>
            tagObject(s3Client, key, bucket, tagSet),
        deleteObjects: (keys, buckets) =>
            deleteObjects(s3Client, keys, buckets),
        uploadObject: (key, bucket, filepath) =>
            uploadObject(s3Client, key, bucket, filepath),
    }
}

function NewS3UploadsClient(): S3UploadsClient {
    const client = new S3Client({})

    return uploadsClient(client)
}

function NewTestS3UploadsClient(): S3UploadsClient {
    const testClient = new S3Client({
        forcePathStyle: true,
        apiVersion: '2006-03-01',
        credentials: {
            accessKeyId: 'S3RVER', // This specific key is required when working offline
            secretAccessKey: 'S3RVER', // pragma: allowlist secret pre-set by serverless-s3-offline
        },
        endpoint: 'http://localhost:4569',
        region: 'us-east', // This region cannot be undefined and any string here will work.
    })

    return uploadsClient(testClient)
}

/**
 * Retrieve metadata about the object without downloading.
 */
async function headObject(
    client: S3Client,
    key: string,
    bucket: string
): Promise<HeadObjectOutput | Error> {
    const head = new HeadObjectCommand({ Key: key, Bucket: bucket })
    try {
        return await client.send(head)
    } catch (err) {
        return err
    }
}

/**
 * Retrieve the file size of S3 object without downloading.
 */
async function sizeOf(
    client: S3Client,
    key: string,
    bucket: string
): Promise<number | Error> {
    const head = await headObject(client, key, bucket)
    if (head instanceof Error) {
        return head
    }

    if (!head.ContentLength) {
        return new Error('Didnt get a size back from S3')
    }

    return head.ContentLength
}

/**
 * Retrieve the tags on an S3 object without downloading.
 */
async function getObjectTags(
    client: S3Client,
    key: string,
    bucket: string
): Promise<Tag[] | Error> {
    const tags = new GetObjectTaggingCommand({ Key: key, Bucket: bucket })

    try {
        const res = await client.send(tags)

        if (res.TagSet) {
            return res.TagSet
        }

        return new Error('Didnt get tags back from S3')
    } catch (err) {
        return err
    }
}

/*
 * Retrieve the file's content type without downloading.
 */

async function getObjectContentType(
    client: S3Client,
    key: string,
    bucket: string
): Promise<{ ContentType?: string } | Error> {
    const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
    })

    try {
        const res = await client.send(command)
        return {
            ContentType: res.ContentType,
        }
    } catch (err) {
        return err
    }
}

async function getOriginalFileName(
    client: S3Client,
    key: string,
    bucket: string
): Promise<string | Error> {
    const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
    })

    try {
        const res = await client.send(command)
        const contentDis = res.ContentDisposition
        if (!contentDis) {
            return new Error('Content-Disposition not found in object metadata')
        }

        const filenameMatch = contentDis.match(/filename=(.*?)($|;)/i)
        if (filenameMatch && filenameMatch[1]) {
            return filenameMatch[1].replace(/["']/g, '').trim()
        } else {
            return new Error('Filename not found in Content-Disposition')
        }
    } catch (err) {
        return err
    }
}

/**
 * Lists all the files from a bucket
 *
 * returns a list of keys
 */
async function listBucketFiles(
    client: S3Client,
    bucketName: string
): Promise<string[] | Error> {
    const objects = await listBucketObjects(client, bucketName)
    if (objects instanceof Error) {
        return objects
    }

    const keys = objects
        .map((obj) => obj.Key)
        .filter((key): key is string => key !== undefined)
    return keys
}

/**
 * Lists all the files from a bucket
 *
 * returns a list of Objects
 */
async function listBucketObjects(
    client: S3Client,
    bucketName: string
): Promise<_Object[] | Error> {
    const listCmd = new ListObjectsV2Command({ Bucket: bucketName })

    try {
        const listFilesResult = await client.send(listCmd)

        if (!listFilesResult.Contents) {
            console.info('NO CONTENTS')
            return []
        }

        return listFilesResult.Contents
    } catch (err) {
        console.error(`Error listing files`)
        console.error(err)
        return err
    }
}

/**
 * Download a file from S3 to a local temp directory.
 */
async function downloadFileFromS3(
    client: S3Client,
    s3ObjectKey: string,
    s3ObjectBucket: string,
    destinationPath: string
): Promise<string | Error> {
    const destinationDir = path.dirname(destinationPath)

    if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir)
    }

    const writeStream = fs.createWriteStream(destinationPath)

    console.info(`Downloading file s3://${s3ObjectBucket}/${s3ObjectKey}`)

    const getCommand = new GetObjectCommand({
        Bucket: s3ObjectBucket,
        Key: s3ObjectKey,
    })

    try {
        const s3Item = await client.send(getCommand)

        return new Promise((resolve, reject) => {
            if (!s3Item.Body) {
                reject(
                    new Error(`stream for ${s3ObjectKey} returned undefined`)
                )
                return
            }

            if (!(s3Item.Body instanceof Readable)) {
                console.error('Unexpected S3 Item Body: ', s3Item.Body)
                reject(new Error('Unexpected S3 Item Body returned'))
                return
            }

            s3Item.Body.on('end', function () {
                console.info(`Finished downloading new object ${s3ObjectKey}`)
                resolve(destinationPath)
            })
                .on('error', function (err) {
                    console.error('Error writing file', err)
                    reject(err)
                })
                .pipe(writeStream)
        })
    } catch (err) {
        console.error('failed to download the file from s3', err)
        return err
    }
}

async function downloadAllFiles(
    client: S3Client,
    keys: string[],
    bucket: string,
    targetDir: string
): Promise<undefined | Error> {
    const downloadPromises = []
    for (const key of keys) {
        const filename = path.basename(key)
        const localPath = path.join(targetDir, filename)

        console.info(`Downloading ${key} from S3 to ${localPath}`)

        const downloadPromise = downloadFileFromS3(
            client,
            key,
            bucket,
            localPath
        )

        downloadPromises.push(downloadPromise)
    }

    try {
        const responses = await Promise.all(downloadPromises)
        const errors = responses.filter((r) => r instanceof Error)
        if (errors.length > 0) {
            console.error('Got errors downloading files: ', errors)
            return new Error('Error downloading all files')
        }
        console.info('Downloaded all given files locally')
        return undefined
    } catch (err) {
        console.error('Error downloading all files', err)
        return err
    }
}

// deleteObjects removes all the given keys from the given bucket
async function deleteObjects(
    client: S3Client,
    keys: string[],
    bucket: string
): Promise<undefined | Error> {
    try {
        const deleteCmd = new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: {
                Objects: keys.map((k) => {
                    return { Key: k }
                }),
            },
        })
        const result = await client.send(deleteCmd)
        console.info(`Deleted extant definitions: ${keys}`, result)
        return undefined
    } catch (err) {
        console.error(`Error deleting current definition files: ${keys}`)
        console.error(err)
        return err
    }
}

// upload an object to the given key, given the local filepath
async function uploadObject(
    client: S3Client,
    key: string,
    bucket: string,
    filepath: string
): Promise<undefined | Error> {
    const contentType = await getFileMimeType(filepath)
    const fileName = path.basename(filepath)
    const putCmd = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fs.createReadStream(filepath),
        ContentType: contentType,
        ContentDisposition: `attachment; filename=${fileName}`,
    })

    try {
        await client.send(putCmd)
        return undefined
    } catch (err) {
        console.error('Error putting file', err)
        return err
    }
}

// set the tagging for the specific object.
async function tagObject(
    client: S3Client,
    key: string,
    bucket: string,
    tagSet: Tagging
): Promise<undefined | Error> {
    const tagCmd = new PutObjectTaggingCommand({
        Key: key,
        Bucket: bucket,
        Tagging: tagSet,
    })

    try {
        await client.send(tagCmd)
        return
    } catch (err) {
        console.error(err)
        return err
    }
}

async function getFileMimeType(filePath: string): Promise<string> {
    const buffer = await readFile(filePath)
    const fileType = await fileTypeFromBuffer(buffer)
    return fileType?.mime || 'application/octet-stream'
}

export { S3UploadsClient, NewS3UploadsClient, NewTestS3UploadsClient }

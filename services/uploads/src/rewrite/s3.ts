import { 
    S3Client, 
    HeadObjectCommand,
    ListObjectsV2Command,
    GetObjectCommand,
    PutObjectTaggingCommand,
    Tagging,
} from "@aws-sdk/client-s3"

import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'


/**
 * Retrieve the file size of S3 object without downloading.
 */
async function sizeOf(key: string, bucket: string): Promise<number | Error> {
    const client = new S3Client({})
    const head = new HeadObjectCommand({ Key: key, Bucket: bucket })

    try {
        const res = await client.send(head)

        if (res.ContentLength) {
            return res.ContentLength
        }

        return new Error('Didnt get a size back from S3')
    } catch (err) {
        return err
    }
}


/**
 * Lists all the files from a bucket
 *
 * returns a list of keys
 */
async function listBucketFiles(bucketName: string): Promise<string[] | Error> {
    const client = new S3Client({})
    const listCmd = new ListObjectsV2Command({ Bucket: bucketName })

    try {
        const listFilesResult = await client.send(listCmd)

        console.log('GOT BACK ', listFilesResult)

        if (!listFilesResult.Contents) {
            console.log("NO CONTENTS")
            return []
        }

        const objects = listFilesResult.Contents

        const keys = objects.map((obj) => obj.Key).filter((key): key is string => key !== undefined)
        return keys;
    } catch (err) {
        console.error(`Error listing files`);
        console.log(err);
        return err;
    }
}

/**
 * Download a file from S3 to a local temp directory.
 */
async function downloadFileFromS3(s3ObjectKey: string, s3ObjectBucket: string, destinationPath: string): Promise<string | Error>{
    const destinationDir = path.dirname(destinationPath)

    if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir)
    }

    // const tmpFileName = `${crypto.randomUUID()}.tmp`;
    // let localPath = path.join(destinationDir, tmpFileName);
    
    let writeStream = fs.createWriteStream(destinationPath);

    console.info(
        `Downloading file s3://${s3ObjectBucket}/${s3ObjectKey}`
    );

    const client = new S3Client({})
    const getCommand = new GetObjectCommand({
        Bucket: s3ObjectBucket,
        Key: s3ObjectKey,
    })
    const s3Item = await client.send(getCommand)

    return new Promise((resolve, reject) => {

        if (!s3Item.Body) {
            reject(new Error(`stream for ${s3ObjectKey} returned undefined`))
            return
        }

        if (!(s3Item.Body instanceof Readable)) {
            console.error('Unexpected S3 Item Body: ', s3Item.Body)
            reject(new Error ('Unexpected S3 Item Body returned'))
            return
        }

        s3Item.Body
            .on('end', function () {
                console.info(
                    `Finished downloading new object ${s3ObjectKey}`
                );
                resolve(destinationPath);
            })
            .on('error', function (err) {
                console.error('Error writing file', err);
                reject(err);
            })
            .pipe(writeStream);
    });

}

// S3.deleteObjects

// S3.putObject


// putObjectTagging
async function tagObject(key: string, bucket: string, tagSet: Tagging): Promise<undefined | Error> {

    const client = new S3Client({})
    const tagCmd = new PutObjectTaggingCommand({
        Key: key,
        Bucket: bucket,
        Tagging: tagSet,
    })

    try {
        await client.send(tagCmd)
        console.info('Tagging successful');
        return
    } catch (err) {
        console.error(err);
        return err
    } 
}


export {
    sizeOf,
    listBucketFiles,
    downloadFileFromS3,
    tagObject,
}

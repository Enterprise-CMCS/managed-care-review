import { S3 } from 'aws-sdk'
import { Handler } from 'aws-lambda'
import Archiver from 'archiver'
import { Readable, Stream } from 'stream'

const s3 = new S3({ region: 'us-east-1' })

interface S3BulkDownloadRequest {
    bucket: string
    keys: string[]
    zipFileName: string
}

export const main: Handler = async (event) => {
    console.time('zipProcess')
    console.log('Starting zip lambda...')
    if (!event.body) {
        console.timeEnd('zipProcess')
        return {
            statusCode: 400,
            body: 'No body found in request',
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    }

    const bulkDlRequest: S3BulkDownloadRequest = JSON.parse(
        JSON.stringify(event.body)
    )
    console.log('Bulk download request:', bulkDlRequest)

    if (
        !bulkDlRequest.bucket ||
        !bulkDlRequest.keys ||
        !bulkDlRequest.zipFileName
    ) {
        console.timeEnd('zipProcess')
        return {
            statusCode: 400,
            body: JSON.stringify({
                code: 'BAD_REQUEST',
                message: 'Missing bucket, keys or zipFileName in request',
            }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    }

    type S3DownloadStreamDetails = { stream: Readable; filename: string }

    const s3DownloadStreams: S3DownloadStreamDetails[] = bulkDlRequest.keys.map(
        (key: string) => {
            return {
                stream: s3
                    .getObject({ Bucket: bulkDlRequest.bucket, Key: key })
                    .createReadStream(),
                filename: key,
            }
        }
    )

    const streamPassThrough = new Stream.PassThrough()
    const params: S3.PutObjectRequest = {
        ACL: 'private',
        Body: streamPassThrough,
        Bucket: bulkDlRequest.bucket,
        ContentType: 'application/zip',
        Key: bulkDlRequest.zipFileName,
        StorageClass: 'STANDARD',
    }

    const s3Upload = s3.upload(params, (error: Error): void => {
        if (error) {
            console.error(
                `Got error creating stream to s3 ${error.name} ${error.message} ${error.stack}`
            )
            throw error
        }
    })

    await new Promise((resolve, reject) => {
        console.log('Starting zip process...')
        const zip = Archiver('zip')
        zip.on('error', (error: Archiver.ArchiverError) => {
            console.log('Error in zip.on: ', error.message, error.stack)
            console.timeEnd('zipProcess')
            return {
                statusCode: 500,
                body: JSON.stringify(error.message),
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                },
            }
        })

        console.log('Starting upload...')

        streamPassThrough.on('close', resolve)
        streamPassThrough.on('end', resolve)
        streamPassThrough.on('error', reject)

        zip.pipe(streamPassThrough)
        s3DownloadStreams.forEach((streamDetails: S3DownloadStreamDetails) =>
            zip.append(streamDetails.stream, {
                name: streamDetails.filename,
            })
        )

        zip.finalize().catch((error) => {
            console.log('Error in zip finalize: ', error.message)
            throw new Error(`Archiver could not finalize: ${error}`)
        })
    }).catch((error: { code: string; message: string; data: string }) => {
        console.log('Caught error: ', error.message)
        throw new Error(`${error.code} ${error.message} ${error.data}`)
    })

    await s3Upload.promise()

    console.timeEnd('zipProcess')
    return {
        statusCode: 200,
        body: JSON.stringify({ code: 'SUCCESS', message: 'success' }),
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
    }
}

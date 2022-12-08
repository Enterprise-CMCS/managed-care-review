import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    PutObjectTaggingCommand,
} from '@aws-sdk/client-s3'
import { Readable, Stream } from 'stream'
import { APIGatewayProxyHandler } from 'aws-lambda'
import Archiver from 'archiver'

const s3 = new S3Client({ region: 'us-east-1' })

interface S3BulkDownloadRequest {
    bucket: string
    keys: string[]
    zipFileName: string
}

export const main: APIGatewayProxyHandler = async (event) => {
    const authProvider =
        event.requestContext.identity.cognitoAuthenticationProvider
    if (authProvider == undefined) {
        return {
            statusCode: 400,
            body:
                JSON.stringify({
                    code: 'NO_AUTH_PROVIDER',
                    message:
                        'auth provider missing. This should always be taken care of by the API Gateway',
                }) + '\n',
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    }

    console.time('zipProcess')
    console.log('Starting zip lambda...', event.body, '--bod')
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

    const bulkDlRequest: S3BulkDownloadRequest = JSON.parse(event.body)
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

    type S3DownloadStreamDetails = {
        stream: Readable
        filename: string
    }

    // here we go through all the keys and open a stream to the object.
    // also, the filename in s3 is a uuid, and we store the original
    // filename in the content-disposition header. set original filename too.
    let s3DownloadStreams: S3DownloadStreamDetails[]
    try {
        s3DownloadStreams = await Promise.all(
            bulkDlRequest.keys.map(async (key: string) => {
                const params = { Bucket: bulkDlRequest.bucket, Key: key }

                const headCommand = new HeadObjectCommand(params)
                const metadata = await s3.send(headCommand)

                const filename = parseContentDisposition(
                    metadata.ContentDisposition ?? key
                )

                const getCommand = new GetObjectCommand(params)
                const s3Item = await s3.send(getCommand)

                console.log('-----file name: ', filename)
                console.log('-----stream: ', s3Item.Body)

                return {
                    stream: s3Item.Body as Readable,
                    key: key,
                    filename,
                }
            })
        )
    } catch (e) {
        console.error('Got an error putting together the download streams: ', e)
        return {
            statusCode: 500,
            body: JSON.stringify(e.message),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    }

    console.log('debug - s3DownloadStreams: ***' + s3DownloadStreams)

    const streamPassThrough = new Stream.PassThrough()

    try {
        // Zip files
        await new Promise((resolve, reject) => {
            console.log('Starting zip process...')
            const zip = Archiver('zip')
            zip.on('error', (error: Archiver.ArchiverError) => {
                console.log('Error in zip.on: ', error.message, error.stack)
                console.timeEnd('zipProcess')
                throw new Error(
                    `${error.name} ${error.code} ${error.message} ${error.path} ${error.stack}`
                )
            })

            console.log('Starting upload...')

            streamPassThrough.on('close', resolve)
            streamPassThrough.on('end', resolve)
            streamPassThrough.on('error', reject)

            console.log('----passed through', streamPassThrough.readableLength)

            zip.pipe(streamPassThrough)
            console.log('----piped through')
            s3DownloadStreams.forEach(
                (streamDetails: S3DownloadStreamDetails) =>
                    zip.append(streamDetails.stream, {
                        //decoding file names encoded in s3Amplify.ts
                        name: decodeURIComponent(streamDetails.filename),
                    })
            )

            zip.finalize().catch((error) => {
                console.log('Error in zip finalize: ', error.message)
                throw new Error(`Archiver could not finalize: ${error}`)
            })
            console.log('-----zipped up', streamPassThrough.readableLength)
        }).catch((error: { code: string; message: string; data: string }) => {
            console.log('Caught error: ', error.message)
            return {
                statusCode: 500,
                body: JSON.stringify(error.message),
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': true,
                },
            }
        })
    } catch (e) {
        console.error('some kind of zipping error?', e)
        return {
            statusCode: 500,
            body: JSON.stringify(e.message),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    }

    console.log('uploading zip file')
    // Upload files
    try {
        const commandPutObject = new PutObjectCommand({
            ACL: 'private',
            Body: streamPassThrough,
            Bucket: bulkDlRequest.bucket,
            ContentType: 'application/zip',
            Key: bulkDlRequest.zipFileName,
            StorageClass: 'STANDARD',
        })
        await s3.send(commandPutObject)
    } catch (e) {
        console.error('Could not upload zip file: ' + e)
        return {
            statusCode: 500,
            body: JSON.stringify(e.message),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    }

    // tag the file as having previously been scanned
    const taggingParams = {
        Bucket: bulkDlRequest.bucket,
        Key: bulkDlRequest.zipFileName,
        Tagging: {
            TagSet: [
                {
                    Key: 'contentsPreviouslyScanned',
                    Value: 'TRUE',
                },
            ],
        },
    }

    try {
        const commandPutObjectTagging = new PutObjectTaggingCommand(
            taggingParams
        )
        await s3.send(commandPutObjectTagging)
    } catch (err) {
        console.error('Could not tag zip file: ' + err)
        return {
            statusCode: 500,
            body: JSON.stringify(err.message),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    }

    console.log('Finished Zip Process Successs')
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

// parses a content-disposition header for the filename
function parseContentDisposition(cd: string): string {
    console.log('original content-disposition: ' + cd)
    const [, filename] = cd.split('filename=')
    console.log('original name: ' + filename)
    return filename
}

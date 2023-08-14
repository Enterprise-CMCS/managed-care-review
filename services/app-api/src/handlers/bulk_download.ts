import type { PutObjectCommandInput } from '@aws-sdk/client-s3'
import {
    S3Client,
    GetObjectCommand,
    HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { Readable, Writable, PassThrough } from 'stream'
import type { APIGatewayProxyHandler } from 'aws-lambda'
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
    console.info('Bulk download request:', bulkDlRequest)

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
        stream: string | Readable | Buffer
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

                if (s3Item.Body === undefined) {
                    throw new Error(`stream for ${filename} returned undefined`)
                }

                if (s3Item.Body instanceof Readable) {
                    return {
                        stream: s3Item.Body,
                        filename,
                    }
                } else if ('size' in s3Item.Body) {
                    // type narrow to Blob
                    throw new Error('Blob response not implemented. ')
                } else if ('locked' in s3Item.Body) {
                    // type narrow to ReadableStream
                    // wml: WARNING: This was never tested but figuring out these types were so painful I want to leave
                    // the work in here. Testing so far It appears that GetObject always returns the Readable type,
                    // not a ReadableStream
                    console.info(
                        'WARNING UNTESTED: We are streaming a ReadableStream'
                    )
                    const readStreamBody = s3Item.Body

                    // this is the node stream we will return as a Reader.
                    const passThrough = new PassThrough()

                    // Get a web stream we can write to. Unfortunately the types don't match enough to just transform our StreamReader
                    const webWriter = Writable.toWeb(passThrough)

                    // do we need to await this?
                    void readStreamBody.pipeTo(webWriter)

                    return {
                        stream: passThrough,
                        filename,
                    }
                } else {
                    console.error(
                        'Programming Error: Unknown return type for s3 Body',
                        s3Item.Body
                    )
                    throw new Error(
                        'Programming Error: Unknown return type for s3 Body'
                    )
                }
            })
        )
    } catch (e) {
        console.error('Got an error downloading the files from s3: ', e)
        console.timeEnd('zipProcess')
        return {
            statusCode: 500,
            body: JSON.stringify(e.message),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    }

    try {
        // This stream is written to by the archive and then read from by the uploader
        const zippedStream = new PassThrough()

        zippedStream.on('error', (err) => {
            console.error('Error in our zipped stream', err)
            throw new Error(`${err.name} ${err.message} ${err.stack}`)
        })

        const input: PutObjectCommandInput = {
            ACL: 'private',
            Body: zippedStream,
            Bucket: bulkDlRequest.bucket,
            ContentType: 'application/zip',
            Key: bulkDlRequest.zipFileName,
            StorageClass: 'STANDARD',
        }

        // Upload is a composite command that correctly handles stream inputs and tagging
        const upload = new Upload({
            client: s3,
            params: input,

            tags: [
                {
                    Key: 'contentsPreviouslyScanned',
                    Value: 'TRUE',
                },
            ],
        })

        upload.on('httpUploadProgress', (progress) => {
            console.info('UploadProgress', progress)
        })

        // Configure Zip
        const zip = Archiver('zip')

        zip.on('warning', function (warn) {
            console.info('zip warning: ', warn.message)
        })

        zip.on('error', (error: Archiver.ArchiverError) => {
            console.info('Error in zip.on: ', error.message, error.stack)
            console.timeEnd('zipProcess')
            throw new Error(
                `${error.name} ${error.code} ${error.message} ${error.path} ${error.stack}`
            )
        })

        zip.on('progress', function (prog) {
            console.info('zip progress: ', prog)
        })

        zip.pipe(zippedStream)

        // Add files to the zip and finalize
        for (const streamDetails of s3DownloadStreams) {
            zip.append(streamDetails.stream, {
                //decoding file names encoded in s3Amplify.ts
                name: decodeURIComponent(streamDetails.filename),
            })
        }

        zip.finalize().catch((err) => {
            console.error('Error finalizing', err)
            throw err
        })

        // We only stop and wait on the upload itself. Hopefully all our streams are streaming correctly
        await upload.done()
    } catch (e) {
        console.info('Error zipping or uploading', e)
        console.timeEnd('zipProcess')
        return {
            statusCode: 500,
            body: JSON.stringify(e.message),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    }

    console.info('Upload Success')
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
    console.info('original content-disposition: ' + cd)
    const [, filename] = cd.split('filename=')
    console.info('original name: ' + filename)
    return filename
}

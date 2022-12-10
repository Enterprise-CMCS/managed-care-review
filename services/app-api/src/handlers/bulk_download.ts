import {
    S3Client,
    GetObjectCommand,
    HeadObjectCommand,
    PutObjectCommandInput,
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { Readable, PassThrough } from 'stream'
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

                console.log('-----file name: ', filename)
                console.log('-----stream: ', s3Item.Body)

                console.log('CHECKING OUT OUR STREAMER')

                if (s3Item.Body === undefined) {
                    throw new Error(`stream for ${filename} returned undefined`)
                }

                if (s3Item.Body instanceof Readable) {
                    console.log('READABLE PASSING THROUGH THE GOALPOSTS')

                    return {
                        stream: s3Item.Body,
                        filename,
                    }
                } else if ('size' in s3Item.Body) {
                    // type narrow to Blob
                    throw new Error('Nod implemeddnted yet')
                    // const blobBody = s3Item.Body
                    // const blobStream = blobBody.stream()
                    // const readable = Readable.fromWeb(blobStream)

                    // return {
                    //     stream: readable,
                    //     filename,
                    // }
                } else if ('locked' in s3Item.Body) {
                    // type narrow to ReadableStream
                    throw new Error('Nod implemeddnted yet')
                    // console.log("We are streaming a ReadableStream")
                    // const readStreamBody = s3Item.Body

                    // // this is the node stream we will return as a Reader.
                    // const passThrough = new PassThrough()

                    // console.log("can we write it")
                    // // Get a web stream we can write to. Unfortunately the types don't match enough to just transform our StreamReader
                    // const webWriter = Writable.toWeb(passThrough)

                    // // do i need to await this?
                    // console.log("can we pipe it?")
                    // readStreamBody.pipeTo(webWriter)

                    // return {
                    //     stream: passThrough,
                    //     filename,
                    // }
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

    console.log(
        'debug - s3DownloadStreams: ***' +
            s3DownloadStreams.map((s) => s.filename)
    )

    const streamPassThrough = new PassThrough()

    // if (s3DownloadStreams.length === 0) {
    //     return {
    //         statusCode: 400,
    //         body: "didn't actually give us any files to download",
    //         headers: {
    //             'Access-Control-Allow-Origin': '*',
    //             'Access-Control-Allow-Credentials': true,
    //         },
    //     }
    // }

    const input: PutObjectCommandInput = {
        ACL: 'private',
        Body: streamPassThrough,
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
        console.log('UploadProgress', progress)
    })

    console.log('We ARe Donw')

    try {
        // Zip files
        await new Promise<void>((resolve, reject) => {
            console.log('Starting zip process...')
            const zip = Archiver('zip')

            zip.on('warning', function (err) {
                console.log('ZIP WARNINFG: ', err.message)
            })

            zip.on('error', (error: Archiver.ArchiverError) => {
                console.log('Error in zip.on: ', error.message, error.stack)
                console.timeEnd('zipProcess')
                throw new Error(
                    `${error.name} ${error.code} ${error.message} ${error.path} ${error.stack}`
                )
            })

            zip.on('progress', function (prog) {
                console.log('ZIP PROGRESS: ', prog)
            })

            console.log('Starting upload...')

            streamPassThrough.on('close', () => {
                console.log('PASS THRU CLOSE')
                resolve()
            })
            streamPassThrough.on('end', () => {
                console.log('PASS THRU END')
                resolve()
            })
            streamPassThrough.on('error', (err) => {
                console.log('PASS THRU ERR', err)
                reject(err)
            })

            console.log('----passed through', streamPassThrough)

            zip.pipe(streamPassThrough)
            console.log('----piped through')
            s3DownloadStreams.forEach(
                (streamDetails: S3DownloadStreamDetails) => {
                    console.log('APPENDING', streamDetails.filename)
                    zip.append(streamDetails.stream, {
                        //decoding file names encoded in s3Amplify.ts
                        name: decodeURIComponent(streamDetails.filename),
                    })
                }
            )

            zip.finalize()
                .then((success) => {
                    console.log('-----Zip Finalized!', success)
                    resolve()
                })
                .catch((error) => {
                    console.log('Error in zip finalize: ', error.message)
                    throw new Error(`Archiver could not finalize: ${error}`)
                })
            console.log('-----zipped up', streamPassThrough)
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

    console.log('Out of ZIP promise!')
    try {
        await upload.done()
    } catch (e) {
        console.log('Getting some headeer thing', e)
        return {
            statusCode: 500,
            body: JSON.stringify(e.message),
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

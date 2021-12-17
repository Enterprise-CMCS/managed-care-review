import { S3 } from 'aws-sdk'
import { APIGatewayProxyHandler } from 'aws-lambda'
import Archiver from 'archiver'
import { Readable, Stream } from 'stream'

import { assertIsAuthMode } from '../../app-web/src/common-code/domain-models'

const s3 = new S3({ region: 'us-east-1' })
const authMode = process.env.REACT_APP_AUTH_MODE
assertIsAuthMode(authMode)

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
        key: string
        filename: string
    }

    // here we go through all the keys and open a stream to the object.
    // also, the filename in s3 is a uuid, and we store the original
    // filename in the content-disposition header. set original filename too.
    const s3DownloadStreams: S3DownloadStreamDetails[] = await Promise.all(
        bulkDlRequest.keys.map(async (key: string) => {
            const params = { Bucket: bulkDlRequest.bucket, Key: key }
            const metadata = await s3.headObject(params).promise()
            return {
                stream: s3.getObject(params).createReadStream(),
                key: key,
                filename: parseContentDisposition(
                    metadata.ContentDisposition ?? key
                ),
            }
        })
    )
    console.log('debug - s3DownloadStreams: ' + s3DownloadStreams)

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
            throw new Error(
                `${error.name} ${error.code} ${error.message} ${error.path} ${error.stack}`
            )
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
        return {
            statusCode: 500,
            body: JSON.stringify(error.message),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true,
            },
        }
    })

    await s3Upload.promise()

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
        await s3.putObjectTagging(taggingParams).promise()
    } catch (err) {
        console.log('Could not tag zip file: ' + err)
    }

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

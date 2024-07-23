import { Context } from 'aws-lambda'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import { fromUtf8, toUtf8 } from '@aws-sdk/util-utf8-node'
import { NewS3UploadsClient, S3UploadsClient } from '../deps/s3'
import { ClamAV, NewClamAV } from '../deps/clamAV'
import { mkdtemp, rm } from 'fs/promises'
import { scanFiles } from '../lib/scanFiles'

interface ScanFilesInput {
    bucket: string
    keys: string[]
}

interface ScanFilesOutput {
    infectedKeys: string[]
}

// For testing purposes, this is a dependency wrapper for invoking the avAuditFiles lambda.
// a generic function type that scans a list of s3 objects and returns any infected keys.
// there are two constructors for this, one that invokes a lambda to do the work and one that
// just does the work locally
type listInfectedFilesFn = (
    input: ScanFilesInput
) => Promise<ScanFilesOutput | Error>

// NewLambdaInfectedFilesLister returns an async function that will invoke a lambda
// to scan a set of files for viruses. This is meant to be used in an AWS environment and
// is called by the avAuditUploads lambda when running there.
export function NewLambdaInfectedFilesLister(
    lambdaName: string
): listInfectedFilesFn {
    return async (input: ScanFilesInput): Promise<ScanFilesOutput | Error> => {
        const lambdaClient = new LambdaClient({})

        console.info('Invoking Function: ', lambdaName)

        const payloadJSON = fromUtf8(JSON.stringify(input))
        const invocation = new InvokeCommand({
            FunctionName: lambdaName,
            Payload: payloadJSON,
        })

        try {
            const res = await lambdaClient.send(invocation)
            if (res.Payload) {
                const lambdaResult = JSON.parse(toUtf8(res.Payload))

                if (lambdaResult.errorType) {
                    const errMsg = `Got an error back from the list infected files lambda: ${JSON.stringify(
                        lambdaResult
                    )}`
                    console.error(errMsg)
                    return new Error(errMsg)
                }

                if (!lambdaResult.infectedKeys) {
                    const errMsg = `Didn't get back a list of keys from the lambda: ${JSON.stringify(
                        lambdaResult
                    )}`
                    console.error(errMsg)
                    return new Error(errMsg)
                }

                return lambdaResult
            }
            return new Error(
                `Failed to get correct results out of lambda: ${res}`
            )
        } catch (err) {
            console.error('Error invoking lambda', err)
            return err
        }
    }
}

// NewLocalInfectedFilesLister runs scanFiles locally in the same format as we call
// the lambda with. This is meant to be used locally in tests, side stepping the need for
// invoking an actual lambda to do the same work.
export function NewLocalInfectedFilesLister(
    s3Client: S3UploadsClient,
    clamAV: ClamAV
): listInfectedFilesFn {
    return async (input: ScanFilesInput): Promise<ScanFilesOutput | Error> => {
        const tmpScanDir = await mkdtemp('/tmp/scanFiles-')

        const result = await scanFiles(
            s3Client,
            clamAV,
            input.keys,
            input.bucket,
            tmpScanDir
        )

        if (result instanceof Error) {
            return result
        }

        await rm(tmpScanDir, { force: true, recursive: true })

        return {
            infectedKeys: result,
        }
    }
}

/*
 * avAuditFiles is a lambda that returns a list of all the given files in S3 that fail antivirus scanning
 */
async function main(
    event: ScanFilesInput,
    _context: Context
): Promise<ScanFilesOutput> {
    console.info('-----Start List Infected Files function-----')

    // Check on the values for our required config
    const clamAVBucketName = process.env.CLAMAV_BUCKET_NAME
    if (!clamAVBucketName || clamAVBucketName === '') {
        throw new Error('Configuration Error: CLAMAV_BUCKET_NAME must be set')
    }

    const clamAVDefintionsPath = process.env.PATH_TO_AV_DEFINITIONS
    if (!clamAVDefintionsPath || clamAVDefintionsPath === '') {
        throw new Error(
            'Configuration Error: PATH_TO_AV_DEFINITIONS must be set'
        )
    }

    const s3Client = NewS3UploadsClient()

    const clamAV = NewClamAV(
        {
            bucketName: clamAVBucketName,
            definitionsPath: clamAVDefintionsPath,
        },
        s3Client
    )

    const downloadsPath = '/tmp/download'

    const result = await scanFiles(
        s3Client,
        clamAV,
        event.keys,
        event.bucket,
        downloadsPath
    )

    if (result instanceof Error) {
        console.error('Error scanning files', result)
        throw result
    }

    return {
        infectedKeys: result,
    }
}

module.exports = { main }

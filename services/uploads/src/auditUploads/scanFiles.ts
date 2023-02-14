import { Context } from 'aws-lambda';
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"
import { fromUtf8, toUtf8 } from "@aws-sdk/util-utf8-node"
import { NewS3UploadsClient, S3UploadsClient } from '../s3';
import { ClamAV, NewClamAV } from '../clamAV';
import { mkdtemp, rm } from 'fs/promises'
import { scanFiles } from '../scanFiles';

interface ScanFilesInput {
    bucket: string
    keys: string[]
}

interface ScanFilesOutput {
    infectedKeys: string[]
}

type listInfectedFilesFn = (input: ScanFilesInput) => Promise<ScanFilesOutput | Error>

async function invokeListInfectedFiles(input: ScanFilesInput): Promise<ScanFilesOutput | Error> {
    const lambdaClient = new LambdaClient({})

    const payloadJSON = fromUtf8(JSON.stringify(input))
    const invocation = new InvokeCommand({ FunctionName: 'uploads-wmluploadsrefinement-avListInfectedFiles', Payload: payloadJSON})

    try {
        const res = await lambdaClient.send(invocation)
        console.log('RESPONSE', res)
        if (res.Payload) {
            const lambdaResult = JSON.parse(toUtf8(res.Payload))
            console.log("GOT OUT", lambdaResult)

            if (lambdaResult.errorType) {
                const errMsg = `Got an error back from the list infected files lambda: ${JSON.stringify(lambdaResult)}`
                console.error(errMsg)
                return new Error(errMsg)
            }

            if (!lambdaResult.infectedKeys) {
                const errMsg = `Didn't get back a list of keys from the lambda: ${JSON.stringify(lambdaResult)}`
                console.error(errMsg)
                return new Error(errMsg)
            }

            return lambdaResult
        }
        return new Error(`Failed to get correct results out of lambda: ${res}`)
    } catch (err) {
        console.log('Error invoking lambda', err)
        return err
    }
}

// Run scanFiles locally in the same format as we call the lambda with
function NewLocalInfectedFilesLister(s3Client: S3UploadsClient, clamAV: ClamAV): listInfectedFilesFn {
    return async (input: ScanFilesInput): Promise<ScanFilesOutput | Error> => {

        const tmpScanDir = await mkdtemp('/tmp/scanFiles-')

        const result = await scanFiles(s3Client, clamAV, input.keys, input.bucket, tmpScanDir)

        console.log('LOCALLY GOT SCANNED: ', result)

        if (result instanceof Error) {
            console.log('local Error', result)
            return result
        }

        await rm(tmpScanDir, { force: true, recursive: true })

        return {
            infectedKeys: result
        }
    }
}

/*
 * scanFilesLambda returns a list of all the given files in S3 that fail antivirus scanning
 */
async function scanFilesLambda(event: ScanFilesInput, _context: Context) {

    console.info('-----Start List Infected Files function-----')

    // Check on the values for our required config
    const clamAVBucketName = process.env.CLAMAV_BUCKET_NAME
    if (!clamAVBucketName || clamAVBucketName === '') {
        throw new Error('Configuration Error: CLAMAV_BUCKET_NAME must be set')
    }

    const clamAVDefintionsPath = process.env.PATH_TO_AV_DEFINITIONS
    if (!clamAVDefintionsPath || clamAVDefintionsPath === '') {
        throw new Error('Configuration Error: PATH_TO_AV_DEFINITIONS must be set')
    }

    const s3Client = NewS3UploadsClient()

    const clamAV = NewClamAV({
        bucketName: clamAVBucketName,
        definitionsPath: clamAVDefintionsPath
    }, s3Client)

    const downloadsPath = '/tmp/download'

    const result = await scanFiles(s3Client, clamAV, event.keys, event.bucket, downloadsPath)

    if (result instanceof Error) {
        console.log('Error scanning files', result)
        throw result
    }

    return {
        infectedKeys: result
    }
}

export {
    scanFilesLambda,
    ScanFilesInput,
    ScanFilesOutput,
    invokeListInfectedFiles,
    listInfectedFilesFn,   
    NewLocalInfectedFilesLister,
}

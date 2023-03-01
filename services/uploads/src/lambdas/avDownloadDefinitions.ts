import { Context, S3Event } from 'aws-lambda'
import { NewS3UploadsClient } from '../deps/s3'
import { NewClamAV } from '../deps/clamAV'
import { updateAVDefinitions } from '../lib/updateAVDefinitions'
import { initTracer, recordException } from '../lib/otel'

async function avDownloadDefinitions(_event: S3Event, _context: Context) {
    console.info('-----Start Update AV Definitions function-----')

    // Check on the values for our required config
    const stageName = process.env.stage
    if (!stageName || stageName === '') {
        throw new Error('Configuration Error: stage env var must be set')
    }

    const otelCollectorURL = process.env.REACT_APP_OTEL_COLLECTOR_URL
    if (!otelCollectorURL || otelCollectorURL === '') {
        throw new Error(
            'Configuration Error: REACT_APP_OTEL_COLLECTOR_URL must be set'
        )
    }

    const serviceName = `uploads-avScanLambda-${stageName}`
    initTracer(serviceName, otelCollectorURL)

    const clamAVBucketName = process.env.CLAMAV_BUCKET_NAME
    if (!clamAVBucketName || clamAVBucketName === '') {
        const err = new Error(
            'Configuration Error: CLAMAV_BUCKET_NAME must be set'
        )
        recordException(err, serviceName)
        throw err
    }

    const clamAVDefintionsPath = process.env.PATH_TO_AV_DEFINITIONS
    if (!clamAVDefintionsPath || clamAVDefintionsPath === '') {
        const err = new Error(
            'Configuration Error: PATH_TO_AV_DEFINITIONS must be set'
        )
        recordException(err, serviceName)
        throw err
    }

    const s3Client = NewS3UploadsClient()

    const clamAV = NewClamAV(
        {
            bucketName: clamAVBucketName,
            definitionsPath: clamAVDefintionsPath,
        },
        s3Client
    )

    console.info('Updating ', clamAVBucketName)
    const err = await updateAVDefinitions(s3Client, clamAV, '/tmp')
    if (err instanceof Error) {
        recordException(err, serviceName)
        throw err
    }

    return 'FILE SCANNED'
}

export { avDownloadDefinitions }

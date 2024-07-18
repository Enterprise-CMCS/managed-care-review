import { Context, S3Event } from 'aws-lambda'
import { NewS3UploadsClient } from '../deps/s3'
import { NewClamAV } from '../deps/clamAV'
import { updateAVDefinitions } from '../lib/updateAVDefinitions'
import {
    initMeter,
    initTracer,
    recordException,
    recordHistogram,
} from '../lib/otel'

async function avDownloadDefinitions(_event: S3Event, _context: Context) {
    console.info('-----Start Update AV Definitions function-----')

    // Check on the values for our required config
    const stageName = process.env.stage
    if (!stageName || stageName === '') {
        throw new Error('Configuration Error: stage env var must be set')
    }

    const otelCollectorURL = process.env.VITE_APP_OTEL_COLLECTOR_URL
    if (!otelCollectorURL || otelCollectorURL === '') {
        throw new Error(
            'Configuration Error: VITE_APP_OTEL_COLLECTOR_URL must be set'
        )
    }

    const serviceName = `uploads-avDownloadDefinitions-${stageName}`
    initTracer(serviceName, otelCollectorURL)
    initMeter(serviceName)

    const clamAVBucketName = process.env.CLAMAV_BUCKET_NAME
    if (!clamAVBucketName || clamAVBucketName === '') {
        const err = new Error(
            'Configuration Error: CLAMAV_BUCKET_NAME must be set'
        )
        recordException(err, serviceName, 'clamAVEnvCheck')
        throw err
    }

    const clamAVDefintionsPath = process.env.PATH_TO_AV_DEFINITIONS
    if (!clamAVDefintionsPath || clamAVDefintionsPath === '') {
        const err = new Error(
            'Configuration Error: PATH_TO_AV_DEFINITIONS must be set'
        )
        recordException(err, serviceName, 'avDefPathCheck')
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

    console.info('Updating AV definitions ', clamAVBucketName)
    try {
        // start the timing of the av scan
        const startTime = new Date().getTime()

        // run the update
        await updateAVDefinitions(s3Client, clamAV, '/tmp')

        // Record the duration of the av scan
        const endTime = new Date().getTime()
        const executionTime = endTime - startTime
        console.info(`av scan time: ${executionTime}`)
        recordHistogram(serviceName, 'avDefUpdate.time', executionTime)
    } catch (err) {
        recordException(err, serviceName, 'avDefUpdate')
    }

    return 'FILE SCANNED'
}

module.exports = { avDownloadDefinitions }

import { Context, S3Event } from 'aws-lambda'
import { NewS3UploadsClient } from '../deps/s3'
import { NewClamAV } from '../deps/clamAV'
import { scanFile } from '../lib/avScan'
import { initTracer, initMeter, recordException } from '../lib/otel'

import opentelemetry from '@opentelemetry/api'

async function avScan(event: S3Event, _context: Context) {
    console.info('-----Start Antivirus Lambda function-----')

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
    initMeter(serviceName)

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

    const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '314572800')

    const s3Client = NewS3UploadsClient()

    const clamAV = NewClamAV(
        {
            bucketName: clamAVBucketName,
            definitionsPath: clamAVDefintionsPath,
        },
        s3Client
    )

    const record = event.Records[0]
    if (!record) {
        const err = new Error('no record in request')
        recordException(err, serviceName)
        throw err
    }

    const s3ObjectKey = record.s3.object.key
    const s3ObjectBucket = record.s3.bucket.name

    console.info('Scanning ', s3ObjectKey, s3ObjectBucket)

    try {
        // start the timing of the av scan
        const meter = opentelemetry.metrics
            .getMeterProvider()
            .getMeter(serviceName)
        const timeAvScan = meter.createHistogram('avScan.duration')
        const startTime = new Date().getTime()

        // scan the file
        await scanFile(
            s3Client,
            clamAV,
            s3ObjectKey,
            s3ObjectBucket,
            maxFileSize,
            '/tmp/downloads'
        )

        // Record the duration of the av scan
        const endTime = new Date().getTime()
        const executionTime = endTime - startTime
        timeAvScan.record(executionTime)
    } catch (err) {
        recordException(err, serviceName)
        throw err
    }

    return 'FILE SCANNED'
}

export { avScan }

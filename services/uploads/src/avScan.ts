import { Context, S3Event } from 'aws-lambda'
import path from 'path'
import crypto from 'crypto'
import process from 'process'

import { NewS3UploadsClient, S3UploadsClient } from './s3'

import { NewClamAV, ClamAV } from './clamAV'

import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { Resource } from '@opentelemetry/resources'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { CollectorTraceExporter } from '@opentelemetry/exporter-collector'
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { AWSXRayIdGenerator } from '@opentelemetry/id-generator-aws-xray'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { AWSXRayPropagator } from '@opentelemetry/propagator-aws-xray'

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '314572800')

export async function avScanLambda(event: S3Event, _context: Context) {
    console.info('-----Start Antivirus Lambda function-----')

    console.info('-----Setting OTEL instrumentation-----')
    const otelCollector = process.env.REACT_APP_OTEL_COLLECTOR_URL
    if (!otelCollector || otelCollector === '') {
        throw new Error(
            'Configuration Error: REACT_APP_OTEL_COLLECTOR_URL must be set'
        )
    }

    const stageName = process.env.stage
    if (!stageName || stageName === '') {
        throw new Error('Configuration Error: stage env var must be set')
    }

    const serviceName = `uploads-avScanLambda-${stageName}`

    const exporter = new CollectorTraceExporter({
        url: process.env.REACT_APP_OTEL_COLLECTOR_URL,
        headers: {},
    })
    const provider = new NodeTracerProvider({
        idGenerator: new AWSXRayIdGenerator(),
        resource: new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        }),
    })

    provider.addSpanProcessor(new SimpleSpanProcessor(exporter))

    // Initialize the OpenTelemetry APIs to use the NodeTracerProvider bindings
    provider.register({
        propagator: new AWSXRayPropagator(),
    })

    registerInstrumentations({
        instrumentations: [getNodeAutoInstrumentations()],
    })

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

    const record = event.Records[0]
    if (!record) {
        throw new Error('no record in request')
    }

    const s3ObjectKey = record.s3.object.key
    const s3ObjectBucket = record.s3.bucket.name

    console.info('Scanning ', s3ObjectKey, s3ObjectBucket)
    const err = await scanFile(s3Client, clamAV, s3ObjectKey, s3ObjectBucket)

    if (err) {
        throw err
    }

    return 'FILE SCANNED'
}

// Constants for tagging file after a virus scan.
const VIRUS_SCAN_STATUS_KEY = 'virusScanStatus'
const VIRUS_SCAN_TIMESTAMP_KEY = 'virusScanTimestamp'
type ScanStatus = 'CLEAN' | 'INFECTED' | 'ERROR' | 'SKIPPED'

/**
 * Generates the set of tags that will be used to tag the files of S3.
 */
function generateTagSet(virusScanStatus: ScanStatus) {
    return {
        TagSet: [
            {
                Key: VIRUS_SCAN_STATUS_KEY,
                Value: virusScanStatus,
            },
            {
                Key: VIRUS_SCAN_TIMESTAMP_KEY,
                Value: new Date().getTime().toString(),
            },
        ],
    }
}

async function scanFile(
    s3Client: S3UploadsClient,
    clamAV: ClamAV,
    key: string,
    bucket: string
): Promise<undefined | Error> {
    //You need to verify that you are not getting too large a file
    //currently lambdas max out at 500MB storage.
    const fileSize = await s3Client.sizeOf(key, bucket)
    if (fileSize instanceof Error) {
        return fileSize
    }

    let tagResult: ScanStatus | undefined = undefined
    if (fileSize > MAX_FILE_SIZE) {
        console.warn('S3 File is too big. Size: ', fileSize)
        // tag with skipped.
        tagResult = 'SKIPPED'
    } else {
        console.info('Download AV Definitions')
        const defsRes = await clamAV.downloadAVDefinitions()
        if (defsRes) {
            console.error('failed to fetch definitions')
            return defsRes
        }

        console.info('Downloading file to be scanned')
        const scanFileName = `${crypto.randomUUID()}.tmp`
        const scanFilePath = path.join('/tmp/download', scanFileName)

        const err = await s3Client.downloadFileFromS3(key, bucket, scanFilePath)
        if (err instanceof Error) {
            return err
        }

        console.info('Scanning File')
        const virusScanStatus = clamAV.scanLocalFile(scanFilePath)
        console.info('VIRUS SCANNED', virusScanStatus)

        if (virusScanStatus instanceof Error) {
            tagResult = 'ERROR'
        } else {
            tagResult = virusScanStatus
        }
    }

    const tags = generateTagSet(tagResult)
    const err = await s3Client.tagObject(key, bucket, tags)
    if (err instanceof Error) {
        console.error('Failed to tag object', err)
        return err
    }

    console.info('Tagged object ', tagResult)
}

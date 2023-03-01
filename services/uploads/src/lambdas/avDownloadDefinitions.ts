import { Context, S3Event } from 'aws-lambda'
import { NewS3UploadsClient } from '../deps/s3'
import { NewClamAV } from '../deps/clamAV'
import { updateAVDefinitions } from '../lib/updateAVDefinitions'

async function avDownloadDefinitions(_event: S3Event, _context: Context) {
    console.info('-----Start Update AV Definitions function-----')

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

    console.info('Updating ', clamAVBucketName)
    const err = await updateAVDefinitions(s3Client, clamAV, '/tmp')

    if (err) {
        throw err
    }

    return 'FILE SCANNED'
}

export { avDownloadDefinitions }

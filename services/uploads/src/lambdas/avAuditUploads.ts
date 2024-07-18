import { Context } from 'aws-lambda'
import { NewS3UploadsClient } from '../deps/s3'
import { NewLambdaInfectedFilesLister } from './avAuditFiles'
import { auditBucket } from '../lib/auditUploads'

async function avAuditUploads(_event: unknown, _context: Context) {
    console.info('-----Start Audit Uploads function-----')

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

    const auditBucketName = process.env.AUDIT_BUCKET_NAME
    if (!auditBucketName || auditBucketName === '') {
        throw new Error('Configuration Error: AUDIT_BUCKET_NAME must be set')
    }

    const listInfectedFilesName = process.env.LIST_INFECTED_FILES_LAMBDA_NAME
    if (!listInfectedFilesName || listInfectedFilesName === '') {
        throw new Error(
            'Configuration Error: LIST_INFECTED_FILES_LAMBDA_NAME must be set'
        )
    }

    const s3Client = NewS3UploadsClient()

    const fileScanner = NewLambdaInfectedFilesLister(listInfectedFilesName)

    console.info('Updating ', clamAVBucketName)
    const err = await auditBucket(s3Client, fileScanner, auditBucketName)

    if (err) {
        throw err
    }

    return 'FILES SCANNED'
}

module.exports = { avAuditUploads }

import { type EventBridgeEvent } from 'aws-lambda'
import { S3Client, PutObjectTaggingCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({})

export interface GuardDutyScanResult {
    'scan-id': string
    'scan-status': 'COMPLETED' | 'FAILED' | 'RUNNING' | 'SKIPPED'
    'scan-start-time': string
    'scan-end-time': string
    'scan-result-details': {
        'scan-result': 'CLEAN' | 'INFECTED'
        threats: Array<{
            name: string
            severity: string
        }>
        's3-object-details': {
            'bucket-name': string
            'object-key': string
            'e-tag': string
            'version-id': string
        }
    }
    'scan-type': 'ON_DEMAND' | 'GUARDUTY_INITIATED'
    'resource-type': 'S3Object'
    'detector-id': string
}

export async function handler(
    event: EventBridgeEvent<'GuardDuty Malware Scan', GuardDutyScanResult>
): Promise<void> {
    console.info(
        'Processing GuardDuty scan result:',
        JSON.stringify(event, null, 2)
    )

    const detail = event.detail
    const s3Details = detail['scan-result-details']['s3-object-details']
    const bucketName = s3Details['bucket-name']
    const objectKey = s3Details['object-key']
    const scanStatus = detail['scan-status']
    const scanResult = detail['scan-result-details']['scan-result']
    const threats = detail['scan-result-details']['threats'] || []

    // Map GuardDuty status to ClamAV-compatible tags for backward compatibility
    let virusScanStatus: string
    switch (scanStatus) {
        case 'COMPLETED':
            virusScanStatus = threats.length > 0 ? 'INFECTED' : 'CLEAN'
            break
        case 'FAILED':
        case 'SKIPPED':
            virusScanStatus = 'ERROR'
            break
        default:
            virusScanStatus = 'ERROR'
    }

    // Create tag set with ClamAV-compatible tags
    const tagSet = [
        { Key: 'virusScanStatus', Value: virusScanStatus },
        { Key: 'virusScanTimestamp', Value: Date.now().toString() },
        { Key: 'guardDutyScanId', Value: detail['scan-id'] },
        { Key: 'guardDutyScanResult', Value: scanResult || 'UNKNOWN' },
    ]

    // Add contentsPreviouslyScanned for CLEAN files (required for S3 bucket policy)
    if (virusScanStatus === 'CLEAN') {
        tagSet.push({ Key: 'contentsPreviouslyScanned', Value: 'TRUE' })
    }

    // Add threat details for infected files
    if (virusScanStatus === 'INFECTED' && threats.length > 0) {
        tagSet.push({
            Key: 'threatNames',
            Value: threats.map((t) => t.name).join(','),
        })
    }

    try {
        await s3.send(
            new PutObjectTaggingCommand({
                Bucket: bucketName,
                Key: objectKey,
                Tagging: { TagSet: tagSet },
            })
        )

        console.info(
            `Successfully tagged S3 object ${objectKey} as ${virusScanStatus}`
        )

        // Log threat details for monitoring
        if (virusScanStatus === 'INFECTED') {
            console.warn(`INFECTED FILE DETECTED: ${bucketName}/${objectKey}`)
            console.warn(`Threats found: ${JSON.stringify(threats)}`)
        }
    } catch (error) {
        console.error(
            `Failed to tag S3 object ${bucketName}/${objectKey}:`,
            error
        )
        throw error
    }
}

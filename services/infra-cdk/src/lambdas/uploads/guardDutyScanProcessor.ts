import { EventBridgeEvent } from 'aws-lambda';
import { S3Client, PutObjectTaggingCommand, GetObjectTaggingCommand, Tag } from '@aws-sdk/client-s3';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

// GuardDuty Malware Protection scan result event
interface GuardDutyScanResult {
  scanId: string;
  resourceType: string;
  s3Object: {
    bucketName: string;
    objectKey: string;
    eTag?: string;
  };
  scanResult: 'NO_THREATS_FOUND' | 'THREATS_FOUND' | 'FAILED' | 'UNSUPPORTED' | 'ACCESS_DENIED';
  scanDate: string;
  threats?: Array<{
    name: string;
    severity: string;
    filePath: string;
  }>;
}


const s3Client = new S3Client({});
const snsClient = new SNSClient({});

export async function handler(
  event: EventBridgeEvent<'GuardDuty Malware Protection Object Scan Result', GuardDutyScanResult>
): Promise<void> {
  console.log('Processing GuardDuty scan result:', JSON.stringify(event, null, 2));

  const { detail } = event;
  const { s3Object, scanResult, scanDate, threats } = detail;
  const { bucketName, objectKey } = s3Object;

  try {
    // Get existing tags
    const getTagsCommand = new GetObjectTaggingCommand({
      Bucket: bucketName,
      Key: objectKey
    });
    
    let existingTags: Tag[] = [];
    try {
      const tagsResponse = await s3Client.send(getTagsCommand);
      existingTags = tagsResponse.TagSet || [];
    } catch (error) {
      console.warn('Failed to get existing tags:', error);
    }

    // Filter out any existing virus scan tags to avoid duplicates
    const filteredTags = existingTags.filter(tag => 
      tag.Key !== 'virusScanStatus' && 
      tag.Key !== 'virusScanTimestamp' &&
      tag.Key !== 'GuardDutyMalwareScanStatus' &&
      tag.Key !== 'GuardDutyScanId' &&
      tag.Key !== 'contentsPreviouslyScanned'
    );

    // Create new tags with both GuardDuty and ClamAV-compatible formats
    const newTags: Tag[] = [
      ...filteredTags,
      // GuardDuty native tags
      { Key: 'GuardDutyMalwareScanStatus', Value: scanResult },
      { Key: 'GuardDutyScanId', Value: detail.scanId },
      { Key: 'GuardDutyScanDate', Value: scanDate },
      { Key: 'virusScanTimestamp', Value: new Date(scanDate).getTime().toString() }
    ];

    // Add ClamAV-compatible tags based on scan result
    if (scanResult === 'NO_THREATS_FOUND') {
      // Clean file - matches ClamAV behavior
      newTags.push({ Key: 'virusScanStatus', Value: 'CLEAN' });
      newTags.push({ Key: 'contentsPreviouslyScanned', Value: 'TRUE' });
    } else if (scanResult === 'THREATS_FOUND') {
      // Infected file
      newTags.push({ Key: 'virusScanStatus', Value: 'INFECTED' });
    } else {
      // Failed, unsupported, or access denied - mark as not scanned
      newTags.push({ Key: 'contentsPreviouslyScanned', Value: 'FALSE' });
    }

    // If threats were found, add threat details
    if (threats && threats.length > 0) {
      const threatNames = threats.map(t => t.name).join(',');
      newTags.push({ Key: 'detectedThreats', Value: threatNames });
    }

    // Apply tags to the S3 object
    const putTagsCommand = new PutObjectTaggingCommand({
      Bucket: bucketName,
      Key: objectKey,
      Tagging: { TagSet: newTags }
    });

    await s3Client.send(putTagsCommand);
    console.log(`Successfully tagged object s3://${bucketName}/${objectKey} with scan result: ${scanResult}`);

    // Send alert if threat detected or scan failed
    if (scanResult === 'THREATS_FOUND' || scanResult === 'FAILED') {
      await sendAlert(detail);
    }

    // Emit CloudWatch metrics
    await emitMetrics(scanResult, bucketName);

  } catch (error) {
    console.error('Error processing scan result:', error);
    throw error;
  }
}

async function sendAlert(scanResult: GuardDutyScanResult): Promise<void> {
  const alertTopicArn = process.env.ALERT_TOPIC_ARN;
  if (!alertTopicArn) {
    console.warn('ALERT_TOPIC_ARN not configured, skipping alert');
    return;
  }

  const { s3Object, scanResult: status, threats } = scanResult;
  
  let message = `GuardDuty Malware Scan Alert\n\n`;
  message += `Status: ${status}\n`;
  message += `Bucket: ${s3Object.bucketName}\n`;
  message += `Object: ${s3Object.objectKey}\n`;
  message += `Scan Date: ${scanResult.scanDate}\n`;

  if (threats && threats.length > 0) {
    message += '\nDetected Threats:\n';
    threats.forEach(threat => {
      message += `  - ${threat.name} (${threat.severity}) at ${threat.filePath}\n`;
    });
  }

  const publishCommand = new PublishCommand({
    TopicArn: alertTopicArn,
    Subject: `GuardDuty Malware Alert: ${status} - ${s3Object.objectKey}`,
    Message: message
  });

  try {
    await snsClient.send(publishCommand);
    console.log('Alert sent successfully');
  } catch (error) {
    console.error('Failed to send alert:', error);
  }
}

async function emitMetrics(scanResult: string, bucketName: string): Promise<void> {
  // CloudWatch metrics are automatically emitted by GuardDuty
  // This is a placeholder for any custom metrics we want to add
  console.log(`Scan completed - Result: ${scanResult}, Bucket: ${bucketName}`);
  
  // Custom metrics could be added here using CloudWatch client
  // For example: tracking scan results by bucket, file types, etc.
}

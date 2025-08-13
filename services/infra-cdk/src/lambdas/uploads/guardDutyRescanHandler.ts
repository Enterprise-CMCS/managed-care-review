import { S3Client, GetObjectTaggingCommand, CopyObjectCommand, Tag } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

interface RescanRequest {
  bucket: string;
  key: string;
  reason?: string;
}

const s3Client = new S3Client({});
const sqsClient = new SQSClient({});

/**
 * Handles rescan requests for files that need to be re-evaluated by GuardDuty.
 * Since GuardDuty doesn't have a direct rescan API, we use S3 object copy
 * to trigger a new scan.
 */
export async function handler(event: any): Promise<any> {
  console.log('GuardDuty rescan handler invoked:', JSON.stringify(event, null, 2));

  const rescanRequests: RescanRequest[] = event.Records ? 
    event.Records.map((record: any) => JSON.parse(record.body)) :
    [event]; // Support direct invocation for testing

  const results = {
    successful: 0,
    failed: 0,
    errors: [] as any[]
  };

  for (const request of rescanRequests) {
    try {
      await rescanObject(request);
      results.successful++;
    } catch (error) {
      console.error(`Failed to rescan ${request.bucket}/${request.key}:`, error);
      results.failed++;
      results.errors.push({
        bucket: request.bucket,
        key: request.key,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  console.log('Rescan results:', results);
  return results;
}

async function rescanObject(request: RescanRequest): Promise<void> {
  const { bucket, key, reason } = request;
  
  console.log(`Initiating rescan for s3://${bucket}/${key}`, reason ? `Reason: ${reason}` : '');

  // Get existing tags
  const getTagsCommand = new GetObjectTaggingCommand({
    Bucket: bucket,
    Key: key
  });
  
  const tagsResponse = await s3Client.send(getTagsCommand);
  const existingTags = tagsResponse.TagSet || [];

  // Check if object was previously scanned
  const lastScanStatus = existingTags.find(tag => tag.Key === 'GuardDutyMalwareScanStatus')?.Value;
  const lastScanTime = existingTags.find(tag => tag.Key === 'GuardDutyScanDate')?.Value;

  console.log(`Previous scan: Status=${lastScanStatus}, Time=${lastScanTime}`);

  // Create a temporary copy to trigger GuardDuty scan
  const tempKey = `${key}.rescan-${Date.now()}`;
  
  // Copy object to temporary location
  const copyCommand = new CopyObjectCommand({
    Bucket: bucket,
    CopySource: `${bucket}/${key}`,
    Key: tempKey,
    TaggingDirective: 'COPY',
    MetadataDirective: 'COPY'
  });

  await s3Client.send(copyCommand);
  console.log(`Created temporary copy at s3://${bucket}/${tempKey}`);

  // Copy back to original location to trigger scan
  const copyBackCommand = new CopyObjectCommand({
    Bucket: bucket,
    CopySource: `${bucket}/${tempKey}`,
    Key: key,
    TaggingDirective: 'REPLACE',
    Tagging: createRescanTags(existingTags, reason),
    MetadataDirective: 'COPY'
  });

  await s3Client.send(copyBackCommand);
  console.log(`Copied back to original location, triggering new scan`);

  // Clean up temporary copy
  // Note: In production, you might want to keep this for audit trail
  // and have a separate cleanup process
  try {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucket,
      Key: tempKey
    });
    await s3Client.send(deleteCommand);
  } catch (error) {
    console.warn(`Failed to clean up temporary object ${tempKey}:`, error);
  }

  // If configured, send notification about rescan
  await notifyRescan(bucket, key, reason);
}

function createRescanTags(existingTags: Tag[], reason?: string): string {
  // Filter out scan-related tags that will be replaced by new scan
  const filteredTags = existingTags.filter(tag => 
    !tag.Key?.startsWith('GuardDuty') && 
    !tag.Key?.startsWith('virusScan')
  );

  // Add rescan metadata tags
  const rescanTags: Tag[] = [
    ...filteredTags,
    { Key: 'LastRescanRequested', Value: new Date().toISOString() },
    { Key: 'RescanCount', Value: String(getRescanCount(existingTags) + 1) }
  ];

  if (reason) {
    rescanTags.push({ Key: 'LastRescanReason', Value: reason });
  }

  // Convert to URL-encoded format required by S3
  return rescanTags
    .map(tag => `${encodeURIComponent(tag.Key!)}=${encodeURIComponent(tag.Value!)}`)
    .join('&');
}

function getRescanCount(tags: Tag[]): number {
  const countTag = tags.find(tag => tag.Key === 'RescanCount');
  return countTag ? parseInt(countTag.Value || '0', 10) : 0;
}

async function notifyRescan(bucket: string, key: string, reason?: string): Promise<void> {
  const queueUrl = process.env.RESCAN_NOTIFICATION_QUEUE_URL;
  if (!queueUrl) {
    return;
  }

  const message = {
    type: 'RESCAN_INITIATED',
    bucket,
    key,
    reason,
    timestamp: new Date().toISOString()
  };

  try {
    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(message)
    });
    await sqsClient.send(command);
  } catch (error) {
    console.warn('Failed to send rescan notification:', error);
  }
}

// Import necessary for DeleteObjectCommand
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

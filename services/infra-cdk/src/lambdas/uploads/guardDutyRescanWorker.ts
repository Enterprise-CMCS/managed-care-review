import { Context } from 'aws-lambda';
import { S3Client, GetObjectTaggingCommand, CopyObjectCommand, DeleteObjectCommand, Tag } from '@aws-sdk/client-s3';

interface ScanFilesInput {
  bucket: string;
  keys: string[];
}

export interface ScanFilesOutput {
  processedKeys: string[];
  failedKeys: string[];
}

const s3Client = new S3Client({});

/**
 * Worker Lambda for parallel rescan processing.
 * Since GuardDuty doesn't have a direct rescan API, we use S3 copy to trigger new scans.
 */
export async function handler(
  event: ScanFilesInput,
  _context: Context
): Promise<ScanFilesOutput> {
  console.log('-----Start Rescan Worker function-----');
  console.log(`Processing ${event.keys.length} files in bucket ${event.bucket}`);

  const processedKeys: string[] = [];
  const failedKeys: string[] = [];

  // Process each file individually
  for (const key of event.keys) {
    try {
      console.log(`Processing rescan for: ${key}`);
      
      // Get existing tags to check current status
      const getTagsCommand = new GetObjectTaggingCommand({
        Bucket: event.bucket,
        Key: key
      });
      
      const tagsResponse = await s3Client.send(getTagsCommand);
      const existingTags = tagsResponse.TagSet || [];
      
      // Check current scan status
      const scanStatus = existingTags.find(tag => 
        tag.Key === 'GuardDutyMalwareScanStatus' || tag.Key === 'virusScanStatus'
      )?.Value;
      
      console.log(`Current scan status for ${key}: ${scanStatus || 'NONE'}`);
      
      // Only rescan if status is ERROR, FAILED, or missing
      if (!scanStatus || scanStatus === 'ERROR' || scanStatus === 'FAILED' || scanStatus === 'ACCESS_DENIED') {
        // Create a temporary copy to trigger GuardDuty scan
        const tempKey = `${key}.rescan-${Date.now()}`;
        
        try {
          // Copy to temporary location
          const copyCommand = new CopyObjectCommand({
            Bucket: event.bucket,
            CopySource: `${event.bucket}/${key}`,
            Key: tempKey,
            TaggingDirective: 'COPY',
            MetadataDirective: 'COPY'
          });
          
          await s3Client.send(copyCommand);
          console.log(`Created temporary copy: ${tempKey}`);
          
          // Copy back to original location with updated tags
          const rescanTags = createRescanTags(existingTags);
          const copyBackCommand = new CopyObjectCommand({
            Bucket: event.bucket,
            CopySource: `${event.bucket}/${tempKey}`,
            Key: key,
            TaggingDirective: 'REPLACE',
            Tagging: rescanTags,
            MetadataDirective: 'COPY'
          });
          
          await s3Client.send(copyBackCommand);
          console.log(`Triggered rescan for: ${key}`);
          
          // Clean up temporary copy
          try {
            const deleteCommand = new DeleteObjectCommand({
              Bucket: event.bucket,
              Key: tempKey
            });
            await s3Client.send(deleteCommand);
          } catch (deleteError) {
            console.warn(`Failed to clean up temp file ${tempKey}:`, deleteError);
          }
          
          processedKeys.push(key);
        } catch (copyError) {
          console.error(`Failed to rescan ${key}:`, copyError);
          failedKeys.push(key);
        }
      } else {
        console.log(`Skipping ${key} - already has valid scan status: ${scanStatus}`);
        processedKeys.push(key);
      }
    } catch (error) {
      console.error(`Error processing ${key}:`, error);
      failedKeys.push(key);
    }
  }

  console.log(`Rescan worker complete. Processed: ${processedKeys.length}, Failed: ${failedKeys.length}`);
  
  return {
    processedKeys,
    failedKeys
  };
}

function createRescanTags(existingTags: Tag[]): string {
  // Filter out scan-related tags that will be replaced by new scan
  const filteredTags = existingTags.filter(tag => 
    !tag.Key?.startsWith('GuardDuty') && 
    !tag.Key?.startsWith('virusScan') &&
    tag.Key !== 'LastRescanRequested' &&
    tag.Key !== 'RescanCount'
  );

  // Add rescan metadata tags
  const now = new Date();
  const rescanCount = getRescanCount(existingTags);
  
  const rescanTags: Tag[] = [
    ...filteredTags,
    { Key: 'LastRescanRequested', Value: now.toISOString() },
    { Key: 'RescanCount', Value: String(rescanCount + 1) },
    { Key: 'RescanTimestamp', Value: String(now.getTime()) }
  ];

  // Convert to URL-encoded format required by S3 CopyObject
  return rescanTags
    .map(tag => `${encodeURIComponent(tag.Key!)}=${encodeURIComponent(tag.Value!)}`)
    .join('&');
}

function getRescanCount(tags: Tag[]): number {
  const countTag = tags.find(tag => tag.Key === 'RescanCount');
  return countTag ? parseInt(countTag.Value || '0', 10) : 0;
}

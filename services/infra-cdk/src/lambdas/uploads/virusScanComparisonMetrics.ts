import { EventBridgeEvent, ScheduledEvent } from 'aws-lambda';
import { S3Client, ListObjectsV2Command, GetObjectTaggingCommand } from '@aws-sdk/client-s3';
import { CloudWatchClient, PutMetricDataCommand, MetricDatum } from '@aws-sdk/client-cloudwatch';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

interface ComparisonResult {
  bucket: string;
  key: string;
  clamAvStatus?: string;
  guardDutyStatus?: string;
  match: boolean;
  scannedAt: Date;
  discrepancyType?: 'MISSING_CLAMAV' | 'MISSING_GUARDDUTY' | 'STATUS_MISMATCH';
}

const s3Client = new S3Client({});
const cloudWatchClient = new CloudWatchClient({});
const snsClient = new SNSClient({});

const BUCKETS_TO_MONITOR = (process.env.MONITORED_BUCKETS || '').split(',').filter(Boolean);
const METRICS_NAMESPACE = process.env.METRICS_NAMESPACE || 'MCR/VirusScanComparison';
const ALERT_TOPIC_ARN = process.env.ALERT_TOPIC_ARN;

/**
 * Lambda function to compare virus scan results between ClamAV and GuardDuty
 * Runs on a schedule to detect discrepancies and track migration progress
 */
export async function handler(event: ScheduledEvent): Promise<void> {
  console.log('Starting virus scan comparison', { event });

  const results: ComparisonResult[] = [];
  const metrics: MetricDatum[] = [];

  try {
    // Process each monitored bucket
    for (const bucket of BUCKETS_TO_MONITOR) {
      const bucketResults = await compareBucketScans(bucket);
      results.push(...bucketResults);
    }

    // Analyze results
    const analysis = analyzeResults(results);
    
    // Emit metrics
    metrics.push(...createMetrics(analysis));
    await publishMetrics(metrics);

    // Alert on discrepancies
    if (analysis.discrepancyCount > 0) {
      await sendAlert(analysis, results.filter(r => !r.match));
    }

    console.log('Comparison complete', { 
      totalObjects: results.length,
      matches: analysis.matchCount,
      discrepancies: analysis.discrepancyCount 
    });

  } catch (error) {
    console.error('Error during comparison:', error);
    throw error;
  }
}

async function compareBucketScans(bucket: string): Promise<ComparisonResult[]> {
  const results: ComparisonResult[] = [];
  let continuationToken: string | undefined;

  do {
    // List objects in bucket
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      MaxKeys: 100,
      ContinuationToken: continuationToken
    });

    const listResponse = await s3Client.send(listCommand);
    
    if (listResponse.Contents) {
      // Check tags for each object
      for (const object of listResponse.Contents) {
        if (object.Key) {
          const comparison = await compareObjectTags(bucket, object.Key);
          results.push(comparison);
        }
      }
    }

    continuationToken = listResponse.NextContinuationToken;
  } while (continuationToken);

  return results;
}

async function compareObjectTags(bucket: string, key: string): Promise<ComparisonResult> {
  try {
    const tagsCommand = new GetObjectTaggingCommand({
      Bucket: bucket,
      Key: key
    });

    const tagsResponse = await s3Client.send(tagsCommand);
    const tags = tagsResponse.TagSet || [];

    // Extract scan statuses
    const clamAvTag = tags.find(t => t.Key === 'virusScanStatus');
    const guardDutyTag = tags.find(t => t.Key === 'GuardDutyMalwareScanStatus');
    const scanTimestamp = tags.find(t => t.Key === 'virusScanTimestamp' || t.Key === 'GuardDutyScanDate');

    const clamAvStatus = clamAvTag?.Value;
    const guardDutyStatus = normalizeGuardDutyStatus(guardDutyTag?.Value);

    // Determine if they match
    let match = false;
    let discrepancyType: ComparisonResult['discrepancyType'];

    if (!clamAvStatus && !guardDutyStatus) {
      // Neither system has scanned - skip
      return {
        bucket,
        key,
        match: true,
        scannedAt: new Date()
      };
    } else if (!clamAvStatus) {
      discrepancyType = 'MISSING_CLAMAV';
    } else if (!guardDutyStatus) {
      discrepancyType = 'MISSING_GUARDDUTY';
    } else {
      match = clamAvStatus === guardDutyStatus;
      if (!match) {
        discrepancyType = 'STATUS_MISMATCH';
      }
    }

    return {
      bucket,
      key,
      clamAvStatus,
      guardDutyStatus,
      match: match && !discrepancyType,
      scannedAt: scanTimestamp ? new Date(scanTimestamp.Value!) : new Date(),
      discrepancyType
    };

  } catch (error) {
    console.error(`Error comparing tags for s3://${bucket}/${key}:`, error);
    return {
      bucket,
      key,
      match: false,
      scannedAt: new Date(),
      discrepancyType: 'STATUS_MISMATCH'
    };
  }
}

function normalizeGuardDutyStatus(status?: string): string | undefined {
  if (!status) return undefined;
  
  const mapping: Record<string, string> = {
    'NO_THREATS_FOUND': 'CLEAN',
    'THREATS_FOUND': 'INFECTED',
    'FAILED': 'ERROR',
    'UNSUPPORTED': 'SKIPPED',
    'ACCESS_DENIED': 'ERROR'
  };

  return mapping[status] || status;
}

interface AnalysisResult {
  totalCount: number;
  matchCount: number;
  discrepancyCount: number;
  missingClamAvCount: number;
  missingGuardDutyCount: number;
  statusMismatchCount: number;
  matchRate: number;
  guardDutyCoverage: number;
  clamAvCoverage: number;
}

function analyzeResults(results: ComparisonResult[]): AnalysisResult {
  const totalCount = results.length;
  const matchCount = results.filter(r => r.match).length;
  const discrepancies = results.filter(r => !r.match);
  
  const missingClamAvCount = discrepancies.filter(r => r.discrepancyType === 'MISSING_CLAMAV').length;
  const missingGuardDutyCount = discrepancies.filter(r => r.discrepancyType === 'MISSING_GUARDDUTY').length;
  const statusMismatchCount = discrepancies.filter(r => r.discrepancyType === 'STATUS_MISMATCH').length;

  const scannedByGuardDuty = results.filter(r => r.guardDutyStatus).length;
  const scannedByClamAv = results.filter(r => r.clamAvStatus).length;

  return {
    totalCount,
    matchCount,
    discrepancyCount: discrepancies.length,
    missingClamAvCount,
    missingGuardDutyCount,
    statusMismatchCount,
    matchRate: totalCount > 0 ? (matchCount / totalCount) * 100 : 100,
    guardDutyCoverage: totalCount > 0 ? (scannedByGuardDuty / totalCount) * 100 : 0,
    clamAvCoverage: totalCount > 0 ? (scannedByClamAv / totalCount) * 100 : 0
  };
}

function createMetrics(analysis: AnalysisResult): MetricDatum[] {
  const timestamp = new Date();
  const stage = process.env.STAGE || 'unknown';

  return [
    {
      MetricName: 'ScanMatchRate',
      Value: analysis.matchRate,
      Unit: 'Percent',
      Timestamp: timestamp,
      Dimensions: [{ Name: 'Stage', Value: stage }]
    },
    {
      MetricName: 'TotalDiscrepancies',
      Value: analysis.discrepancyCount,
      Unit: 'Count',
      Timestamp: timestamp,
      Dimensions: [{ Name: 'Stage', Value: stage }]
    },
    {
      MetricName: 'GuardDutyCoverage',
      Value: analysis.guardDutyCoverage,
      Unit: 'Percent',
      Timestamp: timestamp,
      Dimensions: [{ Name: 'Stage', Value: stage }]
    },
    {
      MetricName: 'ClamAvCoverage',
      Value: analysis.clamAvCoverage,
      Unit: 'Percent',
      Timestamp: timestamp,
      Dimensions: [{ Name: 'Stage', Value: stage }]
    },
    {
      MetricName: 'StatusMismatches',
      Value: analysis.statusMismatchCount,
      Unit: 'Count',
      Timestamp: timestamp,
      Dimensions: [{ Name: 'Stage', Value: stage }]
    }
  ];
}

async function publishMetrics(metrics: MetricDatum[]): Promise<void> {
  const command = new PutMetricDataCommand({
    Namespace: METRICS_NAMESPACE,
    MetricData: metrics
  });

  await cloudWatchClient.send(command);
  console.log(`Published ${metrics.length} metrics to CloudWatch`);
}

async function sendAlert(analysis: AnalysisResult, discrepancies: ComparisonResult[]): Promise<void> {
  if (!ALERT_TOPIC_ARN) {
    console.warn('No alert topic configured, skipping alert');
    return;
  }

  // Sample discrepancies (don't send all if there are many)
  const sampleSize = 10;
  const samples = discrepancies.slice(0, sampleSize);

  let message = `Virus Scan Comparison Alert\n\n`;
  message += `Summary:\n`;
  message += `- Total Objects: ${analysis.totalCount}\n`;
  message += `- Match Rate: ${analysis.matchRate.toFixed(2)}%\n`;
  message += `- Total Discrepancies: ${analysis.discrepancyCount}\n`;
  message += `  - Missing ClamAV: ${analysis.missingClamAvCount}\n`;
  message += `  - Missing GuardDuty: ${analysis.missingGuardDutyCount}\n`;
  message += `  - Status Mismatch: ${analysis.statusMismatchCount}\n`;
  message += `\nGuardDuty Coverage: ${analysis.guardDutyCoverage.toFixed(2)}%\n`;
  message += `ClamAV Coverage: ${analysis.clamAvCoverage.toFixed(2)}%\n`;
  
  if (samples.length > 0) {
    message += `\nSample Discrepancies:\n`;
    samples.forEach(sample => {
      message += `- s3://${sample.bucket}/${sample.key}\n`;
      message += `  ClamAV: ${sample.clamAvStatus || 'NOT_SCANNED'}\n`;
      message += `  GuardDuty: ${sample.guardDutyStatus || 'NOT_SCANNED'}\n`;
      message += `  Type: ${sample.discrepancyType}\n`;
    });
    
    if (discrepancies.length > sampleSize) {
      message += `\n... and ${discrepancies.length - sampleSize} more discrepancies`;
    }
  }

  const publishCommand = new PublishCommand({
    TopicArn: ALERT_TOPIC_ARN,
    Subject: `Virus Scan Discrepancy Alert - ${analysis.discrepancyCount} issues found`,
    Message: message
  });

  await snsClient.send(publishCommand);
  console.log('Alert sent successfully');
}

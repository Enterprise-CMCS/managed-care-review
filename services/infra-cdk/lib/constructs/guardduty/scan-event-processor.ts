/**
 * GuardDuty Scan Event Processor
 * 
 * Processes GuardDuty malware scan results via EventBridge
 */

import { Construct } from 'constructs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';
import * as path from 'path';
import { defaultBundling } from '../../lambda-bundling';

// File size limits
const FILE_SIZE_LIMITS = {
  SCAN_TIMEOUT_MB: 512,
  MAX_UPLOAD_SIZE_MB: 100,
  QUARANTINE_THRESHOLD_MB: 1024,
  MAX_SCAN_SIZE_BYTES: 512 * 1024 * 1024, // 512MB in bytes
} as const;

const PROJECT_PREFIX = 'mcr';

export interface ScanEventProcessorProps {
  stage: string;
  stageConfig: any;
  uploadsBucket: s3.IBucket;
  qaBucket: s3.IBucket;
  alertEmail?: string;
  enableClamAvCompatibility?: boolean;
  vpc?: any;
  vpcSubnets?: any;
  securityGroups?: any;
}

export class ScanEventProcessor extends Construct {
  public readonly scanResultProcessor: NodejsFunction;
  public readonly alertTopic: sns.Topic;
  public scanCompleteRule: events.Rule;
  public threatDetectedRule: events.Rule;

  constructor(scope: Construct, id: string, props: ScanEventProcessorProps) {
    super(scope, id);

    // Create SNS topic for alerts
    this.alertTopic = new sns.Topic(this, 'MalwareAlertTopic', {
      topicName: `${PROJECT_PREFIX}-guardduty-malware-alerts-${props.stage}`,
      displayName: 'GuardDuty Malware Alerts'
    });

    // Subscribe email if provided
    if (props.alertEmail) {
      this.alertTopic.addSubscription(
        new snsSubscriptions.EmailSubscription(props.alertEmail)
      );
    }

    // Create Lambda function to process scan results
    this.scanResultProcessor = new NodejsFunction(this, 'ScanResultProcessor', {
      functionName: `mcr-${props.stage}-guardduty-scan-processor`,
      entry: path.join(__dirname, '..', '..', '..', 'src', 'lambdas', 'uploads', 'guardDutyScanProcessor.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.minutes(5),
      memorySize: 2048,
      environment: {
        STAGE: props.stage,
        stage: props.stage,
        NODE_OPTIONS: '--enable-source-maps',
        UPLOAD_BUCKET_NAME: props.uploadsBucket.bucketName,
        QA_BUCKET_NAME: props.qaBucket.bucketName,
        MAX_FILE_SIZE: FILE_SIZE_LIMITS.MAX_SCAN_SIZE_BYTES.toString(),
        ENABLE_CLAMAV_COMPATIBILITY: (props.enableClamAvCompatibility !== false).toString(),
        ALERT_TOPIC_ARN: this.alertTopic.topicArn,
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
        OTEL_PROPAGATORS: 'tracecontext,baggage,xray',
      },
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
      securityGroups: props.securityGroups,
      // Layers added by Lambda Monitoring Aspect
      bundling: defaultBundling(props.stage)
    });

    // Grant permissions
    this.grantPermissions(props);

    // Create EventBridge rules
    this.createEventRules(props);
  }

  private grantPermissions(props: ScanEventProcessorProps): void {
    // Grant bucket permissions
    props.uploadsBucket.grantRead(this.scanResultProcessor);
    props.qaBucket.grantRead(this.scanResultProcessor);
    this.alertTopic.grantPublish(this.scanResultProcessor);

    // Grant tagging permissions
    this.scanResultProcessor.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObjectTagging',
        's3:PutObjectTagging',
        's3:GetObjectVersionTagging',
        's3:PutObjectVersionTagging'
      ],
      resources: [
        `${props.uploadsBucket.bucketArn}/*`,
        `${props.qaBucket.bucketArn}/*`
      ]
    }));
  }

  private createEventRules(props: ScanEventProcessorProps): void {
    // Create EventBridge rule for all scan results
    this.scanCompleteRule = new events.Rule(this, 'ScanCompleteRule', {
      ruleName: `${PROJECT_PREFIX}-guardduty-scan-complete-${props.stage}`,
      description: 'Trigger on GuardDuty malware scan completion',
      eventPattern: {
        source: ['aws.guardduty'],
        detailType: ['GuardDuty Malware Protection Object Scan Result'],
        detail: {
          scanResult: ['NO_THREATS_FOUND', 'THREATS_FOUND', 'UNSUPPORTED', 'FAILED']
        }
      }
    });

    this.scanCompleteRule.addTarget(new targets.LambdaFunction(this.scanResultProcessor));

    // Create rule for threats only
    this.threatDetectedRule = new events.Rule(this, 'ThreatDetectedRule', {
      ruleName: `${PROJECT_PREFIX}-guardduty-threat-detected-${props.stage}`,
      description: 'Trigger only when threats are found',
      eventPattern: {
        source: ['aws.guardduty'],
        detailType: ['GuardDuty Malware Protection Object Scan Result'],
        detail: {
          scanResult: ['THREATS_FOUND']
        }
      }
    });

    // Send threat alerts to SNS
    this.threatDetectedRule.addTarget(new targets.SnsTopic(this.alertTopic));
  }
}
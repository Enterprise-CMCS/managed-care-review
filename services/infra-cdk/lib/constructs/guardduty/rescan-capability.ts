/**
 * GuardDuty Rescan Capability
 * 
 * Provides ability to rescan files and handle failed scans
 */

import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Duration, CfnOutput } from 'aws-cdk-lib';
import * as path from 'path';
import { defaultBundling } from '../../lambda-bundling';

const PROJECT_PREFIX = 'mcr';

// GuardDuty rescan-specific constants (moved from shared config)
const FILE_SIZE_LIMITS = {
  MAX_SCAN_SIZE_BYTES: 314572800,
  MAX_SCAN_SIZE_MB: 300,
  MAX_API_PAYLOAD_BYTES: 10485760,
  MAX_API_PAYLOAD_MB: 10,
  MAX_LAMBDA_PAYLOAD_BYTES: 6291456,
  MAX_LAMBDA_PAYLOAD_MB: 6,
} as const;

const QUEUE_LIMITS = {
  DEFAULT_VISIBILITY_TIMEOUT: Duration.minutes(5),
  MAX_RETENTION: Duration.days(14),
  DEFAULT_RETENTION: Duration.days(7),
} as const;

// OTEL layer is now added by Lambda Monitoring Aspect to avoid duplicates

export interface RescanCapabilityProps {
  stage: string;
  stageConfig: any;
  uploadsBucket: s3.IBucket;
  qaBucket: s3.IBucket;
  vpc?: ec2.IVpc;
  vpcSubnets?: any;
  securityGroups?: ec2.ISecurityGroup[];
}

export class RescanCapability extends Construct {
  public readonly rescanQueue: sqs.Queue;
  public readonly rescanHandler: NodejsFunction;
  public readonly rescanWorker: NodejsFunction;
  public failedScanRule: events.Rule;

  constructor(scope: Construct, id: string, props: RescanCapabilityProps) {
    super(scope, id);

    // Create SQS queue for rescan requests
    this.rescanQueue = new sqs.Queue(this, 'RescanQueue', {
      queueName: `${PROJECT_PREFIX}-guardduty-rescan-${props.stage}`,
      visibilityTimeout: QUEUE_LIMITS.DEFAULT_VISIBILITY_TIMEOUT,
      retentionPeriod: QUEUE_LIMITS.DEFAULT_RETENTION,
      encryption: sqs.QueueEncryption.KMS_MANAGED
    });

    // Create rescan handler Lambda
    this.rescanHandler = this.createRescanHandler(props);

    // Create rescan worker Lambda
    this.rescanWorker = this.createRescanWorker(props);

    // Grant permissions
    this.grantPermissions(props);

    // Create event rule for failed scans
    this.createFailedScanRule(props);

    // Export rescan queue URL
    new CfnOutput(this, 'RescanQueueUrl', {
      value: this.rescanQueue.queueUrl,
      description: 'URL for GuardDuty rescan request queue',
      exportName: `GuardDuty-${props.stage}-RescanQueueUrl`
    });
  }

  private createRescanHandler(props: RescanCapabilityProps): NodejsFunction {
    return new NodejsFunction(this, 'RescanHandler', {
      functionName: `mcr-${props.stage}-guardduty-rescan-handler`,
      entry: path.join(__dirname, '..', '..', '..', 'src', 'lambdas', 'uploads', 'guardDutyRescanHandler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.minutes(5),
      memorySize: 512,
      reservedConcurrentExecutions: 10, // Limit concurrent rescans
      environment: {
        STAGE: props.stage,
        stage: props.stage,
        NODE_OPTIONS: '--enable-source-maps',
        UPLOAD_BUCKET_NAME: props.uploadsBucket.bucketName,
        QA_BUCKET_NAME: props.qaBucket.bucketName,
        MAX_FILE_SIZE: FILE_SIZE_LIMITS.MAX_SCAN_SIZE_BYTES.toString(),
        RESCAN_QUEUE_URL: this.rescanQueue.queueUrl,
        AUDIT_BUCKET_NAME: props.uploadsBucket.bucketName,
        RESCAN_WORKER_LAMBDA_NAME: `mcr-${props.stage}-rescan-worker`,
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
        OTEL_PROPAGATORS: 'tracecontext,baggage,xray',
      },
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
      securityGroups: props.securityGroups,
      // Layers added by Lambda Monitoring Aspect
      bundling: defaultBundling(props.stage)
    });
  }

  private createRescanWorker(props: RescanCapabilityProps): NodejsFunction {
    return new NodejsFunction(this, 'RescanWorker', {
      functionName: `mcr-${props.stage}-rescan-worker`,
      entry: path.join(__dirname, '..', '..', '..', 'src', 'lambdas', 'uploads', 'guardDutyRescanWorker.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.minutes(5),
      memorySize: 1024,
      environment: {
        STAGE: props.stage,
        stage: props.stage,
        NODE_OPTIONS: '--enable-source-maps',
        UPLOAD_BUCKET_NAME: props.uploadsBucket.bucketName,
        QA_BUCKET_NAME: props.qaBucket.bucketName,
        MAX_FILE_SIZE: FILE_SIZE_LIMITS.MAX_SCAN_SIZE_BYTES.toString(),
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
        OTEL_PROPAGATORS: 'tracecontext,baggage,xray',
      },
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
      securityGroups: props.securityGroups,
      // Layers added by Lambda Monitoring Aspect
      bundling: defaultBundling(props.stage)
    });
  }

  private grantPermissions(props: RescanCapabilityProps): void {
    // Grant bucket permissions
    props.uploadsBucket.grantReadWrite(this.rescanHandler);
    props.qaBucket.grantReadWrite(this.rescanHandler);
    props.uploadsBucket.grantReadWrite(this.rescanWorker);
    props.qaBucket.grantReadWrite(this.rescanWorker);
    
    // Grant tagging permissions
    const taggingPolicy = new iam.PolicyStatement({
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
    });

    this.rescanHandler.addToRolePolicy(taggingPolicy);
    this.rescanWorker.addToRolePolicy(taggingPolicy);

    // Grant rescan handler permission to invoke worker
    this.rescanWorker.grantInvoke(this.rescanHandler);

    // Grant queue permissions
    this.rescanQueue.grantSendMessages(this.rescanHandler);
    this.rescanQueue.grantConsumeMessages(this.rescanHandler);
  }

  private createFailedScanRule(props: RescanCapabilityProps): void {
    this.failedScanRule = new events.Rule(this, 'FailedScanRule', {
      ruleName: `${PROJECT_PREFIX}-guardduty-failed-scan-${props.stage}`,
      description: 'Trigger on failed GuardDuty scans for potential rescan',
      eventPattern: {
        source: ['aws.guardduty'],
        detailType: ['GuardDuty Malware Protection Object Scan Result'],
        detail: {
          scanResult: ['FAILED', 'ACCESS_DENIED']
        }
      }
    });

    // Trigger rescan handler for failed scans
    this.failedScanRule.addTarget(new targets.LambdaFunction(this.rescanHandler, {
      retryAttempts: 2
    }));
  }
}
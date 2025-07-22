/**
 * GuardDuty Rescan Capability
 * 
 * Provides ability to rescan files and handle failed scans
 */

import { Construct } from 'constructs';
import { BaseLambdaFunction } from '@constructs/lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Duration, CfnOutput } from 'aws-cdk-lib';
import { LAMBDA_MEMORY, LAMBDA_TIMEOUTS, FILE_SIZE_LIMITS, PROJECT_PREFIX, SERVICES, getOtelLayerArn, QUEUE_LIMITS } from '@config/constants';
import { LambdaEnvironmentFactory } from '@constructs/lambda/environment-factory';
import { StageConfig } from '@config/stage-config';

export interface RescanCapabilityProps {
  stage: string;
  stageConfig: StageConfig;
  uploadsBucket: s3.IBucket;
  qaBucket: s3.IBucket;
  vpc?: ec2.IVpc;
  vpcSubnets?: any;
  securityGroups?: ec2.ISecurityGroup[];
}

export class RescanCapability extends Construct {
  public readonly rescanQueue: sqs.Queue;
  public readonly rescanHandler: BaseLambdaFunction;
  public readonly rescanWorker: BaseLambdaFunction;
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

  private createRescanHandler(props: RescanCapabilityProps): BaseLambdaFunction {
    return new BaseLambdaFunction(this, 'RescanHandler', {
      functionName: 'guardduty-rescan-handler',
      serviceName: 'infra-cdk',
      handler: 'lambdas/uploads/guardDutyRescanHandler.handler',
      stage: props.stage,
      lambdaConfig: {
        ...props.stageConfig.lambda,
        timeout: LAMBDA_TIMEOUTS.EXTENDED,
        memorySize: LAMBDA_MEMORY.MEDIUM,
        reservedConcurrentExecutions: 10 // Limit concurrent rescans
      },
      environment: LambdaEnvironmentFactory.merge(
        LambdaEnvironmentFactory.createVirusScanEnvironment(
          props.stage,
          [props.uploadsBucket.bucketName],
          {
            maxFileSize: FILE_SIZE_LIMITS.MAX_SCAN_SIZE_BYTES,
            rescanQueueUrl: this.rescanQueue.queueUrl
          }
        ),
        {
          AUDIT_BUCKET_NAME: props.uploadsBucket.bucketName,
          RESCAN_WORKER_LAMBDA_NAME: `${SERVICES.UPLOADS}-${props.stage}-rescan-worker`
        }
      ),
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
      securityGroups: props.securityGroups,
      layers: [
        lambda.LayerVersion.fromLayerVersionArn(
          this,
          'OtelLayerRescanHandler',
          getOtelLayerArn('x86_64')
        )
      ]
    });
  }

  private createRescanWorker(props: RescanCapabilityProps): BaseLambdaFunction {
    return new BaseLambdaFunction(this, 'RescanWorker', {
      functionName: 'rescan-worker',
      serviceName: 'infra-cdk',
      handler: 'lambdas/uploads/guardDutyRescanWorker.handler',
      stage: props.stage,
      lambdaConfig: {
        ...props.stageConfig.lambda,
        timeout: LAMBDA_TIMEOUTS.EXTENDED,
        memorySize: LAMBDA_MEMORY.LARGE
      },
      environment: LambdaEnvironmentFactory.createVirusScanEnvironment(
        props.stage,
        [props.uploadsBucket.bucketName],
        {
          maxFileSize: FILE_SIZE_LIMITS.MAX_SCAN_SIZE_BYTES
        }
      ),
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
      securityGroups: props.securityGroups,
      layers: [
        lambda.LayerVersion.fromLayerVersionArn(
          this,
          'OtelLayerRescanWorker',
          getOtelLayerArn('x86_64')
        )
      ]
    });
  }

  private grantPermissions(props: RescanCapabilityProps): void {
    // Grant bucket permissions
    props.uploadsBucket.grantReadWrite(this.rescanHandler.function);
    props.qaBucket.grantReadWrite(this.rescanHandler.function);
    props.uploadsBucket.grantReadWrite(this.rescanWorker.function);
    props.qaBucket.grantReadWrite(this.rescanWorker.function);
    
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

    this.rescanHandler.function.addToRolePolicy(taggingPolicy);
    this.rescanWorker.function.addToRolePolicy(taggingPolicy);

    // Grant rescan handler permission to invoke worker
    this.rescanWorker.grantInvoke(this.rescanHandler.function);

    // Grant queue permissions
    this.rescanQueue.grantSendMessages(this.rescanHandler.function);
    this.rescanQueue.grantConsumeMessages(this.rescanHandler.function);
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
    this.failedScanRule.addTarget(new targets.LambdaFunction(this.rescanHandler.function, {
      retryAttempts: 2
    }));
  }
}
/**
 * GuardDuty Scan Event Processor
 * 
 * Processes GuardDuty malware scan results via EventBridge
 */

import { Construct } from 'constructs';
import { BaseLambdaFunction } from '@constructs/lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';
import { LAMBDA_MEMORY, LAMBDA_TIMEOUTS, FILE_SIZE_LIMITS, PROJECT_PREFIX, SERVICES, getOtelLayerArn } from '@config/constants';
import { LambdaEnvironmentFactory } from '@constructs/lambda/environment-factory';
import { StageConfig } from '@config/stage-config';

export interface ScanEventProcessorProps {
  stage: string;
  stageConfig: StageConfig;
  uploadsBucket: s3.IBucket;
  qaBucket: s3.IBucket;
  alertEmail?: string;
  enableClamAvCompatibility?: boolean;
  vpc?: any;
  vpcSubnets?: any;
  securityGroups?: any;
}

export class ScanEventProcessor extends Construct {
  public readonly scanResultProcessor: BaseLambdaFunction;
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
    this.scanResultProcessor = new BaseLambdaFunction(this, 'ScanResultProcessor', {
      functionName: 'guardduty-scan-processor',
      serviceName: 'infra-cdk',
      handler: 'lambdas/uploads/guardDutyScanProcessor.handler',
      stage: props.stage,
      lambdaConfig: {
        ...props.stageConfig.lambda,
        timeout: LAMBDA_TIMEOUTS.EXTENDED,
        memorySize: LAMBDA_MEMORY.XLARGE
      },
      environment: LambdaEnvironmentFactory.createVirusScanEnvironment(
        props.stage,
        [props.uploadsBucket.bucketName, props.qaBucket.bucketName],
        {
          maxFileSize: FILE_SIZE_LIMITS.MAX_SCAN_SIZE_BYTES,
          enableClamAvCompatibility: props.enableClamAvCompatibility !== false,
          alertTopicArn: this.alertTopic.topicArn
        }
      ),
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
      securityGroups: props.securityGroups,
      layers: [
        lambda.LayerVersion.fromLayerVersionArn(
          this,
          'OtelLayerScanProcessor',
          getOtelLayerArn('x86_64')
        )
      ]
    });

    // Grant permissions
    this.grantPermissions(props);

    // Create EventBridge rules
    this.createEventRules(props);
  }

  private grantPermissions(props: ScanEventProcessorProps): void {
    // Grant bucket permissions
    props.uploadsBucket.grantRead(this.scanResultProcessor.function);
    props.qaBucket.grantRead(this.scanResultProcessor.function);
    this.alertTopic.grantPublish(this.scanResultProcessor.function);

    // Grant tagging permissions
    this.scanResultProcessor.function.addToRolePolicy(new iam.PolicyStatement({
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
          scanResult: ['CLEAN', 'THREATS_FOUND', 'UNSUPPORTED', 'FAILED']
        }
      }
    });

    this.scanCompleteRule.addTarget(new targets.LambdaFunction(this.scanResultProcessor.function));

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
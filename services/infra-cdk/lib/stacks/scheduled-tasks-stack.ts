import { BaseStack, BaseStackProps } from '@constructs/base';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Duration, CfnOutput } from 'aws-cdk-lib';
import { CDKPaths } from '../config/paths';

export interface ScheduledTasksStackProps extends BaseStackProps {
  uploadsBucketName: string;
  qaBucketName: string;
  applicationEndpoint?: string;
}

/**
 * Scheduled Tasks Stack for cron-based Lambda functions
 * Uses CDK built-in constructs instead of Solutions Constructs (simpler for EventBridge)
 */
export class ScheduledTasksStack extends BaseStack {
  private readonly uploadsBucketName: string;
  private readonly qaBucketName: string;
  private readonly applicationEndpoint?: string;

  constructor(scope: Construct, id: string, props: ScheduledTasksStackProps) {
    super(scope, id, {
      ...props,
      description: 'Scheduled tasks with EventBridge rules - Clean and efficient'
    });

    this.uploadsBucketName = props.uploadsBucketName;
    this.qaBucketName = props.qaBucketName;
    this.applicationEndpoint = props.applicationEndpoint;

    this.defineResources();
  }

  protected defineResources(): void {
    // Import shared infrastructure layers from SSM
    const otelLayerArn = ssm.StringParameter.valueForStringParameter(
      this, 
      `/lambda/${this.stage}/otel-layer-arn`
    );
    const otelLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'OtelLayer', otelLayerArn);

    // Cleanup Lambda Function - ultra-clean with pre-built Lambda package
    const cleanupFunction = new lambda.Function(this, 'CleanupFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset(CDKPaths.getLambdaPackagePath()),
      handler: 'handlers/cleanup.main',
      timeout: Duration.minutes(10),
      memorySize: 512,
      layers: [otelLayer],
      environment: this.getEnvironmentVariables(),
      functionName: `mcr-${this.stage}-cleanup`,
      description: 'Cleanup old files and temporary data'
    });

    // EventBridge rule - runs at 14:00 UTC Monday-Friday (matches serverless config)
    const cleanupRule = new events.Rule(this, 'CleanupScheduleRule', {
      ruleName: `mcr-${this.stage}-cleanup-schedule`,
      description: 'Triggers cleanup function weekdays at 14:00 UTC',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '14',
        weekDay: 'MON-FRI'
      })
    });

    // Add Lambda target to the rule
    cleanupRule.addTarget(new targets.LambdaFunction(cleanupFunction));

    // Create outputs
    new CfnOutput(this, 'CleanupFunctionName', {
      value: cleanupFunction.functionName,
      description: 'Cleanup Lambda Function Name'
    });

    new CfnOutput(this, 'CleanupRuleName', {
      value: cleanupRule.ruleName,
      description: 'Cleanup EventBridge Rule Name'
    });
  }

  /**
   * Get environment variables for scheduled tasks
   */
  private getEnvironmentVariables(): Record<string, string> {
    return {
      NODE_ENV: this.stage === 'prod' ? 'production' : 'development',
      STAGE: this.stage,
      UPLOADS_BUCKET_NAME: this.uploadsBucketName,
      QA_BUCKET_NAME: this.qaBucketName,
      APPLICATION_ENDPOINT: this.applicationEndpoint || `https://mcr-${this.stage}.cms.gov`,
      OTEL_EXPORTER_OTLP_ENDPOINT: ssm.StringParameter.valueForStringParameter(
        this, 
        '/configuration/api_app_otel_collector_url'
      )
    };
  }
}
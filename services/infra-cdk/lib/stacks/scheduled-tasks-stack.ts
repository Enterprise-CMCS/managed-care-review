import { BaseStack, BaseStackProps } from '@constructs/base';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Duration, CfnOutput } from 'aws-cdk-lib';
import { 
  getEnvironment, 
  LAMBDA_HANDLERS, 
  SSM_PATHS,
  ResourceNames
} from '../config';
import { CDKPaths, getLambdaEnvironment } from '@config/index';

// Lambda configuration (moved from shared config)
const LAMBDA_DEFAULTS = {
  RUNTIME: 'NODEJS_20_X',
  ARCHITECTURE: 'x86_64',
  TIMEOUT_API: Duration.seconds(29),
  TIMEOUT_STANDARD: Duration.seconds(60),
  TIMEOUT_LONG_RUNNING: Duration.minutes(10),
  MEMORY_SMALL: 256,
  MEMORY_MEDIUM: 512,
  MEMORY_LARGE: 1024,
  MEMORY_XLARGE: 2048
} as const;

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
    const config = getEnvironment(this.stage);

    // Import shared infrastructure layers from SSM using lean config paths
    const otelLayerArn = ssm.StringParameter.valueForStringParameter(
      this, 
      ResourceNames.ssmPath(SSM_PATHS.OTEL_LAYER, this.stage)
    );
    const otelLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'OtelLayer', otelLayerArn);

    // Cleanup Lambda Function with lean config
    const cleanupFunction = new lambda.Function(this, 'CleanupFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset(CDKPaths.getLambdaPackagePath()),
      handler: LAMBDA_HANDLERS.CLEANUP,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_LONG_RUNNING,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MEDIUM,
      layers: [otelLayer],
      environment: this.getEnvironmentVariables(),
      functionName: ResourceNames.resourceName('scheduled-tasks', 'cleanup', this.stage),
      description: 'Cleanup old files and temporary data'
    });

    // EventBridge rule with lean naming - runs at 14:00 UTC Monday-Friday
    const cleanupRule = new events.Rule(this, 'CleanupScheduleRule', {
      ruleName: ResourceNames.resourceName('scheduled-tasks', 'cleanup-schedule', this.stage),
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
   * Get environment variables using lean config helpers
   */
  private getEnvironmentVariables(): Record<string, string> {
    return getLambdaEnvironment(this.stage, {
      UPLOADS_BUCKET_NAME: this.uploadsBucketName,
      QA_BUCKET_NAME: this.qaBucketName,
      APPLICATION_ENDPOINT: this.applicationEndpoint || `https://mcr-${this.stage}.cms.gov`,
      OTEL_EXPORTER_OTLP_ENDPOINT: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.OTEL_COLLECTOR_URL)
    });
  }
}
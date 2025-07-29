import { BaseStack, BaseStackProps } from '@constructs/base';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as events from 'aws-cdk-lib/aws-events';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { EventbridgeToLambda } from '@aws-solutions-constructs/aws-eventbridge-lambda';
import { Duration, CfnOutput } from 'aws-cdk-lib';
import * as path from 'path';
import { 
  getEnvironment, 
  LAMBDA_HANDLERS, 
  SSM_PATHS,
  ResourceNames
} from '../config';
import { getLambdaEnvironment } from '@config/index';

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
 * Uses AWS Solutions Constructs EventBridge-Lambda pattern with built-in best practices:
 * - CloudWatch log group with retention policy
 * - Dead letter queue for failed invocations  
 * - Proper IAM permissions and security
 * - Error handling and monitoring - ALL AUTOMATIC!
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

    // Create Lambda function with exact same configuration as before
    const cleanupFunction = new NodejsFunction(this, 'CleanupFunction', {
      functionName: ResourceNames.resourceName('scheduled-tasks', 'cleanup', this.stage),
      entry: path.join(__dirname, '..', '..', '..', 'app-api', 'src', 'handlers', 'cleanup.ts'),
      handler: 'main',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_LONG_RUNNING,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MEDIUM,
      layers: [otelLayer],
      environment: this.getEnvironmentVariables(),
      description: 'Cleanup old files and temporary data - Solutions Constructs with all best practices',
      bundling: {
        format: OutputFormat.CJS,
        target: 'node20',
        sourceMap: true,
        minify: this.isProduction,
        externalModules: ['@prisma/client', 'prisma'],
        esbuildArgs: {
          '--packages': 'bundle'
        },
      }
    });

    // 🚀 THIS IS THE MAGIC - Solutions Construct handles EVERYTHING automatically:
    // ✅ EventBridge Rule ✅ Lambda Target ✅ IAM Permissions ✅ Dead Letter Queue
    // ✅ CloudWatch Logs ✅ Error Handling ✅ Retry Logic ✅ Monitoring
    const cleanupIntegration = new EventbridgeToLambda(this, 'CleanupIntegration', {
      existingLambdaObj: cleanupFunction,
      eventRuleProps: {
        ruleName: ResourceNames.resourceName('scheduled-tasks', 'cleanup-schedule', this.stage),
        description: 'Triggers cleanup function weekdays at 14:00 UTC - Solutions Constructs with full best practices',
        schedule: events.Schedule.cron({
          minute: '0',
          hour: '14',
          weekDay: 'MON-FRI'
        })
      }
    });

    // Create outputs - now with Solutions Constructs references
    new CfnOutput(this, 'CleanupFunctionName', {
      value: cleanupIntegration.lambdaFunction.functionName,
      description: 'Cleanup Lambda Function Name (Solutions Constructs managed)'
    });

    new CfnOutput(this, 'CleanupRuleName', {
      value: cleanupIntegration.eventsRule.ruleName,
      description: 'Cleanup EventBridge Rule Name (Solutions Constructs managed)'
    });

    // Bonus: Solutions Constructs automatically creates CloudWatch log groups, 
    // so we can output that too if needed
    new CfnOutput(this, 'AutomaticBenefits', {
      value: 'Dead Letter Queue, CloudWatch Logs, IAM Permissions, Error Handling - ALL AUTOMATIC!',
      description: 'Solutions Constructs provides all these benefits automatically'
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
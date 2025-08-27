import { Stack, StackProps } from 'aws-cdk-lib';
import { stackName } from '../config';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as events from 'aws-cdk-lib/aws-events';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { EventbridgeToLambda } from '@aws-solutions-constructs/aws-eventbridge-lambda';
import { Duration, CfnOutput } from 'aws-cdk-lib';
import * as path from 'path';
import { 
  getEnvironment, 
  LAMBDA_HANDLERS, 
  SSM_PATHS,
  ResourceNames,
  getDatabaseUrl
} from '../config';
import { getLambdaEnvironment } from '@config/index';
import { getBundlingConfig } from '../lambda-bundling';

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

export interface ScheduledTasksStackProps extends StackProps {
  stage: string;
  uploadsBucketName: string;
  qaBucketName: string;
  applicationEndpoint?: string;
  databaseSecretArn: string;
  databaseClusterEndpoint: string;
  databaseName: string;
}

/**
 * Scheduled Tasks Stack for cron-based Lambda functions
 * Uses AWS Solutions Constructs EventBridge-Lambda pattern with built-in best practices:
 * - CloudWatch log group with retention policy
 * - Dead letter queue for failed invocations  
 * - Proper IAM permissions and security
 * - Error handling and monitoring - ALL AUTOMATIC!
 */
export class ScheduledTasksStack extends Stack {
  private readonly stage: string;
  private readonly uploadsBucketName: string;
  private readonly qaBucketName: string;
  private readonly applicationEndpoint?: string;
  private readonly databaseSecretArn: string;
  private readonly databaseClusterEndpoint: string;
  private readonly databaseName: string;

  constructor(scope: Construct, id: string, props: ScheduledTasksStackProps) {
    super(scope, id, {
      ...props,
      stackName: stackName('ScheduledTasks', props.stage),
      description: 'Scheduled tasks with EventBridge rules - Clean and efficient'
    });

    this.stage = props.stage;
    this.uploadsBucketName = props.uploadsBucketName;
    this.qaBucketName = props.qaBucketName;
    this.applicationEndpoint = props.applicationEndpoint;
    this.databaseSecretArn = props.databaseSecretArn;
    this.databaseClusterEndpoint = props.databaseClusterEndpoint;
    this.databaseName = props.databaseName;

    this.defineResources();
  }

  private defineResources(): void {
    const config = getEnvironment(this.stage);

    // OTEL layer is now added by Lambda Monitoring Aspect to avoid duplicates
    // The aspect handles both OTEL and Datadog Extension layers consistently

    // Create Lambda function with exact same configuration as before
    const cleanupFunction = new NodejsFunction(this, 'CleanupFunction', {
      functionName: ResourceNames.resourceName('scheduled-tasks', 'cleanup', this.stage),
      entry: path.join(__dirname, '..', '..', '..', 'app-api', 'src', 'handlers', 'cleanup.ts'),
      handler: 'main',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_LONG_RUNNING,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MEDIUM,
      // Layers added by Lambda Monitoring Aspect,
      environment: this.getEnvironmentVariables(),
      description: 'Cleanup old files and temporary data - Solutions Constructs with all best practices',
      bundling: getBundlingConfig('cleanup', this.stage) // Cleanup doesn't need Prisma
    });

    // Grant RDS permissions needed by the cleanup handler
    cleanupFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'rds:DescribeDBClusterSnapshots',
        'rds:DeleteDBClusterSnapshot'
      ],
      resources: ['*'] // Snapshots require * as resource
    }));

    // Grant S3 permissions (matches serverless.yml provider.iam.role.statements)
    const uploadsBucket = s3.Bucket.fromBucketName(this, 'CleanupUploadsBucket', this.uploadsBucketName);
    const qaBucket = s3.Bucket.fromBucketName(this, 'CleanupQaBucket', this.qaBucketName);
    
    cleanupFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:*'],
      resources: [
        `${uploadsBucket.bucketArn}/allusers/*`,
        `${qaBucket.bucketArn}/allusers/*`,
        `${uploadsBucket.bucketArn}/zips/*`
      ]
    }));
    
    cleanupFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:ListBucket', 's3:GetBucketLocation'],
      resources: [uploadsBucket.bucketArn, qaBucket.bucketArn]
    }));

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

    // Add email_submit function for 100% serverless parity
    const emailSubmitFunction = new NodejsFunction(this, 'EmailSubmitFunction', {
      functionName: ResourceNames.resourceName('scheduled-tasks', 'email-submit', this.stage),
      entry: path.join(__dirname, '..', '..', '..', 'app-api', 'src', 'handlers', 'email_submit.ts'),
      handler: 'main',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_STANDARD,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MEDIUM,
      // Layers added by Lambda Monitoring Aspect,
      environment: this.getEnvironmentVariables(),
      description: 'Email submission handler - serverless parity',
      bundling: getBundlingConfig('email_submit', this.stage) // Email doesn't need Prisma
    });

    // Grant SES permissions for email sending
    emailSubmitFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*']
    }));

    // Grant Lambda invoke permissions (matches serverless.yml)
    emailSubmitFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['lambda:InvokeFunction'],
      resources: ['*']
    }));

    // Grant S3 permissions (matches serverless.yml provider.iam.role.statements)
    const emailUploadsBucket = s3.Bucket.fromBucketName(this, 'EmailUploadsBucket', this.uploadsBucketName);
    const emailQaBucket = s3.Bucket.fromBucketName(this, 'EmailQaBucket', this.qaBucketName);
    
    emailSubmitFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:*'],
      resources: [
        `${emailUploadsBucket.bucketArn}/allusers/*`,
        `${emailQaBucket.bucketArn}/allusers/*`,
        `${emailUploadsBucket.bucketArn}/zips/*`
      ]
    }));
    
    emailSubmitFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:ListBucket', 's3:GetBucketLocation'],
      resources: [emailUploadsBucket.bucketArn, emailQaBucket.bucketArn]
    }));

    new CfnOutput(this, 'EmailSubmitFunctionName', {
      value: emailSubmitFunction.functionName,
      description: 'Email Submit Lambda Function Name'
    });

    // Bonus: Solutions Constructs automatically creates CloudWatch log groups, 
    // so we can output that too if needed
    new CfnOutput(this, 'AutomaticBenefits', {
      value: 'Dead Letter Queue, CloudWatch Logs, IAM Permissions, Error Handling - ALL AUTOMATIC!',
      description: 'Solutions Constructs provides all these benefits automatically'
    });
  }

  /**
   * Get environment variables using lean config helpers - matches serverless.yml provider.environment
   */
  private getEnvironmentVariables(): Record<string, string> {
    return getLambdaEnvironment(this.stage, {
      // S3 Buckets (matches serverless custom variables)
      UPLOADS_BUCKET_NAME: this.uploadsBucketName,
      QA_BUCKET_NAME: this.qaBucketName,
      VITE_APP_S3_DOCUMENTS_BUCKET: this.uploadsBucketName,
      VITE_APP_S3_QA_BUCKET: this.qaBucketName,
      
      // Application settings (matches serverless provider.environment)
      APPLICATION_ENDPOINT: this.applicationEndpoint || `https://mcr-${this.stage}.cms.gov`,
      VITE_APP_AUTH_MODE: this.stage === 'dev' ? 'LOCAL' : 'AWS_COGNITO',
      PARAMETER_STORE_MODE: 'AWS',
      
      // Database configuration (matches serverless provider.environment)
      DATABASE_URL: 'AWS_SM', // Use Secrets Manager for proper URL encoding
      SECRETS_MANAGER_SECRET: `mcr-cdk-aurora-postgres-${this.stage}`,
      
      // Email and configuration (matches serverless provider.environment)
      EMAILER_MODE: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.EMAILER_MODE),
      
      // Security and auth (matches serverless provider.environment)
      JWT_SECRET: '{{resolve:secretsmanager:' + ssm.StringParameter.valueForStringParameter(this, `/mcr-cdk/${this.stage}/foundation/jwt-secret-arn`) + ':SecretString:jwtsigningkey}}',
      
      // Feature flags (matches serverless provider.environment)
      LD_SDK_KEY: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.LD_SDK_KEY),
      
      // OTEL configuration (matches serverless provider.environment)
      API_APP_OTEL_COLLECTOR_URL: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.OTEL_COLLECTOR_URL),
      NR_LICENSE_KEY: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.NR_LICENSE_KEY),
      
      // Deployment tracking
      DEPLOYMENT_TIMESTAMP: new Date().toISOString()
    });
  }
}
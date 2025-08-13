import { Stack, StackProps } from 'aws-cdk-lib';
import { stackName } from '../config';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as ssm from 'aws-cdk-lib/aws-ssm';
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
  TIMEOUT_EXTENDED: Duration.minutes(5),
  MEMORY_SMALL: 256,
  MEMORY_MEDIUM: 512,
  MEMORY_LARGE: 1024,
  MEMORY_XLARGE: 2048
} as const;

export interface FileOpsStackProps extends StackProps {
  stage: string;
  uploadsBucketName: string;
  qaBucketName: string;
  applicationEndpoint?: string;
  databaseSecretArn: string;
  databaseClusterEndpoint: string;
  databaseName: string;
}

/**
 * File Operations Stack for S3-triggered Lambda functions
 * Uses aws-s3-lambda Solutions Constructs for automatic S3 event integration
 * Provides 100% Serverless Framework parity with event-driven architecture
 */
export class FileOpsStack extends Stack {
  private readonly stage: string;
  private readonly uploadsBucketName: string;
  private readonly qaBucketName: string;
  private readonly applicationEndpoint?: string;
  private readonly databaseSecretArn: string;
  private readonly databaseClusterEndpoint: string;
  private readonly databaseName: string;

  constructor(scope: Construct, id: string, props: FileOpsStackProps) {
    super(scope, id, {
      ...props,
      stackName: stackName('FileOps', props.stage),
      description: 'File operations with S3 event triggers - Uses aws-s3-lambda Solutions Constructs'
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

    // Import existing S3 buckets (created by DataStack)
    const uploadsBucket = s3.Bucket.fromBucketName(this, 'UploadsBucket', this.uploadsBucketName);
    const qaBucket = s3.Bucket.fromBucketName(this, 'QaBucket', this.qaBucketName);

    // Import shared infrastructure layers from SSM
    const otelLayerArn = ssm.StringParameter.valueForStringParameter(
      this, 
      ResourceNames.ssmPath(SSM_PATHS.OTEL_LAYER, this.stage)
    );
    const otelLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'OtelLayer', otelLayerArn);

    // ZIP Keys function using CDK NodejsFunction for S3 integration
    const zipKeysFunction = new NodejsFunction(this, 'ZipKeysFunction', {
      functionName: ResourceNames.resourceName('file-ops', 'zip-keys', this.stage),
      entry: path.join(__dirname, '..', '..', '..', 'app-api', 'src', 'handlers', 'bulk_download.ts'),
      handler: 'main',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_EXTENDED,
      memorySize: config.lambda.memorySize,
      layers: [otelLayer], // Zip operations don't need Prisma
      environment: this.getEnvironmentVariables(),
      description: 'Process file compression and S3 operations - v2',
      bundling: getBundlingConfig('zip_keys', this.stage) // Correct function name
    });

    // Grant S3 permissions for ZIP Keys function (needed for creating/managing zip files)
    uploadsBucket.grantReadWrite(zipKeysFunction);
    // Note: This function is invoked via API Gateway POST /zip endpoint (defined in GraphQLApiStack)
    // It requires S3 access to create and manage zip files, but NOT S3 event triggers

    // Audit Files function using CDK NodejsFunction for S3 integration
    const auditFilesFunction = new NodejsFunction(this, 'AuditFilesFunction', {
      functionName: ResourceNames.resourceName('file-ops', 'audit-files', this.stage),
      entry: path.join(__dirname, '..', '..', '..', 'app-api', 'src', 'handlers', 'audit_s3.ts'),
      handler: 'main',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_EXTENDED,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MEDIUM,
      layers: [otelLayer], // Prisma bundled directly into function
      environment: {
        ...this.getEnvironmentVariables(),
        DATABASE_ENGINE: 'postgres',
        PRISMA_QUERY_ENGINE_LIBRARY: './node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node'
      },
      description: 'Audit files for compliance and security - v2',
      bundling: getBundlingConfig('auditFiles', this.stage) // Use serverless-compatible function name
    });

    // Grant S3 permissions and add event notifications for Audit Files function (Serverless parity)
    qaBucket.grantReadWrite(auditFilesFunction);
    qaBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(auditFilesFunction),
      { prefix: 'qa-uploads/' } // Trigger for all files in qa-uploads/
    );
    qaBucket.addEventNotification(
      s3.EventType.OBJECT_REMOVED,
      new s3n.LambdaDestination(auditFilesFunction),
      { prefix: 'qa-uploads/' } // Also trigger on file deletion
    );

    // Create outputs
    new CfnOutput(this, 'ZipKeysFunctionName', {
      value: zipKeysFunction.functionName,
      description: 'ZIP Keys Lambda Function Name'
    });

    new CfnOutput(this, 'AuditFilesFunctionName', {
      value: auditFilesFunction.functionName,
      description: 'Audit Files Lambda Function Name'
    });

    new CfnOutput(this, 'ZipKeysFunctionArn', {
      value: zipKeysFunction.functionArn,
      description: 'ZIP Keys Lambda Function ARN'
    });

    new CfnOutput(this, 'AuditFilesFunctionArn', {
      value: auditFilesFunction.functionArn,
      description: 'Audit Files Lambda Function ARN'
    });
  }

  /**
   * Get environment variables using lean config helpers
   */
  private getEnvironmentVariables(): Record<string, string> {
    return getLambdaEnvironment(this.stage, {
      UPLOADS_BUCKET_NAME: this.uploadsBucketName,
      QA_BUCKET_NAME: this.qaBucketName,
      VITE_APP_S3_DOCUMENTS_BUCKET: this.uploadsBucketName,
      VITE_APP_S3_QA_BUCKET: this.qaBucketName,
      APPLICATION_ENDPOINT: this.applicationEndpoint || `https://mcr-${this.stage}.cms.gov`,
      OTEL_EXPORTER_OTLP_ENDPOINT: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.OTEL_COLLECTOR_URL),
      API_APP_OTEL_COLLECTOR_URL: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.OTEL_COLLECTOR_URL),
      NR_LICENSE_KEY: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.NR_LICENSE_KEY),
      EMAILER_MODE: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.EMAILER_MODE),
      DATABASE_URL: 'AWS_SM', // Use Secrets Manager for proper URL encoding
      SECRETS_MANAGER_SECRET: `mcr-cdk-aurora-postgres-${this.stage}`,
      JWT_SECRET: '{{resolve:secretsmanager:' + ssm.StringParameter.valueForStringParameter(this, `/mcr-cdk/${this.stage}/foundation/jwt-secret-arn`) + ':SecretString:jwtsigningkey}}',
      DEPLOYMENT_TIMESTAMP: new Date().toISOString(), // Forces Lambda updates
      LD_SDK_KEY: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.LD_SDK_KEY)
    });
  }
}
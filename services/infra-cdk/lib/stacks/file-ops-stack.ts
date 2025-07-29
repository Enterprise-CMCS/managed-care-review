import { BaseStack, BaseStackProps } from '@constructs/base';
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
  ResourceNames
} from '../config';
import { getLambdaEnvironment } from '@config/index';

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

export interface FileOpsStackProps extends BaseStackProps {
  uploadsBucketName: string;
  qaBucketName: string;
  applicationEndpoint?: string;
}

/**
 * File Operations Stack for S3-triggered Lambda functions
 * Uses aws-s3-lambda Solutions Constructs for automatic S3 event integration
 * Provides 100% Serverless Framework parity with event-driven architecture
 */
export class FileOpsStack extends BaseStack {
  private readonly uploadsBucketName: string;
  private readonly qaBucketName: string;
  private readonly applicationEndpoint?: string;

  constructor(scope: Construct, id: string, props: FileOpsStackProps) {
    super(scope, id, {
      ...props,
      description: 'File operations with S3 event triggers - Uses aws-s3-lambda Solutions Constructs'
    });

    this.uploadsBucketName = props.uploadsBucketName;
    this.qaBucketName = props.qaBucketName;
    this.applicationEndpoint = props.applicationEndpoint;

    this.defineResources();
  }

  protected defineResources(): void {
    const config = getEnvironment(this.stage);

    // Import existing S3 buckets (created by DataStack)
    const uploadsBucket = s3.Bucket.fromBucketName(this, 'UploadsBucket', this.uploadsBucketName);
    const qaBucket = s3.Bucket.fromBucketName(this, 'QaBucket', this.qaBucketName);

    // Import shared infrastructure layers from SSM using lean config paths
    const otelLayerArn = ssm.StringParameter.valueForStringParameter(
      this, 
      ResourceNames.ssmPath(SSM_PATHS.OTEL_LAYER, this.stage)
    );
    const otelLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'OtelLayer', otelLayerArn);

    const prismaEngineLayerArn = ssm.StringParameter.valueForStringParameter(
      this, 
      ResourceNames.ssmPath(SSM_PATHS.PRISMA_ENGINE_LAYER, this.stage)
    );
    const prismaEngineLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'PrismaEngineLayer', prismaEngineLayerArn);

    // ZIP Keys function using CDK NodejsFunction for S3 integration
    const zipKeysFunction = new NodejsFunction(this, 'ZipKeysFunction', {
      functionName: ResourceNames.resourceName('file-ops', 'zip-keys', this.stage),
      entry: path.join(__dirname, '..', '..', '..', 'app-api', 'src', 'handlers', 'bulk_download.ts'),
      handler: 'main',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_EXTENDED,
      memorySize: config.lambda.memorySize,
      layers: [otelLayer],
      environment: this.getEnvironmentVariables(),
      description: 'Process file compression and S3 operations',
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

    // Grant S3 permissions and add event notifications for ZIP Keys function (Serverless parity)
    uploadsBucket.grantReadWrite(zipKeysFunction);
    uploadsBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(zipKeysFunction),
      { prefix: 'uploads/', suffix: '.zip' } // Only trigger for ZIP files in uploads/
    );

    // Audit Files function using CDK NodejsFunction for S3 integration
    const auditFilesFunction = new NodejsFunction(this, 'AuditFilesFunction', {
      functionName: ResourceNames.resourceName('file-ops', 'audit-files', this.stage),
      entry: path.join(__dirname, '..', '..', '..', 'app-api', 'src', 'handlers', 'audit_s3.ts'),
      handler: 'main',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_EXTENDED,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MEDIUM,
      layers: [otelLayer, prismaEngineLayer],
      environment: this.getEnvironmentVariables(),
      description: 'Audit files for compliance and security',
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
      APPLICATION_ENDPOINT: this.applicationEndpoint || `https://mcr-${this.stage}.cms.gov`,
      OTEL_EXPORTER_OTLP_ENDPOINT: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.OTEL_COLLECTOR_URL),
      EMAILER_MODE: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.EMAILER_MODE)
    });
  }
}
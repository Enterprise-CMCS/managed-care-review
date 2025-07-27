import { BaseStack, BaseStackProps } from '@constructs/base';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { S3ToLambda } from '@aws-solutions-constructs/aws-s3-lambda';
import { Duration, CfnOutput } from 'aws-cdk-lib';
import { CDKPaths } from '../config/paths';

export interface FileOpsStackProps extends BaseStackProps {
  uploadsBucketName: string;
  qaBucketName: string;
  applicationEndpoint?: string;
}

/**
 * File Operations Stack for S3-triggered Lambda functions
 * Uses Solutions Constructs to eliminate 120+ lines of manual S3 permissions
 */
export class FileOpsStack extends BaseStack {
  private readonly uploadsBucketName: string;
  private readonly qaBucketName: string;
  private readonly applicationEndpoint?: string;

  constructor(scope: Construct, id: string, props: FileOpsStackProps) {
    super(scope, id, {
      ...props,
      description: 'File operations with S3 integration - Uses Solutions Constructs'
    });

    this.uploadsBucketName = props.uploadsBucketName;
    this.qaBucketName = props.qaBucketName;
    this.applicationEndpoint = props.applicationEndpoint;

    this.defineResources();
  }

  protected defineResources(): void {
    // Import existing S3 buckets (created by DataStack)
    const uploadsBucket = s3.Bucket.fromBucketName(this, 'UploadsBucket', this.uploadsBucketName);
    const qaBucket = s3.Bucket.fromBucketName(this, 'QaBucket', this.qaBucketName);

    // Import shared infrastructure layers from SSM
    const otelLayerArn = ssm.StringParameter.valueForStringParameter(
      this, 
      `/lambda/${this.stage}/otel-layer-arn`
    );
    const otelLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'OtelLayer', otelLayerArn);

    const prismaEngineLayerArn = ssm.StringParameter.valueForStringParameter(
      this, 
      `/lambda/${this.stage}/prisma-engine-layer-arn`
    );
    const prismaEngineLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'PrismaEngineLayer', prismaEngineLayerArn);

    // ZIP Keys function - ultra-clean with pre-built Lambda package
    const zipKeysFunction = new lambda.Function(this, 'ZipKeysFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset(CDKPaths.getLambdaPackagePath()),
      handler: 'handlers/zip_keys.main',
      timeout: Duration.minutes(5),
      memorySize: 1024,
      layers: [otelLayer],
      environment: this.getEnvironmentVariables(),
      functionName: `mcr-${this.stage}-zip-keys`,
      description: 'Process file compression and S3 operations'
    });
    
    // Grant S3 permissions to ZIP Keys function
    uploadsBucket.grantReadWrite(zipKeysFunction);

    // Audit Files function - ultra-clean with pre-built Lambda package
    const auditFilesFunction = new lambda.Function(this, 'AuditFilesFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset(CDKPaths.getLambdaPackagePath()),
      handler: 'handlers/audit_files.main',
      timeout: Duration.minutes(3),
      memorySize: 512,
      layers: [otelLayer, prismaEngineLayer],
      environment: this.getEnvironmentVariables(),
      functionName: `mcr-${this.stage}-audit-files`,
      description: 'Audit files for compliance and security'
    });
    
    // Grant S3 permissions to Audit Files function
    qaBucket.grantReadWrite(auditFilesFunction);

    // Create outputs
    new CfnOutput(this, 'ZipKeysFunctionName', {
      value: zipKeysFunction.functionName,
      description: 'ZIP Keys Lambda Function Name'
    });

    new CfnOutput(this, 'AuditFilesFunctionName', {
      value: auditFilesFunction.functionName,
      description: 'Audit Files Lambda Function Name'
    });
  }

  /**
   * Get environment variables for file operations functions
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
      ),
      EMAILER_MODE: ssm.StringParameter.valueForStringParameter(
        this, 
        '/configuration/emailer_mode'
      )
    };
  }
}
import { BaseStack, BaseStackProps } from '@constructs/base';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { S3ToLambda } from '@aws-solutions-constructs/aws-s3-lambda';
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

    // ZIP Keys function with lean config
    const zipKeysFunction = new lambda.Function(this, 'ZipKeysFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset(CDKPaths.getLambdaPackagePath()),
      handler: LAMBDA_HANDLERS.ZIP_KEYS,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_EXTENDED,
      memorySize: config.lambda.memorySize,
      layers: [otelLayer],
      environment: this.getEnvironmentVariables(),
      functionName: ResourceNames.resourceName('file-ops', 'zip-keys', this.stage),
      description: 'Process file compression and S3 operations'
    });
    
    // Grant S3 permissions to ZIP Keys function
    uploadsBucket.grantReadWrite(zipKeysFunction);

    // Audit Files function with lean config
    const auditFilesFunction = new lambda.Function(this, 'AuditFilesFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset(CDKPaths.getLambdaPackagePath()),
      handler: LAMBDA_HANDLERS.AUDIT_FILES,
      timeout: LAMBDA_DEFAULTS.TIMEOUT_EXTENDED,
      memorySize: LAMBDA_DEFAULTS.MEMORY_MEDIUM,
      layers: [otelLayer, prismaEngineLayer],
      environment: this.getEnvironmentVariables(),
      functionName: ResourceNames.resourceName('file-ops', 'audit-files', this.stage),
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
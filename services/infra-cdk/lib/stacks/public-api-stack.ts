import { BaseStack, BaseStackProps } from '@constructs/base';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { ApiGatewayToLambda } from '@aws-solutions-constructs/aws-apigateway-lambda';
import { Duration, CfnOutput } from 'aws-cdk-lib';
import { 
  getEnvironment, 
  LAMBDA_HANDLERS, 
  SSM_PATHS,
  ResourceNames,
  getDatabaseUrl
} from '../config';
import { CDKPaths, getLambdaEnvironment } from '@config/index';

// Lambda configuration (moved from shared config)
const LAMBDA_DEFAULTS = {
  RUNTIME: 'NODEJS_20_X',
  ARCHITECTURE: 'x86_64',
  TIMEOUT_API: Duration.seconds(29),
  TIMEOUT_STANDARD: Duration.seconds(60),
  MEMORY_SMALL: 256,
  MEMORY_MEDIUM: 512,
  MEMORY_LARGE: 1024,
  MEMORY_XLARGE: 2048
} as const;

export interface PublicApiStackProps extends BaseStackProps {
  vpc: ec2.IVpc;
  lambdaSecurityGroup: ec2.ISecurityGroup;
  databaseSecretArn: string;
  databaseClusterEndpoint: string;
  databaseName: string;
  applicationEndpoint?: string;
}

/**
 * Public API Stack for Health, OAuth, and OTEL endpoints
 * Each endpoint is isolated using separate Solutions Constructs
 */
export class PublicApiStack extends BaseStack {
  public healthApiUrl: string;
  public oauthApiUrl: string;
  public otelApiUrl: string;
  
  private readonly vpc: ec2.IVpc;
  private readonly lambdaSecurityGroup: ec2.ISecurityGroup;
  private readonly databaseSecretArn: string;
  private readonly databaseClusterEndpoint: string;
  private readonly databaseName: string;
  private readonly applicationEndpoint?: string;

  constructor(scope: Construct, id: string, props: PublicApiStackProps) {
    super(scope, id, {
      ...props,
      description: 'Public APIs for Health, OAuth, and OTEL endpoints - Uses Solutions Constructs'
    });

    this.vpc = props.vpc;
    this.lambdaSecurityGroup = props.lambdaSecurityGroup;
    this.databaseSecretArn = props.databaseSecretArn;
    this.databaseClusterEndpoint = props.databaseClusterEndpoint;
    this.databaseName = props.databaseName;
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

    const prismaEngineLayerArn = ssm.StringParameter.valueForStringParameter(
      this, 
      ResourceNames.ssmPath(SSM_PATHS.PRISMA_ENGINE_LAYER, this.stage)
    );
    const prismaEngineLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'PrismaEngineLayer', prismaEngineLayerArn);

    // Health Check API with lean config
    const healthApi = new ApiGatewayToLambda(this, 'HealthApi', {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(CDKPaths.getLambdaPackagePath()),
        handler: LAMBDA_HANDLERS.HEALTH_CHECK,
        timeout: LAMBDA_DEFAULTS.TIMEOUT_API,
        memorySize: LAMBDA_DEFAULTS.MEMORY_SMALL,
        layers: [otelLayer],
        environment: this.getBaseEnvironmentVariables()
      },
      apiGatewayProps: {
        restApiName: ResourceNames.apiName('health-api', this.stage),
        description: `Health Check API for Managed Care Review - ${this.stage}`
      }
    });
    this.healthApiUrl = healthApi.apiGateway.url;

    // OAuth Token API with lean config
    const oauthApi = new ApiGatewayToLambda(this, 'OAuthApi', {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(CDKPaths.getLambdaPackagePath()),
        handler: LAMBDA_HANDLERS.OAUTH_TOKEN,
        timeout: config.lambda.timeout,
        memorySize: LAMBDA_DEFAULTS.MEMORY_MEDIUM,
        layers: [otelLayer, prismaEngineLayer],
        vpc: this.vpc,
        securityGroups: [this.lambdaSecurityGroup],
        environment: this.getDatabaseEnvironmentVariables()
      },
      apiGatewayProps: {
        restApiName: ResourceNames.apiName('oauth-api', this.stage),
        description: `OAuth Token API for Managed Care Review - ${this.stage}`
      }
    });
    this.oauthApiUrl = oauthApi.apiGateway.url;

    // OTEL Proxy API with lean config
    const otelApi = new ApiGatewayToLambda(this, 'OtelApi', {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(CDKPaths.getLambdaPackagePath()),
        handler: LAMBDA_HANDLERS.OTEL_PROXY,
        timeout: LAMBDA_DEFAULTS.TIMEOUT_STANDARD,
        memorySize: LAMBDA_DEFAULTS.MEMORY_SMALL,
        layers: [otelLayer],
        environment: this.getBaseEnvironmentVariables()
      },
      apiGatewayProps: {
        restApiName: ResourceNames.apiName('otel-api', this.stage),
        description: `OTEL Proxy API for Managed Care Review - ${this.stage}`
      }
    });
    this.otelApiUrl = otelApi.apiGateway.url;

    // Create outputs
    this.createOutputs();
  }

  /**
   * Get base environment variables using lean config helpers
   */
  private getBaseEnvironmentVariables(): Record<string, string> {
    return getLambdaEnvironment(this.stage, {
      APPLICATION_ENDPOINT: this.applicationEndpoint || `https://mcr-${this.stage}.cms.gov`,
      OTEL_EXPORTER_OTLP_ENDPOINT: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.OTEL_COLLECTOR_URL)
    });
  }

  /**
   * Get environment variables for functions that need database access
   */
  private getDatabaseEnvironmentVariables(): Record<string, string> {
    return getLambdaEnvironment(this.stage, {
      APPLICATION_ENDPOINT: this.applicationEndpoint || `https://mcr-${this.stage}.cms.gov`,
      DATABASE_URL: getDatabaseUrl(this.databaseSecretArn, this.databaseClusterEndpoint, this.databaseName),
      OTEL_EXPORTER_OTLP_ENDPOINT: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.OTEL_COLLECTOR_URL),
      LD_SDK_KEY: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.LD_SDK_KEY)
    });
  }

  /**
   * Create stack outputs
   */
  private createOutputs(): void {
    new CfnOutput(this, 'HealthApiUrl', {
      value: this.healthApiUrl,
      description: 'Health Check API Gateway URL'
    });

    new CfnOutput(this, 'OAuthApiUrl', {
      value: this.oauthApiUrl,
      description: 'OAuth Token API Gateway URL'
    });

    new CfnOutput(this, 'OtelApiUrl', {
      value: this.otelApiUrl,
      description: 'OTEL Proxy API Gateway URL'
    });
  }
}
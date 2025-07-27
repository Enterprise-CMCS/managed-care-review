import { BaseStack, BaseStackProps } from '@constructs/base';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { ApiGatewayToLambda } from '@aws-solutions-constructs/aws-apigateway-lambda';
import { Duration, CfnOutput } from 'aws-cdk-lib';
import { CDKPaths } from '../config/paths';

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

    // Health Check API - ultra-clean with pre-built Lambda package
    const healthApi = new ApiGatewayToLambda(this, 'HealthApi', {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(CDKPaths.getLambdaPackagePath()),
        handler: 'handlers/health_check.main',
        timeout: Duration.seconds(10),
        memorySize: 256,
        layers: [otelLayer],
        environment: this.getBaseEnvironmentVariables()
      },
      apiGatewayProps: {
        restApiName: `mcr-${this.stage}-health-api`,
        description: `Health Check API for Managed Care Review - ${this.stage}`
      }
    });
    this.healthApiUrl = healthApi.apiGateway.url;

    // OAuth Token API - ultra-clean with pre-built Lambda package
    const oauthApi = new ApiGatewayToLambda(this, 'OAuthApi', {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(CDKPaths.getLambdaPackagePath()),
        handler: 'handlers/oauth_token.main',
        timeout: Duration.seconds(30),
        memorySize: 512,
        layers: [otelLayer, prismaEngineLayer],
        vpc: this.vpc,
        securityGroups: [this.lambdaSecurityGroup],
        environment: this.getDatabaseEnvironmentVariables()
      },
      apiGatewayProps: {
        restApiName: `mcr-${this.stage}-oauth-api`,
        description: `OAuth Token API for Managed Care Review - ${this.stage}`
      }
    });
    this.oauthApiUrl = oauthApi.apiGateway.url;

    // OTEL Proxy API - ultra-clean with pre-built Lambda package
    const otelApi = new ApiGatewayToLambda(this, 'OtelApi', {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(CDKPaths.getLambdaPackagePath()),
        handler: 'handlers/otel_proxy.main',
        timeout: Duration.seconds(15),
        memorySize: 256,
        layers: [otelLayer],
        environment: this.getBaseEnvironmentVariables()
      },
      apiGatewayProps: {
        restApiName: `mcr-${this.stage}-otel-api`,
        description: `OTEL Proxy API for Managed Care Review - ${this.stage}`
      }
    });
    this.otelApiUrl = otelApi.apiGateway.url;

    // Create outputs
    this.createOutputs();
  }

  /**
   * Get base environment variables for all functions
   */
  private getBaseEnvironmentVariables(): Record<string, string> {
    return {
      NODE_ENV: this.stage === 'prod' ? 'production' : 'development',
      STAGE: this.stage,
      APPLICATION_ENDPOINT: this.applicationEndpoint || `https://mcr-${this.stage}.cms.gov`,
      OTEL_EXPORTER_OTLP_ENDPOINT: ssm.StringParameter.valueForStringParameter(
        this, 
        '/configuration/api_app_otel_collector_url'
      )
    };
  }

  /**
   * Get environment variables for functions that need database access
   */
  private getDatabaseEnvironmentVariables(): Record<string, string> {
    // Construct PostgreSQL connection URL from individual secret components
    const databaseUrl = `postgresql://{{resolve:secretsmanager:${this.databaseSecretArn}:SecretString:username}}:{{resolve:secretsmanager:${this.databaseSecretArn}:SecretString:password}}@${this.databaseClusterEndpoint}:5432/${this.databaseName}`;
    
    return {
      ...this.getBaseEnvironmentVariables(),
      DATABASE_URL: databaseUrl,
      LD_SDK_KEY: ssm.StringParameter.valueForStringParameter(
        this, 
        '/configuration/ld_sdk_key_feds'
      )
    };
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
import { BaseStack, BaseStackProps } from '@constructs/base';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { CognitoToApiGatewayToLambda } from '@aws-solutions-constructs/aws-cognito-apigateway-lambda';
import { Duration, CfnOutput } from 'aws-cdk-lib';
import { PrismaLayerType } from '@constructs/lambda/bundling-utils';
import { CDKPaths } from '../config/paths';

export interface GraphQLApiStackProps extends BaseStackProps {
  vpc: ec2.IVpc;
  lambdaSecurityGroup: ec2.ISecurityGroup;
  databaseSecretArn: string;
  databaseClusterEndpoint: string;
  databaseName: string;
  uploadsBucketName: string;
  qaBucketName: string;
  applicationEndpoint?: string;
}

/**
 * GraphQL API Stack using AWS Solutions Constructs
 * Replaces 200+ lines of manual API Gateway + Cognito + Lambda configuration
 */
export class GraphQLApiStack extends BaseStack {
  public apiUrl: string;
  private readonly vpc: ec2.IVpc;
  private readonly lambdaSecurityGroup: ec2.ISecurityGroup;
  private readonly databaseSecretArn: string;
  private readonly databaseClusterEndpoint: string;
  private readonly databaseName: string;
  private readonly uploadsBucketName: string;
  private readonly qaBucketName: string;
  private readonly applicationEndpoint?: string;

  constructor(scope: Construct, id: string, props: GraphQLApiStackProps) {
    super(scope, id, {
      ...props,
      description: 'GraphQL API with Cognito authentication - Uses Solutions Constructs'
    });

    this.vpc = props.vpc;
    this.lambdaSecurityGroup = props.lambdaSecurityGroup;
    this.databaseSecretArn = props.databaseSecretArn;
    this.databaseClusterEndpoint = props.databaseClusterEndpoint;
    this.databaseName = props.databaseName;
    this.uploadsBucketName = props.uploadsBucketName;
    this.qaBucketName = props.qaBucketName;
    this.applicationEndpoint = props.applicationEndpoint;

    this.defineResources();
  }

  protected defineResources(): void {
    // TODO: Import User Pool from SSM parameters (created by AuthStack)
    // For now, let the Solutions Construct create its own User Pool
    // const userPoolId = ssm.StringParameter.valueForStringParameter(
    //   this, 
    //   `/cognito/${this.stage}/user-pool-id`
    // );
    // const userPool = cognito.UserPool.fromUserPoolId(this, 'ImportedUserPool', userPoolId);

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

    // Create GraphQL API using Solutions Construct - ultra-clean with pre-built Lambda package
    const graphqlApi = new CognitoToApiGatewayToLambda(this, 'GraphQLApi', {
      lambdaFunctionProps: {
        runtime: lambda.Runtime.NODEJS_20_X,
        code: lambda.Code.fromAsset(CDKPaths.getLambdaPackagePath()),
        handler: 'handlers/apollo_gql.gqlHandler',
        timeout: Duration.seconds(30),
        memorySize: 1024,
        layers: [otelLayer, prismaEngineLayer],
        vpc: this.vpc,
        securityGroups: [this.lambdaSecurityGroup],
        environment: this.getEnvironmentVariables()
      },
      // Note: For now, let the construct create its own User Pool
      // Will integrate with existing User Pool in next iteration
      apiGatewayProps: {
        restApiName: `mcr-${this.stage}-graphql-api`,
        description: `GraphQL API for Managed Care Review - ${this.stage}`,
        defaultCorsPreflightOptions: {
          allowOrigins: ['*'],
          allowMethods: ['GET', 'POST', 'OPTIONS'],
          allowHeaders: ['Content-Type', 'Authorization']
        }
      }
    });

    // Store API URL
    this.apiUrl = graphqlApi.apiGateway.url;

    // Create outputs
    new CfnOutput(this, 'GraphQLApiUrl', {
      value: this.apiUrl,
      description: 'GraphQL API Gateway URL'
    });

    new CfnOutput(this, 'GraphQLApiId', {
      value: graphqlApi.apiGateway.restApiId,
      description: 'GraphQL API Gateway ID'
    });
  }

  /**
   * Get environment variables for GraphQL Lambda function
   * Replaces complex EnvironmentFactory pattern
   */
  private getEnvironmentVariables(): Record<string, string> {
    // Construct PostgreSQL connection URL from individual secret components
    const databaseUrl = `postgresql://{{resolve:secretsmanager:${this.databaseSecretArn}:SecretString:username}}:{{resolve:secretsmanager:${this.databaseSecretArn}:SecretString:password}}@${this.databaseClusterEndpoint}:5432/${this.databaseName}`;
    
    return {
      NODE_ENV: this.stage === 'prod' ? 'production' : 'development',
      STAGE: this.stage,
      DATABASE_URL: databaseUrl,
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
      ),
      LD_SDK_KEY: ssm.StringParameter.valueForStringParameter(
        this, 
        '/configuration/ld_sdk_key_feds'
      )
    };
  }
}
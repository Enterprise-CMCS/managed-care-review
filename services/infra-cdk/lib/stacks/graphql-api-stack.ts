import { BaseStack, BaseStackProps } from '@constructs/base';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { CognitoToApiGatewayToLambda } from '@aws-solutions-constructs/aws-cognito-apigateway-lambda';
import { Duration, CfnOutput } from 'aws-cdk-lib';
import * as path from 'path';
import { 
  getEnvironment, 
  SSM_PATHS,
  ResourceNames,
  getDatabaseUrl
} from '../config';
import { getLambdaEnvironment } from '@config/index';
// TODO: Re-implement getBundlingConfig when needed
// import { getBundlingConfig } from '@constructs/lambda/bundling-utils';

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

    // Create GraphQL Lambda using CDK NodejsFunction
    const graphqlFunction = new NodejsFunction(this, 'GraphQLFunction', {
      functionName: ResourceNames.resourceName(this.serviceName, 'graphql', this.stage),
      entry: path.join(__dirname, '..', '..', '..', 'app-api', 'src', 'handlers', 'apollo_gql.ts'),
      handler: 'gqlHandler',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64, // Keep current until migration validated
      timeout: config.lambda.timeout,
      memorySize: config.lambda.memorySize,
      // OTEL layer is required for app initialization
      layers: [
        otelLayer, // Re-enabled - required for app startup
        prismaEngineLayer
      ],
      vpc: this.vpc,
      securityGroups: [this.lambdaSecurityGroup],
      environment: this.getEnvironmentVariables(),
      // Use tested bundling configuration that includes collector.yml handling
      bundling: getBundlingConfig('graphql', this.stage)
    });

    // Create GraphQL API using Solutions Construct with pre-built Lambda
    const graphqlApi = new CognitoToApiGatewayToLambda(this, 'GraphQLApi', {
      existingLambdaObj: graphqlFunction,
      apiGatewayProps: {
        restApiName: ResourceNames.apiName('graphql-api', this.stage),
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

    new CfnOutput(this, 'GraphQLFunctionName', {
      value: graphqlFunction.functionName,
      description: 'GraphQL Lambda Function Name'
    });
  }

  /**
   * Get environment variables using ultra-lean config helpers
   */
  private getEnvironmentVariables(): Record<string, string> {
    return getLambdaEnvironment(this.stage, {
      DATABASE_URL: getDatabaseUrl(this.databaseSecretArn, this.databaseClusterEndpoint, this.databaseName),
      UPLOADS_BUCKET_NAME: this.uploadsBucketName,
      QA_BUCKET_NAME: this.qaBucketName,
      // Add S3 bucket names with the expected variable names for app-api
      VITE_APP_S3_DOCUMENTS_BUCKET: this.uploadsBucketName,
      VITE_APP_S3_QA_BUCKET: this.qaBucketName,
      APPLICATION_ENDPOINT: this.applicationEndpoint || `https://mcr-${this.stage}.cms.gov`,
      // OTEL configuration - required for app initialization
      API_APP_OTEL_COLLECTOR_URL: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.OTEL_COLLECTOR_URL),
      AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
      OPENTELEMETRY_COLLECTOR_CONFIG_FILE: '/var/task/collector.yml',
      JWT_SECRET: `{{resolve:secretsmanager:${ssm.StringParameter.valueForStringParameter(this, `/mcr-cdk/${this.stage}/foundation/jwt-secret-arn`)}:SecretString:jwtsigningkey}}`,
      EMAILER_MODE: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.EMAILER_MODE),
      LD_SDK_KEY: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.LD_SDK_KEY),
      VITE_APP_AUTH_MODE: this.stage === 'dev' ? 'LOCAL' : 'AWS_COGNITO',
      PARAMETER_STORE_MODE: 'AWS',
      REGION: this.region,
      stage: this.stage,
      // Critical missing env vars from serverless
      SECRETS_MANAGER_SECRET: `aurora_postgres_${this.stage}`
    });
  }
}
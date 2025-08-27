import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
// Removed ApiGatewayToLambda - functions will be integrated into main API Gateway
import { Duration, CfnOutput } from 'aws-cdk-lib';
import * as path from 'path';
import { getBundlingConfig } from '../lambda-bundling';
import { ServiceRegistry } from '@constructs/base';
import { 
  stackName,
  resourceName,
  getConfig,
  getLambdaEnvironment,
  getDatabaseUrl,
  SSM_PATHS,
  LAMBDA_DEFAULTS
} from '../config';


export interface PublicApiStackProps extends StackProps {
  stage: string;
  vpc: ec2.IVpc;
  lambdaSecurityGroup: ec2.ISecurityGroup;
  databaseSecretArn: string;
  databaseClusterEndpoint: string;
  databaseName: string;
  applicationEndpoint?: string;
}

/**
 * Public API Stack for Health, OAuth, and OTEL Lambda functions
 * Functions are exported for integration with the main GraphQL API Gateway
 */
export class PublicApiStack extends Stack {
  private readonly stage: string;
  public healthFunction: NodejsFunction;
  public oauthFunction: NodejsFunction;
  public otelFunction: NodejsFunction;
  
  private readonly vpc: ec2.IVpc;
  private readonly lambdaSecurityGroup: ec2.ISecurityGroup;
  private readonly databaseSecretArn: string;
  private readonly databaseClusterEndpoint: string;
  private readonly databaseName: string;
  private readonly applicationEndpoint?: string;

  constructor(scope: Construct, id: string, props: PublicApiStackProps) {
    super(scope, id, {
      ...props,
      stackName: stackName('PublicApi', props.stage),
      description: 'Public APIs for Health, OAuth, and OTEL endpoints - Uses Solutions Constructs'
    });

    this.stage = props.stage;

    this.vpc = props.vpc;
    this.lambdaSecurityGroup = props.lambdaSecurityGroup;
    this.databaseSecretArn = props.databaseSecretArn;
    this.databaseClusterEndpoint = props.databaseClusterEndpoint;
    this.databaseName = props.databaseName;
    this.applicationEndpoint = props.applicationEndpoint;

    this.defineResources();
  }

  private defineResources(): void {
    const config = getConfig(this.stage);

    // OTEL layer is now added by Lambda Monitoring Aspect to avoid duplicates
    // The aspect handles both OTEL and Datadog Extension layers consistently

    // Health Check Lambda using CDK NodejsFunction (no Prisma needed)
    const healthFunction = new NodejsFunction(this, 'HealthFunction', {
      functionName: resourceName('public-api', 'health', this.stage),
      entry: path.join(__dirname, '..', '..', '..', 'app-api', 'src', 'handlers', 'health_check.ts'),
      handler: 'main',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      timeout: Duration.seconds(LAMBDA_DEFAULTS.TIMEOUT_API),
      memorySize: LAMBDA_DEFAULTS.MEMORY_SMALL,
      // Layers added by Lambda Monitoring Aspect,
      environment: this.getBaseEnvironmentVariables(),
      bundling: getBundlingConfig('health_check', this.stage) // Use proper bundling config
    });

    // Export health function for integration with main API Gateway
    this.healthFunction = healthFunction;

    // OAuth Token Lambda using CDK NodejsFunction (needs Prisma)
    const oauthFunction = new NodejsFunction(this, 'OAuthFunction', {
      functionName: resourceName('public-api', 'oauth', this.stage),
      entry: path.join(__dirname, '..', '..', '..', 'app-api', 'src', 'handlers', 'oauth_token.ts'),
      handler: 'main',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      timeout: Duration.seconds(LAMBDA_DEFAULTS.TIMEOUT_STANDARD),
      memorySize: LAMBDA_DEFAULTS.MEMORY_MEDIUM,
      // Layers added by Lambda Monitoring Aspect, // Prisma bundled directly into function
      vpc: this.vpc,
      securityGroups: [this.lambdaSecurityGroup],
      environment: {
        ...this.getDatabaseEnvironmentVariables(),
        NODE_OPTIONS: '--enable-source-maps',
        PRISMA_QUERY_ENGINE_LIBRARY: './node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node'
      },
      bundling: getBundlingConfig('oauth_token', this.stage) // Use proper bundling config
    });

    // Export oauth function for integration with main API Gateway
    this.oauthFunction = oauthFunction;

    // OTEL Proxy Lambda using CDK NodejsFunction (no Prisma needed)
    const otelFunction = new NodejsFunction(this, 'OtelFunction', {
      functionName: resourceName('public-api', 'otel', this.stage),
      entry: path.join(__dirname, '..', '..', '..', 'app-api', 'src', 'handlers', 'otel_proxy.ts'),
      handler: 'main',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.X86_64,
      timeout: Duration.seconds(LAMBDA_DEFAULTS.TIMEOUT_STANDARD),
      memorySize: LAMBDA_DEFAULTS.MEMORY_SMALL,
      // Layers added by Lambda Monitoring Aspect,
      environment: this.getBaseEnvironmentVariables(),
      bundling: getBundlingConfig('otel_proxy', this.stage) // Use proper bundling config
    });

    // Export otel function for integration with main API Gateway
    this.otelFunction = otelFunction;

    // Create outputs
    this.createOutputs();
  }

  /**
   * Get base environment variables using lean config helpers
   */
  private getBaseEnvironmentVariables(): Record<string, string> {
    return getLambdaEnvironment(this.stage, {
      APPLICATION_ENDPOINT: this.applicationEndpoint || `https://mcr-${this.stage}.cms.gov`,
      // Use serverless-compatible variable name for OTEL
      API_APP_OTEL_COLLECTOR_URL: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.OTEL_COLLECTOR_URL),
      OTEL_EXPORTER_OTLP_ENDPOINT: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.OTEL_COLLECTOR_URL),
      AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
      OPENTELEMETRY_COLLECTOR_CONFIG_FILE: '/var/task/collector.yml',
      LD_SDK_KEY: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.LD_SDK_KEY),
      JWT_SECRET: `{{resolve:secretsmanager:${ssm.StringParameter.valueForStringParameter(this, `/mcr-cdk/${this.stage}/foundation/jwt-secret-arn`)}:SecretString:jwtsigningkey}}`
    });
  }

  /**
   * Get environment variables for functions that need database access
   */
  private getDatabaseEnvironmentVariables(): Record<string, string> {
    return getLambdaEnvironment(this.stage, {
      APPLICATION_ENDPOINT: this.applicationEndpoint || `https://mcr-${this.stage}.cms.gov`,
      DATABASE_URL: 'AWS_SM', // Use Secrets Manager for proper URL encoding
      SECRETS_MANAGER_SECRET: `mcr-cdk-aurora-postgres-${this.stage}`,
      // Use serverless-compatible variable name for OTEL
      API_APP_OTEL_COLLECTOR_URL: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.OTEL_COLLECTOR_URL),
      OTEL_EXPORTER_OTLP_ENDPOINT: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.OTEL_COLLECTOR_URL),
      NR_LICENSE_KEY: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.NR_LICENSE_KEY),
      AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
      OPENTELEMETRY_COLLECTOR_CONFIG_FILE: '/var/task/collector.yml',
      LD_SDK_KEY: ssm.StringParameter.valueForStringParameter(this, SSM_PATHS.LD_SDK_KEY),
      JWT_SECRET: `{{resolve:secretsmanager:${ssm.StringParameter.valueForStringParameter(this, `/mcr-cdk/${this.stage}/foundation/jwt-secret-arn`)}:SecretString:jwtsigningkey}}`,
      DEPLOYMENT_TIMESTAMP: new Date().toISOString()
    });
  }

  /**
   * Create stack outputs for Lambda functions
   */
  private createOutputs(): void {
    new CfnOutput(this, 'HealthFunctionArn', {
      value: this.healthFunction.functionArn,
      description: 'Health Check Lambda Function ARN',
      exportName: `${this.stackName}-HealthFunctionArn`
    });

    new CfnOutput(this, 'OAuthFunctionArn', {
      value: this.oauthFunction.functionArn,
      description: 'OAuth Token Lambda Function ARN',
      exportName: `${this.stackName}-OAuthFunctionArn`
    });

    new CfnOutput(this, 'OtelFunctionArn', {
      value: this.otelFunction.functionArn,
      description: 'OTEL Proxy Lambda Function ARN',
      exportName: `${this.stackName}-OtelFunctionArn`
    });
  }
}
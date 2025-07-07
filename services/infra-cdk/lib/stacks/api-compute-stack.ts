import { BaseStack, BaseStackProps, ServiceRegistry } from '@constructs/base';
import { WafProtectedApi, ApiEndpointFactory } from '@constructs/api';
import { OtelLayer, LambdaFactory, PrismaLayer, type BaseLambdaFunction, type CreateFunctionProps } from '@constructs/lambda';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Duration } from 'aws-cdk-lib';
import { SERVICES, API_PATHS, LAMBDA_FUNCTIONS } from '@config/constants';
import { needsPrismaLayer } from '@constructs/lambda/bundling-utils';

export interface ApiComputeStackProps extends BaseStackProps {
  // From Compute Stack
  vpc: ec2.IVpc;
  lambdaSecurityGroup: ec2.ISecurityGroup;
  databaseSecretArn: string;
  uploadsBucketName: string;
  qaBucketName: string;
  // From Auth Stack
  userPool: cognito.IUserPool;
  authenticatedRole?: iam.IRole;
}

/**
 * Function configuration for permissions and VPC settings
 */
interface FunctionConfig {
  useVpc: boolean;
  needsDatabaseAccess: boolean;
  needsSesAccess: boolean;
  needsCognitoAccess: boolean;
}

/**
 * Combined API and Compute stack to avoid circular dependencies
 * This matches the serverless pattern where Lambda and API Gateway are deployed together
 */
export class ApiComputeStack extends BaseStack {
  // Compute resources
  public otelLayer: lambda.ILayerVersion;
  public prismaLayer: lambda.ILayerVersion;
  public lambdaFactory: LambdaFactory;
  public functions: Map<string, BaseLambdaFunction>;
  
  // API resources
  public api: apigateway.RestApi;
  public apiUrl: string;
  private authorizer: apigateway.CognitoUserPoolsAuthorizer;
  
  // Props
  private readonly vpc: ec2.IVpc;
  private readonly lambdaSecurityGroup: ec2.ISecurityGroup;
  private readonly databaseSecretArn: string;
  private readonly uploadsBucketName: string;
  private readonly qaBucketName: string;
  private readonly userPool: cognito.IUserPool;
  private readonly authenticatedRole?: iam.IRole;

  /**
   * Function configurations defining VPC usage and permission requirements
   * This ensures proper permission management and follows the principle of least privilege
   * Matches serverless.yml Lambda functions exactly
   */
  private readonly FUNCTION_CONFIGS: Record<string, FunctionConfig> = {
    // Main GraphQL API handler (handles all GraphQL operations)
    GRAPHQL: { useVpc: true, needsDatabaseAccess: true, needsSesAccess: false, needsCognitoAccess: true },
    
    // Auth functions
    OAUTH_TOKEN: { useVpc: true, needsDatabaseAccess: true, needsSesAccess: false, needsCognitoAccess: false },
    THIRD_PARTY_API_AUTHORIZER: { useVpc: false, needsDatabaseAccess: false, needsSesAccess: false, needsCognitoAccess: false },
    
    // Health check
    INDEX_HEALTH_CHECKER: { useVpc: false, needsDatabaseAccess: false, needsSesAccess: false, needsCognitoAccess: false },
    
    // Email functions
    EMAIL_SUBMIT: { useVpc: false, needsDatabaseAccess: false, needsSesAccess: true, needsCognitoAccess: false },
    
    // File operations
    ZIP_KEYS: { useVpc: false, needsDatabaseAccess: false, needsSesAccess: false, needsCognitoAccess: false },
    
    // Database operations
    MIGRATE: { useVpc: true, needsDatabaseAccess: true, needsSesAccess: false, needsCognitoAccess: false },
    
    // S3 audit
    AUDIT_FILES: { useVpc: true, needsDatabaseAccess: true, needsSesAccess: false, needsCognitoAccess: false },
    
    // Cleanup
    CLEANUP: { useVpc: false, needsDatabaseAccess: false, needsSesAccess: false, needsCognitoAccess: false },
    
    // Observability
    OTEL: { useVpc: false, needsDatabaseAccess: false, needsSesAccess: false, needsCognitoAccess: false },
  };

  constructor(scope: Construct, id: string, props: ApiComputeStackProps) {
    super(scope, id, {
      ...props,
      description: 'Combined API Gateway and Lambda compute stack for Managed Care Review'
    });
    
    // Store required props
    this.vpc = props.vpc;
    this.lambdaSecurityGroup = props.lambdaSecurityGroup;
    this.databaseSecretArn = props.databaseSecretArn;
    this.uploadsBucketName = props.uploadsBucketName;
    this.qaBucketName = props.qaBucketName;
    this.userPool = props.userPool;
    this.authenticatedRole = props.authenticatedRole;
    
    // Initialize functions map
    this.functions = new Map<string, BaseLambdaFunction>();
    
    // Define resources after all properties are initialized
    this.defineResources();
  }

  /**
   * Define all resources
   */
  protected defineResources(): void {
    // Create compute resources first (Lambda layers and functions)
    this.createComputeResources();
    
    // Then create API resources that use the Lambda functions
    this.createApiResources();
  }

  /**
   * Create compute resources (from compute-stack.ts)
   */
  private createComputeResources(): void {
    // Create layers
    this.createOtelLayer();
    this.createPrismaLayer();

    // Create Lambda factory
    this.createLambdaFactory();

    // Create Lambda functions
    this.createLambdaFunctions();

    // Grant necessary permissions
    this.grantPermissions();
  }

  /**
   * Create API resources (from api-stack.ts)
   */
  private createApiResources(): void {
    // Create WAF-protected API
    const wafApi = new WafProtectedApi(this, 'Api', {
      apiName: SERVICES.INFRA_API,
      stage: this.stage,
      securityConfig: this.stageConfig.security,
      description: 'Managed Care Review API Gateway',
      binaryMediaTypes: ['multipart/form-data', 'application/pdf']
    });

    this.api = wafApi.api;
    this.apiUrl = wafApi.url;

    // Create Cognito authorizer
    this.authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [this.userPool],
      authorizerName: `${SERVICES.INFRA_API}-${this.stage}-authorizer`
    });

    // Create API endpoints
    this.createApiEndpoints();

    // Store API ID in ServiceRegistry for cross-stack reference
    ServiceRegistry.putApiId(this, this.stage, this.api.restApiId);

    // Grant API Gateway permissions to authenticated role from auth stack
    this.grantApiPermissionsToAuthenticatedRole();
  }

  /**
   * Create OTEL layer for Lambda functions
   */
  private createOtelLayer(): void {
    const otelConstruct = new OtelLayer(this, 'Otel', {
      stage: this.stage,
      architecture: this.stageConfig.lambda.architecture === 'arm64' 
        ? lambda.Architecture.ARM_64 
        : lambda.Architecture.X86_64
    });

    this.otelLayer = otelConstruct.layer;
  }

  /**
   * Create Prisma layer for Lambda functions
   */
  private createPrismaLayer(): void {
    const prismaConstruct = new PrismaLayer(this, 'Prisma');
    this.prismaLayer = prismaConstruct.layerVersion;
  }

  /**
   * Create Lambda factory for consistent function creation
   */
  private createLambdaFactory(): void {
    this.lambdaFactory = new LambdaFactory(this, 'LambdaFactory', {
      serviceName: SERVICES.APP_API,
      stage: this.stage,
      stageConfig: this.stageConfig,
      vpc: this.vpc,
      securityGroups: [this.lambdaSecurityGroup],
      otelLayer: this.otelLayer,
      prismaLayer: this.prismaLayer,
      commonEnvironment: this.getCommonEnvironment()
    });
  }

  /**
   * Get common environment variables for all Lambda functions
   */
  private getCommonEnvironment(): Record<string, string> {
    // Read configuration from SSM parameters (matching serverless pattern)
    const apiOtelCollectorUrl = ssm.StringParameter.valueForStringParameter(
      this, 
      '/configuration/api_app_otel_collector_url'
    );
    
    const emailerMode = ssm.StringParameter.valueForStringParameter(
      this, 
      '/configuration/emailer_mode'
    );
    
    const parameterStoreMode = ssm.StringParameter.valueForStringParameter(
      this, 
      '/configuration/parameterStoreMode'
    );
    
    const ldSdkKey = ssm.StringParameter.valueForStringParameter(
      this, 
      '/configuration/ld_sdk_key_feds'
    );

    return {
      // Stage configuration
      STAGE: this.stage,
      stage: this.stage, // Some functions expect lowercase
      REGION: this.region,
      
      // Database configuration
      DATABASE_SECRET_ARN: this.databaseSecretArn,
      SECRETS_MANAGER_SECRET: `aurora_postgres_${this.stage}`,
      
      // S3 bucket configuration
      UPLOADS_BUCKET: this.uploadsBucketName,
      QA_BUCKET: this.qaBucketName,
      VITE_APP_S3_DOCUMENTS_BUCKET: this.uploadsBucketName,
      VITE_APP_S3_QA_BUCKET: this.qaBucketName,
      
      // OTEL configuration
      API_APP_OTEL_COLLECTOR_URL: apiOtelCollectorUrl,
      AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
      OPENTELEMETRY_COLLECTOR_CONFIG_FILE: '/var/task/collector.yml',
      
      // Application configuration from SSM
      EMAILER_MODE: emailerMode,
      PARAMETER_STORE_MODE: parameterStoreMode,
      LD_SDK_KEY: ldSdkKey,
      
      // JWT configuration
      JWT_SECRET: this.getJwtSecret(),
      
      // Application endpoint (default for local development)
      APPLICATION_ENDPOINT: 'http://localhost:3000',
      
      // Auth mode configuration
      VITE_APP_AUTH_MODE: process.env.VITE_APP_AUTH_MODE || 'AWS_IAM',
      
      // Prisma configuration
      PRISMA_QUERY_ENGINE_LIBRARY: '/opt/nodejs/node_modules/.prisma/client/libquery_engine-linux-arm64-openssl-3.0.x.so.node',
      NODE_OPTIONS: '--enable-source-maps'
    };
  }

  /**
   * Get JWT secret based on stage
   */
  private getJwtSecret(): string {
    // For local development, use environment variable
    if (process.env.JWT_SECRET) {
      return process.env.JWT_SECRET;
    }
    
    // For deployed environments, the Lambda functions will read this at runtime
    // from Secrets Manager. We just need to pass the reference.
    return '';
  }

  /**
   * Get function-specific environment variables
   */
  private getFunctionSpecificEnvironment(functionName: string): Record<string, string> {
    const specificEnvs: Record<string, Record<string, string>> = {
      GRAPHQL: {
        GRAPHQL_SCHEMA_PATH: './schema.graphql'
      },
      GET_UPLOAD_URL: {
        UPLOAD_EXPIRATION_SECONDS: '3600'
      },
      SEND_TEMPLATE_EMAIL: {
        EMAIL_FROM: `noreply-${this.stage}@mcr.gov`
      },
      INDEX_HEALTH_CHECKER: {
        HEALTH_CHECK_SERVICES: 'database,s3,cognito'
      },
      ZIP_KEYS: {
        MAX_TOTAL_SIZE: (1024 * 1024 * 1024).toString(), // 1GB
        BATCH_SIZE: '50'
      }
    };

    return specificEnvs[functionName] || {};
  }

  /**
   * Get function-specific Lambda configuration
   */
  private getFunctionSpecificConfig(functionName: string): Partial<CreateFunctionProps> {
    const specificConfigs: Record<string, Partial<CreateFunctionProps>> = {
      ZIP_KEYS: {
        timeout: Duration.seconds(60),
        memorySize: this.stage === 'prod' ? 4096 : 1024,
        ephemeralStorageSize: this.stage === 'prod' ? 2048 : 512
      }
    };

    return specificConfigs[functionName] || {};
  }

  /**
   * Create all Lambda functions
   */
  private createLambdaFunctions(): void {
    // Create functions based on configuration
    Object.entries(this.FUNCTION_CONFIGS).forEach(([functionName, config]) => {
      const specificEnv = this.getFunctionSpecificEnvironment(functionName);
      const specificConfig = this.getFunctionSpecificConfig(functionName);
      
      this.lambdaFactory.createFunction({
        functionName: functionName as keyof typeof LAMBDA_FUNCTIONS,
        useVpc: config.useVpc,
        environment: specificEnv,
        ...specificConfig
      });
    });

    // Store functions in the map for later use
    this.functions = this.lambdaFactory.getAllFunctions();
  }

  /**
   * Grant necessary permissions to Lambda functions
   */
  private grantPermissions(): void {
    // Import S3 buckets
    const uploadsBucket = s3.Bucket.fromBucketName(
      this,
      'UploadsBucket',
      this.uploadsBucketName
    );
    
    const qaBucket = s3.Bucket.fromBucketName(
      this,
      'QaBucket',
      this.qaBucketName
    );

    // Import database secret
    const databaseSecret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      'DatabaseSecret',
      this.databaseSecretArn
    );

    // Grant permissions based on function configuration
    this.functions.forEach((func, name) => {
      const config = this.FUNCTION_CONFIGS[name];
      
      if (!config) {
        console.warn(`No configuration found for function ${name} - skipping permissions`);
        return;
      }

      // Grant S3 permissions to file operation functions
      if (['ZIP_KEYS', 'AUDIT_FILES', 'CLEANUP'].includes(name)) {
        uploadsBucket.grantReadWrite(func.function);
        qaBucket.grantReadWrite(func.function);
      }

      // Grant database access only to functions that need it
      if (config.needsDatabaseAccess) {
        databaseSecret.grantRead(func.function);
      }

      // Grant SES permissions to email functions
      if (config.needsSesAccess) {
        func.function.addToRolePolicy(new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'ses:SendEmail',
            'ses:SendRawEmail',
            'ses:SendTemplatedEmail'
          ],
          resources: ['*']
        }));
      }

      // Grant Cognito permissions to user management functions
      if (config.needsCognitoAccess) {
        func.function.addToRolePolicy(new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            'cognito-idp:ListUsers',
            'cognito-idp:AdminGetUser',
            'cognito-idp:AdminUpdateUserAttributes',
            'cognito-idp:AdminAddUserToGroup',
            'cognito-idp:AdminRemoveUserFromGroup'
          ],
          resources: [this.userPool.userPoolArn]
        }));
      }
    });
  }

  /**
   * Create all API endpoints
   */
  private createApiEndpoints(): void {
    // GraphQL endpoint
    const graphqlResource = this.api.root.addResource(API_PATHS.GRAPHQL.replace('/', ''));
    ApiEndpointFactory.createGraphQLEndpoint(this, 'GraphQLEndpoint', {
      resource: graphqlResource,
      handler: this.getFunction('GRAPHQL'),
      userPool: this.userPool
    });

    // Health check endpoint (public)
    const healthResource = this.api.root.addResource('health_check');
    ApiEndpointFactory.createPublicEndpoint(this, 'HealthEndpoint', {
      resource: healthResource,
      method: 'GET',
      handler: this.getFunction('INDEX_HEALTH_CHECKER')
    });

    // OAuth token endpoint (public)
    const oauthResource = this.api.root.addResource('oauth');
    const tokenResource = oauthResource.addResource('token');
    ApiEndpointFactory.createPublicEndpoint(this, 'OAuthTokenEndpoint', {
      resource: tokenResource,
      method: 'POST',
      handler: this.getFunction('OAUTH_TOKEN')
    });

    // OTEL endpoint (public)
    const otelResource = this.api.root.addResource('otel');
    ApiEndpointFactory.createPublicEndpoint(this, 'OtelEndpoint', {
      resource: otelResource,
      method: 'POST',
      handler: this.getFunction('OTEL')
    });

    // Zip endpoint for bulk downloads
    const zipResource = this.api.root.addResource('zip');
    ApiEndpointFactory.createAuthenticatedEndpoint(this, 'ZipKeysEndpoint', {
      resource: zipResource,
      method: 'POST',
      handler: this.getFunction('ZIP_KEYS'),
      userPool: this.userPool,
      authorizer: this.authorizer
    });

    // External GraphQL endpoint with third-party authorizer
    const v1Resource = this.api.root.addResource('v1');
    const v1GraphqlResource = v1Resource.addResource('graphql');
    const externalResource = v1GraphqlResource.addResource('external');
    
    // Create third-party API authorizer
    const thirdPartyAuthorizer = new apigateway.TokenAuthorizer(this, 'ThirdPartyApiAuthorizer', {
      handler: this.getFunction('THIRD_PARTY_API_AUTHORIZER'),
      authorizerName: `${SERVICES.INFRA_API}-${this.stage}-third-party-authorizer`
    });

    // Create external GraphQL endpoints with custom authorizer
    externalResource.addMethod('GET', new apigateway.LambdaIntegration(this.getFunction('GRAPHQL')), {
      authorizationType: apigateway.AuthorizationType.CUSTOM,
      authorizer: thirdPartyAuthorizer
    });

    externalResource.addMethod('POST', new apigateway.LambdaIntegration(this.getFunction('GRAPHQL')), {
      authorizationType: apigateway.AuthorizationType.CUSTOM,
      authorizer: thirdPartyAuthorizer
    });
  }

  /**
   * Get Lambda function from the map
   */
  private getFunction(
    functionName: keyof typeof LAMBDA_FUNCTIONS
  ): lambda.IFunction {
    const func = this.functions.get(functionName);
    if (!func) {
      throw new Error(`Lambda function ${functionName} not found`);
    }
    return func.function;
  }

  /**
   * Grant API Gateway permissions to authenticated role from auth stack
   */
  private grantApiPermissionsToAuthenticatedRole(): void {
    if (!this.authenticatedRole) return;

    // Grant execute-api:Invoke permission matching serverless ui-auth
    if (this.authenticatedRole instanceof iam.Role) {
      this.authenticatedRole.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['execute-api:Invoke'],
        resources: [`arn:aws:execute-api:${this.region}:${this.account}:${this.api.restApiId}/*`]
      }));
    }
  }
}
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
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Duration, Fn, CfnOutput } from 'aws-cdk-lib';
import { SERVICES, API_PATHS, LAMBDA_FUNCTIONS, LAMBDA_MEMORY, LAMBDA_TIMEOUTS, getOtelEnvironment, LAMBDA_COMMON_ENV, FILE_SIZE_LIMITS, CDK_DEPLOYMENT_SUFFIX, PROJECT_PREFIX } from '@config/constants';
import { needsPrismaLayer } from '@constructs/lambda/bundling-utils';
import { LambdaEnvironmentFactory } from '@constructs/lambda/environment-factory';

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
  // From Foundation Stack
  /**
   * JWT secret for API authentication
   */
  jwtSecret: secretsmanager.ISecret;
  // From Lambda Layers Stack
  /**
   * ARN of the Prisma Lambda layer for database ORM functionality
   */
  prismaLayerArn?: string;
  /**
   * ARN of the PostgreSQL tools Lambda layer for database operations
   */
  postgresToolsLayerArn?: string;
  // From Frontend Stack
  /**
   * Application endpoint URL for email links and redirects
   */
  applicationEndpoint?: string;
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
  private readonly applicationEndpoint?: string;
  private readonly jwtSecret: secretsmanager.ISecret;
  private readonly prismaLayerArn?: string;
  private prismaMigrationLayer?: lambda.ILayerVersion;

  /**
   * Function configurations defining VPC usage and permission requirements
   * This ensures proper permission management and follows the principle of least privilege
   * Matches serverless.yml Lambda functions exactly
   */
  private readonly FUNCTION_CONFIGS: Record<string, FunctionConfig> = {
    // Main GraphQL API handler (handles all GraphQL operations) - uses VPC in serverless
    GRAPHQL: { useVpc: true, needsDatabaseAccess: true, needsSesAccess: false, needsCognitoAccess: true },
    
    // Auth functions - oauth_token uses VPC in serverless
    OAUTH_TOKEN: { useVpc: true, needsDatabaseAccess: true, needsSesAccess: false, needsCognitoAccess: false },
    THIRD_PARTY_API_AUTHORIZER: { useVpc: false, needsDatabaseAccess: false, needsSesAccess: false, needsCognitoAccess: false },
    
    // Health check - no VPC in serverless
    INDEX_HEALTH_CHECKER: { useVpc: false, needsDatabaseAccess: false, needsSesAccess: false, needsCognitoAccess: false },
    
    // Email functions - no VPC in serverless
    EMAIL_SUBMIT: { useVpc: false, needsDatabaseAccess: false, needsSesAccess: true, needsCognitoAccess: false },
    
    // File operations - no VPC in serverless
    ZIP_KEYS: { useVpc: false, needsDatabaseAccess: false, needsSesAccess: false, needsCognitoAccess: false },
    
    // Database operations - migrate uses VPC in serverless
    MIGRATE: { useVpc: true, needsDatabaseAccess: true, needsSesAccess: false, needsCognitoAccess: false },
    
    // S3 audit - auditFiles uses VPC in serverless
    AUDIT_FILES: { useVpc: true, needsDatabaseAccess: true, needsSesAccess: false, needsCognitoAccess: false },
    
    // Cleanup - no VPC in serverless
    CLEANUP: { useVpc: false, needsDatabaseAccess: false, needsSesAccess: false, needsCognitoAccess: false },
    
    // Observability - no VPC in serverless
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
    this.applicationEndpoint = props.applicationEndpoint;
    this.jwtSecret = props.jwtSecret;
    this.prismaLayerArn = props.prismaLayerArn;
    
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

    // Create scheduled events
    this.createScheduledEvents();
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
      description: 'Managed Care Review API Gateway'
    });

    this.api = wafApi.api;
    this.apiUrl = wafApi.url;

    // Note: API ID is already stored in ServiceRegistry by WafProtectedApi construct
    // This prevents circular dependencies when other stacks need the API reference

    // Create Cognito authorizer
    this.authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [this.userPool],
      authorizerName: `${SERVICES.INFRA_API}-${this.stage}-authorizer`
    });

    // Create API endpoints
    this.createApiEndpoints();

    // Grant API Gateway permissions to authenticated role from auth stack
    this.grantApiPermissionsToAuthenticatedRole();

    // Create outputs
    new CfnOutput(this, 'ApiUrl', {
      value: this.apiUrl,
      description: 'API Gateway URL'
    });
  }

  /**
   * Create OTEL layer for Lambda functions
   */
  private createOtelLayer(): void {
    const otelConstruct = new OtelLayer(this, 'Otel', {
      stage: this.stage,
      architecture: lambda.Architecture.X86_64 // Match serverless configuration exactly
    });

    this.otelLayer = otelConstruct.layer;
  }

  /**
   * Import Prisma layer from LambdaLayersStack
   */
  private createPrismaLayer(): void {
    if (this.prismaLayerArn) {
      this.prismaLayer = lambda.LayerVersion.fromLayerVersionArn(
        this,
        'ImportedPrismaLayer',
        this.prismaLayerArn
      );
    } else {
      // Fallback: create local layer if ARN not provided (for backwards compatibility)
      const prismaConstruct = new PrismaLayer(this, 'Prisma');
      this.prismaLayer = prismaConstruct.layerVersion;
    }
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

    // Use LambdaEnvironmentFactory to create consistent environment
    return LambdaEnvironmentFactory.createApiLambdaEnvironment(
      this.stage,
      this.region,
      {
        databaseSecretArn: this.databaseSecretArn,
        uploadsBucket: this.uploadsBucketName,
        qaBucket: this.qaBucketName,
        apiOtelCollectorUrl,
        emailerMode,
        parameterStoreMode,
        ldSdkKey,
        jwtSecretName: this.jwtSecret.secretName,
        applicationEndpoint: this.applicationEndpoint || 
          `https://${this.stage === 'prod' ? 'app' : this.stage}.mcr.cms.gov`
      }
    );
  }


  /**
   * Get Prisma migration layer for the MIGRATE function
   * Lazily creates and caches the layer to avoid duplication
   */
  private getMigrationLayer(): lambda.ILayerVersion | undefined {
    if (!this.prismaMigrationLayer) {
      // Read layer ARN from SSM Parameter Store
      const layerArn = ssm.StringParameter.valueForStringParameter(
        this,
        `/${PROJECT_PREFIX}/${this.stage}/layers/prisma-migration-arn`
      );
      
      this.prismaMigrationLayer = lambda.LayerVersion.fromLayerVersionArn(
        this,
        'ImportedPrismaMigrationLayer',
        layerArn
      );
    }
    return this.prismaMigrationLayer;
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
        MAX_TOTAL_SIZE: (FILE_SIZE_LIMITS.MAX_SCAN_SIZE_BYTES * 3.5).toString(), // ~1GB
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
        timeout: LAMBDA_TIMEOUTS.STANDARD,
        memorySize: this.stage === 'prod' ? LAMBDA_MEMORY.XLARGE : LAMBDA_MEMORY.MEDIUM,
        ephemeralStorageSize: this.stage === 'prod' ? 2048 : 512
      },
      MIGRATE: {
        timeout: LAMBDA_TIMEOUTS.STANDARD,
        memorySize: LAMBDA_MEMORY.MEDIUM,
        additionalLayers: [this.getMigrationLayer()].filter(Boolean) as lambda.ILayerVersion[]
      },
      GRAPHQL: {
        timeout: LAMBDA_TIMEOUTS.API_DEFAULT,
        memorySize: LAMBDA_MEMORY.MEDIUM
      },
      AUDIT_FILES: {
        timeout: LAMBDA_TIMEOUTS.STANDARD,
        memorySize: LAMBDA_MEMORY.MEDIUM
      },
      OAUTH_TOKEN: {
        timeout: LAMBDA_TIMEOUTS.SHORT, // Default API Gateway timeout
        memorySize: LAMBDA_MEMORY.MEDIUM
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

    // Grant global permissions that apply to all functions (matching serverless config)
    this.functions.forEach((func) => {
      // RDS snapshot permissions - serverless grants these to all functions
      func.function.addToRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'rds:CreateDBClusterSnapshot',
          'rds:CreateDBSnapshot',
          'rds:CopyDBClusterSnapshot',
          'rds:CopyDBSnapshot',
          'rds:DescribeDBClusterSnapshots',
          'rds:DeleteDBClusterSnapshot'
        ],
        resources: ['*']
      }));
      
      // SSM parameter permissions - serverless grants these to all functions
      func.function.addToRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ssm:GetParameter',
          'ssm:GetParameters'
        ],
        resources: ['*']
      }));
      
      // Lambda invoke permissions - serverless grants these to all functions
      func.function.addToRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['lambda:InvokeFunction'],
        resources: ['*']
      }));
      
      // Cognito permissions - serverless grants these to all functions
      func.function.addToRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cognito-idp:ListUsers'],
        resources: ['*']
      }));
      
      // Grant read access to JWT secret using AWS CDK grant pattern
      this.jwtSecret.grantRead(func.function);
      
      // Additional Secrets Manager permissions for other secrets (matching serverless)
      func.function.addToRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'secretsmanager:GetSecretValue',
          'secretsmanager:DescribeSecret'
        ],
        resources: ['*']
      }));
      
      // RDS database connect permissions - serverless grants these to all functions
      func.function.addToRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['rds-db:connect'],
        resources: [this.databaseSecretArn.replace(':secret:', ':cluster:')]
      }));
      
      // SES permissions - serverless grants these to all functions
      func.function.addToRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ses:SendEmail',
          'ses:SendRawEmail'
        ],
        resources: ['*']
      }));
      
      // S3 permissions - serverless grants these to all functions
      func.function.addToRolePolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:*'],
        resources: [
          `${uploadsBucket.bucketArn}/allusers/*`,
          `${qaBucket.bucketArn}/allusers/*`
        ]
      }));
    });

    // Note: All permissions are granted globally above to match serverless configuration
    // where IAM permissions are defined at the provider level for all functions
  }

  /**
   * Create scheduled events for Lambda functions
   */
  private createScheduledEvents(): void {
    // Schedule cleanup Lambda - runs at 14:00 UTC Monday-Friday
    const cleanupFunction = this.getFunction('CLEANUP');
    const cleanupRule = new events.Rule(this, 'CleanupScheduleRule', {
      ruleName: `${SERVICES.APP_API}-${this.stage}-cleanup-schedule`,
      description: 'Scheduled cleanup of temporary resources',
      schedule: events.Schedule.expression('cron(0 14 ? * MON-FRI *)')
    });
    
    cleanupRule.addTarget(new targets.LambdaFunction(cleanupFunction as lambda.Function));
  }

  /**
   * Create all API endpoints
   */
  private createApiEndpoints(): void {
    // GraphQL endpoint with AWS IAM authorization (matching serverless config)
    const graphqlResource = this.api.root.addResource(API_PATHS.GRAPHQL.replace('/', ''));
    ApiEndpointFactory.createGraphQLEndpoint(this, 'GraphQLEndpoint', {
      resource: graphqlResource,
      handler: this.getFunction('GRAPHQL'),
      authType: 'IAM',
      methods: ['GET', 'POST']  // Match serverless config exactly
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

    // Zip endpoint for bulk downloads (binary content)
    const zipResource = this.api.root.addResource('zip');
    ApiEndpointFactory.createAuthenticatedBinaryEndpoint(this, 'ZipKeysEndpoint', {
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

    // Note: email_submit function is not exposed via API Gateway in serverless config
    // It's an internal-only Lambda function
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
    // Use stage-scoped wildcard to avoid circular dependency
    if (this.authenticatedRole instanceof iam.Role) {
      this.authenticatedRole.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['execute-api:Invoke'],
        resources: [`arn:aws:execute-api:${this.region}:${this.account}:*/${this.stage}/*`]
      }));
    }
  }

}
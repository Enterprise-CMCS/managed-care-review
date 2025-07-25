# Complete Line-by-Line Serverless to CDK Migration Guide - All Lambda Functions

## Table of Contents
1. [Provider Configuration](#provider-configuration)
2. [IAM Configuration](#iam-configuration)
3. [Environment Variables](#environment-variables)
4. [Configuration Management](#configuration-management)
5. [Lambda Layers](#lambda-layers)
6. [Lambda Environment Factory](#lambda-environment-factory)
7. [app-api Service Functions](#app-api-service-functions)
8. [postgres Service Functions](#postgres-service-functions)
9. [uploads Service Functions](#uploads-service-functions)
10. [ui-auth Service (Cognito/Authentication)](#ui-auth-service-cognitoauthentication)
11. [Database Resources (RDS Aurora)](#database-resources-rds-aurora)
12. [Storage Resources (S3)](#storage-resources-s3)
13. [Network Resources (VPC)](#network-resources-vpc)
14. [Frontend Resources (CloudFront + S3)](#frontend-resources-cloudfront--s3)
15. [infra-api Service (API Gateway & WAF)](#infra-api-service-api-gateway--waf)
16. [github-oidc Service (GitHub Actions OIDC)](#github-oidc-service-github-actions-oidc)
17. [app-web Service (Build & Deploy)](#app-web-service-build--deploy)
18. [storybook Service (Component Documentation)](#storybook-service-component-documentation)
19. [ui Service (Main Application Frontend)](#ui-service-main-application-frontend)
20. [CDK App Architecture & Bootstrapping](#cdk-app-architecture--bootstrapping)
21. [CDK Aspects & Cross-Cutting Concerns](#cdk-aspects--cross-cutting-concerns)
22. [Advanced API Patterns](#advanced-api-patterns)
23. [Lambda Factory & Patterns](#lambda-factory--patterns)
24. [Cross-Stack References](#cross-stack-references)
25. [Security Patterns](#security-patterns)
26. [Build & Deployment Patterns](#build--deployment-patterns)
27. [Database Operations](#database-operations)
28. [Monitoring & Observability](#monitoring--observability)
29. [Migration Best Practices](#migration-best-practices)
30. [Modular Constructs Pattern](#modular-constructs-pattern)
31. [Best Practices & Clean Code](#best-practices--clean-code)
32. [Lambda Package Building & Bundling](#lambda-package-building--bundling)

---

## Provider Configuration

### Serverless Provider Block
```yaml
provider:
  name: aws                                    # CDK: Implicit in AWS CDK
  runtime: nodejs20.x                          # CDK: lambda.Runtime.NODEJS_20_X
  region: us-east-1                            # CDK: Stack.of(this).region
  stage: dev                                   # CDK: this.stage (from props)
  apiGateway:
    restApiId: ${self:custom.appApiGatewayId}  # CDK: restApiId prop in apigateway.RestApi
    restApiRootResourceId: ${self:custom...}   # CDK: restApiRootResourceId prop
  layers:
    - arn:aws:lambda:us-east-1:901920...      # CDK: layers: [this.otelLayer]
```

### CDK Provider Equivalent
```typescript
// In BaseStack constructor
super(scope, id, {
  env: {
    account: props.account,
    region: props.region || 'us-east-1'
  }
});

// Runtime in Lambda
runtime: lambda.Runtime.NODEJS_20_X

// API Gateway
this.api = apigateway.RestApi.fromRestApiAttributes(this, 'ImportedApi', {
  restApiId: ServiceRegistry.getApiId(this, stage),
  rootResourceId: ServiceRegistry.getApiRootResourceId(this, stage)
});

// Layers
layers: [this.otelLayer, this.prismaLayer]
```

---

## IAM Configuration

### Serverless IAM Role
```yaml
iam:
  role:
    path: ${self:custom.iamPath}                         # CDK: role.path
    permissionsBoundary: ${self:custom.iamPermissions}   # CDK: role.permissionsBoundary
    statements:                                          # CDK: role.inlinePolicies or addToRolePolicy
      - Effect: 'Allow'
        Action:
          - cognito-idp:ListUsers
        Resource: '*'
```

### CDK IAM Equivalent
```typescript
// In Lambda Factory or direct Lambda creation
const role = new iam.Role(this, 'LambdaRole', {
  assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
  path: '/delegatedadmin/developer/',
  permissionsBoundary: iam.ManagedPolicy.fromManagedPolicyArn(
    this,
    'PermissionsBoundary',
    `arn:aws:iam::${this.account}:policy/cms-cloud-admin/developer-boundary-policy`
  ),
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
    iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')
  ]
});

// Add inline policies
role.addToPolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['cognito-idp:ListUsers'],
  resources: ['*']
}));
```

---

## Environment Variables

### Serverless Environment
```yaml
environment:
  stage: ${sls:stage}                           # CDK: stage: this.stage
  REGION: ${self:provider.region}               # CDK: REGION: this.region
  DATABASE_URL: ${self:custom.dbURL}            # CDK: DATABASE_URL: process.env.DATABASE_URL
  VITE_APP_AUTH_MODE: ${self:custom.react...}   # CDK: VITE_APP_AUTH_MODE: process.env.VITE_APP_AUTH_MODE
```

### CDK Environment Equivalent
```typescript
environment: {
  stage: this.stage,
  STAGE: this.stage,
  REGION: this.region,
  DATABASE_URL: process.env.DATABASE_URL || '',
  VITE_APP_AUTH_MODE: process.env.VITE_APP_AUTH_MODE || 'AWS_IAM',
  // SSM parameters
  API_APP_OTEL_COLLECTOR_URL: ssm.StringParameter.valueForStringParameter(
    this, '/configuration/api_app_otel_collector_url'
  ),
  // Secrets Manager
  DATABASE_SECRET_ARN: this.databaseSecretArn,
  SECRETS_MANAGER_SECRET: `aurora_postgres_${this.stage}`
}
```

---

## Configuration Management

### Overview
CDK best practice is to centralize all configuration values instead of hardcoding them throughout the codebase. The infrastructure now uses a set of configuration modules:

### Configuration Files Structure

```typescript
// lib/config/
├── constants.ts         // Main constants file that re-exports all modules
├── aws-resources.ts     // External AWS resource references
├── limits.ts           // Resource limits and size constants
├── network.ts          // Network configuration
└── service-defaults.ts // AWS service default configurations
```

### 1. AWS Resources Configuration (aws-resources.ts)

#### Serverless Hardcoded Values
```yaml
# Hardcoded in serverless.yml
layers:
  - arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4

# Hardcoded account IDs
VAL_ROLE_ARN: arn:aws:iam::${env:VAL_AWS_ACCOUNT_ID}:role/postgres-cross-account-upload-val
```

#### CDK Configuration Approach
```typescript
// aws-resources.ts
export const OTEL_LAYERS = {
  X86_64: 'arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4',
  ARM64: 'arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-arm64-ver-1-30-2:1',
} as const;

export function getOtelLayerArn(architecture: 'x86_64' | 'arm64' = 'x86_64'): string {
  return architecture === 'arm64' ? OTEL_LAYERS.ARM64 : OTEL_LAYERS.X86_64;
}

export const AWS_ACCOUNTS = {
  VAL: process.env.VAL_AWS_ACCOUNT_ID || '',
  PROD: process.env.PROD_AWS_ACCOUNT_ID || '',
} as const;

// Usage in stack
layers: [
  lambda.LayerVersion.fromLayerVersionArn(
    this,
    'OtelLayer',
    getOtelLayerArn('x86_64')
  )
]
```

### 2. Resource Limits Configuration (limits.ts)

#### Serverless Hardcoded Values
```yaml
# Hardcoded throughout serverless files
memorySize: 1024
timeout: 60
MAX_FILE_SIZE: '314572800'  # 300MB
```

#### CDK Configuration Approach
```typescript
// limits.ts
export const LAMBDA_MEMORY = {
  MINIMUM: 128,
  SMALL: 512,
  MEDIUM: 1024,
  LARGE: 2048,
  XLARGE: 4096,
  MAXIMUM: 10240,
} as const;

export const LAMBDA_TIMEOUTS = {
  SHORT: Duration.seconds(29),     // Just under API Gateway limit
  API_DEFAULT: Duration.seconds(30),
  STANDARD: Duration.seconds(60),
  EXTENDED: Duration.minutes(5),
  LONG_RUNNING: Duration.minutes(10),
  MAXIMUM: Duration.minutes(15),
} as const;

export const FILE_SIZE_LIMITS = {
  MAX_SCAN_SIZE_BYTES: 314572800,  // 300MB
  MAX_SCAN_SIZE_MB: 300,
  MAX_API_PAYLOAD_BYTES: 10485760, // 10MB
  MAX_API_PAYLOAD_MB: 10,
} as const;

// Usage in Lambda configuration
lambdaConfig: {
  memorySize: LAMBDA_MEMORY.MEDIUM,
  timeout: LAMBDA_TIMEOUTS.STANDARD
}
```

### 3. Network Configuration (network.ts)

#### Serverless Hardcoded Values
```yaml
# SSH IPs hardcoded in EC2 configuration
- '34.196.35.156/32'
- '73.170.112.247/32'
- '172.58.0.0/16'
```

#### CDK Configuration Approach
```typescript
// network.ts
export const SSH_ACCESS_IPS = {
  CMS_OFFICE_1: '34.196.35.156/32',
  CMS_OFFICE_2: '73.170.112.247/32',
  CMS_VPN: '172.58.0.0/16',
  DEVELOPER_1: '162.218.226.179/32',
  DEVELOPER_2: '66.108.108.206/32',
  DEVELOPER_3: '207.153.23.192/32',
  DEVELOPER_IPV6: '2601:483:5300:22cf:e1a1:88e9:46b7:2c49/128',
} as const;

export function getAllSshAccessIps(): string[] {
  return Object.values(SSH_ACCESS_IPS).filter(ip => !ip.includes(':'));
}

// Usage in security group
const sshSources = getAllSshAccessIps();
sshSources.forEach(source => {
  vmSecurityGroup.addIngressRule(
    ec2.Peer.ipv4(source),
    ec2.Port.tcp(22),
    'SSH access'
  );
});
```

### 4. Service Defaults Configuration (service-defaults.ts)

#### Serverless Various Defaults
```yaml
# S3 allowed extensions
allowedFileExtensions:
  - '*.csv'
  - '*.doc'
  - '*.docx'
  # ... etc

# GuardDuty settings
FindingPublishingFrequency: 'FIFTEEN_MINUTES'

# Secrets rotation
automaticallyAfter: Duration.days(30)
```

#### CDK Configuration Approach
```typescript
// service-defaults.ts
export const S3_DEFAULTS = {
  ALLOWED_FILE_EXTENSIONS: [
    '*.csv',
    '*.doc',
    '*.docx',
    '*.pdf',
    '*.txt',
    '*.xls',
    '*.xlsx',
    '*.zip',
    '*.xlsm',
    '*.xltm',
    '*.xlam',
  ] as const,
  
  LIFECYCLE: {
    EXPIRE_NONCURRENT_VERSIONS_DAYS: 30,
    TRANSITION_TO_IA_DAYS: 90,
    TRANSITION_TO_GLACIER_DAYS: 365,
  },
} as const;

export const GUARDDUTY_DEFAULTS = {
  FINDING_PUBLISHING_FREQUENCY: 'FIFTEEN_MINUTES' as const,
  S3_PROTECTION_ENABLED: true,
  MALWARE_PROTECTION_SCAN_TIMEOUT: Duration.minutes(5),
} as const;

export const SECRETS_MANAGER_DEFAULTS = {
  ROTATION_DAYS: 30,
  ROTATION_WINDOW: {
    HOUR: 23, // 11 PM
    DURATION: Duration.hours(2),
  },
  RECOVERY_WINDOW_DAYS: 7,
} as const;
```

### Migration Guide for Configuration

1. **Import the constants**:
   ```typescript
   import { LAMBDA_MEMORY, LAMBDA_TIMEOUTS, FILE_SIZE_LIMITS } from '@config/constants';
   ```

2. **Replace hardcoded values**:
   ```typescript
   // Before
   memorySize: 1024,
   timeout: Duration.seconds(60),
   
   // After
   memorySize: LAMBDA_MEMORY.MEDIUM,
   timeout: LAMBDA_TIMEOUTS.STANDARD,
   ```

3. **Use configuration functions**:
   ```typescript
   // Before
   'arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4'
   
   // After
   getOtelLayerArn('x86_64')
   ```

---

## Lambda Layers

### Serverless Layers
```yaml
layers:
  prismaClientMigration:
    path: lambda-layers-prisma-client-migration   # CDK: Code.fromAsset
  prismaClientEngine:
    path: lambda-layers-prisma-client-engine      # CDK: Code.fromAsset
```

### CDK Layers Equivalent - Updated with Configuration
```typescript
// Import configuration
import { getOtelLayerArn, SERVICES } from '@config/constants';

// In PrismaLayer construct - Custom layer from local code
this.layerVersion = new lambda.LayerVersion(this, 'PrismaLayer', {
  code: lambda.Code.fromAsset(path.join(__dirname, '../../../app-api/lambda-layers-prisma-client-engine')),
  compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
  description: 'Prisma client engine layer',
  layerVersionName: `${SERVICES.APP_API}-${props.stage}-prisma-engine`
});

// In OtelLayer construct - External AWS-managed layer
export class OtelLayer extends Construct {
  public readonly layer: lambda.ILayerVersion;

  constructor(scope: Construct, id: string, props: OtelLayerProps) {
    super(scope, id);

    // Use configuration to get the correct layer ARN
    const architecture = props.architecture || Architecture.ARM_64;
    const archType = architecture === Architecture.ARM_64 ? 'arm64' : 'x86_64';
    
    // Reference external layer using centralized configuration
    this.layer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'AwsOtelLayer',
      getOtelLayerArn(archType)
    );
    
    // Store layer ARN in Parameter Store for cross-stack reference
    ServiceRegistry.putLayerArn(this, props.stage, 'otel', this.layer.layerVersionArn);
  }
}
```

### Key Changes from Hardcoded Approach

1. **External Layer ARNs**: No longer hardcoded in the stack files
   ```typescript
   // Before: Hardcoded ARN
   'arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4'
   
   // After: Configuration function
   getOtelLayerArn('x86_64')
   ```

2. **Service Names**: Use constants for consistency
   ```typescript
   // Before: Hardcoded service name
   layerVersionName: `prisma-client-engine-${props.stage}`
   
   // After: Service constant
   layerVersionName: `${SERVICES.APP_API}-${props.stage}-prisma-engine`
   ```

3. **Architecture Support**: Configuration handles architecture differences
   ```typescript
   // The getOtelLayerArn function returns the correct ARN based on architecture
   export function getOtelLayerArn(architecture: 'x86_64' | 'arm64' = 'x86_64'): string {
     return architecture === 'arm64' ? OTEL_LAYERS.ARM64 : OTEL_LAYERS.X86_64;
   }
   ```

---

## Lambda Environment Factory

### Overview
Instead of manually constructing environment variables for each Lambda function, CDK now provides a `LambdaEnvironmentFactory` that ensures consistency and reduces duplication.

### Factory Pattern Structure

```typescript
// constructs/lambda/environment-factory.ts
export class LambdaEnvironmentFactory {
  // Base environment for all functions
  static createBaseEnvironment(stage: string, region: string): BaseEnvironment
  
  // Specialized environments
  static createOtelEnvironment(stage: string): OtelEnvironment
  static createDatabaseEnvironment(secretArn: string, stage: string, region: string): DatabaseEnvironment
  static createS3Environment(uploadsBucket: string, qaBucket: string): S3Environment
  static createAuthEnvironment(options?: AuthOptions): AuthEnvironment
  
  // Complete environments for specific Lambda types
  static createApiLambdaEnvironment(stage: string, region: string, config: ApiConfig): Record<string, string>
  static createVirusScanEnvironment(stage: string, bucketNames: string[], options?: ScanOptions): Record<string, string>
  static createDatabaseLambdaEnvironment(stage: string, region: string, secretArn: string, options?: DbOptions): Record<string, string>
}
```

### Serverless Environment Variables (Before)
```yaml
# Repeated in every function
environment:
  stage: ${sls:stage}
  STAGE: ${sls:stage}
  REGION: ${self:provider.region}
  NODE_OPTIONS: '--enable-source-maps'
  AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1'
  LOG_LEVEL: 'INFO'
  DATABASE_SECRET_ARN: ${cf:aurora-${sls:stage}.DatabaseSecretArn}
  UPLOADS_BUCKET: ${cf:uploads-${sls:stage}.BucketName}
  QA_BUCKET: ${cf:uploads-${sls:stage}.QABucketName}
  AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler'
  OPENTELEMETRY_COLLECTOR_CONFIG_FILE: '/var/task/collector.yml'
  VITE_APP_OTEL_COLLECTOR_URL: ${env:VITE_APP_OTEL_COLLECTOR_URL}
```

### CDK Environment Factory (After)

#### 1. For API Lambda Functions
```typescript
// Instead of manually creating environment object
const environment = LambdaEnvironmentFactory.createApiLambdaEnvironment(
  this.stage,
  this.region,
  {
    databaseSecretArn: this.databaseSecretArn,
    uploadsBucket: this.uploadsBucketName,
    qaBucket: this.qaBucketName,
    apiOtelCollectorUrl: ssmApiOtelUrl,
    emailerMode: ssmEmailerMode,
    parameterStoreMode: ssmParamStoreMode,
    ldSdkKey: ssmLdSdkKey,
    jwtSecret: this.getJwtSecret()
  }
);

// Automatically includes:
// - Base environment (stage, region, NODE_OPTIONS, etc.)
// - Database configuration
// - S3 bucket configuration
// - OTEL configuration
// - Auth configuration
// - Feature flags
```

#### 2. For Virus Scanning Functions
```typescript
// GuardDuty scan processor
environment: LambdaEnvironmentFactory.createVirusScanEnvironment(
  this.stage,
  [this.uploadsBucket.bucketName, this.qaBucket.bucketName],
  {
    maxFileSize: FILE_SIZE_LIMITS.MAX_SCAN_SIZE_BYTES,
    enableClamAvCompatibility: true,
    alertTopicArn: this.alertTopic.topicArn
  }
)

// Automatically includes:
// - Base environment
// - OTEL configuration
// - Virus scan specific settings
// - Bucket configuration
```

#### 3. For Database-Only Functions
```typescript
// Database migration function
environment: LambdaEnvironmentFactory.createDatabaseLambdaEnvironment(
  this.stage,
  this.region,
  this.databaseSecretArn,
  {
    includeOtel: true,
    additionalEnv: {
      MIGRATION_PATH: './migrations'
    }
  }
)
```

### Merging Multiple Environments
```typescript
// For complex functions needing multiple configurations
environment: LambdaEnvironmentFactory.merge(
  LambdaEnvironmentFactory.createBaseEnvironment(stage, region),
  LambdaEnvironmentFactory.createDatabaseEnvironment(secretArn, stage, region),
  LambdaEnvironmentFactory.createS3Environment(uploadsBucket, qaBucket),
  {
    CUSTOM_VAR: 'custom-value'
  }
)
```

### Benefits of Factory Pattern

1. **Consistency**: All Lambda functions get the same base configuration
2. **Type Safety**: TypeScript interfaces ensure correct environment variables
3. **DRY Principle**: No more duplicating environment variables across functions
4. **Maintainability**: Change environment variables in one place
5. **Documentation**: Self-documenting what each Lambda type needs
6. **Testing**: Easier to mock and test environment configurations

### Migration Guide

1. **Identify Lambda function type** (API, Database, S3, etc.)
2. **Choose appropriate factory method**
3. **Replace inline environment object** with factory call
4. **Add any additional custom variables** as needed

Example migration:
```typescript
// Before
environment: {
  stage: this.stage,
  STAGE: this.stage,
  REGION: this.region,
  DATABASE_SECRET_ARN: this.databaseSecretArn,
  // ... 20+ more lines
}

// After
environment: LambdaEnvironmentFactory.createApiLambdaEnvironment(
  this.stage,
  this.region,
  config
)
```

---

## app-api Service Functions

### 1. GraphQL Function - Complete Mapping

#### Serverless Configuration
```yaml
graphql:
  handler: src/handlers/apollo_gql.gqlHandler    # CDK: handler prop
  events:                                        # CDK: API Gateway integration
    - http:
        path: graphql                            # CDK: resource.addResource('graphql')
        method: post                             # CDK: method: 'POST'
        cors: true                               # CDK: defaultCorsPreflightOptions
        authorizer: aws_iam                      # CDK: AuthorizationType.IAM
    - http:
        path: graphql
        method: get
        cors: true
        authorizer: aws_iam
    - http:
        path: v1/graphql/external                # CDK: nested resources
        method: post
        cors: true
        authorizer:                              # CDK: TokenAuthorizer
          name: third_party_api_authorizer       # CDK: authorizer name
          identitySource: method.request.header.Authorization
    - http:
        path: v1/graphql/external
        method: get
        cors: true
        authorizer:
          name: third_party_api_authorizer
          identitySource: method.request.header.Authorization
  timeout: 30                                    # CDK: Duration.seconds(30)
  vpc:                                           # CDK: vpc prop
    securityGroupIds:                            # CDK: securityGroups
      - ${self:custom.sgId}
    subnetIds: ${self:custom.privateSubnets}     # CDK: vpcSubnets
  layers:                                        # CDK: layers array
    - !Ref PrismaClientEngineLambdaLayer         # CDK: this.prismaLayer
    - arn:aws:lambda:us-east-1:901920...        # CDK: this.otelLayer
```

#### CDK Implementation
```typescript
// Lambda Function Creation
const graphqlFunction = new lambda.Function(this, 'GraphQLFunction', {
  functionName: `${SERVICES.APP_API}-${this.stage}-GRAPHQL`,
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'src/handlers/apollo_gql.gqlHandler',
  code: lambda.Code.fromAsset('../app-api', {
    bundling: {
      // esbuild bundling configuration
    }
  }),
  timeout: Duration.seconds(30),
  memorySize: 1024,
  vpc: this.vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [this.lambdaSecurityGroup],
  layers: [this.prismaLayer, this.otelLayer],
  environment: {
    ...commonEnvironment,
    GRAPHQL_SCHEMA_PATH: './schema.graphql'
  }
});

// API Gateway Endpoints
const graphqlResource = this.api.root.addResource('graphql');

// IAM authorized endpoints
['GET', 'POST'].forEach(method => {
  graphqlResource.addMethod(method, new apigateway.LambdaIntegration(graphqlFunction), {
    authorizationType: apigateway.AuthorizationType.IAM
  });
});

// External endpoints with custom authorizer
const v1Resource = this.api.root.addResource('v1');
const v1GraphqlResource = v1Resource.addResource('graphql');
const externalResource = v1GraphqlResource.addResource('external');

const thirdPartyAuthorizer = new apigateway.TokenAuthorizer(this, 'ThirdPartyApiAuthorizer', {
  handler: this.getFunction('THIRD_PARTY_API_AUTHORIZER'),
  authorizerName: `${SERVICES.INFRA_API}-${this.stage}-third-party-authorizer`,
  identitySource: 'method.request.header.Authorization'
});

['GET', 'POST'].forEach(method => {
  externalResource.addMethod(method, new apigateway.LambdaIntegration(graphqlFunction), {
    authorizationType: apigateway.AuthorizationType.CUSTOM,
    authorizer: thirdPartyAuthorizer
  });
});
```

### 2. OAuth Token Function - Complete Mapping

#### Serverless Configuration
```yaml
oauth_token:
  handler: src/handlers/oauth_token.main
  events:
    - http:
        path: oauth/token
        method: post
        cors: true
  vpc:
    securityGroupIds:
      - ${self:custom.sgId}
    subnetIds: ${self:custom.privateSubnets}
  layers:
    - !Ref PrismaClientEngineLambdaLayer
    - arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4
```

#### CDK Implementation
```typescript
const oauthTokenFunction = new lambda.Function(this, 'OAuthTokenFunction', {
  functionName: `${SERVICES.APP_API}-${this.stage}-OAUTH_TOKEN`,
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'src/handlers/oauth_token.main',
  code: lambda.Code.fromAsset('../app-api', { bundling: {...} }),
  timeout: Duration.seconds(29),
  memorySize: 1024,
  vpc: this.vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [this.lambdaSecurityGroup],
  layers: [this.prismaLayer, this.otelLayer],
  environment: commonEnvironment
});

// API Endpoint
const oauthResource = this.api.root.addResource('oauth');
const tokenResource = oauthResource.addResource('token');
tokenResource.addMethod('POST', new apigateway.LambdaIntegration(oauthTokenFunction));
```

### 3. Health Check Function - Complete Mapping

#### Serverless Configuration
```yaml
health:
  handler: src/handlers/health_check.main
  events:
    - http:
        path: health_check
        method: get
        cors: true
```

#### CDK Implementation
```typescript
const healthFunction = new lambda.Function(this, 'HealthCheckFunction', {
  functionName: `${SERVICES.APP_API}-${this.stage}-INDEX_HEALTH_CHECKER`,
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'src/handlers/health_check.main',
  code: lambda.Code.fromAsset('../app-api', { bundling: {...} }),
  timeout: Duration.seconds(29),
  memorySize: 512,
  // NO VPC
  environment: {
    ...commonEnvironment,
    HEALTH_CHECK_SERVICES: 'database,s3,cognito'
  }
});

const healthResource = this.api.root.addResource('health_check');
healthResource.addMethod('GET', new apigateway.LambdaIntegration(healthFunction));
```

### 4. Third Party API Authorizer - Complete Mapping

#### Serverless Configuration
```yaml
third_party_api_authorizer:
  handler: src/handlers/third_party_API_authorizer.main
```

#### CDK Implementation
```typescript
const authorizerFunction = new lambda.Function(this, 'ThirdPartyAuthorizerFunction', {
  functionName: `${SERVICES.APP_API}-${this.stage}-THIRD_PARTY_API_AUTHORIZER`,
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'src/handlers/third_party_API_authorizer.main',
  code: lambda.Code.fromAsset('../app-api', { bundling: {...} }),
  timeout: Duration.seconds(29),
  memorySize: 512,
  // NO VPC
  environment: commonEnvironment
});

// Used as authorizer, not as endpoint
```

### 5. OTEL Function - Complete Mapping

#### Serverless Configuration
```yaml
otel:
  handler: src/handlers/otel_proxy.main
  events:
    - http:
        path: otel
        method: post
        cors: true
```

#### CDK Implementation
```typescript
const otelFunction = new lambda.Function(this, 'OtelFunction', {
  functionName: `${SERVICES.APP_API}-${this.stage}-OTEL`,
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'src/handlers/otel_proxy.main',
  code: lambda.Code.fromAsset('../app-api', { bundling: {...} }),
  timeout: Duration.seconds(29),
  memorySize: 512,
  // NO VPC
  environment: commonEnvironment
});

const otelResource = this.api.root.addResource('otel');
otelResource.addMethod('POST', new apigateway.LambdaIntegration(otelFunction));
```

### 6. Email Submit Function - Complete Mapping

#### Serverless Configuration
```yaml
email_submit:
  handler: src/handlers/email_submit.main
```

#### CDK Implementation
```typescript
const emailSubmitFunction = new lambda.Function(this, 'EmailSubmitFunction', {
  functionName: `${SERVICES.APP_API}-${this.stage}-EMAIL_SUBMIT`,
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'src/handlers/email_submit.main',
  code: lambda.Code.fromAsset('../app-api', { bundling: {...} }),
  timeout: Duration.seconds(29),
  memorySize: 512,
  // NO VPC
  environment: {
    ...commonEnvironment,
    EMAIL_FROM: `noreply-${this.stage}@mcr.gov`
  }
});

// SES Permissions
emailSubmitFunction.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['ses:SendEmail', 'ses:SendRawEmail', 'ses:SendTemplatedEmail'],
  resources: ['*']
}));

// API Endpoint (authenticated)
const emailResource = this.api.root.addResource('email');
const submitResource = emailResource.addResource('submit');
submitResource.addMethod('POST', new apigateway.LambdaIntegration(emailSubmitFunction), {
  authorizationType: apigateway.AuthorizationType.COGNITO,
  authorizer: this.cognitoAuthorizer
});
```

### 7. Migrate Function - Complete Mapping

#### Serverless Configuration
```yaml
migrate:
  handler: src/handlers/postgres_migrate.main
  timeout: 60
  vpc:
    securityGroupIds:
      - ${self:custom.sgId}
    subnetIds: ${self:custom.privateSubnets}
  layers:
    - !Ref PrismaClientMigrationLambdaLayer
    - arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4
```

#### CDK Implementation
```typescript
const migrateFunction = new lambda.Function(this, 'MigrateFunction', {
  functionName: `${SERVICES.APP_API}-${this.stage}-MIGRATE`,
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'src/handlers/postgres_migrate.main',
  code: lambda.Code.fromAsset('../app-api', { bundling: {...} }),
  timeout: Duration.seconds(60),
  memorySize: 1024,
  vpc: this.vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [this.lambdaSecurityGroup],
  layers: [this.prismaMigrationLayer, this.otelLayer],
  environment: commonEnvironment
});

// Database permissions
databaseSecret.grantRead(migrateFunction);
```

### 8. Zip Keys Function - Complete Mapping

#### Serverless Configuration
```yaml
zip_keys:
  handler: src/handlers/bulk_download.main
  events:
    - http:
        path: zip
        method: post
        cors: true
        authorizer: aws_iam
  timeout: 60
  memorySize: ${self:custom.lambdaMemory.${sls:stage}, self:custom.lambdaMemory.default}
  ephemeralStorageSize: ${self:custom.lambdaTmp.${sls:stage}, self:custom.lambdaTmp.default}
```

#### CDK Implementation
```typescript
const zipKeysFunction = new lambda.Function(this, 'ZipKeysFunction', {
  functionName: `${SERVICES.APP_API}-${this.stage}-ZIP_KEYS`,
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'src/handlers/bulk_download.main',
  code: lambda.Code.fromAsset('../app-api', { bundling: {...} }),
  timeout: Duration.seconds(60),
  memorySize: this.stage === 'prod' ? 4096 : 1024,
  ephemeralStorageSize: Size.mebibytes(this.stage === 'prod' ? 2048 : 512),
  // NO VPC
  environment: {
    ...commonEnvironment,
    MAX_TOTAL_SIZE: (1024 * 1024 * 1024).toString(),
    BATCH_SIZE: '50'
  }
});

// S3 permissions
uploadsBucket.grantReadWrite(zipKeysFunction);
qaBucket.grantReadWrite(zipKeysFunction);

// API endpoint
const zipResource = this.api.root.addResource('zip');
zipResource.addMethod('POST', new apigateway.LambdaIntegration(zipKeysFunction), {
  authorizationType: apigateway.AuthorizationType.IAM
});
```

### 9. Cleanup Function - Complete Mapping

#### Serverless Configuration
```yaml
cleanup:
  handler: src/handlers/cleanup.main
  events:
    - schedule: cron(0 14 ? * MON-FRI *)
  layers:
    - arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4
```

#### CDK Implementation
```typescript
const cleanupFunction = new lambda.Function(this, 'CleanupFunction', {
  functionName: `${SERVICES.APP_API}-${this.stage}-CLEANUP`,
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'src/handlers/cleanup.main',
  code: lambda.Code.fromAsset('../app-api', { bundling: {...} }),
  timeout: Duration.seconds(900), // 15 minutes
  memorySize: 1024,
  layers: [this.otelLayer],
  // NO VPC
  environment: commonEnvironment
});

// Schedule rule
const cleanupRule = new events.Rule(this, 'CleanupScheduleRule', {
  ruleName: `${SERVICES.APP_API}-${this.stage}-cleanup-schedule`,
  description: 'Scheduled cleanup of temporary resources',
  schedule: events.Schedule.expression('cron(0 14 ? * MON-FRI *)')
});

cleanupRule.addTarget(new targets.LambdaFunction(cleanupFunction));

// S3 permissions
uploadsBucket.grantReadWrite(cleanupFunction);
qaBucket.grantReadWrite(cleanupFunction);
```

### 10. Audit Files Function - Complete Mapping

#### Serverless Configuration
```yaml
auditFiles:
  handler: src/handlers/audit_s3.main
  timeout: 60
  vpc:
    securityGroupIds:
      - ${self:custom.sgId}
    subnetIds: ${self:custom.privateSubnets}
  layers:
    - !Ref PrismaClientEngineLambdaLayer
    - arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4
```

#### CDK Implementation
```typescript
const auditFilesFunction = new lambda.Function(this, 'AuditFilesFunction', {
  functionName: `${SERVICES.APP_API}-${this.stage}-AUDIT_FILES`,
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'src/handlers/audit_s3.main',
  code: lambda.Code.fromAsset('../app-api', { bundling: {...} }),
  timeout: Duration.seconds(60),
  memorySize: 1024,
  vpc: this.vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [this.lambdaSecurityGroup],
  layers: [this.prismaLayer, this.otelLayer],
  environment: commonEnvironment
});

// Permissions
uploadsBucket.grantReadWrite(auditFilesFunction);
qaBucket.grantReadWrite(auditFilesFunction);
databaseSecret.grantRead(auditFilesFunction);
```

---

## postgres Service Functions

### 1. Rotator Function - Complete Mapping

#### Serverless Configuration
```yaml
rotator:
  handler: src/rotator.handler
  description: Conducts an AWS SecretsManager secret rotation for RDS PostgreSQL
  timeout: 30
  vpc:
    securityGroupIds: ${self:custom.sgId}
    subnetIds: ${self:custom.privateSubnets}
  environment:
    SECRETS_MANAGER_ENDPOINT: !Sub 'https://secretsmanager.${AWS::Region}.amazonaws.com'
```

#### CDK Implementation
```typescript
const rotatorFunction = new lambda.Function(this, 'RotatorFunction', {
  functionName: `${SERVICES.POSTGRES}-${this.stage}-rotator`,
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'src/rotator.handler',
  code: lambda.Code.fromAsset('../postgres', {
    bundling: {
      image: lambda.Runtime.NODEJS_20_X.bundlingImage,
      command: ['bash', '-c', 'npm ci && npm run build && cp -r dist/* /asset-output/']
    }
  }),
  description: 'Conducts an AWS SecretsManager secret rotation for RDS PostgreSQL',
  timeout: Duration.seconds(30),
  memorySize: 512,
  vpc: this.vpc,
  vpcSubnets: { subnets: this.vpc.privateSubnets },
  securityGroups: [this.lambdaSecurityGroup],
  environment: {
    SECRETS_MANAGER_ENDPOINT: `https://secretsmanager.${this.region}.amazonaws.com`,
    REGION: this.region,
    STAGE: this.stage
  }
});

// Permissions
databaseSecret.grantRead(rotatorFunction);
databaseSecret.grantWrite(rotatorFunction);
rotatorFunction.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['secretsmanager:GetRandomPassword'],
  resources: ['*']
}));

// Allow Secrets Manager to invoke
rotatorFunction.grantInvoke(new iam.ServicePrincipal('secretsmanager.amazonaws.com'));
```

### 2. Database Manager Function - Complete Mapping

#### Serverless Configuration
```yaml
dbManager:
  handler: src/logicalDatabaseManager.handler
  description: Manages logical databases in the shared dev PostgreSQL instance
  timeout: 60
  vpc:
    securityGroupIds: ${self:custom.sgId}
    subnetIds: ${self:custom.privateSubnets}
  environment:
    SECRETS_MANAGER_ENDPOINT: !Sub 'https://secretsmanager.${AWS::Region}.amazonaws.com'
```

#### CDK Implementation
```typescript
const dbManagerFunction = new lambda.Function(this, 'DbManagerFunction', {
  functionName: `${SERVICES.POSTGRES}-${this.stage}-dbManager`,
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'src/logicalDatabaseManager.handler',
  code: lambda.Code.fromAsset('../postgres', { bundling: {...} }),
  description: 'Manages logical databases in the shared dev PostgreSQL instance',
  timeout: Duration.seconds(60),
  memorySize: 512,
  vpc: this.vpc,
  vpcSubnets: { subnets: this.vpc.privateSubnets },
  securityGroups: [this.lambdaSecurityGroup],
  environment: {
    SECRETS_MANAGER_ENDPOINT: `https://secretsmanager.${this.region}.amazonaws.com`,
    REGION: this.region,
    STAGE: this.stage,
    DATABASE_SECRET_ARN: databaseSecret.secretArn
  }
});

// Permissions
databaseSecret.grantRead(dbManagerFunction);
dbManagerFunction.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: [
    'secretsmanager:DescribeSecret',
    'secretsmanager:GetSecretValue',
    'secretsmanager:PutSecretValue',
    'secretsmanager:UpdateSecretVersionStage',
    'secretsmanager:DeleteSecret'
  ],
  resources: [`arn:aws:secretsmanager:${this.region}:${this.account}:secret:aurora_postgres_*`]
}));
```

### 3. Database Export Function - Complete Mapping

#### Serverless Configuration
```yaml
dbExport:
  handler: src/db_export.handler
  description: Exports data from the Postgres Aurora database
  timeout: 300
  memorySize: 4096
  vpc:
    securityGroupIds: ${self:custom.sgId}
    subnetIds: ${self:custom.privateSubnets}
  role: ${self:custom.exportRole.${opt:stage}, self:custom.exportRole.other}
  environment:
    S3_BUCKET: ${self:custom.exportBucket.${opt:stage}, self:custom.exportBucket.other}
    DB_SECRET_ARN: !Ref PostgresSecret
    VAL_ROLE_ARN: !Sub 'arn:aws:iam::${self:custom.valAWSAccountID}:role/${self:service}-cross-account-upload-val'
    SECRETS_MANAGER_ENDPOINT: !Sub 'https://secretsmanager.${AWS::Region}.amazonaws.com'
  layers:
    - !Ref PgToolsLambdaLayer
```

#### CDK Implementation
```typescript
// Create custom role for prod
const exportRole = this.stage === 'prod' ? new iam.Role(this, 'ProdExportRole', {
  assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
  path: '/delegatedadmin/developer/',
  permissionsBoundary: permissionsBoundary,
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
    iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')
  ],
  inlinePolicies: {
    ProdExportPermissions: new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['sts:AssumeRole'],
          resources: [`arn:aws:iam::${valAccountId}:role/postgres-cross-account-upload-val`]
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['secretsmanager:GetSecretValue'],
          resources: [databaseSecret.secretArn]
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['s3:PutObject', 's3:PutObjectAcl'],
          resources: [`arn:aws:s3:::postgres-${this.stage}-data-export/*`]
        })
      ]
    })
  }
}) : undefined;

const dbExportFunction = new lambda.Function(this, 'DbExportFunction', {
  functionName: `${SERVICES.POSTGRES}-${this.stage}-dbExport`,
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'src/db_export.handler',
  code: lambda.Code.fromAsset('../postgres', { bundling: {...} }),
  description: 'Exports data from the Postgres Aurora database',
  timeout: Duration.seconds(300),
  memorySize: 4096,
  vpc: this.vpc,
  vpcSubnets: { subnets: this.vpc.privateSubnets },
  securityGroups: [this.lambdaSecurityGroup],
  role: exportRole || undefined, // Use custom role for prod
  layers: [this.pgToolsLayer],
  environment: {
    S3_BUCKET: exportBucket.bucketName,
    DB_SECRET_ARN: databaseSecret.secretArn,
    VAL_ROLE_ARN: `arn:aws:iam::${valAccountId}:role/postgres-cross-account-upload-val`,
    SECRETS_MANAGER_ENDPOINT: `https://secretsmanager.${this.region}.amazonaws.com`
  }
});

// Permissions (if not using custom role)
if (this.stage !== 'prod') {
  databaseSecret.grantRead(dbExportFunction);
  exportBucket.grantWrite(dbExportFunction);
}
```

### 4. Database Import Function - Complete Mapping

#### Serverless Configuration
```yaml
dbImport:
  handler: src/db_import.handler
  description: Imports data from S3 into Postgres Aurora database
  timeout: 600
  memorySize: 4096
  vpc:
    securityGroupIds: ${self:custom.sgId}
    subnetIds: ${self:custom.privateSubnets}
  environment:
    S3_BUCKET: ${self:custom.importBucket.${opt:stage}, self:custom.importBucket.other}
    DOCS_S3_BUCKET: ${self:custom.documentUploadsBucketName}
    DB_SECRET_ARN: !Ref PostgresSecret
    SECRETS_MANAGER_ENDPOINT: !Sub 'https://secretsmanager.${AWS::Region}.amazonaws.com'
  layers:
    - !Ref PgToolsLambdaLayer
    - !Ref PrismaClientEngineLambdaLayer
    - !Ref PrismaClientMigrationLambdaLayer
```

#### CDK Implementation
```typescript
const dbImportFunction = new lambda.Function(this, 'DbImportFunction', {
  functionName: `${SERVICES.POSTGRES}-${this.stage}-dbImport`,
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'src/db_import.handler',
  code: lambda.Code.fromAsset('../postgres', { bundling: {...} }),
  description: 'Imports data from S3 into Postgres Aurora database',
  timeout: Duration.seconds(600), // 10 minutes
  memorySize: 4096,
  vpc: this.vpc,
  vpcSubnets: { subnets: this.vpc.privateSubnets },
  securityGroups: [this.lambdaSecurityGroup],
  layers: [this.pgToolsLayer, this.prismaEngineLayer, this.prismaMigrationLayer],
  environment: {
    S3_BUCKET: importBucket.bucketName,
    DOCS_S3_BUCKET: uploadsBucket.bucketName,
    DB_SECRET_ARN: databaseSecret.secretArn,
    SECRETS_MANAGER_ENDPOINT: `https://secretsmanager.${this.region}.amazonaws.com`
  }
});

// Permissions
databaseSecret.grantRead(dbImportFunction);
importBucket.grantRead(dbImportFunction);
uploadsBucket.grantReadWrite(dbImportFunction);
```

---

## uploads Service Functions

### 1. AV Scan Function - Complete Mapping

#### Serverless Configuration
```yaml
avScan:
  handler: src/lambdas/avScan.main
  name: ${self:service}-${sls:stage}-avScan       # CDK: functionName
  timeout: 300                                    # CDK: Duration.seconds(300)
  memorySize: 4096                                # CDK: memorySize: 4096
  ephemeralStorageSize: 1024                      # CDK: Size.mebibytes(1024)
  layers:
    - !Ref ClamAvLambdaLayer
    - arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4
  vpc:
    securityGroupIds: ${self:custom.sgId}
    subnetIds: ${self:custom.privateSubnets}
  environment:
    stage: ${sls:stage}
    CLAMAV_BUCKET_NAME: !Ref ClamDefsBucket
    PATH_TO_AV_DEFINITIONS: 'lambda/s3-antivirus/av-definitions'
    AWS_LAMBDA_EXEC_WRAPPER: /opt/otel-handler
    OPENTELEMETRY_COLLECTOR_CONFIG_FILE: /var/task/collector.yml
    VITE_APP_OTEL_COLLECTOR_URL: ${self:custom.reactAppOtelCollectorUrl}
```

#### CDK Implementation
```typescript
const avScanFunction = new lambda.Function(this, 'AvScanFunction', {
  functionName: `${SERVICES.UPLOADS}-${this.stage}-avScan`,
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'src/lambdas/avScan.main',
  code: lambda.Code.fromAsset('../uploads', {
    bundling: {
      image: lambda.Runtime.NODEJS_20_X.bundlingImage,
      command: ['bash', '-c', 'npm ci && npm run build && cp -r dist/* /asset-output/']
    }
  }),
  timeout: Duration.seconds(300), // 5 minutes
  memorySize: 4096,
  ephemeralStorageSize: Size.mebibytes(1024),
  vpc: this.vpc,
  vpcSubnets: { subnets: this.vpc.privateSubnets },
  securityGroups: [this.lambdaSecurityGroup],
  layers: [this.clamAvLayer, this.otelLayer],
  environment: {
    stage: this.stage,
    CLAMAV_BUCKET_NAME: clamDefsBucket.bucketName,
    PATH_TO_AV_DEFINITIONS: 'lambda/s3-antivirus/av-definitions',
    AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
    OPENTELEMETRY_COLLECTOR_CONFIG_FILE: '/var/task/collector.yml',
    VITE_APP_OTEL_COLLECTOR_URL: otelCollectorUrl
  }
});

// S3 Event Triggers
uploadsBucket.addEventNotification(
  s3.EventType.OBJECT_CREATED,
  new s3n.LambdaDestination(avScanFunction)
);

qaBucket.addEventNotification(
  s3.EventType.OBJECT_CREATED,
  new s3n.LambdaDestination(avScanFunction)
);

// Permissions
uploadsBucket.grantReadWrite(avScanFunction);
qaBucket.grantReadWrite(avScanFunction);
clamDefsBucket.grantRead(avScanFunction);

// Lambda invoke permission for S3
avScanFunction.grantInvoke(new iam.ServicePrincipal('s3.amazonaws.com'));
```

### 2. Rescan Failed Files Function - Complete Mapping

#### Serverless Configuration
```yaml
rescanFailedFiles:
  handler: src/lambdas/rescanFailedFiles.main
  timeout: 300
  maximumRetryAttempts: 0                         # CDK: retryAttempts: 0
  layers:
    - !Ref ClamAvLambdaLayer
    - arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4
  environment:
    stage: ${sls:stage}
    AUDIT_BUCKET_NAME: !Ref DocumentUploadsBucket
    CLAMAV_BUCKET_NAME: !Ref ClamDefsBucket
    PATH_TO_AV_DEFINITIONS: 'lambda/s3-antivirus/av-definitions'
    AWS_LAMBDA_EXEC_WRAPPER: /opt/otel-handler
    OPENTELEMETRY_COLLECTOR_CONFIG_FILE: /var/task/collector.yml
    VITE_APP_OTEL_COLLECTOR_URL: ${self:custom.reactAppOtelCollectorUrl}
```

#### CDK Implementation
```typescript
const rescanFailedFunction = new lambda.Function(this, 'RescanFailedFunction', {
  functionName: `${SERVICES.UPLOADS}-${this.stage}-rescanFailedFiles`,
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'src/lambdas/rescanFailedFiles.main',
  code: lambda.Code.fromAsset('../uploads', { bundling: {...} }),
  timeout: Duration.seconds(300),
  memorySize: 512,
  retryAttempts: 0,
  layers: [this.clamAvLayer, this.otelLayer],
  // NO VPC
  environment: {
    stage: this.stage,
    AUDIT_BUCKET_NAME: uploadsBucket.bucketName,
    CLAMAV_BUCKET_NAME: clamDefsBucket.bucketName,
    PATH_TO_AV_DEFINITIONS: 'lambda/s3-antivirus/av-definitions',
    AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
    OPENTELEMETRY_COLLECTOR_CONFIG_FILE: '/var/task/collector.yml',
    VITE_APP_OTEL_COLLECTOR_URL: otelCollectorUrl,
    RESCAN_WORKER_FUNCTION_NAME: rescanWorkerFunction.functionName
  }
});

// Permissions
rescanWorkerFunction.grantInvoke(rescanFailedFunction);
```

### 3. Rescan Worker Function - Complete Mapping

#### Serverless Configuration
```yaml
rescanWorker:
  handler: src/lambdas/rescanWorker.main
  timeout: 300
  maximumRetryAttempts: 0
  layers:
    - !Ref ClamAvLambdaLayer
    - arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4
  environment:
    stage: ${sls:stage}
    AUDIT_BUCKET_NAME: !Ref DocumentUploadsBucket
    CLAMAV_BUCKET_NAME: !Ref ClamDefsBucket
    PATH_TO_AV_DEFINITIONS: 'lambda/s3-antivirus/av-definitions'
    AWS_LAMBDA_EXEC_WRAPPER: /opt/otel-handler
    OPENTELEMETRY_COLLECTOR_CONFIG_FILE: /var/task/collector.yml
    VITE_APP_OTEL_COLLECTOR_URL: ${self:custom.reactAppOtelCollectorUrl}
```

#### CDK Implementation
```typescript
const rescanWorkerFunction = new lambda.Function(this, 'RescanWorkerFunction', {
  functionName: `${SERVICES.UPLOADS}-${this.stage}-rescanWorker`,
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'src/lambdas/rescanWorker.main',
  code: lambda.Code.fromAsset('../uploads', { bundling: {...} }),
  timeout: Duration.seconds(300),
  memorySize: 1024,
  retryAttempts: 0,
  layers: [this.clamAvLayer, this.otelLayer],
  // NO VPC
  environment: {
    stage: this.stage,
    AUDIT_BUCKET_NAME: uploadsBucket.bucketName,
    CLAMAV_BUCKET_NAME: clamDefsBucket.bucketName,
    PATH_TO_AV_DEFINITIONS: 'lambda/s3-antivirus/av-definitions',
    AWS_LAMBDA_EXEC_WRAPPER: '/opt/otel-handler',
    OPENTELEMETRY_COLLECTOR_CONFIG_FILE: '/var/task/collector.yml',
    VITE_APP_OTEL_COLLECTOR_URL: otelCollectorUrl
  }
});

// Permissions
uploadsBucket.grantReadWrite(rescanWorkerFunction);
clamDefsBucket.grantRead(rescanWorkerFunction);
```

---

## Key Migration Patterns

### 1. VPC Configuration
**Serverless:**
```yaml
vpc:
  securityGroupIds: [${self:custom.sgId}]
  subnetIds: ${self:custom.privateSubnets}
```

**CDK:**
```typescript
// Using LambdaFactory
useVpc: true

// Direct Lambda creation
vpc: this.vpc,
vpcSubnets: { subnets: this.vpc.privateSubnets },
securityGroups: [this.lambdaSecurityGroup]
```

### 2. Lambda Layers
**Serverless:**
```yaml
layers:
  - !Ref PrismaClientEngineLambdaLayer
  - arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4
```

**CDK:**
```typescript
// Layers are added automatically by LambdaFactory
// Or manually:
layers: [this.prismaLayer, this.otelLayer]
```

### 3. Environment Variables
**Serverless:**
```yaml
environment:
  STAGE: ${sls:stage}
  REGION: ${self:provider.region}
```

**CDK:**
```typescript
environment: {
  STAGE: this.stage,
  REGION: this.region,
  // Function-specific vars
  ...this.getFunctionSpecificEnvironment(functionName)
}
```

### 4. Event Triggers
**Serverless HTTP Events:**
```yaml
events:
  - http:
      path: /path
      method: post
      cors: true
      authorizer: aws_iam
```

**CDK API Gateway:**
```typescript
ApiEndpointFactory.createIAMAuthEndpoint(this, 'EndpointId', {
  resource: apiResource,
  method: 'POST',
  handler: lambdaFunction
});
```

**Serverless Schedule Events:**
```yaml
events:
  - schedule: cron(0 14 ? * MON-FRI *)
```

**CDK EventBridge:**
```typescript
const rule = new events.Rule(this, 'ScheduleRule', {
  schedule: events.Schedule.expression('cron(0 14 ? * MON-FRI *)')
});
rule.addTarget(new targets.LambdaFunction(lambdaFunction));
```

**Serverless S3 Events:**
```yaml
events:
  - s3:
      bucket: bucketName
      event: s3:ObjectCreated:*
```

**CDK S3 Notifications:**
```typescript
bucket.addEventNotification(
  s3.EventType.OBJECT_CREATED,
  new s3n.LambdaDestination(lambdaFunction)
);
```

### 5. IAM Permissions
**Serverless:**
```yaml
provider:
  iam:
    role:
      statements:
        - Effect: Allow
          Action: [ses:SendEmail]
          Resource: '*'
```

**CDK:**
```typescript
// Using grant methods
bucket.grantReadWrite(lambdaFunction);
secret.grantRead(lambdaFunction);

// Or PolicyStatement
lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['ses:SendEmail'],
  resources: ['*']
}));
```

### 6. Timeout and Memory
**Serverless:**
```yaml
timeout: 60
memorySize: 1024
ephemeralStorageSize: 2048
```

**CDK:**
```typescript
timeout: Duration.seconds(60),
memorySize: 1024,
ephemeralStorageSize: Size.mebibytes(2048)
```

This comprehensive guide covers all Lambda functions across all services in the managed care review application, providing clear line-by-line mapping between serverless and CDK configurations.

---

## ui-auth Service (Cognito/Authentication)

### Complete Line-by-Line Cognito Infrastructure Mapping

The ui-auth service manages authentication via AWS Cognito, integrating with Okta SAML provider. This service doesn't contain Lambda functions but provides critical authentication infrastructure used by all other services.

### Cognito User Pool - Complete Mapping

#### Serverless Configuration (ui-auth/serverless.yml)
```yaml
# Provider Configuration
provider:
  name: aws
  runtime: nodejs20.x                            # CDK: Not applicable for Cognito
  region: us-east-1                              # CDK: Stack.of(this).region
  iam:
    role:
      path: ${self:custom.iamPath}              # CDK: role.path
      permissionsBoundary: ${self:custom.iamPermissionsBoundary}
      statements:
        - Effect: 'Allow'
          Action:
            - '*'
          Resource: !GetAtt CognitoUserPool.Arn # CDK: Automatic with Cognito constructs

# Custom Variables
custom:
  stage: ${opt:stage, self:provider.stage}      # CDK: this.stage
  region: ${aws:region}                          # CDK: this.region
  document_uploads_bucket_arn: ${cf:uploads...}  # CDK: Cross-stack references
  qa_uploads_bucket_arn: ${cf:uploads...}        # CDK: Cross-stack references
  api_gateway_rest_api_name: ${cf:infra-api...} # CDK: ServiceRegistry.getApiId()
  application_endpoint_url: ${cf:ui...}          # CDK: props.applicationUrl
  okta_metadata_url: ${ssm:/configuration/okta_metadata_url}
  sesSourceEmailAddress: ${ssm:/configuration/email/sourceAddress}

# User Pool Resource
CognitoUserPool:
  Type: AWS::Cognito::UserPool
  Properties:
    UserPoolName: ${sls:stage}-user-pool         # CDK: userPoolName
    AdminCreateUserConfig:                       # CDK: selfSignUpEnabled: false
      AllowAdminCreateUserOnly: true
    UsernameAttributes:                          # CDK: signInAliases
      - email
    AutoVerifiedAttributes:                      # CDK: autoVerify
      - email
    EmailConfiguration:                          # CDK: email
      Fn::If:
        - CreateEmailConfiguration
        - EmailSendingAccount: DEVELOPER         # CDK: UserPoolEmail.withSES
          SourceArn: !Sub arn:aws:ses...
        - !Ref AWS::NoValue
    Schema:                                      # CDK: standardAttributes + customAttributes
      - Name: given_name                         # CDK: standardAttributes.givenName
        AttributeDataType: String
        Mutable: true
        Required: false
      - Name: family_name                        # CDK: standardAttributes.familyName
        AttributeDataType: String
        Mutable: true
        Required: false
      - Name: state_code                         # CDK: customAttributes.stateCode
        AttributeDataType: String
        Mutable: true
        Required: false
      - Name: phone_number                       # CDK: standardAttributes.phoneNumber
        AttributeDataType: String
        Mutable: true
        Required: false
      - Name: role                               # CDK: customAttributes.role
        AttributeDataType: String
        Mutable: true
        Required: false
```

### User Pool Client - Complete Mapping

```yaml
# User Pool Client Resource
CognitoUserPoolClient:
  Type: AWS::Cognito::UserPoolClient
  Properties:
    ClientName: ${sls:stage}-user-pool-client    # CDK: clientName
    AllowedOAuthFlows:                           # CDK: oAuth.flows
      - implicit                                 # CDK: implicitCodeGrant: true
    AllowedOAuthFlowsUserPoolClient: true        # CDK: Automatic with oAuth
    AllowedOAuthScopes:                          # CDK: oAuth.scopes
      - email                                    # CDK: OAuthScope.EMAIL
      - openid                                   # CDK: OAuthScope.OPENID
    CallbackURLs:                                # CDK: oAuth.callbackUrls
      - ${self:custom.application_endpoint_url}
      - http://localhost:3000/
      - http://localhost:3003/
    DefaultRedirectURI: ${self:custom.application_endpoint_url}
    ExplicitAuthFlows:                           # CDK: authFlows
      - ADMIN_NO_SRP_AUTH                        # CDK: adminUserPassword: true
    GenerateSecret: false                        # CDK: generateSecret: false
    LogoutURLs:                                  # CDK: oAuth.logoutUrls
      - ${self:custom.application_endpoint_url}
      - http://localhost:3000/
      - http://localhost:3003/
    SupportedIdentityProviders:                  # CDK: supportedIdentityProviders
      - Okta                                     # CDK: UserPoolClientIdentityProvider.custom('Okta')
    UserPoolId: !Ref CognitoUserPool             # CDK: userPool prop
  DependsOn: CognitoUserPoolIdentityProvider     # CDK: Automatic dependency management
```

### Identity Provider (SAML/Okta) - Complete Mapping

```yaml
# User Pool Domain Resource
UserPoolDomain:
  Type: AWS::Cognito::UserPoolDomain
  Properties:
    Domain:                                      # CDK: cognitoDomain.domainPrefix
      Fn::Join:
        - ''
        - - ${sls:stage}-login-
          - Ref: CognitoUserPoolClient
    UserPoolId: !Ref CognitoUserPool             # CDK: userPool prop

# Identity Provider (SAML/Okta) Resource
CognitoUserPoolIdentityProvider:
  Type: AWS::Cognito::UserPoolIdentityProvider
  Properties:
    AttributeMapping:                            # CDK: attributeMapping
      email: http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress
      'custom:state_code': state                 # CDK: custom: { stateCode: ProviderAttribute.other('state') }
      'custom:role': cmsRoles                    # CDK: custom: { role: ProviderAttribute.other('cmsRoles') }
      given_name: firstName                      # CDK: givenName: ProviderAttribute.other('firstName')
      family_name: lastName                      # CDK: familyName: ProviderAttribute.other('lastName')
    IdpIdentifiers:
      - IdpIdentifier                            # CDK: identifiers (optional)
    ProviderDetails:
      MetadataURL: ${self:custom.okta_metadata_url}  # CDK: metadata.metadataContent
      IDPSignout: 'true'                         # CDK: idpSignOut: true
    ProviderName: Okta                           # CDK: name
    ProviderType: SAML                           # CDK: UserPoolIdentityProviderSaml
    UserPoolId: !Ref CognitoUserPool             # CDK: userPool prop
```

### Identity Pool and IAM Roles - Complete Mapping

```yaml
# Identity Pool Resource
CognitoIdentityPool:
  Type: AWS::Cognito::IdentityPool
  Properties:
    IdentityPoolName: ${sls:stage}IdentityPool   # CDK: identityPoolName
    AllowUnauthenticatedIdentities: false        # CDK: allowUnauthenticatedIdentities
    CognitoIdentityProviders:                    # CDK: cognitoIdentityProviders
      - ClientId: !Ref CognitoUserPoolClient     # CDK: clientId
        ProviderName: !GetAtt CognitoUserPool.ProviderName  # CDK: providerName

# Identity Pool Role Attachment Resource
CognitoIdentityPoolRoles:
  Type: AWS::Cognito::IdentityPoolRoleAttachment
  Properties:
    IdentityPoolId: !Ref CognitoIdentityPool
    Roles:
      authenticated: !GetAtt CognitoAuthRole.Arn  # CDK: authenticated role

# Authenticated Role for Identity Pool
CognitoAuthRole:
  Type: AWS::IAM::Role
  Properties:
    AssumeRolePolicyDocument:                    # CDK: assumedBy: FederatedPrincipal
      Version: '2012-10-17'
      Statement:
        - Effect: 'Allow'
          Principal:
            Federated: 'cognito-identity.amazonaws.com'
          Action:
            - 'sts:AssumeRoleWithWebIdentity'
          Condition:
            StringEquals:
              'cognito-identity.amazonaws.com:aud': !Ref CognitoIdentityPool
            'ForAnyValue:StringLike':
              'cognito-identity.amazonaws.com:amr': authenticated
    Policies:
      - PolicyName: 'CognitoAuthorizedPolicy'
        PolicyDocument:
          Version: '2012-10-17'
          Statement:
            - Effect: 'Allow'                    # CDK: Basic Cognito permissions
              Action:
                - 'mobileanalytics:PutEvents'
                - 'cognito-sync:*'
                - 'cognito-identity:*'
              Resource: '*'
            - Effect: 'Allow'                    # CDK: API Gateway access
              Action:
                - 'execute-api:Invoke'
              Resource: !Sub arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${self:custom.api_gateway_rest_api_name}/*
            - Effect: 'Allow'                    # CDK: S3 bucket access
              Action:
                - 's3:*'
              Resource:
                - ${self:custom.document_uploads_bucket_arn}/allusers/*
                - ${self:custom.qa_uploads_bucket_arn}/allusers/*
                - Fn::Join:
                    - ''
                    - - ${self:custom.document_uploads_bucket_arn}/private/
                      - '$'
                      - '{cognito-identity.amazonaws.com:sub}/*'
```

### CDK Implementation

```typescript
// In auth-stack.ts
export class AuthStack extends BaseStack {
  public readonly userPool: cognito.IUserPool;
  public readonly userPoolClient: cognito.IUserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;
  public readonly authenticatedRole: iam.IRole;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    // Get configuration from SSM and environment
    this.applicationUrl = this.getApplicationUrl();
    this.oktaMetadataUrl = ssm.StringParameter.valueForStringParameter(
      this, '/configuration/okta_metadata_url'
    );
    this.sesSourceEmail = ssm.StringParameter.valueForStringParameter(
      this, '/configuration/email/sourceAddress'
    );

    // Create Cognito resources
    this.createCognitoAuth();

    // Export values for cross-stack references
    this.exportValues();
  }

  private createCognitoAuth(): void {
    const cognitoAuth = new CognitoAuth(this, 'Auth', {
      stage: this.stage,
      securityConfig: this.stageConfig.security,
      applicationUrl: this.applicationUrl,
      oktaMetadataUrl: this.oktaMetadataUrl,
      sesSourceEmail: this.sesSourceEmail,
      documentUploadsBucketArn: Fn.importValue(`uploads-${this.stage}-DocumentUploadsBucketArn`),
      qaUploadsBucketArn: Fn.importValue(`uploads-${this.stage}-QAUploadsBucketArn`),
      apiGatewayRestApiId: ServiceRegistry.getApiId(this, this.stage),
    });

    this.userPool = cognitoAuth.userPool;
    this.userPoolClient = cognitoAuth.userPoolClient;
    this.identityPool = cognitoAuth.identityPool;
    this.authenticatedRole = cognitoAuth.authenticatedRole;
  }
}

// In CognitoAuth construct
export class CognitoAuth extends Construct {
  constructor(scope: Construct, id: string, props: CognitoAuthProps) {
    // 1. User Pool (replaces CognitoUserPool)
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${props.stage}-user-pool`,
      signInAliases: { email: true },
      autoVerify: { email: true },
      selfSignUpEnabled: false,
      userInvitation: {
        emailSubject: 'Welcome to Managed Care Review',
        emailBody: 'Hello {username}, your temporary password is {####}',
      },
      passwordPolicy: {
        minLength: 16,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      mfa: props.securityConfig.cognitoMfa === 'REQUIRED' 
        ? cognito.Mfa.REQUIRED 
        : cognito.Mfa.OFF,
      email: cognito.UserPoolEmail.withSES({
        fromEmail: props.sesSourceEmail,
        fromName: 'MCR System',
        replyTo: props.sesSourceEmail,
      }),
      standardAttributes: {
        email: { required: true, mutable: true },
        givenName: { required: false, mutable: true },
        familyName: { required: false, mutable: true },
        phoneNumber: { required: false, mutable: true },
      },
      customAttributes: {
        stateCode: new cognito.StringAttribute({ minLen: 2, maxLen: 2 }),
        role: new cognito.StringAttribute({ minLen: 1, maxLen: 100 }),
      },
    });

    // 2. SAML Provider (replaces CognitoUserPoolIdentityProvider)
    const samlProvider = new cognito.UserPoolIdentityProviderSaml(this, 'OktaProvider', {
      userPool: this.userPool,
      name: 'Okta',
      metadata: {
        metadataType: cognito.UserPoolIdentityProviderSamlMetadataType.URL,
        metadataContent: props.oktaMetadataUrl,
      },
      attributeMapping: {
        email: cognito.ProviderAttribute.other('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'),
        givenName: cognito.ProviderAttribute.other('firstName'),
        familyName: cognito.ProviderAttribute.other('lastName'),
        custom: {
          stateCode: cognito.ProviderAttribute.other('state'),
          role: cognito.ProviderAttribute.other('cmsRoles'),
        },
      },
      idpSignOut: true,
    });

    // 3. App Client (replaces CognitoUserPoolClient)
    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      clientName: `${props.stage}-user-pool-client`,
      generateSecret: false,
      authFlows: {
        adminUserPassword: true,
      },
      oAuth: {
        flows: {
          implicitCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
        ],
        callbackUrls: [
          `https://${props.applicationUrl}/`,
          'http://localhost:3000/',
          'http://localhost:3003/',
        ],
        logoutUrls: [
          `https://${props.applicationUrl}/`,
          'http://localhost:3000/',
          'http://localhost:3003/',
        ],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.custom('Okta'),
      ],
    });

    // 4. User Pool Domain (replaces UserPoolDomain)
    new cognito.UserPoolDomain(this, 'UserPoolDomain', {
      userPool: this.userPool,
      cognitoDomain: {
        domainPrefix: `${props.stage}-login-${this.userPoolClient.userPoolClientId}`,
      },
    });

    // 5. Identity Pool (replaces CognitoIdentityPool)
    this.identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      identityPoolName: `${props.stage}IdentityPool`,
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [{
        clientId: this.userPoolClient.userPoolClientId,
        providerName: this.userPool.userPoolProviderName,
      }],
    });

    // 6. Authenticated Role (replaces CognitoAuthRole)
    this.authenticatedRole = new iam.Role(this, 'AuthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
      inlinePolicies: {
        CognitoAuthorizedPolicy: new iam.PolicyDocument({
          statements: [
            // Basic Cognito permissions
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'mobileanalytics:PutEvents',
                'cognito-sync:*',
                'cognito-identity:*',
              ],
              resources: ['*'],
            }),
            // API Gateway access
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['execute-api:Invoke'],
              resources: [`arn:aws:execute-api:${Stack.of(this).region}:${Stack.of(this).account}:${props.apiGatewayRestApiId}/*`],
            }),
            // S3 bucket access
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:*'],
              resources: [
                `${props.documentUploadsBucketArn}/allusers/*`,
                `${props.qaUploadsBucketArn}/allusers/*`,
                `${props.documentUploadsBucketArn}/private/\${cognito-identity.amazonaws.com:sub}/*`,
              ],
            }),
          ],
        }),
      },
    });

    // 7. Role Attachment (replaces CognitoIdentityPoolRoles)
    new cognito.CfnIdentityPoolRoleAttachment(this, 'RoleAttachment', {
      identityPoolId: this.identityPool.ref,
      roles: {
        authenticated: this.authenticatedRole.roleArn,
      },
    });
  }
}
```

### Key Migration Notes for ui-auth

1. **No Lambda Functions**: The ui-auth service only contains Cognito infrastructure, no Lambda functions to migrate.

2. **Cross-Stack References**:
   - Serverless: Uses `${cf:stack-stage.OutputKey}` syntax
   - CDK: Uses `Fn.importValue()` or ServiceRegistry pattern

3. **SSM Parameters**:
   - Serverless: `${ssm:/path/to/parameter}`
   - CDK: `ssm.StringParameter.valueForStringParameter()`

4. **Conditional Resources**:
   - Serverless: Uses CloudFormation conditions
   - CDK: Uses TypeScript conditionals in code

5. **Email Configuration**:
   - Serverless: Complex conditional with SES configuration
   - CDK: Simplified with `UserPoolEmail.withSES()`

6. **Custom Attributes**:
   - Serverless: Defined in Schema array
   - CDK: Split between standardAttributes and customAttributes

7. **SAML Integration**:
   - Serverless: Manual attribute mapping with full URIs
   - CDK: Helper methods with ProviderAttribute

8. **Identity Pool**:
   - Serverless: Native CloudFormation resources
   - CDK: Mix of L2 constructs and CfnIdentityPool for advanced features

---

## Database Resources (RDS Aurora)

### PostgreSQL Aurora Serverless V2

#### Serverless Configuration (postgres/serverless.yml)
```yaml
# Database Cluster
PostgresAuroraV2:
  Type: AWS::RDS::DBCluster
  Condition: IsDevValProd
  DeletionPolicy: ${self:custom.deletionPolicy.${opt:stage}}
  Properties:
    Engine: aurora-postgresql                    # CDK: DatabaseClusterEngine.auroraPostgres
    DatabaseName: '${self:custom.databaseName}'  # CDK: defaultDatabaseName
    MasterUsername: !Sub '{{resolve:secretsmanager:${PostgresSecret}::username}}'
    MasterUserPassword: !Sub '{{resolve:secretsmanager:${PostgresSecret}::password}}'
    DBSubnetGroupName: !Ref PostgresSubnetGroup  # CDK: subnetGroup
    VpcSecurityGroupIds: ['${self:custom.sgId}'] # CDK: securityGroups
    CopyTagsToSnapshot: true                     # CDK: automatic
    BackupRetentionPeriod: ${self:custom.backupRetentionPeriod.${opt:stage}}
    EnableCloudwatchLogsExports:                 # CDK: cloudwatchLogsExports
      - postgresql
    ServerlessV2ScalingConfiguration:            # CDK: serverlessV2MinCapacity/MaxCapacity
      MinCapacity: 1
      MaxCapacity: 16

# Database Instance
PostgresAuroraV2Instance:
  Type: AWS::RDS::DBInstance
  DependsOn: PostgresAuroraV2
  Properties:
    Engine: aurora-postgresql
    DBInstanceClass: db.serverless               # CDK: ClusterInstance.serverlessV2()
    DBClusterIdentifier: !Ref PostgresAuroraV2
    AutoMinorVersionUpgrade: true

# Subnet Group
PostgresSubnetGroup:
  Type: AWS::RDS::DBSubnetGroup
  Properties:
    DBSubnetGroupDescription: postgres aurora serverless
    SubnetIds: '${self:custom.privateSubnets}'   # CDK: vpcSubnets

# Database Secret
PostgresSecret:
  Type: AWS::SecretsManager::Secret
  Properties:
    Name: 'aurora_${self:service}_${sls:stage}'
    Description: 'Dynamically generated password'
    GenerateSecretString:
      SecretStringTemplate: '{"username": "mcreviewadmin"}'
      GenerateStringKey: password
      PasswordLength: 30
      ExcludePunctuation: true

# Secret Attachment
SecretsRDSAttachment:
  Type: AWS::SecretsManager::SecretTargetAttachment
  Properties:
    SecretId: !Ref PostgresSecret
    TargetId: !Ref PostgresAuroraV2
    TargetType: AWS::RDS::DBCluster

# Rotation Schedule
PostgresSecretsRotationSchedule:
  Type: AWS::SecretsManager::RotationSchedule
  Condition: IsDevValProd
  Properties:
    SecretId: !Ref PostgresSecret
    RotationLambdaARN: !GetAtt RotatorLambdaFunction.Arn
    RotationRules:
      AutomaticallyAfterDays: 30
```

#### CDK Implementation
```typescript
// In database-ops-stack.ts
private createDatabase(): void {
  // Create Aurora Serverless V2
  const database = new AuroraServerlessV2(this, 'Database', {
    vpc: this.vpc,
    lambdaSecurityGroup: this.lambdaSecurityGroup,
    serviceName: SERVICES.POSTGRES,
    stage: this.stage,
    databaseName: `aurora_postgres_${this.stage}_${this.account}`,
    databaseConfig: this.stageConfig.database,
    rotatorFunction: this.rotatorFunction
  });

  this.database = database.cluster;
  this.databaseSecret = database.databaseSecret;
}

// In AuroraServerlessV2 construct
export class AuroraServerlessV2 extends Construct {
  constructor(scope: Construct, id: string, props: AuroraServerlessV2Props) {
    // 1. Credentials (replaces PostgresSecret)
    this.dbCredentials = rds.Credentials.fromGeneratedSecret('mcreviewadmin', {
      secretName: `aurora_${props.serviceName}_${props.stage}`,
      excludeCharacters: ' %+~`#$&*()|[]{}:;<>?!\'/@"\\',
    });

    // 2. Security Group (replaces VpcSecurityGroupIds)
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for Aurora Serverless v2',
      allowAllOutbound: false,
    });

    // 3. Subnet Group (replaces PostgresSubnetGroup)
    const subnetGroup = new rds.SubnetGroup(this, 'SubnetGroup', {
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      description: 'Subnet group for Aurora Serverless v2',
    });

    // 4. Parameter Group (additional in CDK)
    const parameterGroup = new rds.ParameterGroup(this, 'ParameterGroup', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_14_9,
      }),
      parameters: {
        'shared_preload_libraries': 'pg_stat_statements',
        'log_statement': 'all',
      },
    });

    // 5. Database Cluster (replaces PostgresAuroraV2 + PostgresAuroraV2Instance)
    this.cluster = new rds.DatabaseCluster(this, 'Cluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_14_9,
      }),
      credentials: this.dbCredentials,
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [dbSecurityGroup],
      serverlessV2MinCapacity: props.databaseConfig.minCapacity,
      serverlessV2MaxCapacity: props.databaseConfig.maxCapacity,
      backup: {
        retention: Duration.days(props.databaseConfig.backupRetentionDays),
        preferredWindow: '03:00-04:00',
      },
      deletionProtection: props.databaseConfig.deletionProtection,
      cloudwatchLogsExports: ['postgresql'],
      parameterGroup,
      subnetGroup,
      enableDataApi: props.databaseConfig.enableDataApi,
      storageEncrypted: true,
      defaultDatabaseName: props.databaseName,
      writer: rds.ClusterInstance.serverlessV2('writer'),
      readers: props.stage === 'prod' ? [
        rds.ClusterInstance.serverlessV2('reader', { scaleWithWriter: true })
      ] : [],
    });

    // 6. Secret rotation (replaces PostgresSecretsRotationSchedule)
    if (props.databaseConfig.secretRotationDays && props.rotatorFunction) {
      new secretsmanager.RotationSchedule(this, 'RotationSchedule', {
        secret: this.databaseSecret,
        rotationLambda: props.rotatorFunction,
        automaticallyAfter: Duration.days(props.databaseConfig.secretRotationDays),
      });
    }
  }
}
```

---

## Authentication Resources (Cognito)

### Cognito User Pool and Identity Pool

#### Serverless Configuration (ui-auth/serverless.yml)
```yaml
# User Pool
CognitoUserPool:
  Type: AWS::Cognito::UserPool
  Properties:
    UserPoolName: ${sls:stage}-users            # CDK: userPoolName
    UsernameAttributes:                          # CDK: signInAliases
      - email
    AutoVerifiedAttributes:                      # CDK: autoVerify
      - email
    AdminCreateUserConfig:                       # CDK: selfSignUpEnabled: false
      AllowAdminCreateUserOnly: true
      UnusedAccountValidityDays: 7
    EmailConfiguration:                          # CDK: email
      EmailSendingAccount: DEVELOPER
      From: ${self:custom.sesSourceEmailAddress}
      SourceArn: !GetAtt CognitoUserPoolEmailRole.Arn
    PasswordPolicy:                              # CDK: passwordPolicy
      MinimumLength: 16
      RequireLowercase: true
      RequireUppercase: true
      RequireNumbers: true
      RequireSymbols: true
    AccountRecoverySetting:                      # CDK: accountRecovery
      RecoveryMechanisms:
        - Name: verified_email
          Priority: 1
    UserAttributeUpdateSettings:                 # CDK: keepOriginal for email
      AttributesRequireVerificationBeforeUpdate:
        - email
    Policies:
      PasswordPolicy:
        MinimumLength: 16
        RequireLowercase: true
        RequireUppercase: true
        RequireNumbers: true
        RequireSymbols: true

# User Pool Client
CognitoUserPoolClient:
  Type: AWS::Cognito::UserPoolClient
  Properties:
    ClientName: ${sls:stage}-users               # CDK: clientName
    UserPoolId: !Ref CognitoUserPool            # CDK: userPool
    ExplicitAuthFlows:                          # CDK: authFlows
      - ALLOW_USER_PASSWORD_AUTH
      - ALLOW_REFRESH_TOKEN_AUTH
    IdTokenValidity: 30                         # CDK: idTokenValidity
    RefreshTokenValidity: 24                    # CDK: refreshTokenValidity
    AccessTokenValidity: 30                     # CDK: accessTokenValidity
    TokenValidityUnits:                         # CDK: Duration.minutes/hours
      AccessToken: minutes
      IdToken: minutes
      RefreshToken: hours
    GenerateSecret: false                       # CDK: generateSecret
    AllowedOAuthScopes:                         # CDK: oAuth.scopes
      - email
      - openid
      - profile
    AllowedOAuthFlows:                          # CDK: oAuth.flows
      - code
    AllowedOAuthFlowsUserPoolClient: true
    SupportedIdentityProviders:                 # CDK: supportedIdentityProviders
      - !Ref OktaSamlProvider
    CallbackURLs:                               # CDK: oAuth.callbackUrls
      - 'https://${self:custom.application_endpoint_url}/'
    LogoutURLs:                                 # CDK: oAuth.logoutUrls
      - 'https://${self:custom.application_endpoint_url}/'

# SAML Provider
OktaSamlProvider:
  Type: AWS::Cognito::UserPoolIdentityProvider
  Properties:
    UserPoolId: !Ref CognitoUserPool
    ProviderName: Okta                          # CDK: name
    ProviderDetails:                            # CDK: metadata
      MetadataURL: ${self:custom.okta_metadata_url}
    ProviderType: SAML
    AttributeMapping:                           # CDK: attributeMapping
      email: mail
      given_name: givenName
      family_name: sn
      custom:stateCode: stateCode
      custom:role: role

# Identity Pool
CognitoIdentityPool:
  Type: AWS::Cognito::IdentityPool
  Properties:
    IdentityPoolName: ${sls:stage}_users
    AllowUnauthenticatedIdentities: false       # CDK: allowUnauthenticatedIdentities
    CognitoIdentityProviders:                   # CDK: cognitoIdentityProviders
      - ClientId: !Ref CognitoUserPoolClient
        ProviderName: !GetAtt CognitoUserPool.ProviderName

# Identity Pool Role Attachment
CognitoIdentityPoolRoleAttachment:
  Type: AWS::Cognito::IdentityPoolRoleAttachment
  Properties:
    IdentityPoolId: !Ref CognitoIdentityPool
    Roles:                                      # CDK: roles
      authenticated: !GetAtt CognitoAuthRole.Arn
      unauthenticated: !GetAtt CognitoUnauthRole.Arn

# User Pool Domain
CognitoUserPoolDomain:
  Type: AWS::Cognito::UserPoolDomain
  Properties:
    Domain: mcr-${sls:stage}                    # CDK: cognitoDomain.domainPrefix
    UserPoolId: !Ref CognitoUserPool
```

#### CDK Implementation
```typescript
// In auth-stack.ts
private createCognitoAuth(): void {
  const cognitoAuth = new CognitoAuth(this, 'Auth', {
    stage: this.stage,
    securityConfig: this.stageConfig.security,
    applicationUrl: this.applicationUrl,
    oktaMetadataUrl: this.oktaMetadataUrl,
    sesSourceEmail: this.sesSourceEmail,
  });

  this.userPool = cognitoAuth.userPool;
  this.userPoolClient = cognitoAuth.userPoolClient;
  this.identityPool = cognitoAuth.identityPool;
  this.authenticatedRole = cognitoAuth.authenticatedRole;
}

// In CognitoAuth construct
export class CognitoAuth extends Construct {
  constructor(scope: Construct, id: string, props: CognitoAuthProps) {
    // 1. User Pool (replaces CognitoUserPool)
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${props.stage}-users`,
      signInAliases: { email: true },
      autoVerify: { email: true },
      selfSignUpEnabled: false,
      userInvitation: {
        emailSubject: 'Welcome to Managed Care Review',
        emailBody: 'Hello {username}, your temporary password is {####}',
      },
      passwordPolicy: {
        minLength: 16,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      mfa: props.securityConfig.cognitoMfa === 'REQUIRED' 
        ? cognito.Mfa.REQUIRED 
        : cognito.Mfa.OFF,
      email: cognito.UserPoolEmail.withSES({
        fromEmail: props.sesSourceEmail,
        fromName: 'MCR System',
        replyTo: props.sesSourceEmail,
      }),
      standardAttributes: {
        email: { required: true, mutable: true },
        givenName: { required: true, mutable: true },
        familyName: { required: true, mutable: true },
      },
      customAttributes: {
        stateCode: new cognito.StringAttribute({ minLen: 2, maxLen: 2 }),
        role: new cognito.StringAttribute({ minLen: 1, maxLen: 100 }),
      },
    });

    // 2. SAML Provider (replaces OktaSamlProvider)
    const samlProvider = new cognito.UserPoolIdentityProviderSaml(this, 'OktaProvider', {
      userPool: this.userPool,
      name: 'Okta',
      metadata: {
        metadataType: cognito.UserPoolIdentityProviderSamlMetadataType.URL,
        metadataContent: props.oktaMetadataUrl,
      },
      attributeMapping: {
        email: cognito.ProviderAttribute.SAML_MAIL,
        givenName: cognito.ProviderAttribute.SAML_GIVEN_NAME,
        familyName: cognito.ProviderAttribute.SAML_FAMILY_NAME,
        custom: {
          stateCode: cognito.ProviderAttribute.other('stateCode'),
          role: cognito.ProviderAttribute.other('role'),
        },
      },
    });

    // 3. App Client (replaces CognitoUserPoolClient)
    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      clientName: `${props.stage}-users`,
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
        custom: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [`https://${props.applicationUrl}/`],
        logoutUrls: [`https://${props.applicationUrl}/`],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.SAML,
      ],
      idTokenValidity: Duration.minutes(30),
      accessTokenValidity: Duration.minutes(30),
      refreshTokenValidity: Duration.hours(24),
    });

    // 4. Identity Pool (replaces CognitoIdentityPool)
    this.identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      identityPoolName: `${props.stage}_users`,
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [{
        clientId: this.userPoolClient.userPoolClientId,
        providerName: this.userPool.userPoolProviderName,
      }],
    });

    // 5. Authenticated Role (replaces CognitoAuthRole)
    this.authenticatedRole = new iam.Role(this, 'AuthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    // 6. Role Attachment (replaces CognitoIdentityPoolRoleAttachment)
    new cognito.CfnIdentityPoolRoleAttachment(this, 'RoleAttachment', {
      identityPoolId: this.identityPool.ref,
      roles: {
        authenticated: this.authenticatedRole.roleArn,
      },
    });

    // 7. User Pool Domain (replaces CognitoUserPoolDomain)
    new cognito.UserPoolDomain(this, 'UserPoolDomain', {
      userPool: this.userPool,
      cognitoDomain: {
        domainPrefix: `mcr-${props.stage}`,
      },
    });
  }
}
```

---

## Storage Resources (S3)

### S3 Buckets with Security Policies

#### Serverless Configuration (uploads/serverless.yml)
```yaml
# Document Uploads Bucket
DocumentUploadsBucket:
  Type: AWS::S3::Bucket
  Properties:
    BucketName: !Sub ${self:service}-${sls:stage}-uploads-${AWS::AccountId}
    BucketEncryption:                           # CDK: encryption
      ServerSideEncryptionConfiguration:
        - ServerSideEncryptionByDefault:
            SSEAlgorithm: AES256
    CorsConfiguration:                          # CDK: cors
      CorsRules:
        - AllowedOrigins:
            - '*'
          AllowedHeaders:
            - '*'
          AllowedMethods:
            - GET
            - PUT
            - POST
            - DELETE
            - HEAD
          MaxAge: 3000
          ExposedHeaders:
            - ETag
    NotificationConfiguration:                  # CDK: addEventNotification
      LambdaConfigurations:
        - Event: s3:ObjectCreated:*
          Function: !GetAtt AvScanLambdaFunction.Arn

# Bucket Policy
DocumentsUploadsBucketPolicy:
  Type: AWS::S3::BucketPolicy
  Properties:
    Bucket: !Ref DocumentUploadsBucket
    PolicyDocument:
      Statement:
        - Action:                               # CDK: addToResourcePolicy
            - 's3:GetObject'
          Effect: 'Deny'
          Resource:
            - !Sub ${DocumentUploadsBucket.Arn}/*
          Principal: '*'
          Condition:
            StringNotEquals:
              s3:ExistingObjectTag/virusScanStatus:
                - 'CLEAN'
              aws:PrincipalArn: !GetAtt IamRoleLambdaExecution.Arn
        - Action: 's3:PutObject'                # CDK: file type restrictions
          Effect: Deny
          Principal: '*'
          NotResource:
            - !Sub ${DocumentUploadsBucket.Arn}/*.csv
            - !Sub ${DocumentUploadsBucket.Arn}/*.doc
            - !Sub ${DocumentUploadsBucket.Arn}/*.docx
            - !Sub ${DocumentUploadsBucket.Arn}/*.pdf
        - Effect: Deny                          # CDK: enforceSSL: true
          Action: 's3:*'
          Principal: '*'
          Condition:
            Bool:
              'aws:SecureTransport': false
          Resource:
            - !Sub ${DocumentUploadsBucket.Arn}
            - !Sub ${DocumentUploadsBucket.Arn}/*

# Lambda Invoke Permission
LambdaInvokePermission:
  Type: AWS::Lambda::Permission
  Properties:
    FunctionName: !GetAtt AvScanLambdaFunction.Arn
    Action: lambda:InvokeFunction
    Principal: s3.amazonaws.com
    SourceAccount: !Sub ${AWS::AccountId}
    SourceArn: !Sub arn:aws:s3:::${self:service}-${sls:stage}-uploads-${AWS::AccountId}
```

#### CDK Implementation
```typescript
// In data-stack.ts
private createBuckets(): void {
  // Document uploads bucket
  this.documentUploadsBucket = new SecureS3Bucket(this, 'DocumentUploadsBucket', {
    bucketName: `${SERVICES.UPLOADS}-${this.stage}-uploads-${this.account}`,
    stage: this.stage,
    corsEnabled: true,
    virusScanningEnabled: true,
    scannerRoleArn: this.avScanFunction.role.roleArn,
    allowedFileTypes: ['.csv', '.doc', '.docx', '.pdf', '.txt', '.xls', '.xlsx', '.zip'],
    lambdaTrigger: this.avScanFunction,
    versioned: false,
    lifecycleRules: [{
      id: 'delete-incomplete-uploads',
      abortIncompleteMultipartUploadAfter: Duration.days(7),
    }],
  });
}

// In SecureS3Bucket construct
export class SecureS3Bucket extends Construct {
  constructor(scope: Construct, id: string, props: SecureS3BucketProps) {
    // 1. Bucket creation (replaces DocumentUploadsBucket)
    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: props.bucketName,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true, // Replaces SSL deny policy
      versioned: props.versioned ?? false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: props.stage === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: props.stage !== 'prod',
      lifecycleRules: props.lifecycleRules,
      cors: props.corsEnabled ? [{
        allowedOrigins: ['*'],
        allowedMethods: [
          s3.HttpMethods.GET,
          s3.HttpMethods.PUT,
          s3.HttpMethods.POST,
          s3.HttpMethods.DELETE,
          s3.HttpMethods.HEAD,
        ],
        allowedHeaders: ['*'],
        exposedHeaders: ['ETag'],
        maxAge: 3000,
      }] : undefined,
    });

    // 2. Virus scanning policy (replaces part of DocumentsUploadsBucketPolicy)
    if (props.virusScanningEnabled) {
      this.bucket.addToResourcePolicy(new iam.PolicyStatement({
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ['s3:GetObject'],
        resources: [`${this.bucket.bucketArn}/*`],
        conditions: {
          StringNotEquals: {
            's3:ExistingObjectTag/virusScanStatus': 'CLEAN',
          },
          StringNotLike: {
            'aws:PrincipalArn': props.scannerRoleArn,
          },
        },
      }));
    }

    // 3. File type restrictions (replaces NotResource policy)
    if (props.allowedFileTypes) {
      const allowedResources = props.allowedFileTypes.map(ext => 
        `${this.bucket.bucketArn}/*${ext}`
      );
      
      this.bucket.addToResourcePolicy(new iam.PolicyStatement({
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ['s3:PutObject'],
        notResources: allowedResources,
      }));
    }

    // 4. Event notifications (replaces NotificationConfiguration)
    if (props.lambdaTrigger) {
      this.bucket.addEventNotification(
        s3.EventType.OBJECT_CREATED,
        new s3n.LambdaDestination(props.lambdaTrigger),
        props.notificationPrefix ? { prefix: props.notificationPrefix } : undefined
      );
      
      // Grant invoke permission (replaces LambdaInvokePermission)
      props.lambdaTrigger.grantInvoke(new iam.ServicePrincipal('s3.amazonaws.com'));
    }
  }
}
```

---

## Network Resources (VPC)

### VPC and Security Groups

#### Serverless Configuration
```yaml
# Custom VPC configuration
custom:
  vpcId: ${env:VPC_ID}                          # CDK: ec2.Vpc.fromLookup
  sgId: ${env:SG_ID}                            # CDK: SecurityGroup.fromSecurityGroupId
  privateSubnets:                               # CDK: Subnet.fromSubnetAttributes
    - ${env:SUBNET_PRIVATE_A_ID}
    - ${env:SUBNET_PRIVATE_B_ID}
    - ${env:SUBNET_PRIVATE_C_ID}
  publicSubnetA: ${env:SUBNET_PUBLIC_A_ID}

# VPC Endpoint (postgres/serverless.yml)
SecretsManagerVPCEndpoint:
  Type: AWS::EC2::VPCEndpoint
  Properties:
    SubnetIds: '${self:custom.privateSubnets}'
    SecurityGroupIds: ['${self:custom.sgId}']
    VpcEndpointType: Interface                  # CDK: InterfaceVpcEndpoint
    ServiceName:                                # CDK: InterfaceVpcEndpointAwsService
      Fn::Sub: com.amazonaws.${AWS::Region}.secretsmanager
    VpcId: ${self:custom.vpcId}

# Security Group (uploads/serverless.yml)
ClamAVSecurityGroup:
  Type: AWS::EC2::SecurityGroup
  Properties:
    GroupDescription: Security group for ClamAV daemon
    VpcId: ${self:custom.vpcId}
    SecurityGroupIngress:                       # CDK: addIngressRule
      - IpProtocol: tcp
        FromPort: 3310
        ToPort: 3310
        SourceSecurityGroupId: ${self:custom.sgId}
```

#### CDK Implementation
```typescript
// In foundation-stack.ts or compute-stack.ts
private importNetworkResources(): void {
  // Import VPC
  this.vpc = ec2.Vpc.fromLookup(this, 'VPC', {
    vpcId: process.env.VPC_ID!,
  });

  // Import subnets
  this.privateSubnets = [
    ec2.Subnet.fromSubnetAttributes(this, 'PrivateSubnetA', {
      subnetId: process.env.SUBNET_PRIVATE_A_ID!,
      availabilityZone: 'us-east-1a',
    }),
    ec2.Subnet.fromSubnetAttributes(this, 'PrivateSubnetB', {
      subnetId: process.env.SUBNET_PRIVATE_B_ID!,
      availabilityZone: 'us-east-1b',
    }),
    ec2.Subnet.fromSubnetAttributes(this, 'PrivateSubnetC', {
      subnetId: process.env.SUBNET_PRIVATE_C_ID!,
      availabilityZone: 'us-east-1c',
    }),
  ];

  // Create Lambda security group
  this.lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
    vpc: this.vpc,
    description: 'Security group for Lambda functions',
    allowAllOutbound: true,
  });

  // Self-referencing rule
  this.lambdaSecurityGroup.addIngressRule(
    this.lambdaSecurityGroup,
    ec2.Port.allTraffic(),
    'Allow Lambda functions to communicate'
  );

  // Create VPC endpoints
  this.createVpcEndpoints();
}

private createVpcEndpoints(): void {
  // S3 Gateway endpoint
  new ec2.GatewayVpcEndpoint(this, 'S3Endpoint', {
    vpc: this.vpc,
    service: ec2.GatewayVpcEndpointAwsService.S3,
    subnets: [{ subnets: this.privateSubnets }],
  });

  // Secrets Manager interface endpoint
  new ec2.InterfaceVpcEndpoint(this, 'SecretsManagerEndpoint', {
    vpc: this.vpc,
    service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
    subnets: { subnets: this.privateSubnets },
    privateDnsEnabled: true,
    securityGroups: [this.lambdaSecurityGroup],
  });

  // RDS interface endpoint
  new ec2.InterfaceVpcEndpoint(this, 'RDSEndpoint', {
    vpc: this.vpc,
    service: ec2.InterfaceVpcEndpointAwsService.RDS,
    subnets: { subnets: this.privateSubnets },
    privateDnsEnabled: true,
    securityGroups: [this.lambdaSecurityGroup],
  });
}
```

---

## Frontend Resources (CloudFront + S3)

### Static Website Hosting

#### Serverless Configuration (ui/serverless.yml)
```yaml
# S3 Bucket for static website
S3Bucket:
  Type: AWS::S3::Bucket
  DeletionPolicy: Delete
  Properties:
    WebsiteConfiguration:                       # CDK: Not needed with OAI
      IndexDocument: index.html
      ErrorDocument: index.html
    BucketEncryption:                          # CDK: encryption
      ServerSideEncryptionConfiguration:
        - ServerSideEncryptionByDefault:
            SSEAlgorithm: AES256
    CorsConfiguration:                         # CDK: cors
      CorsRules:
        - AllowedOrigins:
            - '*'
          AllowedHeaders:
            - Authorization
            - Content-Length
          AllowedMethods:
            - GET
          MaxAge: 3000

# Origin Access Identity
CloudFrontOriginAccessIdentity:
  Type: AWS::CloudFront::CloudFrontOriginAccessIdentity
  Properties:
    CloudFrontOriginAccessIdentityConfig:
      Comment: ${sls:stage}                    # CDK: comment

# Bucket Policy
S3BucketPolicy:
  Type: AWS::S3::BucketPolicy
  Properties:
    Bucket: !Ref S3Bucket
    PolicyDocument:
      Statement:
        - Sid: 'AllowCloudFrontAccessIdentity'
          Effect: Allow
          Action:
            - 's3:GetObject'
          Resource:
            - !Sub '${S3Bucket.Arn}/*'
          Principal:
            AWS: !Sub 'arn:aws:iam::cloudfront:user/CloudFront Origin Access Identity ${CloudFrontOriginAccessIdentity}'

# CloudFront Distribution
CloudFrontDistribution:
  Type: AWS::CloudFront::Distribution
  Properties:
    DistributionConfig:
      Origins:                                 # CDK: origin
        - DomainName: !GetAtt S3Bucket.RegionalDomainName
          Id: S3Origin
          S3OriginConfig:
            OriginAccessIdentity: !Sub origin-access-identity/cloudfront/${CloudFrontOriginAccessIdentity}
      Enabled: true
      HttpVersion: 'http2'
      Comment: ${sls:stage} distribution
      DefaultRootObject: index.html            # CDK: defaultRootObject
      CustomErrorResponses:                    # CDK: errorResponses
        - ErrorCode: 404
          ResponseCode: 200
          ResponsePagePath: /index.html
      DefaultCacheBehavior:                    # CDK: defaultBehavior
        AllowedMethods:
          - DELETE
          - GET
          - HEAD
          - OPTIONS
          - PATCH
          - POST
          - PUT
        Compress: true                         # CDK: compress
        TargetOriginId: S3Origin
        ForwardedValues:
          QueryString: false
          Headers:
            - Authorization
            - Origin
            - Referer
            - Accept
            - Content-Type
            - Access-Control-Request-Method
            - Access-Control-Request-Headers
          Cookies:
            Forward: none
        ViewerProtocolPolicy: redirect-to-https # CDK: viewerProtocolPolicy
      WebACLId: !GetAtt WafPluginAcl.Arn      # CDK: webAclId
      Restrictions:                            # CDK: geoRestriction
        GeoRestriction:
          RestrictionType: whitelist
          Locations:
            - US
```

#### CDK Implementation
```typescript
// In frontend-stack.ts
private createStaticWebsite(): void {
  this.staticWebsite = new StaticWebsite(this, 'Website', {
    domainName: this.domainName,
    stage: this.stage,
    certificateArn: this.certificateArn,
    websiteSourcePath: path.join(__dirname, '../../../ui/build'),
    logBucket: this.logBucket,
    hostedZone: this.hostedZone,
  });

  this.cloudFrontDistribution = this.staticWebsite.distribution;
  this.websiteBucket = this.staticWebsite.bucket;
}

// In StaticWebsite construct
export class StaticWebsite extends Construct {
  constructor(scope: Construct, id: string, props: StaticWebsiteProps) {
    // 1. S3 Bucket (replaces S3Bucket)
    this.bucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `${props.domainName}-${props.stage}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: props.stage === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: props.stage !== 'prod',
      cors: [{
        allowedOrigins: ['*'],
        allowedMethods: [s3.HttpMethods.GET],
        allowedHeaders: ['Authorization', 'Content-Length'],
        maxAge: 3000,
      }],
    });

    // 2. Origin Access Identity (replaces CloudFrontOriginAccessIdentity)
    const oai = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: `OAI for ${props.domainName}`,
    });

    // 3. Grant permissions (replaces S3BucketPolicy)
    this.bucket.grantRead(oai);

    // 4. WAF Web ACL
    const webAcl = new waf.CfnWebACL(this, 'WebAcl', {
      scope: 'CLOUDFRONT',
      defaultAction: { allow: {} },
      rules: [
        {
          name: 'GeoRestriction',
          priority: 1,
          action: { block: {} },
          statement: {
            notStatement: {
              statement: {
                geoMatchStatement: {
                  countryCodes: ['US'],
                },
              },
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'GeoRestriction',
          },
        },
      ],
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `${props.stage}-WebAcl`,
      },
    });

    // 5. CloudFront Distribution (replaces CloudFrontDistribution)
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(this.bucket, {
          originAccessIdentity: oai,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: new cloudfront.OriginRequestPolicy(this, 'OriginRequestPolicy', {
          headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList(
            'Authorization',
            'Origin',
            'Referer',
            'Accept',
            'Content-Type',
            'Access-Control-Request-Method',
            'Access-Control-Request-Headers'
          ),
        }),
        responseHeadersPolicy: this.createResponseHeadersPolicy(),
      },
      domainNames: props.certificateArn ? [props.domainName] : undefined,
      certificate: props.certificateArn 
        ? acm.Certificate.fromCertificateArn(this, 'Certificate', props.certificateArn)
        : undefined,
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.seconds(0),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.seconds(0),
        },
      ],
      httpVersion: cloudfront.HttpVersion.HTTP2,
      comment: `${props.stage} distribution`,
      webAclId: webAcl.attrArn,
      geoRestriction: cloudfront.GeoRestriction.allowlist('US'),
      priceClass: props.stage === 'prod'
        ? cloudfront.PriceClass.PRICE_CLASS_ALL
        : cloudfront.PriceClass.PRICE_CLASS_100,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    // 6. Deployment
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(props.websiteSourcePath)],
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
      memoryLimit: 512,
    });
  }

  private createResponseHeadersPolicy(): cloudfront.ResponseHeadersPolicy {
    return new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
      securityHeadersBehavior: {
        contentTypeOptions: { override: true },
        frameOptions: { 
          frameOption: cloudfront.HeadersFrameOption.DENY,
          override: true 
        },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
        strictTransportSecurity: {
          accessControlMaxAge: Duration.seconds(31536000),
          includeSubdomains: true,
          preload: true,
          override: true,
        },
        xssProtection: {
          mode: cloudfront.HeadersXssProtection.BLOCK,
          protection: true,
          override: true,
        },
      },
    });
  }
}
```

---

## API Gateway Resources

### REST API with WAF

#### Serverless Configuration (app-api/serverless.yml)
```yaml
# API Gateway (imported from infra-api)
provider:
  apiGateway:
    restApiId: ${self:custom.appApiGatewayId}
    restApiRootResourceId: ${self:custom.appApiGatewayRootResourceId}

# WAF Association
ApiGwWebAclAssociation:
  Type: AWS::WAFv2::WebACLAssociation
  DependsOn:
    - ApiGatewayMethodHealthcheckGet
    - ApiGatewayMethodOtelPost
    # ... other methods
  Properties:
    ResourceArn: arn:aws:apigateway:${self:provider.region}::/restapis/${self:custom.appApiGatewayId}/stages/${sls:stage}
    WebACLArn: ${self:custom.appApiWafAclArn}
```

#### CDK Implementation
```typescript
// In api-compute-stack.ts
private createApiResources(): void {
  // Create WAF-protected API
  const wafApi = new WafProtectedApi(this, 'Api', {
    apiName: SERVICES.INFRA_API,
    stage: this.stage,
    securityConfig: this.stageConfig.security,
    description: 'Managed Care Review API Gateway',
    binaryMediaTypes: ['multipart/form-data', 'application/pdf'],
  });

  this.api = wafApi.api;
  this.apiUrl = wafApi.url;
}

// In WafProtectedApi construct
export class WafProtectedApi extends Construct {
  constructor(scope: Construct, id: string, props: WafProtectedApiProps) {
    // 1. Create API Gateway
    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: ResourceNames.resourceName(props.apiName, 'api', props.stage),
      description: props.description,
      deployOptions: {
        stageName: props.stage,
        tracingEnabled: true,
        dataTraceEnabled: props.stage !== 'prod',
        loggingLevel: props.stage === 'prod' 
          ? apigateway.MethodLoggingLevel.ERROR 
          : apigateway.MethodLoggingLevel.INFO,
        metricsEnabled: true,
        methodOptions: {
          '/*/*': {
            throttlingRateLimit: props.securityConfig.apiThrottleRate,
            throttlingBurstLimit: props.securityConfig.apiThrottleBurst,
          },
        },
        accessLogDestination: new apigateway.LogGroupLogDestination(this.logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Amz-User-Agent',
        ],
        allowCredentials: true,
        maxAge: Duration.hours(1),
      },
      binaryMediaTypes: props.binaryMediaTypes,
      minimumCompressionSize: 1024,
      endpointTypes: [apigateway.EndpointType.REGIONAL],
    });

    // 2. Create and attach WAF
    if (props.securityConfig.wafEnabled) {
      const wafApiConstruct = new WafwebaclToApiGateway(this, 'WafApi', {
        existingApiGatewayInterface: this.api,
        webaclProps: {
          scope: 'REGIONAL',
          defaultAction: { allow: {} },
          rules: this.getWafRules(props.stage, props.securityConfig),
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: `${props.apiName}-${props.stage}-waf`,
          },
        },
      });
      
      this.webAcl = wafApiConstruct.webacl;
    }
  }
}
```

---

## Key Migration Patterns Summary

### 1. Resource References
**Serverless:** `!Ref ResourceName` or `!GetAtt Resource.Attribute`  
**CDK:** Direct property access: `resource.property`

### 2. Conditional Resources
**Serverless:** `Condition: IsDevValProd`  
**CDK:** `if (props.stage === 'prod') { ... }`

### 3. Dynamic Values
**Serverless:** `${self:custom.value}` or `${sls:stage}`  
**CDK:** `props.value` or `this.stage`

### 4. Intrinsic Functions
**Serverless:** `!Sub`, `!Join`, `Fn::If`  
**CDK:** Template literals, array methods, ternary operators

### 5. Cross-Stack References
**Serverless:** `${cf:stack-name.OutputKey}`  
**CDK:** ServiceRegistry pattern or stack exports/imports

### 6. Environment Variables
**Serverless:** `${env:VARIABLE_NAME}`  
**CDK:** `process.env.VARIABLE_NAME`

### 7. SSM Parameters
**Serverless:** `${ssm:/path/to/parameter}`  
**CDK:** `ssm.StringParameter.valueForStringParameter(this, '/path/to/parameter')`

### 8. Secrets Manager
**Serverless:** `!Sub '{{resolve:secretsmanager:${Secret}::password}}'`  
**CDK:** `secret.secretValue` or `secret.secretValueFromJson('password')`

This comprehensive guide covers all resources across all services in the managed care review application, providing clear line-by-line mapping between serverless and CDK configurations.

---

## infra-api Service (API Gateway & WAF)

### Complete Line-by-Line API Gateway Infrastructure Mapping

The infra-api service creates the main API Gateway that all other services attach to, along with WAF protection and monitoring infrastructure.

### API Gateway Resource - Complete Mapping

#### Serverless Configuration (infra-api/serverless.yml)
```yaml
# Provider Configuration
provider:
  name: aws
  runtime: nodejs20.x                            # CDK: Not used for infra-only stack
  region: us-east-1                              # CDK: Stack.of(this).region
  iam:
    role:
      path: ${self:custom.iamPath}              # CDK: role.path
      permissionsBoundary: ${self:custom.iamPermissionsBoundary}
      statements:
        - Effect: 'Allow'
          Action:
            - '*'
          Resource: !GetAtt FirehoseStreamToNewRelic.Arn

# Custom Variables
custom:
  stage: ${opt:stage, self:provider.stage}      # CDK: this.stage
  wafExcludeRules:                               # CDK: wafConfig.excludeRules
    awsCommon:
      - 'SizeRestrictions_BODY'
  nrLicenseKey: ${ssm:/configuration/nr_license_key}
  nrMetricStreamName: 'NewRelic-Metric-Stream'   # CDK: monitoring configuration
  nrFirehoseStreamName: 'NewRelic-Delivery-Stream'
  nrExternalId: '3407984'
  webAclName: ${self:custom.stage}-${self:service}-webacl  # CDK: wafConfig.aclName

# Main API Gateway Resource
AppApiGateway:
  Type: AWS::ApiGateway::RestApi
  Properties:
    Name: ${self:service}-${sls:stage}-app-api-gateway  # CDK: restApiName

# Gateway Responses for CORS
GatewayResponseDefault4XX:
  Type: 'AWS::ApiGateway::GatewayResponse'
  Properties:
    ResponseParameters:                          # CDK: defaultCorsPreflightOptions
      gatewayresponse.header.Access-Control-Allow-Origin: "'*'"
      gatewayresponse.header.Access-Control-Allow-Headers: "'*'"
    ResponseType: DEFAULT_4XX                    # CDK: addGatewayResponse
    RestApiId: !Ref AppApiGateway

GatewayResponseDefault5XX:
  Type: 'AWS::ApiGateway::GatewayResponse'
  Properties:
    ResponseParameters:
      gatewayresponse.header.Access-Control-Allow-Origin: "'*'"
      gatewayresponse.header.Access-Control-Allow-Headers: "'*'"
    ResponseType: DEFAULT_5XX
    RestApiId: !Ref AppApiGateway
```

### WAF Configuration - Complete Mapping

```yaml
# WAF Plugin Configuration (via serverless plugin)
plugins:
  - '@enterprise-cmcs/serverless-waf-plugin'

custom:
  wafExcludeRules:                               # CDK: WafProtectedApi construct
    awsCommon:
      - 'SizeRestrictions_BODY'                  # CDK: excludedRules prop
  webAclName: ${self:custom.stage}-${self:service}-webacl
```

### NewRelic Monitoring Infrastructure - Complete Mapping

```yaml
# NewRelic Integration Role
NewRelicInfraIntegrations:
  Type: AWS::IAM::Role
  Condition: CreateNRInfraMonitoring             # CDK: if (stage !== 'local')
  Properties:
    RoleName: NewRelicInfraIntegrations          # CDK: roleName
    AssumeRolePolicyDocument:
      Version: '2012-10-17'
      Statement:
        - Effect: Allow
          Principal:
            AWS:
              - 'arn:aws:iam::754728514883:root'  # CDK: NewRelic AWS account
          Action:
            - 'sts:AssumeRole'
          Condition:
            StringEquals:
              'sts:ExternalId': ${self:custom.nrExternalId}
    Policies:
      - PolicyName: NewRelicBudgetPolicy
        PolicyDocument:
          Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Action: 'budgets:ViewBudget'
              Resource: '*'

# Kinesis Firehose for Metrics
FirehoseStreamToNewRelic:
  Type: AWS::KinesisFirehose::DeliveryStream
  Condition: CreateNRInfraMonitoring
  Properties:
    DeliveryStreamName: ${self:custom.nrFirehoseStreamName}
    DeliveryStreamType: DirectPut
    HttpEndpointDestinationConfiguration:
      EndpointConfiguration:
        Url: 'https://aws-api.newrelic.com/cloudwatch-metrics/v1'
        AccessKey: ${self:custom.nrLicenseKey}
      RequestConfiguration:
        ContentEncoding: GZIP
      S3Configuration:
        BucketARN: !GetAtt FirehoseFailedDataBucket.Arn
        Prefix: 'failed/'
        ErrorOutputPrefix: 'error/'
        CompressionFormat: GZIP

# CloudWatch Metric Stream
MetricStreamToFirehose:
  Type: AWS::CloudWatch::MetricStream
  Condition: CreateNRInfraMonitoring
  Properties:
    Name: ${self:custom.nrMetricStreamName}
    FirehoseArn: !GetAtt FirehoseStreamToNewRelic.Arn
    RoleArn: !GetAtt MetricStreamRole.Arn
    OutputFormat: 'opentelemetry0.7'
```

### CDK Implementation

```typescript
// In infra-api-stack.ts
export class InfraApiStack extends BaseStack {
  public readonly api: apigateway.RestApi;
  public readonly wafAcl: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props: InfraApiStackProps) {
    super(scope, id, props);

    // Create WAF-protected API Gateway
    this.createApiGateway();
    
    // Create monitoring infrastructure
    if (this.stage !== 'local') {
      this.createMonitoringInfrastructure();
    }

    // Export values for other stacks
    this.exportApiGatewayValues();
  }

  private createApiGateway(): void {
    // 1. Create WAF-protected API (replaces AppApiGateway + WAF plugin)
    const wafApi = new WafProtectedApi(this, 'WafProtectedApi', {
      stage: this.stage,
      serviceName: SERVICES.INFRA_API,
      wafConfig: {
        aclName: `${this.stage}-${SERVICES.INFRA_API}-webacl`,
        excludedRules: [
          { name: 'SizeRestrictions_BODY' }  // From custom.wafExcludeRules
        ],
        ipRateLimitPerFiveMinutes: this.stage === 'prod' ? 2000 : 1000,
      },
    });

    this.api = wafApi.api;
    this.wafAcl = wafApi.webAcl;

    // 2. Configure CORS (replaces GatewayResponseDefault4XX/5XX)
    this.api.addGatewayResponse('GatewayResponseDefault4XX', {
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'*'",
      },
    });

    this.api.addGatewayResponse('GatewayResponseDefault5XX', {
      type: apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
        'Access-Control-Allow-Headers': "'*'",
      },
    });
  }

  private createMonitoringInfrastructure(): void {
    // Get NewRelic configuration from SSM
    const nrLicenseKey = ssm.StringParameter.valueForStringParameter(
      this, '/configuration/nr_license_key'
    );

    // 1. NewRelic Integration Role (replaces NewRelicInfraIntegrations)
    const newRelicRole = new iam.Role(this, 'NewRelicInfraIntegrations', {
      roleName: 'NewRelicInfraIntegrations',
      assumedBy: new iam.ArnPrincipal('arn:aws:iam::754728514883:root'),
      externalIds: ['3407984'],
      inlinePolicies: {
        NewRelicBudgetPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['budgets:ViewBudget'],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // 2. S3 Bucket for failed data
    const failedDataBucket = new s3.Bucket(this, 'FirehoseFailedDataBucket', {
      bucketName: `${this.stage}-newrelic-firehose-failed-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [{
        id: 'delete-old-failed-data',
        expiration: Duration.days(30),
      }],
    });

    // 3. Kinesis Firehose Role
    const firehoseRole = new iam.Role(this, 'FirehoseRole', {
      assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
      inlinePolicies: {
        FirehosePolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:AbortMultipartUpload',
                's3:GetBucketLocation',
                's3:GetObject',
                's3:ListBucket',
                's3:ListBucketMultipartUploads',
                's3:PutObject',
              ],
              resources: [
                failedDataBucket.bucketArn,
                `${failedDataBucket.bucketArn}/*`,
              ],
            }),
          ],
        }),
      },
    });

    // 4. Kinesis Firehose (replaces FirehoseStreamToNewRelic)
    const firehose = new kinesisfirehose.CfnDeliveryStream(this, 'NewRelicFirehose', {
      deliveryStreamName: 'NewRelic-Delivery-Stream',
      deliveryStreamType: 'DirectPut',
      httpEndpointDestinationConfiguration: {
        endpointConfiguration: {
          url: 'https://aws-api.newrelic.com/cloudwatch-metrics/v1',
          accessKey: nrLicenseKey,
        },
        requestConfiguration: {
          contentEncoding: 'GZIP',
        },
        s3Configuration: {
          bucketArn: failedDataBucket.bucketArn,
          prefix: 'failed/',
          errorOutputPrefix: 'error/',
          compressionFormat: 'GZIP',
          roleArn: firehoseRole.roleArn,
        },
        roleArn: firehoseRole.roleArn,
        bufferingHints: {
          sizeInMBs: 1,
          intervalInSeconds: 60,
        },
      },
    });

    // 5. CloudWatch Metric Stream Role
    const metricStreamRole = new iam.Role(this, 'MetricStreamRole', {
      assumedBy: new iam.ServicePrincipal('streams.metrics.cloudwatch.amazonaws.com'),
      inlinePolicies: {
        MetricStreamPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'firehose:PutRecord',
                'firehose:PutRecordBatch',
              ],
              resources: [firehose.attrArn],
            }),
          ],
        }),
      },
    });

    // 6. CloudWatch Metric Stream (replaces MetricStreamToFirehose)
    new cloudwatch.CfnMetricStream(this, 'NewRelicMetricStream', {
      name: 'NewRelic-Metric-Stream',
      firehoseArn: firehose.attrArn,
      roleArn: metricStreamRole.roleArn,
      outputFormat: 'opentelemetry0.7',
    });
  }

  private exportApiGatewayValues(): void {
    // Store API Gateway values for other stacks
    ServiceRegistry.putApiId(this, this.stage, this.api.restApiId);
    ServiceRegistry.putApiRootResourceId(this, this.stage, this.api.restApiRootResourceId);

    // Export as CloudFormation outputs
    new cdk.CfnOutput(this, 'ApiGatewayRestApiId', {
      value: this.api.restApiId,
      exportName: `${SERVICES.INFRA_API}-${this.stage}-ApiGatewayRestApiId`,
    });

    new cdk.CfnOutput(this, 'ApiGatewayRestApiRootResourceId', {
      value: this.api.restApiRootResourceId,
      exportName: `${SERVICES.INFRA_API}-${this.stage}-ApiGatewayRestApiRootResourceId`,
    });
  }
}

// WafProtectedApi construct
export class WafProtectedApi extends Construct {
  public readonly api: apigateway.RestApi;
  public readonly webAcl: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props: WafProtectedApiProps) {
    super(scope, id);

    // 1. Create API Gateway
    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: `${props.serviceName}-${props.stage}-app-api-gateway`,
      deployOptions: {
        stageName: props.stage,
        tracingEnabled: true,
        metricsEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['*'],
      },
    });

    // 2. Create WAF WebACL
    const excludedRules = props.wafConfig.excludedRules?.map(rule => ({
      name: rule.name,
    }));

    this.webAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
      name: props.wafConfig.aclName,
      scope: 'REGIONAL',
      defaultAction: { allow: {} },
      rules: [
        {
          name: 'RateLimitRule',
          priority: 1,
          statement: {
            rateBasedStatement: {
              limit: props.wafConfig.ipRateLimitPerFiveMinutes || 2000,
              aggregateKeyType: 'IP',
            },
          },
          action: { block: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitRule',
          },
        },
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
              excludedRules,
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesCommonRuleSet',
          },
        },
      ],
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: props.wafConfig.aclName,
      },
    });

    // 3. Associate WAF with API Gateway
    new wafv2.CfnWebACLAssociation(this, 'WebAclAssociation', {
      resourceArn: `arn:aws:apigateway:${Stack.of(this).region}::/restapis/${this.api.restApiId}/stages/${props.stage}`,
      webAclArn: this.webAcl.attrArn,
    });
  }
}
```

### Key Migration Notes for infra-api

1. **No Lambda Functions**: The infra-api service only contains infrastructure resources, no Lambda functions.

2. **WAF Integration**:
   - Serverless: Uses `@enterprise-cmcs/serverless-waf-plugin`
   - CDK: Custom `WafProtectedApi` construct with CfnWebACL

3. **API Gateway CORS**:
   - Serverless: Gateway responses for 4XX/5XX
   - CDK: Both `defaultCorsPreflightOptions` and `addGatewayResponse`

4. **Monitoring Infrastructure**:
   - Serverless: Conditional resources based on stage
   - CDK: TypeScript conditionals in code

5. **Cross-Stack References**:
   - Serverless: Outputs consumed via `${cf:}`
   - CDK: ServiceRegistry pattern + CfnOutput exports

---

## github-oidc Service (GitHub Actions OIDC)

### Complete Line-by-Line GitHub OIDC Infrastructure Mapping

**NOTE: The CDK deployment reuses the existing serverless OIDC setup to avoid duplicate OIDC providers (only one allowed per AWS account). The CDK GitHubOidcStack is disabled.**

The github-oidc service configures OpenID Connect (OIDC) authentication for GitHub Actions, allowing secure AWS deployments without storing credentials.

### OIDC Provider Configuration - Complete Mapping

#### Serverless Configuration (github-oidc/serverless.yml)
```yaml
# Service Configuration
service: github-oidc

# Stage-specific Parameters
params:
  val:
    subjectClaim: 'repo:Enterprise-CMCS/managed-care-review:environment:val'
  prod:
    subjectClaim: 'repo:Enterprise-CMCS/managed-care-review:environment:prod'
  default:
    subjectClaim: 'repo:Enterprise-CMCS/managed-care-review:environment:dev'
    
    # GitHub OIDC thumbprints
    githubActionsThumbprint:     # CDK: thumbprints prop
      [
        6938fd4d98bab03faadb97b34396831e3780aea1,
        1c58a3a8518e8759bf075b76b750d4f2df264fcd,
      ]
    
    # Allowed audiences
    audienceList: [sts.amazonaws.com]           # CDK: clientIds prop
    
    # Managed policies to attach
    managedPolicyArns: []                       # CDK: managedPolicies prop
    
    # Allowed AWS actions
    githubActionsAllowedAwsActions:             # CDK: inlinePolicy statements
      - 'acm:*'
      - 'apigateway:*'
      - 'cloudformation:*'
      - 'cloudfront:*'
      - 'cloudwatch:*'
      - 'cognito-identity:*'
      - 'cognito-idp:*'
      - 'ec2:*'
      - 'ecr:*'
      - 'events:*'
      - 'firehose:*'
      - 'iam:*'
      - 'kms:*'
      - 'lambda:*'
      - 'logs:*'
      - 'route53:*'
      - 'rds:*'
      - 'secretsmanager:*'
      - 'ssm:*'
      - 's3:*'
      - 'tag:*'
      - 'wafv2:*'
      - 'securityhub:*'

# Conditions
Conditions:
  # Only create IdP for official environments
  CreateGitHubIdentityProvider: !Or              # CDK: if (stage in ['main', 'val', 'prod'])
    - !Equals
      - ${sls:stage}
      - main
    - !Equals
      - ${sls:stage}
      - val
    - !Equals
      - ${sls:stage}
      - prod
  
  CreateGitHubActionsPermissionsPolicy: !Not     # CDK: if (actions.length > 0)
    - !Equals
      - ''
      - !Join
        - ''
        - ${param:githubActionsAllowedAwsActions}
```

### OIDC Resources - Complete Mapping

```yaml
# GitHub OIDC Provider
GitHubIdentityProvider:
  Type: AWS::IAM::OIDCProvider
  Condition: CreateGitHubIdentityProvider
  Properties:
    Url: https://token.actions.githubusercontent.com    # CDK: url
    ClientIdList: ${param:audienceList}                # CDK: clientIds
    ThumbprintList: ${param:githubActionsThumbprint}   # CDK: thumbprints

# GitHub Actions Role
GitHubActionsRole:
  Type: AWS::IAM::Role
  Properties:
    RoleName: github-actions-${sls:stage}               # CDK: roleName
    ManagedPolicyArns: ${param:managedPolicyArns}      # CDK: managedPolicies
    AssumeRolePolicyDocument:
      Version: '2012-10-17'
      Statement:
        - Effect: Allow
          Principal:
            Federated: !If
              - CreateGitHubIdentityProvider
              - !GetAtt GitHubIdentityProvider.Arn
              - !Sub >-
                  arn:aws:iam::${AWS::AccountId}:oidc-provider/token.actions.githubusercontent.com
          Action: 'sts:AssumeRoleWithWebIdentity'
          Condition:
            StringEquals:
              'token.actions.githubusercontent.com:sub': ${param:subjectClaim}
              'token.actions.githubusercontent.com:aud': ${param:audienceList}

# Inline Policy for GitHub Actions
GitHubActionsRolePermissionsPolicy:
  Type: AWS::IAM::RolePolicy
  Condition: CreateGitHubActionsPermissionsPolicy
  Properties:
    RoleName: !Ref GitHubActionsRole
    PolicyName: GitHubActionsPermissions                # CDK: inlinePolicies key
    PolicyDocument:
      Version: '2012-10-17'
      Statement:
        - Effect: Allow
          Action: ${param:githubActionsAllowedAwsActions}
          Resource: '*'
```

### CDK Implementation

```typescript
// In github-oidc-stack.ts
export class GitHubOidcStack extends BaseStack {
  public readonly oidcProvider: iam.OpenIdConnectProvider;
  public readonly githubActionsRole: iam.Role;

  constructor(scope: Construct, id: string, props: GitHubOidcStackProps) {
    super(scope, id, props);

    // Create OIDC provider and role
    this.createGitHubOidc();

    // Export values
    this.exportValues();
  }

  private createGitHubOidc(): void {
    // Determine subject claim based on stage
    const subjectClaim = this.getSubjectClaim();
    
    // 1. Create OIDC Provider (replaces GitHubIdentityProvider)
    // Only create for official environments
    if (['main', 'val', 'prod'].includes(this.stage)) {
      this.oidcProvider = new iam.OpenIdConnectProvider(this, 'GitHubIdentityProvider', {
        url: 'https://token.actions.githubusercontent.com',
        clientIds: ['sts.amazonaws.com'],  // audienceList
        thumbprints: [
          '6938fd4d98bab03faadb97b34396831e3780aea1',
          '1c58a3a8518e8759bf075b76b750d4f2df264fcd',
        ],
      });
    }

    // 2. Create GitHub Actions Role (replaces GitHubActionsRole)
    const principal = this.oidcProvider 
      ? new iam.OpenIdConnectPrincipal(this.oidcProvider)
      : new iam.FederatedPrincipal(
          `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`,
          {
            StringEquals: {
              'token.actions.githubusercontent.com:sub': subjectClaim,
              'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
            },
          },
          'sts:AssumeRoleWithWebIdentity'
        );

    this.githubActionsRole = new iam.Role(this, 'GitHubActionsRole', {
      roleName: `github-actions-${this.stage}`,
      assumedBy: principal,
      managedPolicies: this.getManagedPolicies(),
      inlinePolicies: this.getInlinePolicies(),
    });
  }

  private getSubjectClaim(): string {
    // Map stage to subject claim
    const subjectClaims: Record<string, string> = {
      val: 'repo:Enterprise-CMCS/managed-care-review:environment:val',
      prod: 'repo:Enterprise-CMCS/managed-care-review:environment:prod',
    };
    
    return subjectClaims[this.stage] || 'repo:Enterprise-CMCS/managed-care-review:environment:dev';
  }

  private getManagedPolicies(): iam.IManagedPolicy[] {
    // Return any managed policies needed
    // In serverless config, this is empty by default
    return [];
  }

  private getInlinePolicies(): { [name: string]: iam.PolicyDocument } | undefined {
    // Define allowed actions (replaces githubActionsAllowedAwsActions)
    const allowedActions = [
      'acm:*',
      'apigateway:*',
      'cloudformation:*',
      'cloudfront:*',
      'cloudwatch:*',
      'cognito-identity:*',
      'cognito-idp:*',
      'ec2:*',
      'ecr:*',
      'events:*',
      'firehose:*',
      'iam:*',
      'kms:*',
      'lambda:*',
      'logs:*',
      'route53:*',
      'rds:*',
      'secretsmanager:*',
      'ssm:*',
      's3:*',
      'tag:*',
      'wafv2:*',
      'securityhub:*',
    ];

    // Only create policy if actions are defined
    if (allowedActions.length === 0) {
      return undefined;
    }

    return {
      GitHubActionsPermissions: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: allowedActions,
            resources: ['*'],
          }),
        ],
      }),
    };
  }

  private exportValues(): void {
    // Export role ARN for GitHub Actions workflows
    new cdk.CfnOutput(this, 'GitHubActionsRoleArn', {
      value: this.githubActionsRole.roleArn,
      description: 'ARN of the role for GitHub Actions to assume',
      exportName: `github-actions-role-arn-${this.stage}`,
    });

    // Export OIDC provider ARN if created
    if (this.oidcProvider) {
      new cdk.CfnOutput(this, 'GitHubOidcProviderArn', {
        value: this.oidcProvider.openIdConnectProviderArn,
        description: 'ARN of the GitHub OIDC provider',
        exportName: `github-oidc-provider-arn-${this.stage}`,
      });
    }
  }
}
```

### GitHub Actions Workflow Integration

```yaml
# Example .github/workflows/deploy.yml
name: Deploy to AWS
on:
  push:
    branches:
      - main
      - val
      - prod

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: arn:aws:iam::${{ secrets.AWS_ACCOUNT_ID }}:role/github-actions-${{ github.ref_name }}
          aws-region: us-east-1
      
      - name: Deploy CDK
        run: |
          npm ci
          npx cdk deploy --all --require-approval never
```

### Key Migration Notes for github-oidc

**IMPORTANT**: The CDK currently reuses the existing serverless OIDC infrastructure instead of creating its own. The GitHubOidcStack is kept for reference but is disabled to avoid conflicts.

1. **OIDC Provider Creation**:
   - Serverless: Conditional based on stage (currently active)
   - CDK: Would use TypeScript array check in code (disabled)

2. **Stage-based Configuration**:
   - Serverless: Uses `params` section with stage keys (currently active)
   - CDK: Would use method to map stage to configuration (disabled)

3. **Trust Policy**:
   - Serverless: Complex condition with If statement (currently active)
   - CDK: Would be cleaner with OpenIdConnectPrincipal or FederatedPrincipal (disabled)

4. **Inline Policies**:
   - Serverless: Separate RolePolicy resource with condition (currently active)
   - CDK: Would use `inlinePolicies` property on Role (disabled)

5. **Thumbprints**:
   - Serverless: Array in params (currently active)
   - CDK: Would use direct array in OpenIdConnectProvider (disabled)

6. **GitHub Integration**:
   - Both approaches result in the same trust relationship
   - CDK uses the serverless OIDC role via the `get_aws_credentials` GitHub Action

---

## app-web Service (Build & Deploy)

### Complete Line-by-Line Build and Deploy Infrastructure Mapping

The app-web service handles building and deploying the React application to S3 buckets and invalidating CloudFront distributions. This service has no Lambda functions or AWS resources - it only runs build scripts and uses serverless plugins for deployment.

### Build Configuration - Complete Mapping

#### Serverless Configuration (app-web/serverless.yml)
```yaml
# Service Configuration
service: app-web

plugins:
  - serverless-plugin-scripts          # CDK: Build scripts in package.json or CDK app
  - serverless-s3-sync                  # CDK: s3-deployment.BucketDeployment
  - serverless-stack-termination-protection
  - serverless-s3-bucket-helper
  - serverless-cf-invalidate-proxy      # CDK: cloudfront.Distribution.invalidateCache()

# Cross-stack References
custom:
  stage: ${opt:stage, self:provider.stage}
  # Import values from other stacks
  api_url: ${cf:infra-api-${sls:stage}.ApiGatewayRestApiUrl}                    # CDK: Fn.importValue
  application_endpoint_url: ${cf:ui-${sls:stage}.CloudFrontEndpointUrl}         # CDK: Fn.importValue
  cognito_region: ${cf:ui-auth-${sls:stage}.Region}                             # CDK: Stack.of(this).region
  cognito_identity_pool_id: ${cf:ui-auth-${sls:stage}.IdentityPoolId}           # CDK: Fn.importValue
  cognito_user_pool_id: ${cf:ui-auth-${sls:stage}.UserPoolId}                   # CDK: Fn.importValue
  cognito_client_id: ${cf:ui-auth-${sls:stage}.UserPoolClientId}                # CDK: Fn.importValue
  cognito_user_pool_client_domain: ${cf:ui-auth-${sls:stage}.UserPoolClientDomain}
  s3_documents_bucket_region: ${cf:uploads-${sls:stage}.Region}
  s3_documents_bucket_name: ${cf:uploads-${sls:stage}.DocumentUploadsBucketName}
  s3_qa_bucket_name: ${cf:uploads-${sls:stage}.QAUploadsBucketName}
  ui_s3_bucket_name: ${cf:ui-${sls:stage}.S3BucketName}                         # CDK: bucket.bucketName
  ui_cloudfront_distribution_id: ${cf:ui-${sls:stage}.CloudFrontDistributionId} # CDK: distribution.distributionId
  storybook_s3_bucket_name: ${cf:storybook-${sls:stage}.S3BucketName}
  storybook_cloudfront_distribution_id: ${cf:storybook-${sls:stage}.CloudFrontDistributionId}
  
  # Environment variables from SSM and env
  react_app_auth_mode: ${env:VITE_APP_AUTH_MODE}
  nr_license_key: ${env:NR_LICENSE_KEY, ssm:/configuration/nr_license_key}
  react_app_ld_client_id: ${env:VITE_APP_LD_CLIENT_ID, ssm:/configuration/react_app_ld_client_id_feds}
  react_app_nr_account_id: ${env:VITE_APP_NR_ACCOUNT_ID, ssm:/configuration/react_app_nr_account_id}
  react_app_nr_trust_key: ${env:VITE_APP_NR_TRUST_KEY, ssm:/configuration/react_app_nr_trust_key}
  react_app_nr_license_key: ${env:VITE_APP_NR_LICENSE_KEY, ssm:/configuration/react_app_nr_license_key}
  react_app_nr_agent_id: ${env:VITE_APP_NR_AGENT_ID, ssm:/configuration/react_app_nr_agent_id}
```

### S3 Sync Configuration - Complete Mapping

```yaml
# S3 Sync Plugin Configuration
s3Sync:
  - bucketName: ${self:custom.ui_s3_bucket_name}      # CDK: deployment.destinationBucket
    localDir: ./build                                  # CDK: s3deploy.Source.asset('./build')
    deleteRemoved: true                                # CDK: prune: true
  - bucketName: ${self:custom.storybook_s3_bucket_name}
    localDir: ./storybook-static
    deleteRemoved: true

# CloudFront Invalidation Plugin Configuration
cloudfrontInvalidate:
  - distributionId: ${self:custom.ui_cloudfront_distribution_id}    # CDK: distribution.distributionId
    items:
      - '/*'                                                        # CDK: invalidationPaths: ['/*']
  - distributionId: ${self:custom.storybook_cloudfront_distribution_id}
    items:
      - '/*'
```

### Build Scripts - Complete Mapping

```yaml
# Build Script Hooks
scripts:
  hooks:
    package:initialize: |
      set -e
      # Export all environment variables for the build
      export VITE_APP_AUTH_MODE=${self:custom.react_app_auth_mode}
      export VITE_APP_API_URL=${self:custom.api_url}
      export VITE_APP_APPLICATION_ENDPOINT=${self:custom.application_endpoint_url}
      export VITE_APP_COGNITO_REGION=${self:custom.cognito_region}
      export VITE_APP_COGNITO_ID_POOL_ID=${self:custom.cognito_identity_pool_id}
      export VITE_APP_COGNITO_USER_POOL_ID=${self:custom.cognito_user_pool_id}
      export VITE_APP_COGNITO_USER_POOL_CLIENT_ID=${self:custom.cognito_client_id}
      export VITE_APP_COGNITO_USER_POOL_CLIENT_DOMAIN=${self:custom.cognito_user_pool_client_domain}
      export VITE_APP_S3_REGION=${self:custom.s3_documents_bucket_region}
      export VITE_APP_S3_DOCUMENTS_BUCKET=${self:custom.s3_documents_bucket_name}
      export VITE_APP_S3_QA_BUCKET=${self:custom.s3_qa_bucket_name}
      export VITE_APP_STAGE_NAME=${sls:stage}
      export VITE_APP_OTEL_COLLECTOR_URL=${self:custom.api_url}/otel
      export VITE_APP_LD_CLIENT_ID=${self:custom.react_app_ld_client_id}
      export VITE_APP_NR_ACCOUNT_ID=${self:custom.react_app_nr_account_id}
      export VITE_APP_NR_AGENT_ID=${self:custom.react_app_nr_agent_id}
      export VITE_APP_NR_LICENSE_KEY=${self:custom.react_app_nr_license_key}
      export VITE_APP_NR_TRUST_KEY=${self:custom.react_app_nr_trust_key}

      # Build both applications
      pnpm build                    # CDK: Executed in bundling or CodeBuild
      pnpm storybook:build         # CDK: Executed in bundling or CodeBuild
```

### CDK Implementation

```typescript
// In app-web-deployment-stack.ts
export class AppWebDeploymentStack extends BaseStack {
  constructor(scope: Construct, id: string, props: AppWebDeploymentStackProps) {
    super(scope, id, props);

    // Import references from other stacks
    const apiUrl = Fn.importValue(`infra-api-${this.stage}-ApiGatewayRestApiUrl`);
    const uiBucket = s3.Bucket.fromBucketName(this, 'UiBucket', 
      Fn.importValue(`ui-${this.stage}-S3BucketName`)
    );
    const storybookBucket = s3.Bucket.fromBucketName(this, 'StorybookBucket',
      Fn.importValue(`storybook-${this.stage}-S3BucketName`)
    );
    const uiDistribution = cloudfront.Distribution.fromDistributionAttributes(this, 'UiDistribution', {
      distributionId: Fn.importValue(`ui-${this.stage}-CloudFrontDistributionId`),
      domainName: Fn.importValue(`ui-${this.stage}-CloudFrontEndpointUrl`)
    });
    const storybookDistribution = cloudfront.Distribution.fromDistributionAttributes(this, 'StorybookDistribution', {
      distributionId: Fn.importValue(`storybook-${this.stage}-CloudFrontDistributionId`),
      domainName: Fn.importValue(`storybook-${this.stage}-CloudFrontEndpointUrl`)
    });

    // Get configuration from SSM
    const config = this.getAppConfiguration();

    // Create deployments
    this.createUiDeployment(uiBucket, uiDistribution, config);
    this.createStorybookDeployment(storybookBucket, storybookDistribution, config);
  }

  private getAppConfiguration(): AppConfig {
    // Get SSM parameters
    const nrLicenseKey = ssm.StringParameter.valueForStringParameter(
      this, '/configuration/nr_license_key'
    );
    const ldClientId = ssm.StringParameter.valueForStringParameter(
      this, '/configuration/react_app_ld_client_id_feds'
    );
    // ... other SSM parameters

    return {
      VITE_APP_AUTH_MODE: process.env.VITE_APP_AUTH_MODE || 'AWS_IAM',
      VITE_APP_API_URL: Fn.importValue(`infra-api-${this.stage}-ApiGatewayRestApiUrl`),
      VITE_APP_APPLICATION_ENDPOINT: Fn.importValue(`ui-${this.stage}-CloudFrontEndpointUrl`),
      VITE_APP_COGNITO_REGION: Stack.of(this).region,
      VITE_APP_COGNITO_ID_POOL_ID: Fn.importValue(`ui-auth-${this.stage}-IdentityPoolId`),
      VITE_APP_COGNITO_USER_POOL_ID: Fn.importValue(`ui-auth-${this.stage}-UserPoolId`),
      VITE_APP_COGNITO_USER_POOL_CLIENT_ID: Fn.importValue(`ui-auth-${this.stage}-UserPoolClientId`),
      VITE_APP_COGNITO_USER_POOL_CLIENT_DOMAIN: Fn.importValue(`ui-auth-${this.stage}-UserPoolClientDomain`),
      VITE_APP_S3_REGION: Stack.of(this).region,
      VITE_APP_S3_DOCUMENTS_BUCKET: Fn.importValue(`uploads-${this.stage}-DocumentUploadsBucketName`),
      VITE_APP_S3_QA_BUCKET: Fn.importValue(`uploads-${this.stage}-QAUploadsBucketName`),
      VITE_APP_STAGE_NAME: this.stage,
      VITE_APP_OTEL_COLLECTOR_URL: `${Fn.importValue(`infra-api-${this.stage}-ApiGatewayRestApiUrl`)}/otel`,
      VITE_APP_LD_CLIENT_ID: ldClientId,
      VITE_APP_NR_LICENSE_KEY: nrLicenseKey,
      // ... other config values
    };
  }

  private createUiDeployment(
    bucket: s3.IBucket,
    distribution: cloudfront.IDistribution,
    config: AppConfig
  ): void {
    // 1. Build the application (replaces package:initialize script)
    new s3deploy.BucketDeployment(this, 'UiDeployment', {
      sources: [s3deploy.Source.asset('../app-web', {
        bundling: {
          image: cdk.DockerImage.fromRegistry('node:20'),
          command: ['bash', '-c', `
            cd /asset-input &&
            npm ci &&
            ${Object.entries(config).map(([key, value]) => 
              `export ${key}="${value}"`
            ).join(' && ')} &&
            npm run build &&
            cp -r build/* /asset-output/
          `],
        },
      })],
      destinationBucket: bucket,
      prune: true,  // deleteRemoved: true
      distribution,
      distributionPaths: ['/*'],  // cloudfrontInvalidate items
    });
  }

  private createStorybookDeployment(
    bucket: s3.IBucket,
    distribution: cloudfront.IDistribution,
    config: AppConfig
  ): void {
    new s3deploy.BucketDeployment(this, 'StorybookDeployment', {
      sources: [s3deploy.Source.asset('../app-web', {
        bundling: {
          image: cdk.DockerImage.fromRegistry('node:20'),
          command: ['bash', '-c', `
            cd /asset-input &&
            npm ci &&
            npm run storybook:build &&
            cp -r storybook-static/* /asset-output/
          `],
        },
      })],
      destinationBucket: bucket,
      prune: true,
      distribution,
      distributionPaths: ['/*'],
    });
  }
}

// Alternative: Using CodeBuild for more complex builds
export class AppWebCodeBuildStack extends BaseStack {
  constructor(scope: Construct, id: string, props: AppWebCodeBuildStackProps) {
    super(scope, id, props);

    const buildProject = new codebuild.Project(this, 'AppWebBuildProject', {
      projectName: `${SERVICES.APP_WEB}-${this.stage}-build`,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.MEDIUM,
      },
      environmentVariables: this.getBuildEnvironmentVariables(),
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              'cd services/app-web',
              'npm ci',
            ],
          },
          build: {
            commands: [
              'npm run build',
              'npm run storybook:build',
            ],
          },
        },
        artifacts: {
          files: ['**/*'],
          'base-directory': 'services/app-web',
          name: 'BuildArtifacts',
        },
      }),
    });

    // Grant permissions to read from other stacks and write to S3
    props.uiBucket.grantReadWrite(buildProject);
    props.storybookBucket.grantReadWrite(buildProject);
  }
}
```

### Key Migration Notes for app-web

1. **No AWS Resources**: The app-web service only handles build and deployment, no infrastructure resources to migrate.

2. **Build Scripts**:
   - Serverless: Uses serverless-plugin-scripts with hooks
   - CDK: Options include BucketDeployment bundling, CodeBuild, or GitHub Actions

3. **Environment Variables**:
   - Serverless: Injected via shell script during build
   - CDK: Passed to bundling commands or CodeBuild environment

4. **S3 Sync**:
   - Serverless: serverless-s3-sync plugin
   - CDK: s3-deployment.BucketDeployment with prune: true

5. **CloudFront Invalidation**:
   - Serverless: serverless-cf-invalidate-proxy plugin
   - CDK: Automatic with BucketDeployment when distribution is specified

6. **Cross-Stack References**:
   - Serverless: ${cf:stack-stage.OutputKey}
   - CDK: Fn.importValue() or direct stack references

---

## storybook Service (Component Documentation)

### Complete Line-by-Line Storybook Infrastructure Mapping

The storybook service hosts the component documentation site using S3 static website hosting and CloudFront distribution with geo-restriction.

### S3 Bucket Configuration - Complete Mapping

#### Serverless Configuration (storybook/serverless.yml)
```yaml
# S3 Bucket for Static Website
S3Bucket:
  Type: AWS::S3::Bucket
  Properties:
    WebsiteConfiguration:                        # CDK: Not needed with OAI
      IndexDocument: index.html                  # CDK: cloudfront.Distribution errorResponses
      ErrorDocument: index.html
    BucketEncryption:                           # CDK: encryption
      ServerSideEncryptionConfiguration:
        - ServerSideEncryptionByDefault:
            SSEAlgorithm: AES256                # CDK: s3.BucketEncryption.S3_MANAGED
    OwnershipControls:                          # CDK: objectOwnership
      Rules:
        - ObjectOwnership: ObjectWriter          # CDK: s3.ObjectOwnership.OBJECT_WRITER

# Bucket Policy
BucketPolicy:
  Type: AWS::S3::BucketPolicy
  Properties:
    PolicyDocument:
      Version: '2012-10-17'
      Statement:
        - Effect: Allow
          Action: 's3:GetObject'
          Resource: !Sub ${S3Bucket.Arn}/*
          Principal:
            CanonicalUser: !GetAtt CloudFrontOriginAccessIdentity.S3CanonicalUserId
        - Effect: Deny                          # CDK: bucket.addToResourcePolicy or enforceSSL: true
          Action: 's3:*'
          Principal: '*'
          Condition:
            Bool:
              'aws:SecureTransport': false
          Resource:
            - !Sub ${S3Bucket.Arn}
            - !Sub ${S3Bucket.Arn}/*
          Sid: DenyUnencryptedConnections
    Bucket: !Ref S3Bucket
```

### WAF Configuration - Complete Mapping

```yaml
# WAF WebACL for Geo-restriction
CloudFrontWebAcl:
  Type: AWS::WAFv2::WebACL
  Properties:
    DefaultAction:                               # CDK: defaultAction
      Block: {}                                  # CDK: wafv2.CfnWebACL.DefaultActionProperty
    Rules:
      - Action:
          Allow: {}
        Name: ${sls:stage}-allow-usa-plus-territories
        Priority: 0
        Statement:
          GeoMatchStatement:                     # CDK: geoMatchStatement
            CountryCodes:
              - GU # Guam
              - PR # Puerto Rico
              - US # USA
              - UM # US Minor Outlying Islands
              - VI # US Virgin Islands
              - MP # Northern Mariana Islands
        VisibilityConfig:
          SampledRequestsEnabled: true
          CloudWatchMetricsEnabled: true
          MetricName: WafWebAcl
    Scope: CLOUDFRONT                           # CDK: scope: 'CLOUDFRONT'
    VisibilityConfig:
      CloudWatchMetricsEnabled: true
      SampledRequestsEnabled: true
      MetricName: ${sls:stage}-webacl
```

### CloudFront Distribution - Complete Mapping

```yaml
# Origin Access Identity
CloudFrontOriginAccessIdentity:
  Type: AWS::CloudFront::CloudFrontOriginAccessIdentity
  Properties:
    CloudFrontOriginAccessIdentityConfig:
      Comment: OAI to prevent direct public access to the bucket

# CloudFront Distribution
CloudFrontDistribution:
  Type: AWS::CloudFront::Distribution
  Properties:
    DistributionConfig:
      Comment: CloudFront Distro for the static website hosted in S3
      Aliases:                                  # CDK: domainNames
        Fn::If:
          - CreateCustomCloudFrontDomain
          - - ${self:custom.cloudfrontStorybookDomainName}
          - Ref: AWS::NoValue
      Origins:
        - DomainName: !GetAtt S3Bucket.DomainName    # CDK: origins.S3Origin
          Id: S3Origin
          S3OriginConfig:
            OriginAccessIdentity: !Sub origin-access-identity/cloudfront/${CloudFrontOriginAccessIdentity}
      Enabled: true
      HttpVersion: 'http2'                      # CDK: httpVersion
      DefaultRootObject: index.html             # CDK: defaultRootObject
      DefaultCacheBehavior:                     # CDK: defaultBehavior
        AllowedMethods: [GET, HEAD]             # CDK: allowedMethods
        Compress: true                          # CDK: compress
        TargetOriginId: S3Origin
        ForwardedValues:
          QueryString: true                     # CDK: queryString
          Cookies:
            Forward: none                       # CDK: cookies.forward
        ViewerProtocolPolicy: redirect-to-https # CDK: viewerProtocolPolicy
      ViewerCertificate:                        # CDK: certificate
        Fn::If:
          - CreateCustomCloudFrontDomain
          - AcmCertificateArn: ${self:custom.cloudfrontCertificateArn}
            MinimumProtocolVersion: TLSv1
            SslSupportMethod: sni-only
          - CloudFrontDefaultCertificate: true
      CustomErrorResponses:                     # CDK: errorResponses
        - ErrorCode: 403
          ResponseCode: 403
          ResponsePagePath: /index.html
      WebACLId: !GetAtt CloudFrontWebAcl.Arn    # CDK: webAclId
      Logging:                                  # CDK: logBucket, logFilePrefix
        Bucket: !Sub ${S3Bucket.DomainName}
        Prefix: ${sls:stage}-${self:service}-cloudfront-logs/
```

### CDK Implementation

```typescript
// In storybook-stack.ts
export class StorybookStack extends BaseStack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: StorybookStackProps) {
    super(scope, id, props);

    // Create S3 bucket
    this.bucket = this.createBucket();
    
    // Create WAF WebACL
    const webAcl = this.createWebAcl();
    
    // Create CloudFront distribution
    this.distribution = this.createDistribution(this.bucket, webAcl);

    // Export values
    this.exportValues();
  }

  private createBucket(): s3.Bucket {
    const bucket = new s3.Bucket(this, 'StorybookBucket', {
      bucketName: `${SERVICES.STORYBOOK}-${this.stage}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      enforceSSL: true,  // Replaces the Deny policy for unencrypted connections
      removalPolicy: this.stage === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: this.stage !== 'prod',
    });

    // Enable CloudFront logging
    bucket.addLifecycleRule({
      id: 'delete-old-logs',
      prefix: `${this.stage}-${SERVICES.STORYBOOK}-cloudfront-logs/`,
      expiration: Duration.days(90),
    });

    return bucket;
  }

  private createWebAcl(): wafv2.CfnWebACL {
    return new wafv2.CfnWebACL(this, 'StorybookWebAcl', {
      defaultAction: { block: {} },
      rules: [{
        name: `${this.stage}-allow-usa-plus-territories`,
        priority: 0,
        action: { allow: {} },
        statement: {
          geoMatchStatement: {
            countryCodes: ['GU', 'PR', 'US', 'UM', 'VI', 'MP'],
          },
        },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: 'WafWebAcl',
        },
      }],
      scope: 'CLOUDFRONT',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        sampledRequestsEnabled: true,
        metricName: `${this.stage}-webacl`,
      },
    });
  }

  private createDistribution(bucket: s3.Bucket, webAcl: wafv2.CfnWebACL): cloudfront.Distribution {
    // Create Origin Access Identity
    const oai = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: 'OAI to prevent direct public access to the bucket',
    });

    // Grant OAI access to bucket
    bucket.grantRead(oai);

    // Get certificate if custom domain is configured
    const certificate = this.getCloudFrontCertificate();
    const domainNames = this.getCustomDomainNames();

    const distribution = new cloudfront.Distribution(this, 'StorybookDistribution', {
      comment: 'CloudFront Distro for the static website hosted in S3',
      defaultRootObject: 'index.html',
      httpVersion: cloudfront.HttpVersion.HTTP2,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1,
      defaultBehavior: {
        origin: new origins.S3Origin(bucket, {
          originAccessIdentity: oai,
        }),
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 403,
          responsePagePath: '/index.html',
        },
      ],
      certificate,
      domainNames,
      webAclId: webAcl.attrArn,
      logBucket: bucket,
      logFilePrefix: `${this.stage}-${SERVICES.STORYBOOK}-cloudfront-logs/`,
    });

    return distribution;
  }

  private getCloudFrontCertificate(): acm.ICertificate | undefined {
    const certificateArn = process.env.CLOUDFRONT_CERT_ARN;
    if (!certificateArn) return undefined;

    return acm.Certificate.fromCertificateArn(
      this,
      'Certificate',
      certificateArn
    );
  }

  private getCustomDomainNames(): string[] | undefined {
    const domainName = process.env.CLOUDFRONT_SB_DOMAIN_NAME;
    return domainName ? [domainName] : undefined;
  }

  private exportValues(): void {
    new cdk.CfnOutput(this, 'S3BucketName', {
      value: this.bucket.bucketName,
      exportName: `${SERVICES.STORYBOOK}-${this.stage}-S3BucketName`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.distribution.distributionId,
      exportName: `${SERVICES.STORYBOOK}-${this.stage}-CloudFrontDistributionId`,
    });

    new cdk.CfnOutput(this, 'CloudFrontEndpointUrl', {
      value: `https://${this.distribution.domainName}`,
      exportName: `${SERVICES.STORYBOOK}-${this.stage}-CloudFrontEndpointUrl`,
    });
  }
}
```

### Key Migration Notes for storybook

1. **Origin Access Identity**:
   - Serverless: Manual CloudFormation resource
   - CDK: cloudfront.OriginAccessIdentity with automatic bucket policy

2. **Geo-restriction**:
   - Serverless: WAF WebACL with geo match rules
   - CDK: Same approach using CfnWebACL (L1 construct)

3. **Custom Domain**:
   - Serverless: Conditional with Fn::If
   - CDK: Conditional logic in TypeScript

4. **Error Pages**:
   - Serverless: WebsiteConfiguration + CustomErrorResponses
   - CDK: Only errorResponses needed with OAI

5. **Logging**:
   - Serverless: Logs to same bucket with prefix
   - CDK: Same pattern with lifecycle rules for cleanup

---

## ui Service (Main Application Frontend)

### Complete Line-by-Line UI Infrastructure Mapping

The ui service hosts the main application frontend using S3 static website hosting and CloudFront distribution with WAF protection and HSTS headers.

### S3 and CloudFront Configuration - Complete Mapping

#### Serverless Configuration (ui/serverless.yml)
```yaml
# S3 Bucket (identical to storybook)
S3Bucket:
  Type: AWS::S3::Bucket
  Properties:
    WebsiteConfiguration:
      IndexDocument: index.html
      ErrorDocument: index.html
    BucketEncryption:
      ServerSideEncryptionConfiguration:
        - ServerSideEncryptionByDefault:
            SSEAlgorithm: AES256
    OwnershipControls:
      Rules:
        - ObjectOwnership: ObjectWriter

# CloudFront Function for HSTS Headers
HstsCloudfrontFunction:
  Type: AWS::CloudFront::Function
  Properties:
    AutoPublish: true                            # CDK: autoPublish
    FunctionCode: |                              # CDK: code
      function handler(event) {
        var response = event.response;
        var headers = response.headers;
        headers['strict-transport-security'] = { value: 'max-age=63072000; includeSubdomains; preload'};
        return response;
      }
    FunctionConfig:
      Comment: This function adds headers to implement HSTS
      Runtime: cloudfront-js-1.0                 # CDK: FunctionRuntime.JS_1_0
    Name: hsts-${sls:stage}                      # CDK: functionName
```

### CloudFront Distribution with HSTS - Complete Mapping

```yaml
# CloudFront Distribution (similar to storybook but with HSTS function)
CloudFrontDistribution:
  Type: AWS::CloudFront::Distribution
  Properties:
    DistributionConfig:
      DefaultCacheBehavior:
        # ... other properties ...
        FunctionAssociations:                    # CDK: functionAssociations
          - EventType: viewer-response           # CDK: FunctionEventType.VIEWER_RESPONSE
            FunctionARN: !GetAtt HstsCloudfrontFunction.FunctionMetadata.FunctionARN
      ViewerCertificate:
        Fn::If:
          - CreateCustomCloudFrontDomain
          - AcmCertificateArn: ${self:custom.cloudfrontCertificateArn}
            MinimumProtocolVersion: TLSv1.2_2021 # CDK: SecurityPolicyProtocol.TLS_V1_2_2021
            SslSupportMethod: sni-only
          - CloudFrontDefaultCertificate: true
      CustomErrorResponses:
        - ErrorCode: 403
          ResponseCode: 200                      # CDK: Different from storybook (200 vs 403)
          ResponsePagePath: /index.html
```

### CDK Implementation

```typescript
// In ui-stack.ts (extends frontend-stack.ts)
export class UiStack extends BaseStack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: UiStackProps) {
    super(scope, id, props);

    // Create infrastructure
    this.createUiInfrastructure();

    // Export values
    this.exportValues();
  }

  private createUiInfrastructure(): void {
    // Create S3 bucket (same as storybook)
    this.bucket = new s3.Bucket(this, 'UiBucket', {
      bucketName: `${SERVICES.UI}-${this.stage}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      enforceSSL: true,
      removalPolicy: this.stage === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: this.stage !== 'prod',
    });

    // Create HSTS function (replaces HstsCloudfrontFunction)
    const hstsFunction = new cloudfront.Function(this, 'HstsFunction', {
      functionName: `hsts-${this.stage}`,
      code: cloudfront.FunctionCode.fromInline(`
        function handler(event) {
          var response = event.response;
          var headers = response.headers;
          headers['strict-transport-security'] = { 
            value: 'max-age=63072000; includeSubdomains; preload'
          };
          return response;
        }
      `),
      comment: 'This function adds headers to implement HSTS',
      runtime: cloudfront.FunctionRuntime.JS_1_0,
    });

    // Create WAF WebACL (same as storybook)
    const webAcl = new wafv2.CfnWebACL(this, 'UiWebAcl', {
      defaultAction: { block: {} },
      rules: [{
        name: `${this.stage}-allow-usa-plus-territories`,
        priority: 0,
        action: { allow: {} },
        statement: {
          geoMatchStatement: {
            countryCodes: ['GU', 'PR', 'US', 'UM', 'VI', 'MP'],
          },
        },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: 'WafWebAcl',
        },
      }],
      scope: 'CLOUDFRONT',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        sampledRequestsEnabled: true,
        metricName: `${this.stage}-webacl`,
      },
    });

    // Create OAI
    const oai = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: 'OAI to prevent direct public access to the bucket',
    });

    this.bucket.grantRead(oai);

    // Get certificate and domain names
    const certificate = this.getCloudFrontCertificate();
    const domainNames = this.getCustomDomainNames();

    // Create CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'UiDistribution', {
      comment: 'CloudFront Distro for the static website hosted in S3',
      defaultRootObject: 'index.html',
      httpVersion: cloudfront.HttpVersion.HTTP2,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      defaultBehavior: {
        origin: new origins.S3Origin(this.bucket, {
          originAccessIdentity: oai,
        }),
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        functionAssociations: [{
          function: hstsFunction,
          eventType: cloudfront.FunctionEventType.VIEWER_RESPONSE,
        }],
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,  // Different from storybook
          responsePagePath: '/index.html',
        },
      ],
      certificate,
      domainNames,
      webAclId: webAcl.attrArn,
      logBucket: this.bucket,
      logFilePrefix: `${this.stage}-${SERVICES.UI}-cloudfront-logs/`,
    });
  }

  private getCloudFrontCertificate(): acm.ICertificate | undefined {
    const certificateArn = process.env.CLOUDFRONT_CERT_ARN;
    if (!certificateArn) return undefined;

    return acm.Certificate.fromCertificateArn(
      this,
      'Certificate',
      certificateArn
    );
  }

  private getCustomDomainNames(): string[] | undefined {
    const domainName = process.env.CLOUDFRONT_DOMAIN_NAME;
    if (!domainName) return undefined;

    // Return the custom domain or construct the stage-based URL
    return this.stage === 'prod' 
      ? [domainName]
      : [`${this.stage}.${domainName}`];
  }

  private exportValues(): void {
    new cdk.CfnOutput(this, 'S3BucketName', {
      value: this.bucket.bucketName,
      exportName: `${SERVICES.UI}-${this.stage}-S3BucketName`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.distribution.distributionId,
      exportName: `${SERVICES.UI}-${this.stage}-CloudFrontDistributionId`,
    });

    new cdk.CfnOutput(this, 'CloudFrontEndpointUrl', {
      value: this.getOutputUrl(),
      exportName: `${SERVICES.UI}-${this.stage}-CloudFrontEndpointUrl`,
    });
  }

  private getOutputUrl(): string {
    const customDomain = this.getCustomDomainNames()?.[0];
    return customDomain 
      ? `https://${customDomain}/`
      : `https://${this.distribution.domainName}`;
  }
}

// Alternative: Shared frontend construct
export class StaticWebsite extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: StaticWebsiteProps) {
    super(scope, id);

    // Common implementation for both ui and storybook
    this.bucket = this.createBucket(props);
    const webAcl = props.enableWaf ? this.createWebAcl(props) : undefined;
    this.distribution = this.createDistribution(props, webAcl?.attrArn);
  }

  // ... implementation details ...
}
```

### Key Migration Notes for ui

1. **CloudFront Functions**:
   - Serverless: AWS::CloudFront::Function resource
   - CDK: cloudfront.Function with inline code

2. **HSTS Headers**:
   - Serverless: Function association on viewer-response
   - CDK: functionAssociations in defaultBehavior

3. **Error Response Codes**:
   - UI returns 200 for 403 errors (SPA routing)
   - Storybook returns 403 for 403 errors

4. **TLS Version**:
   - UI uses TLSv1.2_2021
   - Storybook uses TLSv1

5. **Shared Infrastructure**:
   - Both services have nearly identical setup
   - CDK can use a shared construct to reduce duplication

---

## CDK App Architecture & Bootstrapping

### Main App Entry Point (bin/mcr-app.ts)

The CDK app entry point orchestrates all stacks and applies cross-cutting concerns.

#### Serverless Multi-Service Architecture
```yaml
# Each service has its own serverless.yml
services/
  app-api/serverless.yml
  postgres/serverless.yml
  uploads/serverless.yml
  ui-auth/serverless.yml
  ui/serverless.yml
  storybook/serverless.yml
  infra-api/serverless.yml
  github-oidc/serverless.yml
  app-web/serverless.yml
```

#### CDK Unified App Architecture
```typescript
// bin/mcr-app.ts - Single entry point for all infrastructure

#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Aspects } from 'aws-cdk-lib';
import { IamPathAspect } from '../lib/aspects/iam-path-aspects';
import { IamPermissionsBoundaryAspect } from '../lib/aspects/iam-permissions-boundary-aspects';

// Main async function to initialize app
async function main() {
  // 1. Load environment configuration
  const stage = process.argv.find(arg => arg.includes('stage='))?.split('=')[1] || 'dev';
  loadEnvironment(stage);
  
  // 2. Get CDK synthesizer config from Secrets Manager (required)
  const synthConfig = await getSynthesizerConfig();
  
  // 3. Create CDK app with custom synthesizer
  const app = new cdk.App({
    defaultStackSynthesizer: new cdk.DefaultStackSynthesizer(synthConfig),
  });
  
  // 4. Create stacks in dependency order
  const foundationStack = new FoundationStack(app, `MCR-Foundation-${stage}`, { ... });
  const networkStack = new NetworkStack(app, `MCR-Network-${stage}`, { ... });
  const dataStack = new DataStack(app, `MCR-Data-${stage}`, { ... });
  const authStack = new AuthStack(app, `MCR-Auth-${stage}`, { ... });
  const apiComputeStack = new ApiComputeStack(app, `MCR-ApiCompute-${stage}`, { ... });
  
  // 5. Set up stack dependencies
  networkStack.addDependency(foundationStack);
  dataStack.addDependency(networkStack);
  apiComputeStack.addDependency(dataStack);
  apiComputeStack.addDependency(authStack);
  
  // 6. Apply global aspects
  Aspects.of(app).add(new IamPathAspect('/delegatedadmin/developer/'));
  Aspects.of(app).add(new IamPermissionsBoundaryAspect(permBoundaryArn));
  
  // 7. Apply global tags
  cdk.Tags.of(app).add('Project', 'ManagedCareReview');
  cdk.Tags.of(app).add('Environment', stage);
  
  app.synth();
}
```

### Custom CDK Synthesizer Configuration

```typescript
// Getting synthesizer config from Secrets Manager
async function getSynthesizerConfig(): Promise<any> {
  const client = new SecretsManagerClient({ region: 'us-east-1' });
  
  const response = await client.send(new GetSecretValueCommand({
    SecretId: 'cdkSynthesizerConfig'
  }));
  
  return JSON.parse(response.SecretString);
}

// The synthesizer config typically includes:
{
  fileAssetsBucketName: "cdk-assets-${AWS::AccountId}-${AWS::Region}",
  bucketPrefix: "",
  imageAssetsRepositoryName: "cdk-assets-${AWS::AccountId}-${AWS::Region}",
  deployRoleArn: "arn:aws:iam::${AWS::AccountId}:role/delegatedadmin/developer/cdk-deploy-role",
  fileAssetPublishingRoleArn: "arn:aws:iam::${AWS::AccountId}:role/delegatedadmin/developer/cdk-file-publishing-role",
  imageAssetPublishingRoleArn: "arn:aws:iam::${AWS::AccountId}:role/delegatedadmin/developer/cdk-image-publishing-role",
  cloudFormationExecutionRole: "arn:aws:iam::${AWS::AccountId}:role/delegatedadmin/developer/cdk-cfn-exec-role"
}
```

### Stack Dependency Management

```typescript
// Stack deployment order and dependencies:

1. Foundation Stack (no dependencies)
   - Basic shared resources

2. Network Stack → depends on Foundation
   - VPC, subnets, security groups

3. Lambda Layers Stack → depends on Network
   - Shared Lambda layers (Prisma, PostgreSQL tools)

4. Data Stack → depends on Network
   - RDS Aurora database
   - S3 buckets for uploads

5. Auth Stack → depends on Foundation (parallel with Data)
   - Cognito user pool and identity pool

6. API+Compute Stack → depends on Network, Data, Auth, Lambda Layers
   - API Gateway
   - Lambda functions
   - Combined to avoid circular dependencies

7. Database Operations Stack → depends on Network, Data, Lambda Layers
   - Migration and backup Lambdas

8. Frontend Stack → depends on API+Compute
   - CloudFront distributions
   - S3 static websites

9. Virus Scanning Stack → depends on Data, Network
   - GuardDuty malware protection

10. Monitoring Stack → depends on Foundation
    - CloudWatch dashboards and alarms
```

### Environment Configuration Loading

```typescript
// lib/config/environment.ts
export function loadEnvironment(stage: string): void {
  // Load stage-specific .env file
  const envFile = `.env.${stage}`;
  if (existsSync(envFile)) {
    config({ path: envFile });
  }
  
  // Override with environment variables
  process.env.CDK_STAGE = stage;
}

export function validateEnvironment(stage: string): void {
  const required = [
    'PROJECT',
    'AWS_REGION',
    'PERM_BOUNDARY_ARN',
    'IAM_PATH'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

### Key Migration Notes for App Architecture

1. **Single vs Multiple Entry Points**:
   - Serverless: Each service deployed independently
   - CDK: Single app manages all infrastructure

2. **Configuration Management**:
   - Serverless: Per-service configuration in serverless.yml
   - CDK: Centralized configuration with stage-specific overrides

3. **Dependency Management**:
   - Serverless: Manual coordination of deployments
   - CDK: Explicit stack dependencies ensure correct order

4. **Custom Synthesizer**:
   - Required for CMS compliance (custom IAM paths and roles)
   - Configuration stored in Secrets Manager

5. **Environment Variables**:
   - Serverless: ${env:VAR_NAME} in each service
   - CDK: Centralized loading with validation

---

## CDK Aspects & Cross-Cutting Concerns

CDK Aspects allow you to apply modifications across all constructs in your app.

### IAM Path Aspect

Ensures all IAM roles and policies use the required CMS path structure.

```typescript
// lib/aspects/iam-path-aspects.ts
export class IamPathAspect implements IAspect {
  constructor(private readonly iamPath: string) {}

  public visit(node: IConstruct): void {
    // Apply to IAM roles
    if (node instanceof iam.Role) {
      const cfnRole = node.node.defaultChild as iam.CfnRole;
      cfnRole.path = this.iamPath;
    }
    
    // Apply to IAM policies
    if (node instanceof iam.Policy) {
      const cfnPolicy = node.node.defaultChild as iam.CfnPolicy;
      cfnPolicy.path = this.iamPath;
    }
  }
}

// Usage in app:
Aspects.of(app).add(new IamPathAspect('/delegatedadmin/developer/'));
```

### IAM Permissions Boundary Aspect

Enforces permissions boundaries on all IAM entities for compliance.

```typescript
// lib/aspects/iam-permissions-boundary-aspects.ts
export class IamPermissionsBoundaryAspect implements IAspect {
  constructor(private readonly permissionsBoundaryArn: string) {}

  public visit(node: IConstruct): void {
    // Apply to IAM roles
    if (node instanceof iam.Role) {
      const roleResource = node.node.defaultChild as iam.CfnRole;
      roleResource.addPropertyOverride("PermissionsBoundary", this.permissionsBoundaryArn);
    }
    
    // Apply to IAM users
    if (node instanceof iam.User) {
      const userResource = node.node.defaultChild as iam.CfnUser;
      userResource.addPropertyOverride("PermissionsBoundary", this.permissionsBoundaryArn);
    }
    
    // Handle low-level CloudFormation resources
    if (cdk.CfnResource.isCfnResource(node)) {
      if ((node as cdk.CfnResource).cfnResourceType === "AWS::IAM::Role") {
        (node as iam.CfnRole).addPropertyOverride("PermissionsBoundary", this.permissionsBoundaryArn);
      }
    }
  }
}

// Usage in app:
const permBoundaryArn = `arn:aws:iam::${account}:policy/cms-cloud-admin/developer-boundary-policy`;
Aspects.of(app).add(new IamPermissionsBoundaryAspect(permBoundaryArn));
```

### Serverless IAM Configuration vs CDK Aspects

#### Serverless Approach
```yaml
# Must be repeated in every serverless.yml
provider:
  iam:
    role:
      path: ${self:custom.iamPath}
      permissionsBoundary: ${self:custom.iamPermissionsBoundary}

custom:
  iamPath: /delegatedadmin/developer/
  iamPermissionsBoundary: arn:aws:iam::${AWS::AccountId}:policy/cms-cloud-admin/developer-boundary-policy
```

#### CDK Aspect Approach
```typescript
// Applied once globally to all resources
Aspects.of(app).add(new IamPathAspect('/delegatedadmin/developer/'));
Aspects.of(app).add(new IamPermissionsBoundaryAspect(boundaryArn));

// No need to repeat in individual constructs!
```

### Custom Tagging Aspect Example

```typescript
// Custom aspect for environment-specific tags
export class EnvironmentTaggingAspect implements IAspect {
  constructor(
    private readonly stage: string,
    private readonly costCenter: string
  ) {}

  public visit(node: IConstruct): void {
    if (cdk.TagManager.isTaggable(node)) {
      cdk.Tags.of(node).add('Environment', this.stage);
      cdk.Tags.of(node).add('CostCenter', this.costCenter);
      cdk.Tags.of(node).add('ManagedBy', 'CDK');
    }
  }
}
```

### Security Compliance Aspect Example

```typescript
// Ensure all S3 buckets have encryption
export class S3EncryptionAspect implements IAspect {
  public visit(node: IConstruct): void {
    if (node instanceof s3.Bucket) {
      const cfnBucket = node.node.defaultChild as s3.CfnBucket;
      
      // Ensure encryption is enabled
      if (!cfnBucket.bucketEncryption) {
        cfnBucket.bucketEncryption = {
          serverSideEncryptionConfiguration: [{
            serverSideEncryptionByDefault: {
              sseAlgorithm: 'AES256'
            }
          }]
        };
      }
    }
  }
}
```

### Key Benefits of CDK Aspects

1. **DRY Principle**: Write once, apply everywhere
2. **Compliance**: Ensure all resources meet requirements
3. **Consistency**: Uniform configuration across stacks
4. **Flexibility**: Easy to add/remove/modify global behaviors
5. **Separation of Concerns**: Business logic separate from compliance

---

## Advanced API Patterns

### ApiEndpoint Construct

The ApiEndpoint construct provides a reusable pattern for creating Lambda-backed API endpoints.

```typescript
// lib/constructs/api/api-endpoint.ts
export interface ApiEndpointProps {
  resource: apigateway.Resource;
  method: string;
  handler: lambda.IFunction;
  authorizationType?: apigateway.AuthorizationType;
  authorizer?: apigateway.IAuthorizer;
  requestValidator?: apigateway.IRequestValidator;
  requestModels?: { [contentType: string]: apigateway.IModel };
}

export class ApiEndpoint extends Construct {
  public readonly method: apigateway.Method;
  
  constructor(scope: Construct, id: string, props: ApiEndpointProps) {
    super(scope, id);
    
    // Create Lambda integration with CORS
    const integration = new apigateway.LambdaIntegration(props.handler, {
      proxy: true,
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': "'*'"
          }
        }
      ]
    });
    
    // Add method to resource
    this.method = props.resource.addMethod(props.method, integration, {
      authorizationType: props.authorizationType || apigateway.AuthorizationType.NONE,
      authorizer: props.authorizer,
      requestValidator: props.requestValidator,
      requestModels: props.requestModels,
      methodResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true,
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true
          }
        }
      ]
    });
  }
}
```

### ApiEndpointFactory Patterns

```typescript
// Factory methods for common endpoint patterns

export class ApiEndpointFactory {
  /**
   * Create a public endpoint (no auth)
   */
  static createPublicEndpoint(
    scope: Construct,
    id: string,
    props: Omit<ApiEndpointProps, 'authorizationType'>
  ): ApiEndpoint {
    return new ApiEndpoint(scope, id, {
      ...props,
      authorizationType: apigateway.AuthorizationType.NONE
    });
  }

  /**
   * Create a Cognito authenticated endpoint
   */
  static createAuthenticatedEndpoint(
    scope: Construct,
    id: string,
    props: ApiEndpointProps & { userPool: cognito.IUserPool }
  ): ApiEndpoint {
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      scope,
      `${id}Authorizer`,
      {
        cognitoUserPools: [props.userPool],
        authorizerName: `${id}-authorizer`
      }
    );

    return new ApiEndpoint(scope, id, {
      ...props,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer
    });
  }

  /**
   * Create a GraphQL endpoint with proper request model
   */
  static createGraphQLEndpoint(
    scope: Construct,
    id: string,
    props: {
      resource: apigateway.Resource;
      handler: lambda.IFunction;
      authType?: 'IAM' | 'COGNITO' | 'NONE';
      userPool?: cognito.IUserPool;
    }
  ): ApiEndpoint[] {
    // Create GraphQL request model
    const requestModel = new apigateway.Model(scope, `${id}Model`, {
      restApi: props.resource.api,
      contentType: 'application/json',
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          query: { type: apigateway.JsonSchemaType.STRING },
          variables: { type: apigateway.JsonSchemaType.OBJECT },
          operationName: { type: apigateway.JsonSchemaType.STRING }
        },
        required: ['query']
      }
    });
    
    // Create POST endpoint for GraphQL
    return [
      ApiEndpointFactory.createAuthenticatedEndpoint(scope, `${id}POST`, {
        resource: props.resource,
        method: 'POST',
        handler: props.handler,
        userPool: props.userPool!,
        requestModels: { 'application/json': requestModel }
      })
    ];
  }
}
```

### Usage Examples

```typescript
// In your stack:

// 1. Public health check endpoint
const healthCheck = ApiEndpointFactory.createPublicEndpoint(this, 'HealthCheck', {
  resource: api.root.addResource('health'),
  method: 'GET',
  handler: healthCheckLambda
});

// 2. Authenticated user endpoint
const userEndpoint = ApiEndpointFactory.createAuthenticatedEndpoint(this, 'GetUser', {
  resource: api.root.addResource('users').addResource('{userId}'),
  method: 'GET',
  handler: getUserLambda,
  userPool: authStack.userPool
});

// 3. GraphQL endpoint
const graphqlEndpoints = ApiEndpointFactory.createGraphQLEndpoint(this, 'GraphQL', {
  resource: api.root.addResource('graphql'),
  handler: graphqlLambda,
  authType: 'COGNITO',
  userPool: authStack.userPool
});

// 4. Request validation example
const validator = new apigateway.RequestValidator(this, 'BodyValidator', {
  restApi: api,
  requestValidatorName: 'body-validator',
  validateRequestBody: true
});

const createUser = new ApiEndpoint(this, 'CreateUser', {
  resource: api.root.addResource('users'),
  method: 'POST',
  handler: createUserLambda,
  requestValidator: validator,
  requestModels: {
    'application/json': new apigateway.Model(this, 'CreateUserModel', {
      restApi: api,
      contentType: 'application/json',
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          email: { type: apigateway.JsonSchemaType.STRING, format: 'email' },
          name: { type: apigateway.JsonSchemaType.STRING, minLength: 1 }
        },
        required: ['email', 'name']
      }
    })
  }
});
```

### Serverless Functions vs CDK API Patterns

#### Serverless Function Definition
```yaml
functions:
  getUser:
    handler: src/handlers/getUser.handler
    events:
      - http:
          path: users/{userId}
          method: GET
          cors: true
          authorizer:
            type: COGNITO_USER_POOLS
            authorizerId: ${self:custom.userPoolAuthorizer}
```

#### CDK Equivalent with Factory
```typescript
// More explicit but also more flexible
const getUserEndpoint = ApiEndpointFactory.createAuthenticatedEndpoint(
  this, 
  'GetUser',
  {
    resource: api.root.addResource('users').addResource('{userId}'),
    method: 'GET',
    handler: new LambdaFactory.createNodeFunction(this, 'GetUserFunction', {
      entry: 'src/handlers/getUser.ts',
      handler: 'handler'
    }),
    userPool: authStack.userPool
  }
);
```

### Key Benefits of API Factory Pattern

1. **Consistency**: All endpoints follow the same patterns
2. **Type Safety**: Full TypeScript support
3. **Reusability**: Common patterns extracted to factory methods
4. **Flexibility**: Easy to extend for new patterns
5. **CORS Handling**: Built-in CORS configuration

---

## Lambda Factory & Patterns

### BaseLambdaFunction Construct

The BaseLambdaFunction provides standardized Lambda configuration across all functions.

```typescript
// lib/constructs/lambda/base-lambda-function.ts
export interface BaseLambdaFunctionProps {
  functionName: string;
  serviceName: string;
  handler: string;
  stage: string;
  lambdaConfig: LambdaConfig;
  environment?: { [key: string]: string };
  vpc?: ec2.IVpc;
  vpcSubnets?: ec2.SubnetSelection;
  securityGroups?: ec2.ISecurityGroup[];
  layers?: lambda.ILayerVersion[];
}

export class BaseLambdaFunction extends Construct {
  public readonly function: lambda.Function;
  public readonly role: iam.IRole;

  constructor(scope: Construct, id: string, props: BaseLambdaFunctionProps) {
    super(scope, id);

    // Create standardized Lambda role
    this.role = new iam.Role(this, 'Role', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      path: '/delegatedadmin/developer/',
      permissionsBoundary: iam.ManagedPolicy.fromManagedPolicyArn(
        this,
        'PermissionsBoundary',
        `arn:aws:iam::${Stack.of(this).account}:policy/cms-cloud-admin/developer-boundary-policy`
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        ...(props.vpc ? [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')] : [])
      ]
    });

    // Create Lambda function with standard configuration
    this.function = new lambda.Function(this, 'Function', {
      functionName: `${props.serviceName}-${props.stage}-${props.functionName}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: props.handler,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../'), {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          command: this.getBundlingCommand(props.handler),
          environment: {
            NODE_ENV: 'production'
          }
        }
      }),
      environment: {
        NODE_ENV: props.stage,
        STAGE: props.stage,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        ...props.environment
      },
      timeout: props.lambdaConfig.timeout || Duration.seconds(30),
      memorySize: props.lambdaConfig.memorySize || 1024,
      reservedConcurrentExecutions: props.lambdaConfig.reservedConcurrentExecutions,
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
      securityGroups: props.securityGroups,
      layers: props.layers,
      role: this.role,
      tracing: lambda.Tracing.ACTIVE,
      logRetention: props.lambdaConfig.logRetention || 30
    });
  }

  private getBundlingCommand(handler: string): string[] {
    const handlerPath = handler.split('.')[0];
    return [
      'bash', '-c',
      `npm ci --production && ` +
      `cp -r node_modules ${handlerPath}* /asset-output/`
    ];
  }
}
```

### LambdaFactory for Common Patterns - Updated

The Lambda factory now integrates with the environment factory and configuration management:

```typescript
// lib/constructs/lambda/lambda-factory.ts
import { LAMBDA_MEMORY, LAMBDA_TIMEOUTS } from '@config/constants';
import { LambdaEnvironmentFactory } from './environment-factory';

export class LambdaFactory extends Construct {
  private readonly props: LambdaFactoryProps;
  private readonly functions: Map<string, BaseLambdaFunction> = new Map();

  constructor(scope: Construct, id: string, props: LambdaFactoryProps) {
    super(scope, id);
    this.props = props;
  }

  /**
   * Create a Lambda function with standard configuration
   */
  public createFunction(functionProps: CreateFunctionProps): BaseLambdaFunction {
    const functionId = functionProps.functionName;
    
    // Get handler mapping
    const handlerMapping = getHandlerMapping(functionProps.functionName);
    const handler = `${handlerMapping.entry}.${handlerMapping.handler}`;

    // Determine if this function needs VPC access
    const needsVpc = functionProps.useVpc ?? this.requiresVpc(functionProps.functionName);

    // Create lambda config with proper defaults from constants
    const lambdaConfig = {
      ...this.props.stageConfig.lambda,
      timeout: functionProps.timeout || LAMBDA_TIMEOUTS.API_DEFAULT,
      memorySize: functionProps.memorySize || LAMBDA_MEMORY.MEDIUM,
      ...(functionProps.ephemeralStorageSize && { ephemeralStorageSize: functionProps.ephemeralStorageSize })
    };

    // Create the function using BaseLambdaFunction
    const lambdaFunction = new BaseLambdaFunction(this, functionId, {
      functionName: LAMBDA_FUNCTIONS[functionProps.functionName],
      serviceName: this.props.serviceName,
      handler,
      stage: this.props.stage,
      lambdaConfig,
      environment: {
        ...this.props.commonEnvironment, // From LambdaEnvironmentFactory
        ...functionProps.environment      // Function-specific overrides
      },
      vpc: needsVpc ? this.props.vpc : undefined,
      vpcSubnets: needsVpc && this.props.vpc ? {
        subnets: this.props.vpc.privateSubnets
      } : undefined,
      securityGroups: needsVpc ? this.props.securityGroups : undefined,
      layers: [
        this.props.otelLayer,
        ...(needsPrismaLayer(functionProps.functionName) && this.props.prismaLayer ? [this.props.prismaLayer] : []),
        ...(functionProps.additionalLayers || [])
      ],
      role: functionProps.role,
      logRetentionDays: this.props.stageConfig.monitoring.logRetentionDays
    });

    // Store the function
    this.functions.set(functionId, lambdaFunction);

    // Store function ARN in Parameter Store
    ServiceRegistry.putLambdaArn(
      this,
      this.props.stage,
      LAMBDA_FUNCTIONS[functionProps.functionName],
      lambdaFunction.functionArn
    );

    return lambdaFunction;
  }

  /**
   * Create a VPC-enabled Lambda for database access
   */
  public createDatabaseFunction(
    functionName: keyof typeof LAMBDA_FUNCTIONS,
    additionalEnv?: Record<string, string>
  ): BaseLambdaFunction {
    // Use environment factory for database functions
    const environment = LambdaEnvironmentFactory.createDatabaseLambdaEnvironment(
      this.props.stage,
      this.props.region,
      this.props.databaseSecretArn,
      {
        includeOtel: true,
        additionalEnv
      }
    );

    return this.createFunction({
      functionName,
      useVpc: true,
      environment,
      timeout: LAMBDA_TIMEOUTS.STANDARD,
      memorySize: LAMBDA_MEMORY.MEDIUM
    });
  }

  /**
   * Create a VPC-enabled Lambda for database access
   */
  static createDatabaseFunction(
    scope: Construct,
    id: string,
    props: {
      entry: string;
      vpc: ec2.IVpc;
      securityGroup: ec2.ISecurityGroup;
      databaseSecretArn: string;
      prismaLayer: lambda.ILayerVersion;
      environment?: { [key: string]: string };
    }
  ): NodejsFunction {
    const fn = this.createNodeFunction(scope, id, {
      entry: props.entry,
      vpc: props.vpc,
      layers: [props.prismaLayer],
      environment: {
        DATABASE_SECRET_ARN: props.databaseSecretArn,
        ...props.environment
      },
      timeout: Duration.minutes(5), // Longer timeout for DB operations
      memorySize: 2048 // More memory for Prisma
    });

    // Add to security group
    fn.connections.addSecurityGroup(props.securityGroup);

    // Grant secret read permissions
    const secret = secretsmanager.Secret.fromSecretCompleteArn(
      scope,
      `${id}Secret`,
      props.databaseSecretArn
    );
    secret.grantRead(fn);

    return fn;
  }

  /**
   * Create a scheduled Lambda function
   */
  static createScheduledFunction(
    scope: Construct,
    id: string,
    props: {
      entry: string;
      schedule: events.Schedule;
      environment?: { [key: string]: string };
    }
  ): { function: NodejsFunction; rule: events.Rule } {
    const fn = this.createNodeFunction(scope, id, {
      entry: props.entry,
      environment: props.environment
    });

    const rule = new events.Rule(scope, `${id}Rule`, {
      schedule: props.schedule
    });

    rule.addTarget(new targets.LambdaFunction(fn));

    return { function: fn, rule };
  }

  /**
   * Create an S3-triggered Lambda function
   */
  static createS3TriggeredFunction(
    scope: Construct,
    id: string,
    props: {
      entry: string;
      bucket: s3.IBucket;
      events: s3.EventType[];
      prefix?: string;
      suffix?: string;
      environment?: { [key: string]: string };
    }
  ): NodejsFunction {
    const fn = this.createNodeFunction(scope, id, {
      entry: props.entry,
      environment: {
        BUCKET_NAME: props.bucket.bucketName,
        ...props.environment
      }
    });

    // Add S3 event notification
    props.bucket.addEventNotification(
      ...props.events,
      new s3n.LambdaDestination(fn),
      {
        prefix: props.prefix,
        suffix: props.suffix
      }
    );

    // Grant bucket permissions
    props.bucket.grantRead(fn);

    return fn;
  }
}
```

### Usage Examples

```typescript
// 1. Simple API handler
const apiHandler = LambdaFactory.createNodeFunction(this, 'ApiHandler', {
  entry: 'src/handlers/api/index.ts',
  environment: {
    API_ENDPOINT: api.url
  }
});

// 2. Database function with Prisma
const dbFunction = LambdaFactory.createDatabaseFunction(this, 'DbFunction', {
  entry: 'src/handlers/database/migrate.ts',
  vpc: networkStack.vpc,
  securityGroup: networkStack.lambdaSecurityGroup,
  databaseSecretArn: dataStack.database.secret.secretArn,
  prismaLayer: lambdaLayersStack.prismaLayer,
  environment: {
    STAGE: this.stage
  }
});

// 3. Scheduled cleanup function
const { function: cleanupFn, rule } = LambdaFactory.createScheduledFunction(
  this,
  'CleanupFunction',
  {
    entry: 'src/handlers/cleanup/index.ts',
    schedule: events.Schedule.rate(Duration.hours(6)),
    environment: {
      RETENTION_DAYS: '30'
    }
  }
);

// 4. S3 upload processor
const uploadProcessor = LambdaFactory.createS3TriggeredFunction(
  this,
  'UploadProcessor',
  {
    entry: 'src/handlers/uploads/process.ts',
    bucket: uploadsBucket,
    events: [s3.EventType.OBJECT_CREATED],
    suffix: '.pdf',
    environment: {
      SCAN_ENABLED: 'true'
    }
  }
);
```

### Serverless Function vs CDK Lambda Factory

#### Serverless Configuration
```yaml
functions:
  processUpload:
    handler: src/handlers/uploads/process.handler
    runtime: nodejs20.x
    memorySize: 2048
    timeout: 300
    vpc:
      securityGroupIds:
        - ${self:custom.lambdaSecurityGroupId}
      subnetIds:
        - ${self:custom.privateSubnetA}
        - ${self:custom.privateSubnetB}
    environment:
      DATABASE_URL: ${self:custom.databaseUrl}
      STAGE: ${self:provider.stage}
    events:
      - s3:
          bucket: ${self:custom.uploadsBucket}
          event: s3:ObjectCreated:*
          rules:
            - suffix: .pdf
```

#### CDK Factory Equivalent
```typescript
const uploadProcessor = LambdaFactory.createS3TriggeredFunction(this, 'ProcessUpload', {
  entry: 'src/handlers/uploads/process.ts',
  bucket: uploadsBucket,
  events: [s3.EventType.OBJECT_CREATED],
  suffix: '.pdf',
  environment: {
    DATABASE_URL: databaseUrl,
    STAGE: this.stage
  }
});

// VPC configuration handled separately
uploadProcessor.connections.addSecurityGroup(lambdaSecurityGroup);
```

### Key Benefits of Lambda Factory Pattern

1. **Standardization**: Consistent Lambda configuration
2. **Best Practices**: Built-in security and performance settings
3. **Type Safety**: Full TypeScript support
4. **Reusability**: Common patterns abstracted
5. **Bundling**: Optimized bundling configuration built-in

---

## Cross-Stack References

### ServiceRegistry Pattern

The ServiceRegistry provides a centralized way to manage cross-stack references.

```typescript
// lib/constructs/base/service-registry.ts
export class ServiceRegistry {
  private static readonly PREFIX = 'MCR';

  /**
   * Export a value from a stack
   */
  static exportValue(
    scope: Construct,
    key: string,
    value: string,
    description?: string
  ): CfnOutput {
    const stack = Stack.of(scope);
    const stage = stack.node.tryGetContext('stage') || 'dev';
    
    return new CfnOutput(scope, key, {
      value,
      description,
      exportName: `${this.PREFIX}-${stage}-${key}`
    });
  }

  /**
   * Import a value from another stack
   */
  static importValue(
    scope: Construct,
    key: string
  ): string {
    const stack = Stack.of(scope);
    const stage = stack.node.tryGetContext('stage') || 'dev';
    
    return Fn.importValue(`${this.PREFIX}-${stage}-${key}`);
  }

  /**
   * Get common service values
   */
  static getApiId(scope: Construct, stage: string): string {
    return this.importValue(scope, 'ApiGatewayId');
  }

  static getApiRootResourceId(scope: Construct, stage: string): string {
    return this.importValue(scope, 'ApiGatewayRootResourceId');
  }

  static getUserPoolId(scope: Construct, stage: string): string {
    return this.importValue(scope, 'UserPoolId');
  }

  static getUploadsBucketName(scope: Construct, stage: string): string {
    return this.importValue(scope, 'UploadsBucketName');
  }

  static getVpcId(scope: Construct, stage: string): string {
    return this.importValue(scope, 'VpcId');
  }
}
```

### Exporting Values from Stacks

```typescript
// In DataStack:
export class DataStack extends BaseStack {
  public readonly uploadsBucket: s3.IBucket;
  public readonly database: AuroraServerlessV2;

  protected defineOutputs(): void {
    // Export bucket name
    ServiceRegistry.exportValue(
      this,
      'UploadsBucketName',
      this.uploadsBucket.bucketName,
      'S3 bucket for file uploads'
    );

    // Export database secret ARN
    ServiceRegistry.exportValue(
      this,
      'DatabaseSecretArn',
      this.database.secret.secretArn,
      'Secret containing database credentials'
    );

    // Export database cluster identifier
    ServiceRegistry.exportValue(
      this,
      'DatabaseClusterIdentifier',
      this.database.cluster.clusterIdentifier,
      'RDS Aurora cluster identifier'
    );
  }
}
```

### Importing Values in Other Stacks

```typescript
// In ApiComputeStack:
export class ApiComputeStack extends BaseStack {
  constructor(scope: Construct, id: string, props: ApiComputeStackProps) {
    super(scope, id, props);

    // Option 1: Import via ServiceRegistry
    const uploadsBucketName = ServiceRegistry.getUploadsBucketName(this, this.stage);
    const uploadsBucket = s3.Bucket.fromBucketName(
      this,
      'ImportedUploadsBucket',
      uploadsBucketName
    );

    // Option 2: Direct prop passing (preferred for type safety)
    const databaseSecret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      'DatabaseSecret',
      props.databaseSecretArn // Passed from parent stack
    );

    // Option 3: Using Fn.importValue directly
    const vpcId = Fn.importValue(`MCR-${this.stage}-VpcId`);
    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', { vpcId });
  }
}
```

### Serverless Cross-Stack References vs CDK

#### Serverless Approach
```yaml
# In service A (exports)
resources:
  Outputs:
    UserPoolId:
      Value: !Ref CognitoUserPool
      Export:
        Name: ${self:service}-${self:provider.stage}-UserPoolId

# In service B (imports)
custom:
  userPoolId: ${cf:ui-auth-${self:provider.stage}.UserPoolId}
  # Or using Fn::ImportValue
  userPoolId:
    Fn::ImportValue: ui-auth-${self:provider.stage}-UserPoolId
```

#### CDK Approach
```typescript
// In AuthStack (exports)
ServiceRegistry.exportValue(this, 'UserPoolId', this.userPool.userPoolId);

// In ApiStack (imports) - Three options:

// Option 1: ServiceRegistry (cleanest)
const userPoolId = ServiceRegistry.getUserPoolId(this, this.stage);

// Option 2: Direct props (most type-safe)
interface ApiStackProps extends StackProps {
  userPool: cognito.IUserPool;
}
// Use: props.userPool.userPoolId

// Option 3: Fn.importValue (most flexible)
const userPoolId = Fn.importValue(`MCR-${stage}-UserPoolId`);
```

### Best Practices for Cross-Stack References

1. **Prefer Direct Props Over Imports**:
   ```typescript
   // Better - type-safe and explicit dependencies
   new ApiStack(app, 'Api', {
     userPool: authStack.userPool,
     database: dataStack.database
   });

   // Avoid when possible - string-based and fragile
   const userPoolId = Fn.importValue('auth-stack-user-pool-id');
   ```

2. **Use ServiceRegistry for Common Values**:
   ```typescript
   // Standardized keys prevent typos
   ServiceRegistry.getUserPoolId(this, stage);
   // vs error-prone string concatenation
   Fn.importValue(`auth-${stage}-pool-${id}`);
   ```

3. **Document All Exports**:
   ```typescript
   ServiceRegistry.exportValue(
     this,
     'ApiEndpoint',
     this.api.url,
     'REST API endpoint URL for frontend configuration' // Always add description
   );
   ```

4. **Group Related Exports**:
   ```typescript
   // Create a method to export all database-related values
   private exportDatabaseOutputs(): void {
     ServiceRegistry.exportValue(this, 'DbClusterId', this.cluster.clusterIdentifier);
     ServiceRegistry.exportValue(this, 'DbSecretArn', this.secret.secretArn);
     ServiceRegistry.exportValue(this, 'DbEndpoint', this.cluster.clusterEndpoint.hostname);
   }
   ```

### Key Migration Notes

1. **Export Limits**: CloudFormation has a limit of 1000 exports per region
2. **Deletion Protection**: Cannot delete stacks with active export references
3. **Naming Conventions**: Use consistent prefixes to avoid conflicts
4. **Type Safety**: CDK provides better type safety with direct references
5. **Circular Dependencies**: CDK helps prevent these at compile time

---

## Production Hardening

### 1. JWT Secret Security Pattern

**Issue**: Passing JWT secret ARN as environment variable risks exposing it in CloudWatch logs.

**Solution**: Use AWS CDK grant patterns to provide access without exposing the ARN.

```typescript
// ❌ Anti-pattern: Exposing secret ARN
environment: {
  JWT_SECRET_ARN: jwtSecret.secretArn  // ARN visible in logs!
}

// ✅ Correct pattern: Grant access and use secret name
// In stack:
this.jwtSecret.grantRead(lambdaFunction);

// In environment:
environment: {
  JWT_SECRET_NAME: jwtSecret.secretName  // Only non-sensitive name
}

// In Lambda code:
const secretsManager = new AWS.SecretsManager();
const secret = await secretsManager.getSecretValue({
  SecretId: process.env.JWT_SECRET_NAME
}).promise();
```

### 2. Binary Content Handling for API Gateway

**Issue**: File uploads/downloads get corrupted without proper binary content handling.

**Solution**: Create specialized endpoints with content handling.

```typescript
// lib/constructs/api/api-endpoint.ts
export class ApiEndpointFactory {
  /**
   * Create endpoint that handles binary content (file uploads/downloads)
   */
  static createAuthenticatedBinaryEndpoint(
    scope: Construct,
    id: string,
    props: ApiEndpointProps & { userPool: cognito.IUserPool }
  ): ApiEndpoint {
    const endpoint = new ApiEndpoint(scope, id, {
      ...props,
      authType: 'COGNITO_USER_POOLS',
      authorizer: props.authorizer
    });

    // Configure binary content handling
    const integration = new apigateway.LambdaIntegration(props.handler, {
      proxy: true,
      contentHandling: apigateway.ContentHandling.CONVERT_TO_BINARY
    });

    endpoint.resource.addMethod(props.method, integration, {
      authorizationType: apigateway.AuthorizationType.COGNITO_USER_POOLS,
      authorizer: props.authorizer
    });

    return endpoint;
  }
}

// Usage for file download endpoint:
ApiEndpointFactory.createAuthenticatedBinaryEndpoint(this, 'ZipKeysEndpoint', {
  resource: zipResource,
  method: 'POST',
  handler: this.getFunction('ZIP_KEYS'),
  userPool: this.userPool,
  authorizer: this.authorizer
});
```

### 3. Cross-Stack Layer Management

**Issue**: CloudFormation exports can cause deployment failures when updating layers.

**Solution**: Use SSM Parameter Store for layer ARN storage.

```typescript
// In layer stack - store ARN:
new ssm.StringParameter(this, 'PrismaMigrationLayerArnParam', {
  parameterName: `/${PROJECT_PREFIX}/${this.stage}/layers/prisma-migration-arn`,
  stringValue: this.prismaMigrationLayer.layerVersionArn,
  description: 'ARN of the Prisma migration layer'
});

// In consuming stack - retrieve ARN:
private getMigrationLayer(): lambda.ILayerVersion | undefined {
  if (!this.prismaMigrationLayer) {
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
```

### 4. Auth Stack Validation

**Issue**: Missing configuration can cause silent authentication failures.

**Solution**: Validate critical configuration during stack creation.

```typescript
// lib/stacks/auth-stack.ts
private validateConfiguration(): void {
  // Prevent silent auth failures
  if (this.allowedCallbackUrls.length === 0) {
    throw new Error(
      'allowedCallbackUrls must not be empty - authentication will fail without valid callback URLs'
    );
  }
  
  // Ensure proper email delivery in production
  if (this.stage === 'prod' && !this.emailSender) {
    throw new Error(
      'emailSender must be provided in production to ensure proper email delivery'
    );
  }
}

// Provide domain-verified default
private getDefaultEmailSender(): string {
  // Avoid Cognito's default no-reply@verificationemail.com
  return `noreply-${this.stage}@mcr.cms.gov`;
}
```

### 5. IAM Permission Scoping

**Issue**: Mixed IAM condition contexts and unattached policies.

**Solution**: Use correct Identity Pool conditions and attach policies.

```typescript
// ❌ Anti-pattern: Mixing contexts
conditions: {
  StringEquals: {
    'cognito-identity.amazonaws.com:aud': identityPoolId,
    'cognito:groups': 'ADMIN'  // Wrong context!
  }
}

// ✅ Correct pattern: Identity Pool conditions
const groupBasedPolicy = new iam.Policy(this, 'GroupBasedAccessPolicy', {
  statements: [
    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['s3:GetObject'],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': this.identityPool.ref
        },
        'ForAnyValue:StringLike': {
          'cognito-identity.amazonaws.com:amr': '*:ADMIN'
        }
      }
    })
  ]
});

// MUST attach the policy!
this.authenticatedRole.attachInlinePolicy(groupBasedPolicy);
```

### 6. Environment Variable Security

**Issue**: Sensitive values in environment variables can leak.

**Solution**: Use proper patterns for each type of configuration.

```typescript
// lib/constructs/lambda/environment-factory.ts
export class LambdaEnvironmentFactory {
  static createApiLambdaEnvironment(config: {
    // ... other params
    jwtSecretName: string,  // Name only, not ARN
    applicationEndpoint?: string
  }): Record<string, string> {
    return {
      // Non-sensitive configuration
      APPLICATION_ENDPOINT: config.applicationEndpoint || 
        `https://${stage === 'prod' ? 'app' : stage}.mcr.cms.gov`,
      
      // Secret reference (not value)
      JWT_SECRET_NAME: config.jwtSecretName,
      
      // SSM parameters resolved at deploy time
      API_OTEL_COLLECTOR_URL: ssm.StringParameter.valueForStringParameter(
        this, '/configuration/api_app_otel_collector_url'
      )
    };
  }
}
```

## Security Patterns

### WAF Integration with API Gateway

The WafProtectedApi construct provides automatic WAF protection for API Gateway.

```typescript
// lib/constructs/api/waf-protected-api.ts
export interface WafConfig {
  aclName: string;
  excludedRules?: { name: string }[];
  ipRateLimitPerFiveMinutes?: number;
  geoRestriction?: {
    allowedCountries?: string[];
    blockedCountries?: string[];
  };
}

export class WafProtectedApi extends Construct {
  public readonly api: apigateway.RestApi;
  public readonly webAcl: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props: {
    stage: string;
    serviceName: string;
    wafConfig: WafConfig;
  }) {
    super(scope, id);

    // Create API Gateway
    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: `${props.serviceName}-${props.stage}-api`,
      deployOptions: {
        stageName: props.stage,
        tracingEnabled: true,
        dataTraceEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['*']
      }
    });

    // Create WAF Web ACL
    this.webAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
      scope: 'REGIONAL', // For API Gateway
      defaultAction: { allow: {} },
      name: props.wafConfig.aclName,
      rules: this.createWafRules(props.wafConfig),
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `${props.serviceName}-waf-metric`
      }
    });

    // Associate WAF with API Gateway stage
    new wafv2.CfnWebACLAssociation(this, 'WebAclAssociation', {
      resourceArn: `${this.api.deploymentStage.stageArn}`,
      webAclArn: this.webAcl.attrArn
    });
  }

  private createWafRules(config: WafConfig): wafv2.CfnWebACL.RuleProperty[] {
    const rules: wafv2.CfnWebACL.RuleProperty[] = [];
    let priority = 0;

    // 1. AWS Managed Core Rule Set
    rules.push({
      priority: priority++,
      name: 'AWSManagedRulesCommonRuleSet',
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesCommonRuleSet',
          excludedRules: config.excludedRules || []
        }
      },
      action: { block: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'CommonRuleSetMetric'
      }
    });

    // 2. Rate limiting rule
    if (config.ipRateLimitPerFiveMinutes) {
      rules.push({
        priority: priority++,
        name: 'RateLimitRule',
        statement: {
          rateBasedStatement: {
            limit: config.ipRateLimitPerFiveMinutes,
            aggregateKeyType: 'IP'
          }
        },
        action: { block: {} },
        visibilityConfig: {
          sampledRequestsEnabled: true,
          cloudWatchMetricsEnabled: true,
          metricName: 'RateLimitMetric'
        }
      });
    }

    // 3. Geo-restriction rule
    if (config.geoRestriction) {
      if (config.geoRestriction.allowedCountries) {
        rules.push({
          priority: priority++,
          name: 'GeoAllowRule',
          statement: {
            notStatement: {
              statement: {
                geoMatchStatement: {
                  countryCodes: config.geoRestriction.allowedCountries
                }
              }
            }
          },
          action: { block: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'GeoAllowMetric'
          }
        });
      }
    }

    return rules;
  }
}
```

### Geo-Restricted CloudFront with WAF

```typescript
// lib/constructs/frontend/geo-restricted-waf.ts
export class GeoRestrictedWaf extends Construct {
  public readonly webAcl: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props: {
    stage: string;
    allowedCountries: string[];
  }) {
    super(scope, id);

    this.webAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
      scope: 'CLOUDFRONT', // For CloudFront
      defaultAction: { block: {} }, // Default deny
      name: `${props.stage}-cloudfront-webacl`,
      rules: [
        {
          priority: 0,
          name: `${props.stage}-allow-countries`,
          statement: {
            geoMatchStatement: {
              countryCodes: props.allowedCountries
            }
          },
          action: { allow: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'GeoAllowMetric'
          }
        }
      ],
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `${props.stage}-webacl`
      }
    });
  }
}

// Usage in CloudFront
const waf = new GeoRestrictedWaf(this, 'Waf', {
  stage: this.stage,
  allowedCountries: ['US', 'PR', 'GU', 'VI', 'MP', 'UM']
});

const distribution = new cloudfront.Distribution(this, 'Distribution', {
  webAclId: waf.webAcl.attrArn,
  // ... other config
});
```

### S3 Bucket Security Policies

```typescript
// lib/constructs/storage/secure-s3-bucket.ts
export class SecureS3Bucket extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: {
    bucketName?: string;
    allowedFileTypes?: string[];
    requireVirusScan?: boolean;
    allowedPrincipals?: iam.IPrincipal[];
  }) {
    super(scope, id);

    // Create bucket with security defaults
    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: props.bucketName,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [{
        id: 'delete-old-versions',
        noncurrentVersionExpiration: cdk.Duration.days(90)
      }],
      enforceSSL: true // Automatically adds SSL-only policy
    });

    // Add custom bucket policies
    if (props.requireVirusScan) {
      this.addVirusScanPolicy();
    }

    if (props.allowedFileTypes) {
      this.addFileTypeRestrictionPolicy(props.allowedFileTypes);
    }
  }

  private addVirusScanPolicy(): void {
    // Deny access to files without clean scan status
    this.bucket.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'DenyUnscannedFileAccess',
      effect: iam.Effect.DENY,
      principals: [new iam.AnyPrincipal()],
      actions: ['s3:GetObject'],
      resources: [`${this.bucket.bucketArn}/*`],
      conditions: {
        StringNotEquals: {
          's3:ExistingObjectTag/virusScanStatus': 'CLEAN'
        }
      }
    }));
  }

  private addFileTypeRestrictionPolicy(allowedTypes: string[]): void {
    // Create allowed file patterns
    const allowedResources = allowedTypes.map(
      type => `${this.bucket.bucketArn}/*${type}`
    );

    // Deny uploads of non-allowed file types
    this.bucket.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'DenyNonAllowedFileTypes',
      effect: iam.Effect.DENY,
      principals: [new iam.AnyPrincipal()],
      actions: ['s3:PutObject'],
      notResources: allowedResources
    }));
  }
}
```

### Lambda Function Security

```typescript
// Security-hardened Lambda configuration
export class SecureLambdaFunction extends BaseLambdaFunction {
  constructor(scope: Construct, id: string, props: BaseLambdaFunctionProps) {
    super(scope, id, props);

    // 1. Enable AWS Lambda Insights
    this.function.addLayers(
      lambda.LayerVersion.fromLayerVersionArn(
        this,
        'LambdaInsights',
        `arn:aws:lambda:${Stack.of(this).region}:580247275435:layer:LambdaInsightsExtension:21`
      )
    );

    // 2. Add security environment variables
    this.function.addEnvironment('AWS_NODEJS_CONNECTION_REUSE_ENABLED', '1');
    this.function.addEnvironment('NODE_OPTIONS', '--enable-source-maps');

    // 3. Configure dead letter queue
    const dlq = new sqs.Queue(this, 'DeadLetterQueue', {
      encryption: sqs.QueueEncryption.KMS_MANAGED,
      retentionPeriod: cdk.Duration.days(14)
    });
    
    this.function.configureAsyncInvoke({
      onFailure: new destinations.SqsDestination(dlq),
      maxEventAge: cdk.Duration.hours(2),
      retryAttempts: 2
    });

    // 4. Add security monitoring
    new cloudwatch.Alarm(this, 'ErrorAlarm', {
      metric: this.function.metricErrors(),
      threshold: 5,
      evaluationPeriods: 1
    });

    // 5. Restrict concurrent executions for DDoS protection
    if (!props.lambdaConfig.reservedConcurrentExecutions) {
      this.function.configureReservedConcurrentExecutions(100);
    }
  }
}
```

### Cognito Security Configuration

```typescript
// Enhanced Cognito security settings
export class SecureCognitoAuth extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: {
    allowedCallbackUrls: string[];
    samlMetadataUrl?: string;
  }) {
    super(scope, id);

    // Create user pool with security best practices
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: false, // Disable SMS MFA (security best practice)
        otp: true   // Enable TOTP only
      },
      advancedSecurityMode: cognito.AdvancedSecurityMode.ENFORCED,
      userVerification: {
        emailSubject: 'Verify your MCR account',
        emailBody: 'Your verification code is {####}',
        emailStyle: cognito.VerificationEmailStyle.CODE
      },
      selfSignUpEnabled: false, // Disable self-registration
      signInAliases: {
        email: true,
        username: false
      },
      autoVerify: {
        email: true
      }
    });

    // Configure SAML if provided
    if (props.samlMetadataUrl) {
      new cognito.UserPoolIdentityProviderSaml(this, 'SamlProvider', {
        userPool: this.userPool,
        metadata: {
          metadataType: cognito.SamlMetadataType.URL,
          metadataContent: props.samlMetadataUrl
        },
        name: 'CMS-IDM'
      });
    }

    // Create app client with security settings
    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      generateSecret: false, // For SPA
      authFlows: {
        userPassword: false, // Disable for security
        userSrp: true,       // Use SRP
        custom: true
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false // Disable implicit flow
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE
        ],
        callbackUrls: props.allowedCallbackUrls,
        logoutUrls: props.allowedCallbackUrls
      },
      preventUserExistenceErrors: true,
      accessTokenValidity: cdk.Duration.minutes(60),
      idTokenValidity: cdk.Duration.minutes(60),
      refreshTokenValidity: cdk.Duration.days(30)
    });
  }
}
```

### Serverless Security vs CDK Security Patterns

#### Serverless WAF Plugin
```yaml
# serverless.yml
plugins:
  - '@enterprise-cmcs/serverless-waf-plugin'

custom:
  wafExcludeRules:
    awsCommon:
      - 'SizeRestrictions_BODY'
  webAclName: ${self:custom.stage}-${self:service}-webacl
```

#### CDK WAF Implementation
```typescript
// More control and flexibility
const wafApi = new WafProtectedApi(this, 'WafApi', {
  stage: this.stage,
  serviceName: 'app-api',
  wafConfig: {
    aclName: `${this.stage}-app-api-webacl`,
    excludedRules: [{ name: 'SizeRestrictions_BODY' }],
    ipRateLimitPerFiveMinutes: 2000,
    geoRestriction: {
      allowedCountries: ['US', 'CA']
    }
  }
});
```

### Key Security Migration Notes

1. **WAF Configuration**:
   - Serverless: Plugin-based with limited customization
   - CDK: Full control over rules and conditions

2. **S3 Bucket Policies**:
   - Serverless: Manual policy definitions
   - CDK: Type-safe policy builders with validation

3. **Lambda Security**:
   - Serverless: Basic IAM configuration
   - CDK: Comprehensive security layers including DLQ, monitoring

4. **Cognito Configuration**:
   - Serverless: CloudFormation resources
   - CDK: High-level constructs with security defaults

5. **SSL/TLS Enforcement**:
   - Serverless: Manual bucket policies
   - CDK: Single `enforceSSL: true` property

---

## Build & Deployment Patterns

### Frontend Build Integration

The app-web service pattern shows how to integrate build processes with CDK deployment.

```typescript
// lib/constructs/frontend/app-web-integration.ts
export class AppWebIntegration extends Construct {
  constructor(scope: Construct, id: string, props: {
    api: apigateway.IRestApi;
    userPool: cognito.IUserPool;
    uploadsBucket: s3.IBucket;
    uiBucket: s3.IBucket;
    uiDistribution: cloudfront.IDistribution;
    storybookBucket: s3.IBucket;
    storybookDistribution: cloudfront.IDistribution;
    stage: string;
  }) {
    super(scope, id);

    // 1. Create build configuration
    const buildConfig = this.createBuildConfig(props);

    // 2. Build the frontend applications
    const buildOutput = this.buildApplications(buildConfig);

    // 3. Deploy to S3
    this.deployToS3(buildOutput, props);

    // 4. Invalidate CloudFront
    this.invalidateCloudFront(props);
  }

  private createBuildConfig(props: any): BuildConfig {
    return {
      VITE_APP_API_URL: props.api.url,
      VITE_APP_APPLICATION_ENDPOINT: `https://${props.uiDistribution.domainName}`,
      VITE_APP_COGNITO_REGION: Stack.of(this).region,
      VITE_APP_COGNITO_USER_POOL_ID: props.userPool.userPoolId,
      VITE_APP_COGNITO_USER_POOL_CLIENT_ID: props.userPool.userPoolClientId,
      VITE_APP_S3_DOCUMENTS_BUCKET: props.uploadsBucket.bucketName,
      VITE_APP_STAGE_NAME: props.stage,
      // Add all other required environment variables
    };
  }

  private buildApplications(config: BuildConfig): BucketDeployment {
    // Option 1: Build during CDK synthesis
    return new s3deploy.BucketDeployment(this, 'DeployWebApp', {
      sources: [
        s3deploy.Source.asset('../app-web', {
          bundling: {
            image: cdk.DockerImage.fromRegistry('node:20'),
            command: [
              'bash', '-c', [
                'npm ci',
                // Export all environment variables
                ...Object.entries(config).map(([key, value]) => 
                  `export ${key}="${value}"`
                ),
                'npm run build',
                'npm run storybook:build',
                'cp -r build/* /asset-output/',
                'mkdir -p /asset-output/storybook',
                'cp -r storybook-static/* /asset-output/storybook/'
              ].join(' && ')
            ],
            user: 'root'
          }
        })
      ],
      destinationBucket: props.uiBucket,
      distribution: props.uiDistribution,
      distributionPaths: ['/*']
    });
  }

  private deployToS3(deployment: BucketDeployment, props: any): void {
    // Deploy main app
    new s3deploy.BucketDeployment(this, 'DeployMainApp', {
      sources: [s3deploy.Source.asset('./build')],
      destinationBucket: props.uiBucket,
      distribution: props.uiDistribution,
      distributionPaths: ['/*'],
      prune: true
    });

    // Deploy storybook
    new s3deploy.BucketDeployment(this, 'DeployStorybook', {
      sources: [s3deploy.Source.asset('./storybook-static')],
      destinationBucket: props.storybookBucket,
      distribution: props.storybookDistribution,
      distributionPaths: ['/*'],
      prune: true
    });
  }

  private invalidateCloudFront(props: any): void {
    // Automatic with BucketDeployment when distribution is specified
    // No need for separate invalidation
  }
}
```

### Alternative: CodeBuild Integration

```typescript
// For more complex build processes
export class CodeBuildFrontend extends Construct {
  public readonly project: codebuild.Project;

  constructor(scope: Construct, id: string, props: {
    sourceRepository: string;
    buildEnvironment: { [key: string]: string };
    outputBucket: s3.IBucket;
  }) {
    super(scope, id);

    // Create CodeBuild project
    this.project = new codebuild.Project(this, 'BuildProject', {
      source: codebuild.Source.gitHub({
        owner: 'Enterprise-CMCS',
        repo: 'managed-care-review',
        webhook: true,
        webhookFilters: [
          codebuild.FilterGroup.inEventOf(
            codebuild.EventAction.PUSH
          ).andBranchIs('main')
        ]
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.MEDIUM,
        environmentVariables: this.convertToCodeBuildEnv(props.buildEnvironment)
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': {
              nodejs: 20
            },
            commands: ['npm ci']
          },
          build: {
            commands: [
              'npm run build',
              'npm run test:ci',
              'npm run storybook:build'
            ]
          }
        },
        artifacts: {
          files: ['**/*'],
          'base-directory': 'build'
        }
      }),
      artifacts: codebuild.Artifacts.s3({
        bucket: props.outputBucket,
        packageZip: false,
        path: 'frontend-builds'
      })
    });

    // Grant permissions
    props.outputBucket.grantWrite(this.project);
  }

  private convertToCodeBuildEnv(env: { [key: string]: string }): { [key: string]: codebuild.BuildEnvironmentVariable } {
    const result: { [key: string]: codebuild.BuildEnvironmentVariable } = {};
    
    for (const [key, value] of Object.entries(env)) {
      result[key] = { value, type: codebuild.BuildEnvironmentVariableType.PLAINTEXT };
    }
    
    return result;
  }
}
```

### Static Website Deployment Pattern

```typescript
// lib/constructs/frontend/static-website.ts
export class StaticWebsite extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: {
    domainName?: string;
    certificateArn?: string;
    buildCommand?: string;
    buildDirectory: string;
    environmentVariables?: { [key: string]: string };
  }) {
    super(scope, id);

    // Create S3 bucket for static hosting
    this.bucket = new s3.Bucket(this, 'Bucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // For SPA routing
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    // Create OAI for CloudFront
    const oai = new cloudfront.OriginAccessIdentity(this, 'OAI');
    this.bucket.grantRead(oai);

    // Create CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(this.bucket, {
          originAccessIdentity: oai
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true
      },
      domainNames: props.domainName ? [props.domainName] : undefined,
      certificate: props.certificateArn ? 
        acm.Certificate.fromCertificateArn(this, 'Cert', props.certificateArn) : 
        undefined,
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0)
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0)
        }
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100
    });

    // Deploy built assets
    if (props.buildCommand) {
      new s3deploy.BucketDeployment(this, 'Deployment', {
        sources: [
          s3deploy.Source.asset(props.buildDirectory, {
            bundling: {
              image: cdk.DockerImage.fromRegistry('node:20'),
              command: ['bash', '-c', [
                'cd /asset-input',
                'npm ci',
                ...Object.entries(props.environmentVariables || {}).map(
                  ([k, v]) => `export ${k}="${v}"`
                ),
                props.buildCommand,
                'cp -r ' + props.buildDirectory + '/* /asset-output/'
              ].join(' && ')],
              user: 'root'
            }
          })
        ],
        destinationBucket: this.bucket,
        distribution: this.distribution,
        distributionPaths: ['/*']
      });
    } else {
      // Deploy pre-built assets
      new s3deploy.BucketDeployment(this, 'Deployment', {
        sources: [s3deploy.Source.asset(props.buildDirectory)],
        destinationBucket: this.bucket,
        distribution: this.distribution,
        distributionPaths: ['/*']
      });
    }
  }
}
```

### Serverless Deployment vs CDK Patterns

#### Serverless Plugin Approach
```yaml
# serverless.yml for app-web
plugins:
  - serverless-plugin-scripts
  - serverless-s3-sync
  - serverless-cf-invalidate-proxy

custom:
  scripts:
    hooks:
      package:initialize: |
        export VITE_APP_API_URL=${self:custom.api_url}
        npm run build
        npm run storybook:build

  s3Sync:
    - bucketName: ${self:custom.ui_s3_bucket_name}
      localDir: ./build
      deleteRemoved: true

  cloudfrontInvalidate:
    - distributionId: ${self:custom.ui_cloudfront_distribution_id}
      items:
        - '/*'
```

#### CDK Integrated Approach
```typescript
// All-in-one deployment with automatic invalidation
new StaticWebsite(this, 'AppWebsite', {
  buildCommand: 'npm run build',
  buildDirectory: 'build',
  environmentVariables: {
    VITE_APP_API_URL: api.url,
    VITE_APP_STAGE: this.stage
  },
  domainName: 'app.example.com',
  certificateArn: certificateArn
});
```

### Key Build & Deployment Notes

1. **Build Integration**:
   - Serverless: Separate build step with plugins
   - CDK: Integrated build during deployment

2. **Environment Variables**:
   - Serverless: Shell script exports
   - CDK: Structured configuration objects

3. **CloudFront Invalidation**:
   - Serverless: Separate plugin required
   - CDK: Automatic with BucketDeployment

4. **Build Caching**:
   - CDK can leverage Docker layer caching
   - Consider CodeBuild for complex builds

5. **Deployment Rollback**:
   - CDK maintains previous versions
   - Easy rollback with CloudFormation

---

## Database Operations

### Database Migration Patterns

```typescript
// lib/constructs/database/migration-handler.ts
export class DatabaseMigrationHandler extends Construct {
  public readonly migrationFunction: lambda.Function;
  public readonly customResource: CustomResource;

  constructor(scope: Construct, id: string, props: {
    vpc: ec2.IVpc;
    databaseCluster: rds.IDatabaseCluster;
    databaseSecret: secretsmanager.ISecret;
    prismaLayer: lambda.ILayerVersion;
    migrationsPath: string;
  }) {
    super(scope, id);

    // Create migration Lambda
    this.migrationFunction = new LambdaFactory.createDatabaseFunction(
      this,
      'MigrationFunction',
      {
        entry: path.join(__dirname, 'handlers/migrate.ts'),
        vpc: props.vpc,
        securityGroup: props.databaseCluster.connections.securityGroups[0],
        databaseSecretArn: props.databaseSecret.secretArn,
        prismaLayer: props.prismaLayer,
        environment: {
          DATABASE_URL_SECRET_ARN: props.databaseSecret.secretArn,
          PRISMA_SCHEMA_PATH: '/opt/nodejs/node_modules/@prisma/client/schema.prisma'
        },
        timeout: cdk.Duration.minutes(15), // Migrations can take time
        memorySize: 2048
      }
    );

    // Grant permissions
    props.databaseSecret.grantRead(this.migrationFunction);
    props.databaseCluster.connections.allowDefaultPortFrom(this.migrationFunction);

    // Create custom resource to run migrations
    const provider = new cr.Provider(this, 'MigrationProvider', {
      onEventHandler: this.migrationFunction,
      logRetention: logs.RetentionDays.ONE_WEEK
    });

    this.customResource = new CustomResource(this, 'DatabaseMigration', {
      serviceToken: provider.serviceToken,
      properties: {
        version: Date.now().toString(), // Force update on each deployment
        migrationsPath: props.migrationsPath
      }
    });
  }
}

// Migration handler Lambda code
export const handler = async (event: CloudFormationCustomResourceEvent) => {
  const { PrismaClient } = require('@prisma/client');
  const { execSync } = require('child_process');
  
  if (event.RequestType === 'Delete') {
    // Don't run migrations on delete
    return { PhysicalResourceId: 'migrations' };
  }

  try {
    // Get database URL from secrets
    const secret = await getSecretValue(process.env.DATABASE_URL_SECRET_ARN!);
    const databaseUrl = buildDatabaseUrl(secret);
    
    // Set environment for Prisma
    process.env.DATABASE_URL = databaseUrl;
    
    // Run migrations
    console.log('Running database migrations...');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: databaseUrl }
    });
    
    // Verify connection
    const prisma = new PrismaClient();
    await prisma.$connect();
    const count = await prisma.$executeRaw`SELECT COUNT(*) FROM "_prisma_migrations"`;
    await prisma.$disconnect();
    
    console.log(`Migrations completed. Total migrations: ${count}`);
    
    return {
      PhysicalResourceId: 'migrations',
      Data: {
        MigrationsCount: count,
        Timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};
```

### Database Backup and Restore

```typescript
// lib/constructs/database/backup-handler.ts
export class DatabaseBackupHandler extends Construct {
  public readonly backupFunction: lambda.Function;
  public readonly restoreFunction: lambda.Function;
  public readonly backupBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: {
    vpc: ec2.IVpc;
    databaseCluster: rds.IDatabaseCluster;
    databaseSecret: secretsmanager.ISecret;
    postgresLayer: lambda.ILayerVersion;
  }) {
    super(scope, id);

    // Create backup bucket
    this.backupBucket = new s3.Bucket(this, 'BackupBucket', {
      bucketName: `${Stack.of(this).account}-db-backups-${props.stage}`,
      lifecycleRules: [{
        id: 'delete-old-backups',
        expiration: cdk.Duration.days(30),
        transitions: [{
          storageClass: s3.StorageClass.GLACIER,
          transitionAfter: cdk.Duration.days(7)
        }]
      }],
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });

    // Create backup function
    this.backupFunction = this.createBackupFunction(props);

    // Create restore function
    this.restoreFunction = this.createRestoreFunction(props);

    // Schedule daily backups
    const backupRule = new events.Rule(this, 'BackupSchedule', {
      schedule: events.Schedule.rate(cdk.Duration.days(1))
    });
    backupRule.addTarget(new targets.LambdaFunction(this.backupFunction));
  }

  private createBackupFunction(props: any): lambda.Function {
    const fn = new lambda.Function(this, 'BackupFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { Client } = require('pg');
        const AWS = require('aws-sdk');
        const s3 = new AWS.S3();
        const { execSync } = require('child_process');
        
        exports.handler = async (event) => {
          const secret = await getSecretValue(process.env.DATABASE_SECRET_ARN);
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const backupKey = \`backups/\${timestamp}/backup.sql\`;
          
          // Create pg_dump command
          const dumpCommand = \`PGPASSWORD=\${secret.password} pg_dump \\
            -h \${secret.host} \\
            -U \${secret.username} \\
            -d \${secret.dbname} \\
            --no-owner \\
            --clean \\
            --if-exists\`;
          
          // Execute backup
          console.log('Starting database backup...');
          const backup = execSync(dumpCommand);
          
          // Upload to S3
          await s3.putObject({
            Bucket: process.env.BACKUP_BUCKET,
            Key: backupKey,
            Body: backup,
            ServerSideEncryption: 'AES256',
            Metadata: {
              timestamp,
              database: secret.dbname,
              size: backup.length.toString()
            }
          }).promise();
          
          console.log(\`Backup completed: \${backupKey}\`);
          
          return {
            statusCode: 200,
            body: JSON.stringify({ backupKey, size: backup.length })
          };
        };
      `),
      vpc: props.vpc,
      layers: [props.postgresLayer],
      timeout: cdk.Duration.minutes(15),
      memorySize: 3008,
      environment: {
        DATABASE_SECRET_ARN: props.databaseSecret.secretArn,
        BACKUP_BUCKET: this.backupBucket.bucketName
      }
    });

    // Grant permissions
    props.databaseSecret.grantRead(fn);
    this.backupBucket.grantWrite(fn);
    props.databaseCluster.connections.allowDefaultPortFrom(fn);

    return fn;
  }

  private createRestoreFunction(props: any): lambda.Function {
    // Similar pattern for restore function
    // Reads from S3 and restores to database
  }
}
```

### Database Secret Rotation

```typescript
// lib/constructs/database/secret-rotation.ts
export class DatabaseSecretRotation extends Construct {
  constructor(scope: Construct, id: string, props: {
    databaseCluster: rds.IDatabaseCluster;
    databaseSecret: secretsmanager.ISecret;
    vpc: ec2.IVpc;
  }) {
    super(scope, id);

    // Enable automatic secret rotation
    new secretsmanager.SecretRotation(this, 'SecretRotation', {
      application: secretsmanager.SecretRotationApplication.POSTGRES_ROTATION_SINGLE_USER,
      secret: props.databaseSecret,
      target: props.databaseCluster,
      vpc: props.vpc,
      automaticallyAfter: cdk.Duration.days(30),
      excludeCharacters: ' %+~`#$&*()|[]{}:;<>?!\'/@"\\',
    });

    // Create Lambda to update application connections after rotation
    const rotationHook = new lambda.Function(this, 'RotationHook', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          // Notify application of secret rotation
          console.log('Secret rotated:', event);
          
          // Could trigger ECS task refresh, Lambda restarts, etc.
          // Application should use AWS SDK to fetch secrets dynamically
          
          return { statusCode: 200 };
        };
      `),
      environment: {
        SECRET_ARN: props.databaseSecret.secretArn
      }
    });

    // Trigger on secret rotation
    props.databaseSecret.addRotationSchedule('RotationSchedule', {
      automaticallyAfter: cdk.Duration.days(30),
      lambda: rotationHook
    });
  }
}
```

### Serverless Database Operations vs CDK

#### Serverless Approach
```yaml
functions:
  migrate:
    handler: src/db/migrate.handler
    vpc:
      securityGroupIds:
        - ${cf:database-${self:provider.stage}.DBSecurityGroup}
      subnetIds:
        - ${cf:network-${self:provider.stage}.PrivateSubnetA}
    environment:
      DATABASE_URL: ${cf:database-${self:provider.stage}.DatabaseUrl}
    events:
      - schedule: rate(1 day) # For backups

resources:
  Resources:
    MigrationCustomResource:
      Type: Custom::DatabaseMigration
      Properties:
        ServiceToken: !GetAtt MigrateLambdaFunction.Arn
```

#### CDK Integrated Approach
```typescript
// Complete database operations setup
const dbOps = new DatabaseOperationsStack(app, 'DbOps', {
  vpc: networkStack.vpc,
  database: dataStack.database,
  includeBackups: true,
  includeSecretRotation: true,
  runMigrationsOnDeploy: true
});
```

### Key Database Operations Notes

1. **Migration Management**:
   - Serverless: Manual Lambda triggers
   - CDK: Automated with Custom Resources

2. **Backup Strategies**:
   - Native RDS snapshots for disaster recovery
   - pg_dump for logical backups and migrations

3. **Secret Rotation**:
   - CDK provides built-in rotation constructs
   - Serverless requires manual Lambda setup

4. **Connection Management**:
   - Use RDS Proxy for connection pooling
   - Lambda functions should use IAM auth when possible

5. **Schema Management**:
   - Prisma migrations for schema versioning
   - Custom resources ensure migrations run on deploy

---

## Monitoring & Observability

### OpenTelemetry Integration

```typescript
// lib/constructs/monitoring/otel-configuration.ts
export class OtelConfiguration extends Construct {
  public readonly collectorLayer: lambda.ILayerVersion;
  public readonly collectorConfig: string;

  constructor(scope: Construct, id: string, props: {
    stage: string;
    apiEndpoint: string;
  }) {
    super(scope, id);

    // Use AWS Distro for OpenTelemetry layer
    this.collectorLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'OtelLayer',
      'arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4'
    );

    // Create collector configuration
    this.collectorConfig = this.createCollectorConfig(props);

    // Store config in Parameter Store for Lambda access
    new ssm.StringParameter(this, 'OtelConfig', {
      parameterName: `/mcr/${props.stage}/otel/collector-config`,
      stringValue: this.collectorConfig
    });
  }

  private createCollectorConfig(props: any): string {
    return `
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s
    send_batch_size: 50
  
  resource:
    attributes:
      - key: environment
        value: ${props.stage}
        action: insert
      - key: service.namespace
        value: mcr
        action: insert

exporters:
  otlp:
    endpoint: ${props.apiEndpoint}/otel
    headers:
      x-api-key: \${env:OTEL_API_KEY}
  
  awsxray:
    region: us-east-1

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [otlp, awsxray]
    
    metrics:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [otlp]
`;
  }

  // Helper to configure Lambda for OTEL
  public configureLambda(fn: lambda.Function): void {
    fn.addLayers(this.collectorLayer);
    fn.addEnvironment('AWS_LAMBDA_EXEC_WRAPPER', '/opt/otel-handler');
    fn.addEnvironment('OPENTELEMETRY_COLLECTOR_CONFIG_FILE', '/var/task/collector.yml');
    fn.addEnvironment('OTEL_PROPAGATORS', 'tracecontext,baggage,xray');
    fn.addEnvironment('OTEL_TRACES_SAMPLER', 'always_on');
  }
}
```

### CloudWatch Dashboard

```typescript
// lib/constructs/monitoring/dashboard.ts
export class MonitoringDashboard extends Construct {
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, props: {
    api: apigateway.RestApi;
    lambdaFunctions: lambda.Function[];
    database: rds.IDatabaseCluster;
    buckets: s3.IBucket[];
  }) {
    super(scope, id);

    this.dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `MCR-${props.stage}-Dashboard`,
      periodOverride: cloudwatch.PeriodOverride.INHERIT,
      defaultInterval: cdk.Duration.hours(1)
    });

    // API Gateway metrics
    this.addApiMetrics(props.api);

    // Lambda metrics
    this.addLambdaMetrics(props.lambdaFunctions);

    // Database metrics
    this.addDatabaseMetrics(props.database);

    // S3 metrics
    this.addS3Metrics(props.buckets);

    // Custom business metrics
    this.addBusinessMetrics();
  }

  private addApiMetrics(api: apigateway.RestApi): void {
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway Metrics',
        left: [
          api.metricCount({ statistic: 'Sum' }),
          api.metricLatency({ statistic: 'Average' }),
          api.metric4XXError({ statistic: 'Sum' }),
          api.metric5XXError({ statistic: 'Sum' })
        ],
        width: 12
      })
    );
  }

  private addLambdaMetrics(functions: lambda.Function[]): void {
    const widgets = functions.map(fn => 
      new cloudwatch.GraphWidget({
        title: `Lambda: ${fn.functionName}`,
        left: [
          fn.metricInvocations({ statistic: 'Sum' }),
          fn.metricErrors({ statistic: 'Sum' }),
          fn.metricDuration({ statistic: 'Average' }),
          fn.metricConcurrentExecutions({ statistic: 'Maximum' })
        ],
        width: 6
      })
    );

    this.dashboard.addWidgets(...widgets);
  }

  private addDatabaseMetrics(database: rds.IDatabaseCluster): void {
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Database Metrics',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/RDS',
            metricName: 'DatabaseConnections',
            dimensionsMap: {
              DBClusterIdentifier: database.clusterIdentifier
            },
            statistic: 'Average'
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/RDS',
            metricName: 'CPUUtilization',
            dimensionsMap: {
              DBClusterIdentifier: database.clusterIdentifier
            },
            statistic: 'Average'
          })
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/RDS',
            metricName: 'ServerlessDatabaseCapacity',
            dimensionsMap: {
              DBClusterIdentifier: database.clusterIdentifier
            },
            statistic: 'Average'
          })
        ],
        width: 12
      })
    );
  }

  private addBusinessMetrics(): void {
    // Custom metrics
    const namespace = 'MCR/Business';
    
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Business Metrics',
        left: [
          new cloudwatch.Metric({
            namespace,
            metricName: 'SubmissionsCreated',
            statistic: 'Sum'
          }),
          new cloudwatch.Metric({
            namespace,
            metricName: 'DocumentsUploaded',
            statistic: 'Sum'
          })
        ],
        width: 12
      })
    );
  }
}
```

### Alarm Configuration

```typescript
// lib/constructs/monitoring/alarms.ts
export class MonitoringAlarms extends Construct {
  public readonly alarmTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: {
    api: apigateway.RestApi;
    lambdaFunctions: lambda.Function[];
    database: rds.IDatabaseCluster;
    alertEmail: string;
  }) {
    super(scope, id);

    // Create SNS topic for alarms
    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      displayName: 'MCR Monitoring Alarms'
    });

    this.alarmTopic.addSubscription(
      new snsSubscriptions.EmailSubscription(props.alertEmail)
    );

    // API Gateway alarms
    this.createApiAlarms(props.api);

    // Lambda alarms
    props.lambdaFunctions.forEach(fn => this.createLambdaAlarms(fn));

    // Database alarms
    this.createDatabaseAlarms(props.database);
  }

  private createApiAlarms(api: apigateway.RestApi): void {
    // High 4XX error rate
    new cloudwatch.Alarm(this, 'Api4XXAlarm', {
      metric: api.metric4XXError({ period: cdk.Duration.minutes(5) }),
      threshold: 50,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'API 4XX errors exceed threshold'
    }).addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    // High 5XX error rate
    new cloudwatch.Alarm(this, 'Api5XXAlarm', {
      metric: api.metric5XXError({ period: cdk.Duration.minutes(5) }),
      threshold: 10,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
      alarmDescription: 'API 5XX errors detected'
    }).addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    // High latency
    new cloudwatch.Alarm(this, 'ApiLatencyAlarm', {
      metric: api.metricLatency({ 
        period: cdk.Duration.minutes(5),
        statistic: 'p99'
      }),
      threshold: 3000, // 3 seconds
      evaluationPeriods: 2,
      alarmDescription: 'API latency exceeds 3 seconds'
    }).addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
  }

  private createLambdaAlarms(fn: lambda.Function): void {
    // Error rate alarm
    new cloudwatch.Alarm(this, `${fn.node.id}ErrorAlarm`, {
      metric: new cloudwatch.MathExpression({
        expression: 'errors / invocations * 100',
        usingMetrics: {
          errors: fn.metricErrors(),
          invocations: fn.metricInvocations()
        }
      }),
      threshold: 5, // 5% error rate
      evaluationPeriods: 2,
      alarmDescription: `${fn.functionName} error rate exceeds 5%`
    }).addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    // Concurrent execution limit
    new cloudwatch.Alarm(this, `${fn.node.id}ConcurrencyAlarm`, {
      metric: fn.metricConcurrentExecutions(),
      threshold: fn.reservedConcurrentExecutions ? 
        fn.reservedConcurrentExecutions * 0.9 : 900,
      evaluationPeriods: 1,
      alarmDescription: `${fn.functionName} approaching concurrency limit`
    }).addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
  }

  private createDatabaseAlarms(database: rds.IDatabaseCluster): void {
    // High CPU utilization
    new cloudwatch.Alarm(this, 'DatabaseCPUAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/RDS',
        metricName: 'CPUUtilization',
        dimensionsMap: {
          DBClusterIdentifier: database.clusterIdentifier
        }
      }),
      threshold: 80,
      evaluationPeriods: 2,
      alarmDescription: 'Database CPU exceeds 80%'
    }).addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    // Connection count
    new cloudwatch.Alarm(this, 'DatabaseConnectionAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/RDS',
        metricName: 'DatabaseConnections',
        dimensionsMap: {
          DBClusterIdentifier: database.clusterIdentifier
        }
      }),
      threshold: 90, // Adjust based on instance size
      evaluationPeriods: 2,
      alarmDescription: 'Database connections approaching limit'
    }).addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
  }
}
```

### EventBridge Event Monitoring

```typescript
// Monitor and log important application events
export class EventMonitoring extends Construct {
  constructor(scope: Construct, id: string, props: {
    eventBus?: events.IEventBus;
  }) {
    super(scope, id);

    const bus = props.eventBus || events.EventBus.fromEventBusName(
      this, 'DefaultBus', 'default'
    );

    // Log all custom events
    const logGroup = new logs.LogGroup(this, 'EventLogs', {
      retention: logs.RetentionDays.ONE_WEEK
    });

    new events.Rule(this, 'LogAllEvents', {
      eventBus: bus,
      eventPattern: {
        source: ['mcr.application']
      },
      targets: [new targets.CloudWatchLogGroup(logGroup)]
    });

    // Monitor specific business events
    const submissionEvents = new events.Rule(this, 'SubmissionEvents', {
      eventBus: bus,
      eventPattern: {
        source: ['mcr.application'],
        detailType: ['Submission Created', 'Submission Updated']
      }
    });

    // Send to monitoring Lambda
    submissionEvents.addTarget(
      new targets.LambdaFunction(
        this.createMetricsFunction()
      )
    );
  }

  private createMetricsFunction(): lambda.Function {
    return new lambda.Function(this, 'MetricsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        const cloudwatch = new AWS.CloudWatch();
        
        exports.handler = async (event) => {
          // Extract business metrics from event
          const metric = {
            Namespace: 'MCR/Business',
            MetricData: [{
              MetricName: event['detail-type'].replace(/\\s+/g, ''),
              Value: 1,
              Unit: 'Count',
              Timestamp: new Date(event.time)
            }]
          };
          
          await cloudwatch.putMetricData(metric).promise();
          
          console.log('Metric published:', metric);
          return { statusCode: 200 };
        };
      `)
    });
  }
}
```

### Serverless Monitoring vs CDK Patterns

#### Serverless Basic Monitoring
```yaml
# Limited to CloudWatch Logs and basic metrics
functions:
  api:
    handler: handler.api
    events:
      - http: GET /
    environment:
      LOG_LEVEL: debug
```

#### CDK Comprehensive Monitoring
```typescript
// Full observability stack
new MonitoringStack(app, 'Monitoring', {
  // OpenTelemetry for distributed tracing
  enableOtel: true,
  
  // CloudWatch dashboards
  createDashboards: true,
  
  // Proactive alarms
  alarmEmail: 'ops@example.com',
  
  // Business metrics
  customMetrics: true,
  
  // Event monitoring
  eventLogging: true
});
```

### Key Monitoring & Observability Notes

1. **Distributed Tracing**:
   - OTEL provides end-to-end request tracing
   - X-Ray integration for AWS services

2. **Metrics Collection**:
   - CloudWatch for infrastructure metrics
   - Custom metrics for business KPIs

3. **Log Aggregation**:
   - Structured logging with correlation IDs
   - Log groups with appropriate retention

4. **Alerting Strategy**:
   - Avoid alert fatigue with smart thresholds
   - Use composite alarms for complex conditions

5. **Cost Optimization**:
   - Set appropriate log retention periods
   - Use metric filters instead of processing all logs

---

## Migration Best Practices

### Incremental Migration Strategy

```typescript
// Recommended approach for migrating from Serverless to CDK

// 1. Start with shared infrastructure
export class Phase1InfraStack extends BaseStack {
  // Migrate VPC, databases, S3 buckets first
  // These can coexist with serverless functions
}

// 2. Create CDK wrappers for existing resources
export class Phase2WrapperStack extends BaseStack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    // Import existing Cognito User Pool
    const userPool = cognito.UserPool.fromUserPoolId(
      this,
      'ImportedUserPool',
      Fn.importValue('ui-auth-prod-UserPoolId')
    );

    // Import existing API Gateway
    const api = apigateway.RestApi.fromRestApiAttributes(
      this,
      'ImportedApi',
      {
        restApiId: Fn.importValue('infra-api-prod-ApiId'),
        rootResourceId: Fn.importValue('infra-api-prod-RootResourceId')
      }
    );

    // Now you can add new CDK resources that use these
  }
}

// 3. Migrate services incrementally
export class Phase3ServiceMigration extends BaseStack {
  // Migrate one service at a time
  // Start with less critical services
}
```

### Handling Environment-Specific Configuration

```typescript
// lib/config/stage-config.ts
export interface StageConfig {
  account: string;
  region: string;
  vpcCidr: string;
  dbConfig: {
    minCapacity: number;
    maxCapacity: number;
    autoPause: boolean;
  };
  lambdaConfig: {
    memorySize: number;
    timeout: number;
    reservedConcurrency?: number;
  };
}

export class StageConfiguration {
  private static configs: Record<string, StageConfig> = {
    dev: {
      account: '123456789012',
      region: 'us-east-1',
      vpcCidr: '10.0.0.0/16',
      dbConfig: {
        minCapacity: 0.5,
        maxCapacity: 1,
        autoPause: true
      },
      lambdaConfig: {
        memorySize: 1024,
        timeout: 30
      }
    },
    prod: {
      account: '210987654321',
      region: 'us-east-1',
      vpcCidr: '10.1.0.0/16',
      dbConfig: {
        minCapacity: 2,
        maxCapacity: 16,
        autoPause: false
      },
      lambdaConfig: {
        memorySize: 3008,
        timeout: 300,
        reservedConcurrency: 100
      }
    }
  };

  static get(stage: string): StageConfig {
    const config = this.configs[stage];
    if (!config) {
      throw new Error(`No configuration found for stage: ${stage}`);
    }
    return config;
  }
}
```

### Common Serverless Plugin Replacements

```typescript
// Serverless plugins and their CDK equivalents

// 1. serverless-domain-manager → Route53 + ACM
const hostedZone = route53.HostedZone.fromLookup(this, 'Zone', {
  domainName: 'example.com'
});

const certificate = new acm.Certificate(this, 'Certificate', {
  domainName: 'api.example.com',
  validation: acm.CertificateValidation.fromDns(hostedZone)
});

const domainName = new apigateway.DomainName(this, 'DomainName', {
  domainName: 'api.example.com',
  certificate
});

// 2. serverless-offline → CDK watch mode
// cdk watch --hotswap

// 3. serverless-plugin-tracing → Built-in CDK
const fn = new lambda.Function(this, 'Function', {
  tracing: lambda.Tracing.ACTIVE // X-Ray tracing enabled
});

// 4. serverless-plugin-canary-deployments → CDK native
const alias = new lambda.Alias(this, 'Alias', {
  aliasName: 'live',
  version: fn.currentVersion
});

new codedeploy.LambdaDeploymentGroup(this, 'DeploymentGroup', {
  alias,
  deploymentConfig: codedeploy.LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES
});

// 5. serverless-prune-plugin → Built-in CDK
const fn = new lambda.Function(this, 'Function', {
  logRetention: logs.RetentionDays.ONE_WEEK // Automatic pruning
});
```

### Testing Strategies

```typescript
// Unit testing CDK constructs
import { Template } from 'aws-cdk-lib/assertions';

describe('ApiStack', () => {
  test('WAF is attached to API', () => {
    const app = new cdk.App();
    const stack = new ApiStack(app, 'TestStack');
    
    const template = Template.fromStack(stack);
    
    // Assert WAF WebACL exists
    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      Scope: 'REGIONAL',
      DefaultAction: { Allow: {} }
    });
    
    // Assert association exists
    template.hasResourceProperties('AWS::WAFv2::WebACLAssociation', {
      ResourceArn: {
        'Fn::Sub': Match.anyValue()
      }
    });
  });
});

// Integration testing
describe('API Integration', () => {
  test('GraphQL endpoint accepts queries', async () => {
    const api = await getDeployedApiUrl();
    
    const response = await fetch(`${api}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        query: '{ users { id name } }'
      })
    });
    
    expect(response.status).toBe(200);
  });
});
```

### Rollback Strategies

```typescript
// Safe rollback patterns

// 1. Use CloudFormation stack policies
const stack = new cdk.Stack(app, 'ProductionStack', {
  stackName: 'mcr-production',
  terminationProtection: true // Prevent accidental deletion
});

// Add stack policy to prevent updates to critical resources
stack.addMetadata('StackPolicy', {
  Statement: [{
    Effect: 'Deny',
    Principal: '*',
    Action: 'Update:Replace',
    Resource: 'LogicalResourceId/Database*'
  }]
});

// 2. Blue-Green deployments for Lambda
const blueGreenLambda = new lambda.Function(this, 'Function', {
  // ... config
});

const alias = blueGreenLambda.addAlias('live');

new codedeploy.LambdaDeploymentGroup(this, 'DeploymentGroup', {
  alias,
  deploymentConfig: codedeploy.LambdaDeploymentConfig.ALL_AT_ONCE,
  alarms: [errorAlarm], // Automatic rollback on alarm
  autoRollback: {
    failedDeployment: true,
    stoppedDeployment: true,
    deploymentInAlarm: true
  }
});

// 3. Database migration rollback
class SafeDatabaseMigration extends Construct {
  constructor(scope: Construct, id: string, props: any) {
    super(scope, id);

    // Always backup before migration
    const backupFunction = new lambda.Function(this, 'Backup', {
      // ... backup logic
    });

    // Run migration with rollback capability
    const migrateFunction = new lambda.Function(this, 'Migrate', {
      code: lambda.Code.fromInline(`
        try {
          // Create savepoint
          await db.query('SAVEPOINT pre_migration');
          
          // Run migration
          await runMigration();
          
          // Test migration
          await validateMigration();
          
          // Commit
          await db.query('RELEASE SAVEPOINT pre_migration');
        } catch (error) {
          // Rollback
          await db.query('ROLLBACK TO SAVEPOINT pre_migration');
          throw error;
        }
      `)
    });
  }
}
```

### Common Pitfalls and Solutions

```typescript
// 1. Circular Dependencies
// ❌ Bad: Direct circular reference
const stackA = new StackA(app, 'A', { 
  database: stackB.database // Error: stackB not defined yet
});
const stackB = new StackB(app, 'B', { 
  api: stackA.api 
});

// ✅ Good: Use exports/imports or combine stacks
const dataStack = new DataStack(app, 'Data');
const apiStack = new ApiStack(app, 'Api', {
  databaseArn: dataStack.databaseArn // Pass ARN, not object
});

// 2. Resource Limits
// ❌ Bad: Too many resources in one stack
class MonolithStack extends Stack {
  // 500+ resources will hit CloudFormation limits
}

// ✅ Good: Split into logical stacks
class NetworkStack extends Stack { /* ~50 resources */ }
class DataStack extends Stack { /* ~100 resources */ }
class ComputeStack extends Stack { /* ~200 resources */ }

// 3. Hard-coded values
// ❌ Bad: Environment-specific values in code
const bucket = new s3.Bucket(this, 'Bucket', {
  bucketName: 'my-app-prod-bucket' // Hard-coded
});

// ✅ Good: Use stage configuration
const bucket = new s3.Bucket(this, 'Bucket', {
  bucketName: `my-app-${this.stage}-bucket-${this.account}`
});

// 4. Missing IAM permissions
// ❌ Bad: Assuming permissions exist
const fn = new lambda.Function(this, 'Function', {
  // Missing S3 permissions
});

// ✅ Good: Explicit permission grants
const fn = new lambda.Function(this, 'Function', {});
bucket.grantRead(fn); // CDK adds minimum required permissions

// 5. Retention policies
// ❌ Bad: Default retention (resources deleted with stack)
const logGroup = new logs.LogGroup(this, 'Logs');

// ✅ Good: Explicit retention for production
const logGroup = new logs.LogGroup(this, 'Logs', {
  retention: logs.RetentionDays.ONE_YEAR,
  removalPolicy: cdk.RemovalPolicy.RETAIN // Keep logs after stack deletion
});
```

### Migration Checklist

```typescript
// Pre-migration checklist
const migrationChecklist = {
  preparation: [
    'Inventory all serverless services',
    'Document cross-service dependencies',
    'Identify shared resources',
    'Plan migration phases',
    'Set up CDK bootstrapping'
  ],
  
  implementation: [
    'Start with stateless resources',
    'Migrate shared infrastructure first',
    'Use CDK import for existing resources',
    'Maintain backwards compatibility',
    'Test each phase thoroughly'
  ],
  
  validation: [
    'Compare CloudFormation templates',
    'Verify all resources migrated',
    'Test all integrations',
    'Validate IAM permissions',
    'Performance testing'
  ],
  
  cutover: [
    'Plan maintenance window',
    'Backup all data',
    'Have rollback plan ready',
    'Monitor closely after migration',
    'Document lessons learned'
  ]
};
```

### Key Migration Best Practices

1. **Incremental Approach**: Migrate one service at a time
2. **Backwards Compatibility**: Maintain during migration
3. **Testing Strategy**: Unit, integration, and load testing
4. **Rollback Plan**: Always have an escape route
5. **Documentation**: Keep detailed migration notes

---

## Modular Constructs Pattern

### Overview
Large CDK stacks can become difficult to maintain. The modular constructs pattern breaks down complex stacks into smaller, focused, reusable components.

### Case Study: GuardDuty Stack Refactoring

#### Before: Monolithic Stack (731 lines)
```typescript
export class GuardDutyMalwareProtectionStack extends BaseStack {
  // Everything in one file:
  // - Detector creation
  // - IAM roles
  // - Protection plans
  // - S3 policies
  // - EventBridge rules
  // - Lambda functions
  // - SQS queues
  // - SNS topics
  // - CloudWatch metrics
  // ... 700+ lines of intertwined logic
}
```

#### After: Modular Constructs (6 focused files)

```typescript
// lib/constructs/guardduty/
├── detector-manager.ts       // 87 lines - GuardDuty detector management
├── malware-protection-plan.ts // 123 lines - Protection plan creation
├── virus-scan-policies.ts    // 106 lines - S3 bucket policies
├── scan-event-processor.ts   // 156 lines - Event processing
├── rescan-capability.ts      // 194 lines - Rescan functionality
└── index.ts                  // Exports all constructs
```

### 1. Detector Manager Construct
```typescript
// detector-manager.ts
export class GuardDutyDetectorManager extends Construct {
  public readonly detectorId: string;
  
  constructor(scope: Construct, id: string, props: { stage: string }) {
    super(scope, id);
    
    // Single responsibility: Manage GuardDuty detector
    const detectorHandler = this.createDetectorHandler();
    this.detectorResource = new CustomResource(this, 'GuardDutyDetector', {
      serviceToken: detectorHandler.functionArn,
      properties: {
        Enable: true,
        FindingPublishingFrequency: GUARDDUTY_DEFAULTS.FINDING_PUBLISHING_FREQUENCY
      }
    });
    
    this.detectorId = this.detectorResource.getAttString('DetectorId');
  }
}
```

### 2. Malware Protection Plan Construct
```typescript
// malware-protection-plan.ts
export class MalwareProtectionPlan extends Construct {
  public readonly plan: guardduty.CfnMalwareProtectionPlan;
  
  constructor(scope: Construct, id: string, props: MalwareProtectionPlanProps) {
    super(scope, id);
    
    // Single responsibility: Create protection plan for one bucket
    this.plan = new guardduty.CfnMalwareProtectionPlan(this, 'Plan', {
      role: props.malwareProtectionRole.roleArn,
      protectedResource: {
        s3Bucket: {
          bucketName: props.bucket.bucketName,
          objectPrefixes: props.objectPrefixes
        }
      },
      actions: { tagging: { status: 'ENABLED' } }
    });
  }
}
```

### 3. Refactored Stack Using Constructs
```typescript
// guardduty-malware-protection-stack-refactored.ts
export class GuardDutyMalwareProtectionStackRefactored extends BaseStack {
  protected defineResources(props: GuardDutyMalwareProtectionStackProps): void {
    // 1. Detector management
    this.detectorManager = new GuardDutyDetectorManager(this, 'DetectorManager', {
      stage: this.stage
    });

    // 2. IAM role
    this.malwareProtectionRole = new MalwareProtectionRole(this, 'MalwareRole', {
      stage: this.stage,
      buckets: [props.uploadsBucket, props.qaBucket]
    });

    // 3. Protection plans
    this.uploadsPlan = new MalwareProtectionPlan(this, 'UploadsPlan', {
      stage: this.stage,
      bucket: props.uploadsBucket,
      bucketType: 'uploads',
      malwareProtectionRole: this.malwareProtectionRole.role
    });

    // 4. Bucket policies
    new VirusScanPolicies(this, 'UploadsPolicies', {
      bucket: props.uploadsBucket,
      bucketName: 'uploads'
    });

    // 5. Event processing
    this.scanEventProcessor = new ScanEventProcessor(this, 'EventProcessor', {
      stage: this.stage,
      stageConfig: this.stageConfig,
      uploadsBucket: props.uploadsBucket,
      qaBucket: props.qaBucket,
      alertEmail: props.alertEmail
    });

    // 6. Optional rescan capability
    if (props.enableRescanCapability) {
      this.rescanCapability = new RescanCapability(this, 'RescanCapability', {
        stage: this.stage,
        stageConfig: this.stageConfig,
        uploadsBucket: props.uploadsBucket,
        qaBucket: props.qaBucket
      });
    }
  }
}
```

### Benefits of Modular Constructs

1. **Single Responsibility**: Each construct has one clear purpose
2. **Reusability**: Constructs can be used in multiple stacks
3. **Testability**: Smaller units are easier to test
4. **Maintainability**: Changes are localized
5. **Readability**: Stack logic is clearer
6. **Composition**: Build complex stacks from simple parts

### Creating Your Own Modular Constructs

#### Step 1: Identify Logical Boundaries
```typescript
// Look for:
// - Resources that change together
// - Repeated patterns
// - Independent functionality
// - Clear interfaces between components
```

#### Step 2: Define Construct Interface
```typescript
export interface MyConstructProps {
  // Required props
  stage: string;
  bucket: s3.IBucket;
  
  // Optional props
  enableFeatureX?: boolean;
  customConfig?: CustomConfig;
}
```

#### Step 3: Implement Single Responsibility
```typescript
export class MyConstruct extends Construct {
  // Public properties for other constructs to reference
  public readonly resource: SomeResource;
  
  constructor(scope: Construct, id: string, props: MyConstructProps) {
    super(scope, id);
    
    // Create only resources related to this construct's purpose
    this.resource = new SomeResource(this, 'Resource', {
      // configuration
    });
    
    // Handle internal wiring
    this.wireUpEventHandlers();
    this.grantPermissions();
  }
  
  // Private methods for internal logic
  private wireUpEventHandlers(): void {
    // ...
  }
  
  private grantPermissions(): void {
    // ...
  }
}
```

#### Step 4: Export Through Index
```typescript
// constructs/my-feature/index.ts
export * from './my-construct';
export * from './my-other-construct';
export * from './my-types';
```

### When to Create a New Construct

Create a new construct when you have:
- **Repeated Pattern**: Same resources created multiple times
- **Logical Grouping**: Related resources that work together
- **Complex Configuration**: Hide complexity behind simple interface
- **Cross-Stack Sharing**: Resources used by multiple stacks
- **Domain Concept**: Represents a business/technical concept

### Anti-Patterns to Avoid

1. **Too Granular**: Don't create a construct for a single resource
2. **Too Broad**: Don't put unrelated resources together
3. **Circular Dependencies**: Avoid constructs depending on each other
4. **State Management**: Constructs should be stateless
5. **Side Effects**: Avoid external calls in constructors

---

## Best Practices & Clean Code

### 1. Configuration Management

#### ❌ Bad: Hardcoded Values
```typescript
const lambda = new lambda.Function(this, 'MyFunction', {
  memorySize: 1024,
  timeout: Duration.seconds(300),
  layers: [
    lambda.LayerVersion.fromLayerVersionArn(
      this,
      'OtelLayer',
      'arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4'
    )
  ]
});
```

#### ✅ Good: Centralized Configuration
```typescript
import { LAMBDA_MEMORY, LAMBDA_TIMEOUTS, getOtelLayerArn } from '@config/constants';

const lambda = new lambda.Function(this, 'MyFunction', {
  memorySize: LAMBDA_MEMORY.MEDIUM,
  timeout: LAMBDA_TIMEOUTS.EXTENDED,
  layers: [
    lambda.LayerVersion.fromLayerVersionArn(
      this,
      'OtelLayer',
      getOtelLayerArn('x86_64')
    )
  ]
});
```

### 2. Environment Variables

#### ❌ Bad: Inline Environment
```typescript
environment: {
  stage: this.stage,
  STAGE: this.stage,
  REGION: this.region,
  NODE_OPTIONS: '--enable-source-maps',
  AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
  DATABASE_SECRET_ARN: secretArn,
  UPLOADS_BUCKET: bucketName,
  // ... 20 more lines
}
```

#### ✅ Good: Environment Factory
```typescript
environment: LambdaEnvironmentFactory.createApiLambdaEnvironment(
  this.stage,
  this.region,
  {
    databaseSecretArn: secretArn,
    uploadsBucket: bucketName,
    // Other required config
  }
)
```

### 3. Stack Organization

#### ❌ Bad: Everything in One Stack
```typescript
export class MegaStack extends Stack {
  constructor(scope: Construct, id: string) {
    // VPC
    // Databases
    // S3 Buckets
    // Lambda Functions
    // API Gateway
    // CloudFront
    // Cognito
    // ... 2000+ lines
  }
}
```

#### ✅ Good: Logical Stack Separation
```typescript
// Separate stacks for separate concerns
export class NetworkStack extends BaseStack { }
export class DataStack extends BaseStack { }
export class ComputeStack extends BaseStack { }
export class ApiStack extends BaseStack { }
export class FrontendStack extends BaseStack { }

// Orchestrate in app
const network = new NetworkStack(app, 'Network', props);
const data = new DataStack(app, 'Data', { vpc: network.vpc });
const compute = new ComputeStack(app, 'Compute', { vpc: network.vpc, db: data.cluster });
```

### 4. Type Safety

#### ❌ Bad: Any Types and Strings
```typescript
const createLambda = (name: any, config: any) => {
  return new lambda.Function(this, name, {
    runtime: 'nodejs20.x', // String
    handler: config.handler,
    memorySize: config.memory || 1024
  });
};
```

#### ✅ Good: Strong Types
```typescript
interface LambdaConfig {
  handler: string;
  memory?: keyof typeof LAMBDA_MEMORY;
  timeout?: Duration;
}

const createLambda = (name: string, config: LambdaConfig): lambda.Function => {
  return new lambda.Function(this, name, {
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: config.handler,
    memorySize: config.memory ? LAMBDA_MEMORY[config.memory] : LAMBDA_MEMORY.MEDIUM
  });
};
```

### 5. Resource Naming

#### ❌ Bad: Inconsistent Naming
```typescript
new s3.Bucket(this, 'MyBucket', {
  bucketName: 'uploads-bucket-' + stage
});

new lambda.Function(this, 'function1', {
  functionName: `${stage}_graphql_handler`
});
```

#### ✅ Good: Consistent Naming Convention
```typescript
import { ResourceNames } from '@config/constants';

new s3.Bucket(this, 'UploadsBucket', {
  bucketName: ResourceNames.s3BucketName('uploads', stage)
});

new lambda.Function(this, 'GraphQLHandler', {
  functionName: ResourceNames.lambdaFunctionName('graphql', stage)
});
```

### 6. Error Handling

#### ❌ Bad: No Error Context
```typescript
const secret = secretsmanager.Secret.fromSecretArn(
  this,
  'Secret',
  props.secretArn
);
```

#### ✅ Good: Validation and Context
```typescript
if (!props.secretArn) {
  throw new Error(`Database secret ARN is required for stage: ${this.stage}`);
}

const secret = secretsmanager.Secret.fromSecretCompleteArn(
  this,
  'DatabaseSecret',
  props.secretArn
);
```

### 7. Documentation

#### ❌ Bad: No Comments
```typescript
export class MyConstruct extends Construct {
  constructor(scope: Construct, id: string, props: any) {
    super(scope, id);
    // Complex logic with no explanation
  }
}
```

#### ✅ Good: Clear Documentation
```typescript
/**
 * S3 bucket with virus scanning enforcement
 * 
 * This construct creates an S3 bucket with:
 * - Automatic virus scanning via GuardDuty
 * - File type restrictions
 * - SSL enforcement
 * - Versioning enabled
 * 
 * @example
 * ```typescript
 * new SecureUploadsBucket(this, 'Uploads', {
 *   stage: 'prod',
 *   allowedFileTypes: S3_DEFAULTS.ALLOWED_FILE_EXTENSIONS
 * });
 * ```
 */
export class SecureUploadsBucket extends Construct {
  public readonly bucket: s3.Bucket;
  
  constructor(scope: Construct, id: string, props: SecureUploadsBucketProps) {
    super(scope, id);
    // Implementation
  }
}
```

### Clean Code Checklist

- [ ] No magic numbers - use named constants
- [ ] No hardcoded ARNs or IDs
- [ ] Consistent resource naming
- [ ] Type-safe interfaces
- [ ] Single responsibility constructs
- [ ] Proper error handling with context
- [ ] Environment variables via factory
- [ ] Configuration in central location
- [ ] Meaningful variable/function names
- [ ] Documentation for public APIs
- [ ] No commented-out code
- [ ] Logical file organization
- [ ] Dependency injection over hardcoding
- [ ] Immutable infrastructure patterns
- [ ] Tagged resources for cost tracking

---

## Conclusion

This comprehensive guide covers the complete migration from Serverless Framework to AWS CDK for the Managed Care Review application. 

### Key Improvements in the Updated CDK Approach

The CDK infrastructure now includes several major improvements:

1. **Centralized Configuration Management**
   - All hardcoded values moved to configuration files
   - Constants for memory, timeouts, file sizes, and network settings
   - Configuration functions for dynamic values

2. **Lambda Environment Factory**
   - Consistent environment variable management
   - Type-safe environment creation
   - Specialized factories for different Lambda types

3. **Modular Constructs Pattern**
   - Large stacks broken into focused, reusable constructs
   - Single responsibility principle applied
   - Easier testing and maintenance

4. **Clean Code Practices**
   - No magic numbers
   - Strong typing throughout
   - Consistent naming conventions
   - Comprehensive documentation

### Benefits of the CDK Approach

- **Better Type Safety**: Full TypeScript support with strong interfaces
- **Improved Modularity**: Reusable constructs and patterns
- **Enhanced Security**: Built-in best practices and compliance
- **Simplified Operations**: Integrated monitoring and deployment
- **Greater Flexibility**: Full control over AWS resources
- **Maintainability**: Clean, organized code that's easy to update

### Migration Path

1. **Start with Configuration**: Set up centralized configuration files
2. **Use Environment Factory**: Standardize Lambda environment variables
3. **Apply Modular Patterns**: Break down large stacks incrementally
4. **Follow Clean Code**: Apply best practices as you migrate

Remember to migrate incrementally, test thoroughly, and maintain backwards compatibility throughout the process. The investment in clean, well-organized CDK code will pay dividends in long-term maintainability and operational excellence.

---

## Lambda Package Building & Bundling

### Overview

This section provides comprehensive details about how Lambda packages are built in the CDK infrastructure, migrating from serverless-esbuild to CDK's NodejsFunction construct with custom bundling configurations.

### Comparison: Serverless vs CDK Lambda Bundling

#### Serverless Approach
```yaml
# serverless.yml
custom:
  esbuild:
    bundle: true
    minify: false
    sourcemap: true
    exclude: 
      - '@aws-sdk/*'
      - 'aws-sdk'
    target: 'node18'
    define:
      'require.resolve': undefined
    platform: 'node'
    format: 'cjs'
    packager: 'pnpm'
    buildConcurrency: 10
    plugins: 'esbuild-plugins.js'

functions:
  graphql:
    handler: src/handlers/apollo_gql.gqlHandler
    package:
      individually: true
```

#### CDK Approach
```typescript
// base-lambda-function.ts
this.function = new NodejsFunction(this, 'Function', {
  functionName: ResourceNames.resourceName(props.serviceName, props.functionName, props.stage),
  runtime: lambda.Runtime.NODEJS_20_X,
  architecture: props.lambdaConfig.architecture === 'arm64' 
    ? lambda.Architecture.ARM_64 
    : lambda.Architecture.X86_64,
  handler: handlerFunction,
  entry: path.join('..', props.serviceName, 'src', `${entryFile}.ts`),
  bundling: getBundlingConfig(functionName, stage, architecture),
  layers: props.layers,
  // ... other configuration
});
```

### Lambda Bundling Architecture

#### 1. Build Process Flow

```
TypeScript Source Code
        ↓
NodejsFunction Construct
        ↓
getBundlingConfig()
        ↓
esbuild Configuration
        ↓
Command Hooks (before/after)
        ↓
Bundle Output
        ↓
Lambda Deployment Package
```

#### 2. Key Components

**BaseLambdaFunction** (`lib/constructs/lambda/base-lambda-function.ts`)
- Wraps AWS CDK's NodejsFunction
- Standardizes Lambda configuration
- Handles role creation and permissions
- Sets up logging and monitoring

**bundling-utils.ts** (`lib/constructs/lambda/bundling-utils.ts`)
- Configures esbuild for Lambda bundling
- Manages external modules
- Handles special file copying
- Provides architecture-specific settings

**esbuild-config.ts** (`lib/constructs/lambda/esbuild-config.ts`)
- Core esbuild configuration
- GraphQL loader plugin
- Command hooks for file operations
- Environment-specific optimizations

### Detailed Bundling Configuration

#### 1. Base Bundling Options

```typescript
export function getBundlingConfig(
  functionName: string,
  stage: string,
  architecture: Architecture = Architecture.X86_64
): NodejsFunctionProps['bundling'] {
  return {
    // Optimization settings
    minify: true,                          // Reduce bundle size
    sourceMap: true,                       // Enable debugging
    sourcesContent: false,                 // Exclude source content from maps
    target: 'node20',                      // Target Node.js 20.x runtime
    format: OutputFormat.CJS,              // CommonJS format for Lambda
    
    // Module resolution
    mainFields: ['module', 'main'],        // Prefer ES modules, fallback to CommonJS
    
    // External modules (not bundled)
    externalModules: [
      '@aws-sdk/*',                        // Available in Lambda runtime
      'aws-sdk',                           // Legacy SDK
      '@opentelemetry/*',                  // Provided via layer
      'prisma',                            // Provided via layer
      '@prisma/client',                    // Provided via layer
      'canvas',                            // Native module
      'utf-8-validate',                    // Native module
      'bufferutil',                        // Native module
    ],
    
    // esbuild arguments
    esbuildArgs: {
      '--bundle': true,                    // Bundle all dependencies
      '--platform': 'node',                // Target Node.js platform
      '--keep-names': 'true',              // Preserve function names
      '--tree-shaking': 'true',            // Remove unused code
      '--drop:debugger': true,             // Remove debugger statements
      ...(stage === 'prod' && { 
        '--drop:console': true             // Remove console logs in production
      })
    },
    
    // Command hooks for special operations
    commandHooks,
    
    // Node modules to include (despite being external)
    nodeModules: [
      '@aws-sdk/client-s3',
      '@aws-sdk/client-ses',
      '@aws-sdk/client-cognito-identity-provider',
      '@aws-sdk/client-secrets-manager',
      '@aws-sdk/client-ssm',
      '@aws-sdk/client-rds',
    ],
    
    // TypeScript configuration
    tsconfig: path.join(projectRoot, 'services', 'infra-cdk', 'tsconfig.lambda.json'),
    
    // Force local bundling (no Docker)
    forceDockerBundling: false,
  };
}
```

#### 2. Command Hooks

Command hooks handle special file operations during the bundling process:

```typescript
const commandHooks = {
  // Before npm install
  beforeInstall: (inputDir: string, outputDir: string): string[] => [
    // Copy pnpm workspace configuration
    `cp ${projectRoot}/pnpm-workspace.yaml ${outputDir}/pnpm-workspace.yaml`,
  ],
  
  // Before bundling
  beforeBundling: (inputDir: string, outputDir: string): string[] => {
    const commands: string[] = [];
    
    // GraphQL functions need schema file
    if (functionName === 'GRAPHQL') {
      const schemaPath = path.join(inputDir, '..', '..', '..', 'app-graphql', 'src', 'schema.graphql');
      commands.push(
        `if [ -f "${schemaPath}" ]; then`,
        `  mkdir -p "${outputDir}/app-graphql/src"`,
        `  cp "${schemaPath}" "${outputDir}/app-graphql/src/"`,
        `fi`
      );
    }
    
    // Email functions need templates
    if (['EMAIL_SUBMIT', 'SEND_TEMPLATE_EMAIL'].includes(functionName)) {
      const templatesPath = path.join(inputDir, '..', 'emailer', 'etaTemplates');
      commands.push(
        `if [ -d "${templatesPath}" ]; then`,
        `  mkdir -p "${outputDir}/etaTemplates"`,
        `  cp -r "${templatesPath}"/* "${outputDir}/etaTemplates/"`,
        `fi`
      );
    }
    
    // OTEL function needs collector config
    if (functionName === 'OTEL') {
      const collectorPath = path.join(inputDir, '..', '..', 'collector.yml');
      commands.push(
        `if [ -f "${collectorPath}" ]; then`,
        `  cp "${collectorPath}" "${outputDir}/"`,
        `fi`
      );
    }
    
    return commands.length > 0 ? [commands.join(' && ')] : [];
  },
  
  // After bundling
  afterBundling: (inputDir: string, outputDir: string): string[] => {
    const commands: string[] = [];
    
    // Replace environment variables in collector.yml
    if (functionName === 'OTEL') {
      commands.push(
        `if [ -f "${outputDir}/collector.yml" ] && [ -n "$NR_LICENSE_KEY" ]; then`,
        `  sed -i.bak "s/\\$NR_LICENSE_KEY/$NR_LICENSE_KEY/g" "${outputDir}/collector.yml"`,
        `  rm "${outputDir}/collector.yml.bak"`,
        `fi`
      );
    }
    
    return commands.length > 0 ? [commands.join(' && ')] : [];
  }
};
```

### External Modules Strategy

#### Why Externalize Certain Modules?

1. **AWS SDK**: Already available in Lambda runtime
   - Reduces bundle size significantly
   - Uses AWS's optimized version
   - Automatic security updates

2. **Lambda Layers**: Large dependencies shared across functions
   - Prisma client and binaries
   - OpenTelemetry instrumentation
   - Reduces cold start times

3. **Native Modules**: Cannot be bundled
   - Binary dependencies
   - Platform-specific code
   - Must be installed at runtime

#### Layer Integration

```typescript
// Lambda function with layers
this.function = new NodejsFunction(this, 'Function', {
  layers: [
    this.otelLayer,                                    // OpenTelemetry instrumentation
    ...(needsPrismaLayer(functionName) ? [this.prismaLayer] : []), // Prisma if needed
    ...(functionProps.additionalLayers || [])         // Function-specific layers
  ],
});

// Determine if function needs Prisma
export function needsPrismaLayer(functionName: string): boolean {
  const prismaFunctions = [
    'GRAPHQL', 'CURRENT_USER', 'GET_USERS', 'UPDATE_USER_ROLE',
    'INDEX_RATES', 'DELETE_RATE', 'INDEX_STATE_SUBMISSION',
    'CREATE_QUESTION_RESPONSE', 'SEND_REVIEW_ACTION_EMAILS',
    'SEND_EMAILS_FOR_CMS_RATE_REVIEWS', 'OAUTH_TOKEN', 'MIGRATE',
  ];
  return prismaFunctions.includes(functionName);
}
```

### Workspace Package Handling

The CDK bundling process handles pnpm workspaces specially:

1. **Workspace Configuration**: Copies `pnpm-workspace.yaml` to bundling directory
2. **Local Packages**: Bundles `@mc-review/*` packages directly into Lambda
3. **Package Resolution**: Uses workspace protocol for local dependencies

```typescript
// tsconfig.lambda.json
{
  "compilerOptions": {
    "paths": {
      "@mc-review/*": ["../../packages/*/build"]  // Resolve workspace packages
    }
  }
}
```

### Special File Handling Examples

#### 1. GraphQL Schema
```typescript
// GraphQL Lambda needs schema file at runtime
if (functionName === 'GRAPHQL') {
  // Copy schema.graphql to bundle
  // From: services/app-graphql/src/schema.graphql
  // To: bundle/app-graphql/src/schema.graphql
}
```

#### 2. Email Templates
```typescript
// Email functions need ETA templates
if (['EMAIL_SUBMIT', 'SEND_TEMPLATE_EMAIL'].includes(functionName)) {
  // Copy all template files
  // From: services/app-api/src/emailer/etaTemplates/
  // To: bundle/etaTemplates/
}
```

#### 3. Configuration Files
```typescript
// OTEL function needs collector configuration
if (functionName === 'OTEL') {
  // Copy and process collector.yml
  // Replace $NR_LICENSE_KEY with actual value
}
```

### Build Optimization Techniques

#### 1. Tree Shaking
- Removes unused code automatically
- Analyzes import/export statements
- Significantly reduces bundle size

#### 2. Minification
```typescript
minify: true,  // Production optimization
// Transforms:
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
// To:
function a(b){return b.reduce((c,d)=>c+d.price,0)}
```

#### 3. Source Maps
```typescript
sourceMap: true,        // Enable debugging
sourcesContent: false,  // Don't include source in maps
// Generates .js.map files for stack trace mapping
```

#### 4. Console Statement Removal
```typescript
// Production only
'--drop:console': true
// Removes all console.log, console.error, etc.
```

### Architecture-Specific Configuration

```typescript
// Support for different architectures
architecture: props.lambdaConfig.architecture === 'arm64' 
  ? lambda.Architecture.ARM_64    // Graviton2 processors
  : lambda.Architecture.X86_64    // Traditional x86

// Benefits of ARM64:
// - ~20% better price/performance
// - Lower latency
// - Reduced costs
```

### Debugging Bundled Lambdas

#### 1. Source Maps
- Automatically generated for all functions
- Maps minified code back to TypeScript
- Enable readable stack traces

#### 2. Local Testing
```typescript
// Test bundled output locally
npm run build
node dist/handlers/apollo_gql.js

// With source maps
node --enable-source-maps dist/handlers/apollo_gql.js
```

#### 3. Bundle Analysis
```typescript
// esbuild generates metafile for analysis
esbuildArgs: {
  '--metafile': true,  // Analyze bundle contents
}
```

### Migration from Serverless

#### Key Differences

1. **Handler Format**
   - Serverless: `src/handlers/apollo_gql.gqlHandler`
   - CDK: Entry file + handler function separately

2. **Layer Management**
   - Serverless: Global provider.layers
   - CDK: Per-function layers array

3. **Build Process**
   - Serverless: Runs during deployment
   - CDK: Runs during synthesis

4. **Environment Variables**
   - Serverless: Interpolated at deploy time
   - CDK: Set during synthesis

#### Migration Checklist

- [ ] Update handler references to CDK format
- [ ] Move custom esbuild plugins to CDK configuration
- [ ] Update file copying logic to command hooks
- [ ] Configure external modules correctly
- [ ] Set up Lambda layers for shared dependencies
- [ ] Update environment variable references
- [ ] Test bundled output locally
- [ ] Verify special files are included

### Best Practices

1. **Keep Bundles Small**
   - Externalize AWS SDK
   - Use layers for large dependencies
   - Enable tree shaking

2. **Optimize Cold Starts**
   - Minimize bundle size
   - Use ARM64 architecture
   - Consider provisioned concurrency

3. **Maintain Debuggability**
   - Always generate source maps
   - Keep function names (`--keep-names`)
   - Use structured logging

4. **Handle Native Modules**
   - Don't bundle binary dependencies
   - Use Lambda layers when possible
   - Test on target architecture

5. **Version Control**
   - Lock dependency versions
   - Use exact versions in layers
   - Test updates thoroughly

### Troubleshooting Common Issues

#### 1. Module Not Found
```
Error: Cannot find module '@mc-review/common-js'
Solution: Ensure workspace packages are built before CDK synthesis
```

#### 2. Native Module Errors
```
Error: The module 'canvas.node' was compiled against a different Node.js version
Solution: Add to externalModules and install via layer
```

#### 3. Large Bundle Size
```
Warning: Bundle size exceeds 50MB
Solution: Check for accidentally bundled node_modules, use external modules
```

#### 4. Missing Files at Runtime
```
Error: ENOENT: no such file or directory 'schema.graphql'
Solution: Add file copying to command hooks
```

## 33. Frontend Asset Building & Deployment

This section explains how frontend assets are built and deployed in the CDK infrastructure, including the build process, CDK constructs used, and deployment strategies.

### Overview

The CDK frontend deployment uses a multi-stage process:
1. **Build Phase**: React application is built using npm scripts
2. **Bundle Phase**: Assets are prepared for deployment 
3. **Deploy Phase**: Assets are uploaded to S3 and served via CloudFront

### Build Process

#### 1. Build Configuration

**Serverless**:
```yaml
# app-web/serverless.yml
custom:
  scripts:
    hooks:
      'package:createDeploymentArtifacts': |
        set -e
        npm run build
        rm -rf build/static/js/*.js.map
```

**CDK**:
```typescript
// In frontend-stack.ts
private deployFrontendAssets(): void {
  // Build command executed during CDK synthesis
  const buildCommand = [
    'cd ../../app-web',
    'npm ci',
    'npm run build',
    'rm -rf build/static/js/*.js.map'
  ].join(' && ');

  // Assets are built and deployed using BucketDeployment
  new s3deploy.BucketDeployment(this, 'WebsiteDeployment', {
    sources: [
      s3deploy.Source.asset('../../app-web/build', {
        bundling: {
          image: cdk.DockerImage.fromRegistry('node:20'),
          command: ['bash', '-c', buildCommand],
          environment: {
            REACT_APP_API_URL: this.apiUrl,
            REACT_APP_AUTH_URL: this.authUrl,
            // ... other env vars
          }
        }
      })
    ],
    destinationBucket: this.websiteBucket,
    distributionPaths: ['/*'], // Invalidate CloudFront cache
    prune: true, // Remove old files
    retainOnDelete: false
  });
}
```

#### 2. Environment Variables

The build process injects environment-specific variables:

```typescript
// Environment variables passed to React build
const buildEnvironment = {
  // API endpoints
  REACT_APP_API_URL: `https://${this.api.restApiId}.execute-api.${this.region}.amazonaws.com/${this.stage}`,
  REACT_APP_AUTH_URL: `https://${this.authApi.restApiId}.execute-api.${this.region}.amazonaws.com/${this.stage}`,
  
  // Feature flags
  REACT_APP_OTEL_COLLECTOR_URL: this.otelCollectorUrl,
  REACT_APP_APPLICATION_ENDPOINT: this.cloudFrontUrl,
  
  // Build metadata
  VITE_REACT_APP_VERSION: this.gitCommitHash || 'unknown',
  VITE_LD_CLIENT_ID: this.launchDarklyClientId || ''
};
```

### CDK Constructs

#### 1. Static Website Construct

The `StaticWebsite` construct handles S3 bucket creation and CloudFront configuration:

```typescript
export class StaticWebsite extends Construct {
  public readonly bucket: s3.IBucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly url: string;

  constructor(scope: Construct, id: string, props: StaticWebsiteProps) {
    super(scope, id);

    // Create S3 bucket for static assets
    this.bucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `${props.bucketName}-${props.stage}-${Stack.of(this).account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: props.stage === 'prod' 
        ? RemovalPolicy.RETAIN 
        : RemovalPolicy.DESTROY,
      autoDeleteObjects: props.stage !== 'prod',
      versioned: true,
      lifecycleRules: [{
        id: 'ExpireOldVersions',
        noncurrentVersionExpiration: Duration.days(30),
        abortIncompleteMultipartUploadAfter: Duration.days(7)
      }]
    });

    // Create CloudFront Origin Access Control
    const oac = new cloudfront.CfnOriginAccessControl(this, 'OAC', {
      originAccessControlConfig: {
        name: `${props.bucketName}-${props.stage}-oac`,
        originAccessControlOriginType: 's3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4'
      }
    });

    // CloudFront distribution configuration
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: `${props.description} - ${props.stage}`,
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new origins.S3Origin(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        responseHeadersPolicy: this.createResponseHeadersPolicy()
      },
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.seconds(0)
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.seconds(0)
        }
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      enableLogging: true,
      logBucket: props.logBucket,
      logFilePrefix: `cloudfront/${props.bucketName}/`
    });

    // Grant CloudFront access to S3
    this.bucket.addToResourcePolicy(new iam.PolicyStatement({
      sid: 'AllowCloudFrontServicePrincipalReadOnly',
      effect: iam.Effect.ALLOW,
      principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
      actions: ['s3:GetObject'],
      resources: [`${this.bucket.bucketArn}/*`],
      conditions: {
        StringEquals: {
          'AWS:SourceArn': `arn:aws:cloudfront::${Stack.of(this).account}:distribution/${this.distribution.distributionId}`
        }
      }
    }));
  }
}
```

#### 2. App Web Integration

The `AppWebIntegration` construct handles the specific app-web deployment:

```typescript
export class AppWebIntegration extends Construct {
  constructor(scope: Construct, id: string, props: AppWebIntegrationProps) {
    super(scope, id);

    // Deploy React build artifacts
    new s3deploy.BucketDeployment(this, 'AppWebDeployment', {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, '../../../app-web/build'), {
          bundling: {
            image: cdk.DockerImage.fromRegistry('public.ecr.aws/docker/library/node:20-alpine'),
            command: [
              'sh', '-c', 
              [
                'cd /asset-input',
                'npm ci --prefer-offline --no-audit',
                'npm run build',
                'cp -r build/* /asset-output/',
                // Remove source maps in production
                props.stage === 'prod' && 'rm -rf /asset-output/static/js/*.js.map'
              ].filter(Boolean).join(' && ')
            ],
            environment: props.environment,
            user: 'root',
            local: {
              // Local bundling for faster development
              tryBundle(outputDir: string): boolean {
                if (process.env.CDK_DOCKER_BUILD === 'false') {
                  execSync(`cd ${path.join(__dirname, '../../../app-web')} && npm ci && npm run build`);
                  execSync(`cp -r ${path.join(__dirname, '../../../app-web/build/*')} ${outputDir}/`);
                  if (props.stage === 'prod') {
                    execSync(`rm -rf ${outputDir}/static/js/*.js.map`);
                  }
                  return true;
                }
                return false;
              }
            }
          }
        })
      ],
      destinationBucket: props.websiteBucket,
      distribution: props.distribution,
      distributionPaths: ['/*'],
      prune: true,
      retainOnDelete: false,
      memoryLimit: 2048
    });
  }
}
```

### Deployment Strategies

#### 1. Caching Strategy

```typescript
// Cache configuration for different asset types
const staticAssetsBehavior: cloudfront.BehaviorOptions = {
  origin: new origins.S3Origin(this.bucket),
  viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
  cachePolicy: new cloudfront.CachePolicy(this, 'StaticAssetsCachePolicy', {
    defaultTtl: Duration.days(30),
    maxTtl: Duration.days(365),
    queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
  }),
  compress: true
};

// Add behaviors for static assets
this.distribution.addBehavior('/static/*', staticAssetsBehavior);
this.distribution.addBehavior('/*.js', staticAssetsBehavior);
this.distribution.addBehavior('/*.css', staticAssetsBehavior);
```

#### 2. Security Headers

```typescript
private createResponseHeadersPolicy(): cloudfront.ResponseHeadersPolicy {
  return new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeadersPolicy', {
    securityHeadersBehavior: {
      contentTypeOptions: { override: true },
      frameOptions: { 
        frameOption: cloudfront.HeadersFrameOption.DENY, 
        override: true 
      },
      referrerPolicy: {
        referrerPolicy: cloudfront.HeadersReferrerPolicy.SAME_ORIGIN,
        override: true
      },
      strictTransportSecurity: {
        accessControlMaxAge: Duration.days(365),
        includeSubdomains: true,
        override: true
      },
      xssProtection: {
        mode: cloudfront.HeadersXssProtection.BLOCK,
        protection: true,
        override: true
      }
    },
    customHeadersBehavior: {
      customHeaders: [
        {
          header: 'Cache-Control',
          value: 'no-cache, no-store, must-revalidate',
          override: false
        },
        {
          header: 'Pragma',
          value: 'no-cache',
          override: false
        },
        {
          header: 'X-Content-Type-Options',
          value: 'nosniff',
          override: true
        }
      ]
    }
  });
}
```

### Build Optimization

#### 1. Docker Layer Caching

```typescript
// Optimize Docker builds with layer caching
bundling: {
  image: cdk.DockerImage.fromRegistry('node:20-alpine'),
  command: ['sh', '-c', buildCommand],
  volumes: [
    // Cache npm packages between builds
    {
      containerPath: '/root/.npm',
      hostPath: path.join(os.homedir(), '.npm-cache'),
    }
  ],
  buildArgs: {
    // Enable BuildKit for better caching
    DOCKER_BUILDKIT: '1'
  }
}
```

#### 2. Conditional Builds

```typescript
// Skip build in certain environments
const shouldBuild = process.env.SKIP_FRONTEND_BUILD !== 'true';

if (shouldBuild) {
  new s3deploy.BucketDeployment(this, 'Deployment', {
    // ... deployment config
  });
} else {
  console.log('Skipping frontend build (SKIP_FRONTEND_BUILD=true)');
}
```

### Environment-Specific Configurations

#### Development
```typescript
if (props.stage === 'dev') {
  // Enable source maps
  buildEnvironment.GENERATE_SOURCEMAP = 'true';
  
  // Disable caching for easier debugging
  distribution.defaultBehavior.cachePolicy = cloudfront.CachePolicy.CACHING_DISABLED;
}
```

#### Production
```typescript
if (props.stage === 'prod') {
  // Remove source maps
  bundling.command.push('&& rm -rf /asset-output/static/js/*.js.map');
  
  // Enable CloudFront compression
  distribution.defaultBehavior.compress = true;
  
  // Add Web Application Firewall
  const webAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
    // ... WAF configuration
  });
}
```

### Monitoring & Alerts

```typescript
// CloudFront distribution alarms
new cloudwatch.Alarm(this, 'HighErrorRate', {
  metric: new cloudwatch.Metric({
    namespace: 'AWS/CloudFront',
    metricName: '4xxErrorRate',
    dimensionsMap: {
      DistributionId: this.distribution.distributionId
    },
    statistic: 'Average',
    period: Duration.minutes(5)
  }),
  threshold: 5,
  evaluationPeriods: 2,
  alarmDescription: 'High 4xx error rate on CloudFront distribution'
});

// S3 bucket metrics
new cloudwatch.Alarm(this, 'HighBucketSize', {
  metric: new cloudwatch.Metric({
    namespace: 'AWS/S3',
    metricName: 'BucketSizeBytes',
    dimensionsMap: {
      BucketName: this.bucket.bucketName,
      StorageType: 'StandardStorage'
    },
    statistic: 'Average',
    period: Duration.days(1)
  }),
  threshold: 1_073_741_824, // 1GB
  evaluationPeriods: 1,
  alarmDescription: 'S3 bucket size exceeds 1GB'
});
```

### Best Practices

1. **Build Optimization**
   - Use Docker layer caching
   - Implement local bundling when possible
   - Remove source maps in production
   - Minimize bundle sizes

2. **Security**
   - Block public access to S3 buckets
   - Use Origin Access Control (OAC)
   - Implement security headers
   - Enable AWS WAF for production

3. **Performance**
   - Use CloudFront edge locations
   - Implement proper cache headers
   - Enable Gzip compression
   - Use HTTP/2 and HTTP/3

4. **Deployment**
   - Invalidate CloudFront cache on deployment
   - Use versioned S3 objects
   - Implement rollback strategies
   - Monitor deployment metrics

5. **Cost Optimization**
   - Use appropriate CloudFront price class
   - Implement S3 lifecycle policies
   - Monitor and alert on usage
   - Clean up old deployments

## 34. SSM Parameters Required for CDK Deployment

This section documents all AWS Systems Manager (SSM) Parameter Store parameters that must be configured before deploying the CDK infrastructure. These parameters allow the CDK to integrate with existing infrastructure and configure Lambda environments.

### Overview

The CDK infrastructure reads configuration from SSM Parameter Store to:
- Import existing VPC and network resources
- Configure Lambda function environment variables
- Integrate with external services (OTEL, LaunchDarkly, etc.)
- Import security groups for VPN access

### Required Parameters

#### 1. VPC and Network Parameters (REQUIRED)

These parameters are used by the `ImportedVpc` construct to import your existing VPC:

```bash
# VPC Configuration
aws ssm put-parameter \
    --name "/configuration/default/vpc/id" \
    --value "vpc-xxxxxxxxx" \
    --type "String" \
    --description "VPC ID for MCR infrastructure"

aws ssm put-parameter \
    --name "/configuration/default/vpc/cidr" \
    --value "10.0.0.0/16" \
    --type "String" \
    --description "VPC CIDR block"

# Private Subnets (minimum 2 required, 3 recommended)
aws ssm put-parameter \
    --name "/configuration/default/vpc/subnets/private/a/id" \
    --value "subnet-xxxxxxxxx" \
    --type "String" \
    --description "Private subnet in AZ-a"

aws ssm put-parameter \
    --name "/configuration/default/vpc/subnets/private/b/id" \
    --value "subnet-yyyyyyyyy" \
    --type "String" \
    --description "Private subnet in AZ-b"

aws ssm put-parameter \
    --name "/configuration/default/vpc/subnets/private/c/id" \
    --value "subnet-zzzzzzzzz" \
    --type "String" \
    --description "Private subnet in AZ-c"
```

#### 2. Lambda Environment Configuration (REQUIRED)

These parameters configure Lambda function environments:

```bash
# OpenTelemetry Configuration
aws ssm put-parameter \
    --name "/configuration/api_app_otel_collector_url" \
    --value "https://otel-collector.example.com" \
    --type "String" \
    --description "OpenTelemetry collector endpoint URL"

# Email Service Configuration
aws ssm put-parameter \
    --name "/configuration/emailer_mode" \
    --value "ses" \
    --type "String" \
    --description "Email service mode: ses | mock"

# Parameter Store Mode
aws ssm put-parameter \
    --name "/configuration/parameterStoreMode" \
    --value "standard" \
    --type "String" \
    --description "Parameter store access mode"

# LaunchDarkly SDK Key (store as SecureString)
aws ssm put-parameter \
    --name "/configuration/ld_sdk_key_feds" \
    --value "sdk-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
    --type "SecureString" \
    --key-id "alias/aws/ssm" \
    --description "LaunchDarkly SDK key for feature flags"
```

#### 3. VPN Security Groups (OPTIONAL)

For database access via VPN (replaces bastion EC2):

```bash
# VPN Security Group
aws ssm put-parameter \
    --name "/configuration/vpn_security_group_id" \
    --value "sg-xxxxxxxxx" \
    --type "String" \
    --description "VPN security group ID for database access"

# Shared Services Security Group (if applicable)
aws ssm put-parameter \
    --name "/configuration/shared_services_security_group_id" \
    --value "sg-yyyyyyyyy" \
    --type "String" \
    --description "Shared services security group ID"
```

#### 4. Frontend Build Parameters (OPTIONAL)

These parameters are used during frontend build process:

```bash
# LaunchDarkly Client ID
aws ssm put-parameter \
    --name "/configuration/react_app_ld_client_id_feds" \
    --value "client-xxxxxxxx" \
    --type "String" \
    --description "LaunchDarkly client ID for React app"

# New Relic Configuration (if using New Relic)
aws ssm put-parameter \
    --name "/configuration/react_app_nr_account_id" \
    --value "1234567" \
    --type "String" \
    --description "New Relic account ID"

aws ssm put-parameter \
    --name "/configuration/react_app_nr_agent_id" \
    --value "agent-id" \
    --type "String" \
    --description "New Relic agent ID"

aws ssm put-parameter \
    --name "/configuration/react_app_nr_license_key" \
    --value "license-key" \
    --type "SecureString" \
    --description "New Relic license key"

aws ssm put-parameter \
    --name "/configuration/react_app_nr_trust_key" \
    --value "trust-key" \
    --type "SecureString" \
    --description "New Relic trust key"
```

### Parameters Created by CDK

The CDK will automatically create these parameters during deployment:

```
/mcr/{stage}/service-registry/*     # Service discovery
/mcr/{stage}/foundation/*           # Foundation stack outputs
/mcr/{stage}/network/*              # Network stack outputs
/mcr/{stage}/database/*             # Database endpoints
/mcr/{stage}/auth/*                 # Cognito configuration
/mcr/{stage}/lambda/*               # Lambda layer ARNs
/mcr/{stage}/s3/*                   # S3 bucket names
/mcr/{stage}/frontend/build/*       # Frontend build metadata
```

### Migration Checklist

Before deploying CDK infrastructure:

- [ ] Identify existing VPC ID and CIDR block
- [ ] Get subnet IDs for at least 2 availability zones
- [ ] Obtain OpenTelemetry collector URL
- [ ] Get LaunchDarkly SDK keys (backend and frontend)
- [ ] Determine email service mode (ses or mock)
- [ ] Identify VPN security group IDs (if using VPN access)
- [ ] Create all required SSM parameters using AWS CLI
- [ ] Verify parameters are in correct region
- [ ] Test parameter access with appropriate IAM permissions

### Verification

Verify all parameters are set correctly:

```bash
# List all configuration parameters
aws ssm describe-parameters \
    --parameter-filters "Key=Path,Values=/configuration" \
    --query "Parameters[*].[Name,Type,Description]" \
    --output table

# Get specific parameter value
aws ssm get-parameter \
    --name "/configuration/default/vpc/id" \
    --query "Parameter.Value" \
    --output text
```

### Troubleshooting

#### Missing Parameter Errors

If CDK synthesis fails with "Parameter not found":
1. Verify parameter exists in correct region
2. Check parameter name matches exactly (case-sensitive)
3. Ensure IAM role has `ssm:GetParameter` permission
4. For SecureString parameters, also need `kms:Decrypt`

#### VPC Import Failures

If VPC import fails:
1. Verify VPC ID is correct
2. Ensure at least 2 subnets in different AZs
3. Check subnet types match (private with egress)
4. Verify CIDR block matches actual VPC

#### Security Group Import Issues

If security group imports fail:
1. Security groups must exist in same region
2. Check security group IDs are correct
3. Verify CDK deployment account has access
4. Groups must be in the imported VPC

### Best Practices

1. **Use SecureString** for sensitive values (API keys, passwords)
2. **Document** parameter purpose in descriptions
3. **Version** parameter changes with timestamps
4. **Automate** parameter creation with scripts
5. **Validate** parameters before CDK deployment
6. **Use consistent** naming conventions
7. **Implement** least-privilege IAM policies

This comprehensive bundling system ensures efficient, optimized Lambda deployments while maintaining developer productivity and debuggability.
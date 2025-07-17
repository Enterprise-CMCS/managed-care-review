# CDK Architecture Developer Documentation: Complete Wiring Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Step-by-Step Wiring Process](#step-by-step-wiring-process)
4. [Serverless to CDK Migration Path](#serverless-to-cdk-migration-path)
5. [Factory Pattern Deep Dive](#factory-pattern-deep-dive)
6. [Real-World Example: GraphQL API](#real-world-example-graphql-api)

---

## Architecture Overview

The CDK architecture follows a hierarchical pattern with clear separation of concerns:

```
CDK App (mcr-app.ts)
├── BaseStack (Abstract Foundation)
├── Stacks (Concrete Implementations)
│   ├── ApiComputeStack
│   ├── DatabaseOpsStack
│   ├── AuthStack
│   └── Others...
├── Constructs (Reusable Components)
│   ├── LambdaFactory
│   ├── ApiEndpointFactory
│   ├── WafProtectedApi
│   └── AuroraServerlessV2
└── Configuration
    ├── StageConfig
    ├── Constants
    └── ServiceRegistry
```

---

## Core Components

### 1. BaseStack - The Foundation

**Purpose**: Provides standardized configuration for all stacks including tagging, naming conventions, and environment setup.

**Key Features**:
- Automatic tagging (Project, Environment, Service, Cost Center)
- Stage-aware configuration (dev, val, prod)
- Termination protection for production
- CDK Nag integration (security best practices)
- Resource naming conventions

**Implementation**:
```typescript
export abstract class BaseStack extends Stack {
  protected readonly stage: string;
  protected readonly stageConfig: StageConfig;
  protected readonly serviceName: string;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    // 1. Generate standardized stack name
    const stackName = ResourceNames.stackName(props.serviceName, props.stage);
    
    // 2. Initialize with AWS environment
    super(scope, id, {
      stackName,
      env: {
        account: props.stageConfig.account,
        region: props.stageConfig.region
      }
    });

    // 3. Apply mandatory tags
    this.applyTags();
    
    // 4. Enable termination protection for prod
    if (this.stage === 'prod') {
      this.terminationProtection = true;
    }
  }

  // Child stacks must implement this
  protected abstract defineResources(): void;
}
```

### 2. LambdaFactory - Function Creation Engine

**Purpose**: Standardizes Lambda function creation with consistent configuration, bundling, and layer management.

**Key Components**:

#### BaseLambdaFunction
- Wraps AWS CDK NodejsFunction
- Handles TypeScript compilation and bundling
- Manages IAM roles and permissions
- Configures logging and monitoring

```typescript
export class BaseLambdaFunction extends Construct {
  public readonly function: NodejsFunction;
  public readonly logGroup: logs.LogGroup;
  public readonly role: iam.IRole;

  constructor(scope: Construct, id: string, props: BaseLambdaFunctionProps) {
    // 1. Create or use provided IAM role
    this.role = props.role || this.createLambdaRole(props);

    // 2. Create CloudWatch log group
    this.logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/${ResourceNames.resourceName(...)}`,
      retention: props.logRetentionDays || 7
    });

    // 3. Parse handler format: "filename.functionName"
    const [entryFile, handlerFunction] = props.handler.split('.');

    // 4. Create NodejsFunction with esbuild bundling
    this.function = new NodejsFunction(this, 'Function', {
      entry: path.join('..', props.serviceName, 'src', `${entryFile}.ts`),
      handler: handlerFunction,
      runtime: lambda.Runtime.NODEJS_20_X,
      bundling: getBundlingConfig(...),
      // ... other config
    });
  }
}
```

#### LambdaFactory
- Creates Lambda functions with consistent patterns
- Manages function registry
- Handles VPC configuration
- Applies layers (OTEL, Prisma, etc.)

```typescript
export class LambdaFactory extends Construct {
  private readonly functions: Map<string, BaseLambdaFunction> = new Map();

  public createFunction(props: CreateFunctionProps): BaseLambdaFunction {
    // 1. Get handler mapping from configuration
    const handlerMapping = getHandlerMapping(props.functionName);
    
    // 2. Determine VPC requirements
    const needsVpc = props.useVpc ?? this.requiresVpc(props.functionName);
    
    // 3. Create function with layers
    const lambdaFunction = new BaseLambdaFunction(this, functionId, {
      handler: `${handlerMapping.entry}.${handlerMapping.handler}`,
      vpc: needsVpc ? this.props.vpc : undefined,
      layers: [
        this.props.otelLayer,
        needsPrismaLayer(functionName) ? this.props.prismaLayer : undefined
      ].filter(Boolean),
      // ... other config
    });
    
    // 4. Store in registry
    this.functions.set(functionId, lambdaFunction);
    
    // 5. Export ARN to Parameter Store
    ServiceRegistry.putLambdaArn(...);
    
    return lambdaFunction;
  }
}
```

### 3. ApiEndpointFactory - API Gateway Integration

**Purpose**: Creates API Gateway endpoints with consistent patterns for different authentication types.

**Factory Methods**:

```typescript
export class ApiEndpointFactory {
  // Public endpoint (no auth)
  static createPublicEndpoint(scope, id, props) {
    return new ApiEndpoint(scope, id, {
      ...props,
      authorizationType: apigateway.AuthorizationType.NONE
    });
  }

  // AWS IAM authenticated endpoint
  static createIAMAuthEndpoint(scope, id, props) {
    return new ApiEndpoint(scope, id, {
      ...props,
      authorizationType: apigateway.AuthorizationType.IAM
    });
  }

  // Cognito authenticated endpoint
  static createAuthenticatedEndpoint(scope, id, props) {
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(...);
    return new ApiEndpoint(scope, id, {
      ...props,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer
    });
  }

  // GraphQL endpoint (supports multiple auth types)
  static createGraphQLEndpoint(scope, id, props) {
    const methods = props.methods || ['POST'];
    const authType = props.authType || 'NONE';
    
    return methods.map(method => {
      switch (authType) {
        case 'IAM':
          return this.createIAMAuthEndpoint(...);
        case 'COGNITO':
          return this.createAuthenticatedEndpoint(...);
        default:
          return this.createPublicEndpoint(...);
      }
    });
  }
}
```

---

## Step-by-Step Wiring Process

### Step 1: CDK App Entry Point (bin/mcr-app.ts)

```typescript
async function main() {
  // 1. Load configuration from Secrets Manager
  const synthesizerConfig = await getSynthesizerConfig();
  
  // 2. Create CDK App with custom synthesizer
  const app = new cdk.App({
    defaultStackSynthesizer: new cdk.DefaultStackSynthesizer({
      ...synthesizerConfig
    })
  });
  
  // 3. Initialize stage configuration
  const stage = app.node.tryGetContext('stage') || 'dev';
  const stageConfig = StageConfiguration.get(stage);
  
  // 4. Create stacks with dependencies
  const lambdaLayersStack = new LambdaLayersStack(app, `MCR-LambdaLayers-${stage}`, {
    env,
    stage,
    stageConfig
  });
  
  const apiComputeStack = new ApiComputeStack(app, `MCR-ApiCompute-${stage}`, {
    env,
    stage,
    stageConfig,
    // Pass dependencies
    vpc: computeStack.vpc,
    lambdaSecurityGroup: computeStack.lambdaSecurityGroup,
    prismaLayerArn: lambdaLayersStack.prismaLayerVersionArn,
    // ... other props
  });
  
  // 5. Add stack dependencies
  apiComputeStack.addDependency(computeStack);
  apiComputeStack.addDependency(lambdaLayersStack);
}
```

### Step 2: Stack Implementation (ApiComputeStack)

```typescript
export class ApiComputeStack extends BaseStack {
  constructor(scope: Construct, id: string, props: ApiComputeStackProps) {
    super(scope, id, props);
    
    // Store dependencies from props
    this.vpc = props.vpc;
    this.lambdaSecurityGroup = props.lambdaSecurityGroup;
    
    // Call abstract method to define resources
    this.defineResources();
  }
  
  protected defineResources(): void {
    // 1. Create layers
    this.createOtelLayer();
    this.createPrismaLayer();
    
    // 2. Create Lambda factory
    this.createLambdaFactory();
    
    // 3. Create Lambda functions
    this.createLambdaFunctions();
    
    // 4. Create API Gateway
    this.createApiResources();
  }
}
```

### Step 3: Lambda Creation Flow

```typescript
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

private createLambdaFunctions(): void {
  // Create functions based on configuration
  Object.entries(this.FUNCTION_CONFIGS).forEach(([functionName, config]) => {
    this.lambdaFactory.createFunction({
      functionName: functionName as keyof typeof LAMBDA_FUNCTIONS,
      useVpc: config.useVpc,
      environment: this.getFunctionSpecificEnvironment(functionName),
      ...this.getFunctionSpecificConfig(functionName)
    });
  });
  
  // Store functions for later use
  this.functions = this.lambdaFactory.getAllFunctions();
}
```

### Step 4: API Gateway Integration

```typescript
private createApiResources(): void {
  // 1. Create WAF-protected API
  const wafApi = new WafProtectedApi(this, 'Api', {
    apiName: SERVICES.INFRA_API,
    stage: this.stage,
    securityConfig: this.stageConfig.security
  });
  
  this.api = wafApi.api;
  
  // 2. Create endpoints
  this.createApiEndpoints();
}

private createApiEndpoints(): void {
  // GraphQL endpoint with AWS IAM auth
  const graphqlResource = this.api.root.addResource('graphql');
  ApiEndpointFactory.createGraphQLEndpoint(this, 'GraphQLEndpoint', {
    resource: graphqlResource,
    handler: this.getFunction('GRAPHQL'),
    authType: 'IAM',
    methods: ['GET', 'POST']
  });
  
  // Health check endpoint (public)
  const healthResource = this.api.root.addResource('health_check');
  ApiEndpointFactory.createPublicEndpoint(this, 'HealthEndpoint', {
    resource: healthResource,
    method: 'GET',
    handler: this.getFunction('INDEX_HEALTH_CHECKER')
  });
}
```

---

## Serverless to CDK Migration Path

### Phase 1: Configuration Mapping

**Serverless custom variables → CDK StageConfig**
```yaml
# serverless.yml
custom:
  lambdaMemory:
    prod: 4096
    default: 1024
```

```typescript
// CDK stage-config.ts
private static getLambdaConfig(stage: string): LambdaConfig {
  switch (stage) {
    case 'prod':
      return { memorySize: 4096, ... };
    default:
      return { memorySize: 1024, ... };
  }
}
```

### Phase 2: Provider Settings

**Serverless provider → CDK Stack props**
```yaml
# serverless.yml
provider:
  name: aws
  runtime: nodejs20.x
  region: us-east-1
```

```typescript
// CDK
runtime: lambda.Runtime.NODEJS_20_X
env: { region: 'us-east-1' }
```

### Phase 3: Function Migration

**Serverless function → CDK Lambda**
```yaml
# serverless.yml
functions:
  graphql:
    handler: src/handlers/apollo_gql.gqlHandler
    timeout: 30
    vpc:
      securityGroupIds: [${self:custom.sgId}]
```

```typescript
// CDK
this.lambdaFactory.createFunction({
  functionName: 'GRAPHQL',
  useVpc: true,
  timeout: Duration.seconds(30)
});
```

### Phase 4: API Events

**Serverless events → CDK API Gateway**
```yaml
# serverless.yml
events:
  - http:
      path: graphql
      method: post
      authorizer: aws_iam
```

```typescript
// CDK
ApiEndpointFactory.createGraphQLEndpoint(this, 'GraphQLEndpoint', {
  resource: graphqlResource,
  handler: this.getFunction('GRAPHQL'),
  authType: 'IAM',
  methods: ['POST']
});
```

---

## Factory Pattern Deep Dive

### Why Factories?

1. **Consistency**: Ensures all resources follow the same patterns
2. **Reusability**: Common configurations are centralized
3. **Type Safety**: TypeScript interfaces enforce correct usage
4. **Testability**: Factories can be easily mocked/tested

### Factory Hierarchy

```
BaseConstruct (Abstract)
├── BaseLambdaFunction (Concrete Lambda wrapper)
├── LambdaFactory (Creates BaseLambdaFunction instances)
├── ApiEndpoint (Concrete API endpoint)
└── ApiEndpointFactory (Creates ApiEndpoint instances)
```

### Factory Benefits Example

**Without Factory**:
```typescript
// Repetitive, error-prone
const func1 = new lambda.Function(this, 'Func1', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda'),
  vpc: vpc,
  securityGroups: [sg],
  environment: { STAGE: 'dev' },
  layers: [otelLayer, prismaLayer],
  // ... 20 more properties
});

// Repeat for every function...
```

**With Factory**:
```typescript
// Clean, consistent
const func1 = this.lambdaFactory.createFunction({
  functionName: 'GRAPHQL',
  useVpc: true
});
```

---

## Real-World Example: GraphQL API

### Complete Flow from Serverless to CDK

#### 1. Serverless Configuration
```yaml
graphql:
  handler: src/handlers/apollo_gql.gqlHandler
  events:
    - http:
        path: graphql
        method: post
        cors: true
        authorizer: aws_iam
    - http:
        path: v1/graphql/external
        method: post
        authorizer:
          name: third_party_api_authorizer
  timeout: 30
  vpc:
    securityGroupIds: [${self:custom.sgId}]
  layers:
    - !Ref PrismaClientEngineLambdaLayer
```

#### 2. CDK Implementation

**Step 1: Configure Function in FUNCTION_CONFIGS**
```typescript
private readonly FUNCTION_CONFIGS: Record<string, FunctionConfig> = {
  GRAPHQL: { 
    useVpc: true, 
    needsDatabaseAccess: true, 
    needsSesAccess: false, 
    needsCognitoAccess: true 
  }
};
```

**Step 2: Lambda Handler Mapping**
```typescript
// lambda-handlers.ts
export const HANDLER_MAPPINGS = {
  GRAPHQL: { entry: 'handlers/apollo_gql', handler: 'gqlHandler' }
};
```

**Step 3: Create Lambda Function**
```typescript
// Called automatically by createLambdaFunctions()
this.lambdaFactory.createFunction({
  functionName: 'GRAPHQL',
  useVpc: true,
  timeout: Duration.seconds(30),
  environment: { GRAPHQL_SCHEMA_PATH: './schema.graphql' }
});
```

**Step 4: Create API Endpoints**
```typescript
// Main GraphQL endpoint with IAM auth
const graphqlResource = this.api.root.addResource('graphql');
ApiEndpointFactory.createGraphQLEndpoint(this, 'GraphQLEndpoint', {
  resource: graphqlResource,
  handler: this.getFunction('GRAPHQL'),
  authType: 'IAM',
  methods: ['GET', 'POST']
});

// External endpoint with custom authorizer
const v1Resource = this.api.root.addResource('v1');
const v1GraphqlResource = v1Resource.addResource('graphql');
const externalResource = v1GraphqlResource.addResource('external');

const thirdPartyAuthorizer = new apigateway.TokenAuthorizer(this, 'ThirdPartyApiAuthorizer', {
  handler: this.getFunction('THIRD_PARTY_API_AUTHORIZER')
});

externalResource.addMethod('POST', new apigateway.LambdaIntegration(this.getFunction('GRAPHQL')), {
  authorizationType: apigateway.AuthorizationType.CUSTOM,
  authorizer: thirdPartyAuthorizer
});
```

**Step 5: Grant Permissions**
```typescript
private grantPermissions(): void {
  const graphqlFunction = this.getFunction('GRAPHQL');
  
  // Database access
  databaseSecret.grantRead(graphqlFunction.function);
  
  // Cognito access
  graphqlFunction.function.addToRolePolicy(new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ['cognito-idp:ListUsers', 'cognito-idp:AdminGetUser'],
    resources: [this.userPool.userPoolArn]
  }));
}
```

### Final Architecture

```
API Gateway
├── /graphql (GET, POST) → IAM Auth → GraphQL Lambda
├── /v1/graphql/external (GET, POST) → Custom Auth → GraphQL Lambda
└── /health_check (GET) → No Auth → Health Lambda

GraphQL Lambda
├── VPC Enabled (Private Subnets)
├── Layers: [OTEL, Prisma]
├── IAM Role
│   ├── Database Secret Read
│   ├── Cognito User Operations
│   └── CloudWatch Logs
└── Environment Variables
    ├── STAGE
    ├── DATABASE_SECRET_ARN
    └── GRAPHQL_SCHEMA_PATH
```

---

## Best Practices

### 1. Always Use Factories
```typescript
// ❌ Don't create resources directly
const func = new lambda.Function(this, 'MyFunc', {...});

// ✅ Use factories
const func = this.lambdaFactory.createFunction({...});
```

### 2. Configuration Over Code
```typescript
// ❌ Don't hardcode values
memorySize: 1024

// ✅ Use stage configuration
memorySize: this.stageConfig.lambda.memorySize
```

### 3. Explicit Dependencies
```typescript
// ✅ Always declare stack dependencies
apiStack.addDependency(computeStack);
apiStack.addDependency(authStack);
```

### 4. Service Registry for Cross-Stack References
```typescript
// ✅ Store values for other stacks
ServiceRegistry.putApiId(this, this.stage, this.api.restApiId);

// ✅ Retrieve in another stack
const apiId = ServiceRegistry.getApiId(this, this.stage);
```

### 5. Type Safety
```typescript
// ✅ Use TypeScript enums and types
functionName: 'GRAPHQL' as keyof typeof LAMBDA_FUNCTIONS
```

This documentation provides a complete understanding of how the CDK architecture is wired together, from the abstract BaseStack through the factory patterns to concrete implementations, with clear migration paths from serverless configurations.

---

## Database Infrastructure

### Aurora Serverless V2 - Complete Architecture

#### Serverless Configuration (postgres/serverless.yml)
```yaml
PostgresAuroraV2:
  Type: AWS::RDS::DBCluster
  Properties:
    Engine: aurora-postgresql
    DatabaseName: '${self:custom.databaseName}'
    MasterUsername: !Sub '{{resolve:secretsmanager:${PostgresSecret}::username}}'
    MasterUserPassword: !Sub '{{resolve:secretsmanager:${PostgresSecret}::password}}'
    DBSubnetGroupName: !Ref PostgresSubnetGroup
    VpcSecurityGroupIds: ['${self:custom.sgId}']
    BackupRetentionPeriod: ${self:custom.backupRetentionPeriod.${opt:stage}}
    EnableCloudwatchLogsExports: [postgresql]
    ServerlessV2ScalingConfiguration:
      MinCapacity: 1
      MaxCapacity: 16

PostgresSecret:
  Type: AWS::SecretsManager::Secret
  Properties:
    Name: 'aurora_${self:service}_${sls:stage}'
    GenerateSecretString:
      SecretStringTemplate: '{"username": "mcreviewadmin"}'
      GenerateStringKey: password
      PasswordLength: 30
      ExcludePunctuation: true
```

#### CDK Implementation (AuroraServerlessV2 Construct)
```typescript
export class AuroraServerlessV2 extends Construct {
  public readonly cluster: rds.DatabaseCluster;
  public readonly databaseSecret: secretsmanager.Secret;
  public readonly dbCredentials: rds.Credentials;

  constructor(scope: Construct, id: string, props: AuroraServerlessV2Props) {
    super(scope, id);

    // 1. Create database credentials
    this.dbCredentials = rds.Credentials.fromGeneratedSecret('mcreviewadmin', {
      secretName: `aurora_${props.serviceName}_${props.stage}`,
      excludeCharacters: ' %+~`#$&*()|[]{}:;<>?!\'/@"\\',
    });

    // 2. Create security group
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for Aurora Serverless v2',
      allowAllOutbound: false,
    });

    // Allow inbound from Lambda security group
    dbSecurityGroup.addIngressRule(
      props.lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL access from Lambda functions'
    );

    // 3. Create subnet group
    const subnetGroup = new rds.SubnetGroup(this, 'SubnetGroup', {
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      description: 'Subnet group for Aurora Serverless v2',
    });

    // 4. Create parameter group
    const parameterGroup = new rds.ParameterGroup(this, 'ParameterGroup', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_14_9,
      }),
      parameters: {
        'shared_preload_libraries': 'pg_stat_statements',
        'log_statement': 'all',
        'log_statement_stats': '1',
        'log_min_duration_statement': '100', // Log queries > 100ms
      },
    });

    // 5. Create Aurora Serverless v2 cluster
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

    // 6. Store secret reference
    this.databaseSecret = this.cluster.secret!;

    // 7. Create secret rotation (if enabled)
    if (props.databaseConfig.secretRotationDays) {
      new secretsmanager.RotationSchedule(this, 'RotationSchedule', {
        secret: this.databaseSecret,
        rotationLambda: props.rotatorFunction,
        automaticallyAfter: Duration.days(props.databaseConfig.secretRotationDays),
      });
    }

    // 8. Add CloudWatch alarms
    this.createAlarms(props);
  }

  private createAlarms(props: AuroraServerlessV2Props): void {
    // CPU utilization alarm
    new cloudwatch.Alarm(this, 'HighCPUAlarm', {
      metric: this.cluster.metricCPUUtilization(),
      threshold: 80,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Database connections alarm
    new cloudwatch.Alarm(this, 'HighConnectionsAlarm', {
      metric: this.cluster.metric('DatabaseConnections'),
      threshold: props.stage === 'prod' ? 1000 : 100,
      evaluationPeriods: 2,
    });
  }
}
```

### Database Migration from Serverless

#### Key Differences:
1. **Credentials Management**: CDK uses `rds.Credentials.fromGeneratedSecret` vs CloudFormation `GenerateSecretString`
2. **Scaling Configuration**: CDK uses `serverlessV2MinCapacity/MaxCapacity` properties
3. **Security Groups**: CDK creates dedicated security group with specific ingress rules
4. **Parameter Groups**: CDK allows detailed PostgreSQL configuration
5. **Monitoring**: CDK makes it easy to add CloudWatch alarms

---

## Authentication Infrastructure

### Cognito User Pool - Complete Architecture

#### Serverless Configuration (ui-auth/serverless.yml)
```yaml
CognitoUserPool:
  Type: AWS::Cognito::UserPool
  Properties:
    UserPoolName: ${sls:stage}-users
    UsernameAttributes: [email]
    AutoVerifiedAttributes: [email]
    AdminCreateUserConfig:
      AllowAdminCreateUserOnly: true
      UnusedAccountValidityDays: 7
    EmailConfiguration:
      EmailSendingAccount: DEVELOPER
      From: ${self:custom.sesSourceEmailAddress}
      SourceArn: !GetAtt CognitoUserPoolEmailRole.Arn
    PasswordPolicy:
      MinimumLength: 16
      RequireLowercase: true
      RequireUppercase: true
      RequireNumbers: true
      RequireSymbols: true
    AccountRecoverySetting:
      RecoveryMechanisms:
        - Name: verified_email
          Priority: 1
    UserAttributeUpdateSettings:
      AttributesRequireVerificationBeforeUpdate: [email]

CognitoUserPoolClient:
  Type: AWS::Cognito::UserPoolClient
  Properties:
    ClientName: ${sls:stage}-users
    UserPoolId: !Ref CognitoUserPool
    IdTokenValidity: 30
    RefreshTokenValidity: 24
    AccessTokenValidity: 30
    TokenValidityUnits:
      AccessToken: minutes
      IdToken: minutes
      RefreshToken: hours
    GenerateSecret: false
    AllowedOAuthScopes: [email, openid, profile]
    AllowedOAuthFlows: [code]
    SupportedIdentityProviders: [!Ref OktaSamlProvider]
    CallbackURLs: ['https://${self:custom.application_endpoint_url}/']
    LogoutURLs: ['https://${self:custom.application_endpoint_url}/']
```

#### CDK Implementation (CognitoAuth Construct)
```typescript
export class CognitoAuth extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;
  public readonly authenticatedRole: iam.Role;

  constructor(scope: Construct, id: string, props: CognitoAuthProps) {
    super(scope, id);

    // 1. Create user pool
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${props.stage}-users`,
      signInAliases: { email: true },
      autoVerify: { email: true },
      selfSignUpEnabled: false, // Admin only
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
        : props.securityConfig.cognitoMfa === 'OPTIONAL'
        ? cognito.Mfa.OPTIONAL
        : cognito.Mfa.OFF,
      mfaSecondFactor: {
        sms: false,
        otp: true,
      },
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
      removalPolicy: props.stage === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // 2. Create SAML provider (Okta)
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

    // 3. Create app client
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

    // 4. Create identity pool
    this.identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      identityPoolName: `${props.stage}_users`,
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [{
        clientId: this.userPoolClient.userPoolClientId,
        providerName: this.userPool.userPoolProviderName,
      }],
    });

    // 5. Create authenticated role
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
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'),
      ],
    });

    // 6. Attach roles to identity pool
    new cognito.CfnIdentityPoolRoleAttachment(this, 'RoleAttachment', {
      identityPoolId: this.identityPool.ref,
      roles: {
        authenticated: this.authenticatedRole.roleArn,
      },
    });

    // 7. Create user pool domain
    new cognito.UserPoolDomain(this, 'UserPoolDomain', {
      userPool: this.userPool,
      cognitoDomain: {
        domainPrefix: `mcr-${props.stage}`,
      },
    });

    // 8. Add Lambda triggers
    if (props.preSignUpTrigger) {
      this.userPool.addTrigger(
        cognito.UserPoolOperation.PRE_SIGN_UP,
        props.preSignUpTrigger
      );
    }
  }
}
```

### Authentication Migration Key Points

1. **SAML Integration**: CDK provides `UserPoolIdentityProviderSaml` for Okta integration
2. **MFA Configuration**: CDK allows dynamic MFA settings based on stage
3. **Custom Attributes**: CDK supports custom attributes with validation
4. **Identity Pool**: CDK requires manual creation of `CfnIdentityPool`
5. **SES Integration**: CDK integrates with SES for email delivery

---

## Storage Infrastructure

### S3 Buckets - Complete Architecture

#### Serverless Configuration (uploads/serverless.yml)
```yaml
DocumentUploadsBucket:
  Type: AWS::S3::Bucket
  Properties:
    BucketName: !Sub ${self:service}-${sls:stage}-uploads-${AWS::AccountId}
    BucketEncryption:
      ServerSideEncryptionConfiguration:
        - ServerSideEncryptionByDefault:
            SSEAlgorithm: AES256
    CorsConfiguration:
      CorsRules:
        - AllowedOrigins: ['*']
          AllowedHeaders: ['*']
          AllowedMethods: [GET, PUT, POST, DELETE, HEAD]
          MaxAge: 3000
          ExposedHeaders: [ETag]
    NotificationConfiguration:
      LambdaConfigurations:
        - Event: s3:ObjectCreated:*
          Function: !GetAtt AvScanLambdaFunction.Arn

DocumentsUploadsBucketPolicy:
  Type: AWS::S3::BucketPolicy
  Properties:
    Bucket: !Ref DocumentUploadsBucket
    PolicyDocument:
      Statement:
        - Action: 's3:GetObject'
          Effect: 'Deny'
          Resource: !Sub ${DocumentUploadsBucket.Arn}/*
          Principal: '*'
          Condition:
            StringNotEquals:
              s3:ExistingObjectTag/virusScanStatus: ['CLEAN']
```

#### CDK Implementation (SecureS3Bucket Construct)
```typescript
export class SecureS3Bucket extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: SecureS3BucketProps) {
    super(scope, id);

    // 1. Create bucket with security best practices
    this.bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: props.bucketName,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: props.versioned ?? false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: props.stage === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: props.stage !== 'prod',
      lifecycleRules: props.lifecycleRules || [{
        id: 'delete-old-versions',
        noncurrentVersionExpiration: Duration.days(30),
        abortIncompleteMultipartUploadAfter: Duration.days(7),
      }],
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
      serverAccessLogsPrefix: props.enableAccessLogging ? 'access-logs/' : undefined,
      intelligentTieringConfigurations: props.stage === 'prod' ? [{
        name: 'archive-old-data',
        archiveAccessTierTime: Duration.days(90),
        deepArchiveAccessTierTime: Duration.days(180),
      }] : undefined,
    });

    // 2. Add bucket policy for virus scanning
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

    // 3. Add file type restrictions
    if (props.allowedFileTypes) {
      const notAllowedTypes = props.allowedFileTypes.map(ext => `${this.bucket.bucketArn}/*${ext}`);
      
      this.bucket.addToResourcePolicy(new iam.PolicyStatement({
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ['s3:PutObject'],
        notResources: notAllowedTypes,
      }));
    }

    // 4. Add event notifications
    if (props.lambdaTrigger) {
      this.bucket.addEventNotification(
        s3.EventType.OBJECT_CREATED,
        new s3n.LambdaDestination(props.lambdaTrigger),
        props.notificationPrefix ? { prefix: props.notificationPrefix } : undefined
      );
    }

    // 5. Enable CloudTrail logging for prod
    if (props.stage === 'prod') {
      const trail = new cloudtrail.Trail(this, 'BucketTrail', {
        bucket: props.auditBucket,
        s3KeyPrefix: `${props.bucketName}-trail`,
      });
      
      trail.addS3EventSelector([{
        bucket: this.bucket,
        objectPrefix: '',
        includeManagementEvents: false,
        readWriteType: cloudtrail.ReadWriteType.ALL,
      }]);
    }

    // 6. Add CloudWatch metrics
    this.createMetrics(props);
  }

  private createMetrics(props: SecureS3BucketProps): void {
    // Storage metrics
    new cloudwatch.Metric({
      namespace: 'AWS/S3',
      metricName: 'BucketSizeBytes',
      dimensionsMap: {
        BucketName: this.bucket.bucketName,
        StorageType: 'StandardStorage',
      },
      statistic: 'Average',
    });

    // Request metrics (requires configuration)
    if (props.requestMetricsEnabled) {
      this.bucket.addMetric({
        id: 'EntireBucket',
      });
    }
  }
}
```

### Storage Migration Key Points

1. **Security by Default**: CDK enforces SSL and blocks public access
2. **Lifecycle Management**: CDK provides type-safe lifecycle rules
3. **Event Notifications**: CDK uses destination classes for Lambda triggers
4. **Intelligent Tiering**: CDK supports automatic archival for cost optimization
5. **CloudTrail Integration**: CDK makes audit logging easy to configure

---

## Network Infrastructure

### VPC Import and Configuration

#### Serverless Configuration
```yaml
custom:
  vpcId: ${env:VPC_ID}
  sgId: ${env:SG_ID}
  privateSubnets:
    - ${env:SUBNET_PRIVATE_A_ID}
    - ${env:SUBNET_PRIVATE_B_ID}
    - ${env:SUBNET_PRIVATE_C_ID}
  publicSubnetA: ${env:SUBNET_PUBLIC_A_ID}
```

#### CDK Implementation (ImportedVpc Construct)
```typescript
export class ImportedVpc extends Construct {
  public readonly vpc: ec2.IVpc;
  public readonly privateSubnets: ec2.ISubnet[];
  public readonly publicSubnets: ec2.ISubnet[];
  public readonly isolatedSubnets: ec2.ISubnet[];

  constructor(scope: Construct, id: string, props: ImportedVpcProps) {
    super(scope, id);

    // 1. Import VPC by ID
    this.vpc = ec2.Vpc.fromLookup(this, 'VPC', {
      vpcId: props.vpcId,
    });

    // 2. Import subnets
    this.privateSubnets = props.privateSubnetIds.map((subnetId, index) => 
      ec2.Subnet.fromSubnetAttributes(this, `PrivateSubnet${index}`, {
        subnetId,
        availabilityZone: this.getAzFromIndex(index),
        routeTableId: props.privateRouteTableIds?.[index],
      })
    );

    this.publicSubnets = props.publicSubnetIds.map((subnetId, index) => 
      ec2.Subnet.fromSubnetAttributes(this, `PublicSubnet${index}`, {
        subnetId,
        availabilityZone: this.getAzFromIndex(index),
        routeTableId: props.publicRouteTableIds?.[index],
      })
    );

    // 3. Create security groups
    this.createSecurityGroups(props);

    // 4. Add VPC endpoints for AWS services
    this.createVpcEndpoints(props);
  }

  private createSecurityGroups(props: ImportedVpcProps): void {
    // Lambda security group
    const lambdaSg = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Lambda functions',
      allowAllOutbound: true,
    });

    // Self-referencing rule for Lambda-to-Lambda communication
    lambdaSg.addIngressRule(
      lambdaSg,
      ec2.Port.allTraffic(),
      'Allow Lambda functions to communicate'
    );

    // Database security group
    const dbSg = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for RDS database',
      allowAllOutbound: false,
    });

    // Allow Lambda to access database
    dbSg.addIngressRule(
      lambdaSg,
      ec2.Port.tcp(5432),
      'Allow PostgreSQL access from Lambda'
    );
  }

  private createVpcEndpoints(props: ImportedVpcProps): void {
    // S3 Gateway endpoint
    new ec2.GatewayVpcEndpoint(this, 'S3Endpoint', {
      vpc: this.vpc,
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [{ subnets: this.privateSubnets }],
    });

    // Secrets Manager endpoint
    new ec2.InterfaceVpcEndpoint(this, 'SecretsManagerEndpoint', {
      vpc: this.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      subnets: { subnets: this.privateSubnets },
      privateDnsEnabled: true,
    });

    // RDS endpoint
    new ec2.InterfaceVpcEndpoint(this, 'RDSEndpoint', {
      vpc: this.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.RDS,
      subnets: { subnets: this.privateSubnets },
      privateDnsEnabled: true,
    });
  }

  private getAzFromIndex(index: number): string {
    const azs = ['us-east-1a', 'us-east-1b', 'us-east-1c'];
    return azs[index] || azs[0];
  }
}
```

---

## Frontend Infrastructure

### CloudFront + S3 Static Website

#### Serverless Configuration (ui/serverless.yml)
```yaml
S3Bucket:
  Type: AWS::S3::Bucket
  Properties:
    WebsiteConfiguration:
      IndexDocument: index.html
      ErrorDocument: index.html

CloudFrontDistribution:
  Type: AWS::CloudFront::Distribution
  Properties:
    DistributionConfig:
      Origins:
        - DomainName: !GetAtt S3Bucket.RegionalDomainName
          Id: S3Origin
          S3OriginConfig:
            OriginAccessIdentity: !Sub origin-access-identity/cloudfront/${CloudFrontOriginAccessIdentity}
      DefaultRootObject: index.html
      DefaultCacheBehavior:
        TargetOriginId: S3Origin
        ViewerProtocolPolicy: redirect-to-https
        Compress: true
        AllowedMethods: [GET, HEAD, OPTIONS]
        CachedMethods: [GET, HEAD, OPTIONS]
        ForwardedValues:
          QueryString: false
          Headers: []
          Cookies:
            Forward: none
      CustomErrorResponses:
        - ErrorCode: 404
          ResponseCode: 200
          ResponsePagePath: /index.html
```

#### CDK Implementation (StaticWebsite Construct)
```typescript
export class StaticWebsite extends Construct {
  public readonly distribution: cloudfront.Distribution;
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StaticWebsiteProps) {
    super(scope, id);

    // 1. Create S3 bucket for static content
    this.bucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `${props.domainName}-${props.stage}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: props.stage === 'prod' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: props.stage !== 'prod',
    });

    // 2. Create Origin Access Identity
    const oai = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: `OAI for ${props.domainName}`,
    });

    // 3. Grant CloudFront access to S3
    this.bucket.grantRead(oai);

    // 4. Create WAF ACL for geo-restriction
    const webAcl = new GeoRestrictedWaf(this, 'WebAcl', {
      stage: props.stage,
      allowedCountries: ['US'],
    });

    // 5. Create CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(this.bucket, {
          originAccessIdentity: oai,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        compress: true,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
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
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      webAclId: webAcl.webAclArn,
      priceClass: props.stage === 'prod'
        ? cloudfront.PriceClass.PRICE_CLASS_ALL
        : cloudfront.PriceClass.PRICE_CLASS_100,
      logging: props.logBucket ? {
        bucket: props.logBucket,
        prefix: `cloudfront-logs/${props.domainName}/`,
      } : undefined,
    });

    // 6. Create Route53 record (if domain provided)
    if (props.hostedZone && props.domainName) {
      new route53.ARecord(this, 'AliasRecord', {
        zone: props.hostedZone,
        recordName: props.domainName,
        target: route53.RecordTarget.fromAlias(
          new targets.CloudFrontTarget(this.distribution)
        ),
      });
    }

    // 7. Add deployment automation
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(props.websiteSourcePath)],
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
      memoryLimit: 512,
      prune: false, // Keep old versions
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
      customHeadersBehavior: {
        customHeaders: [
          {
            header: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
            override: false,
          },
          {
            header: 'Pragma',
            value: 'no-cache',
            override: false,
          },
          {
            header: 'Expires',
            value: '0',
            override: false,
          },
        ],
      },
    });
  }
}
```

### Frontend Migration Key Points

1. **Origin Access Identity**: CDK uses OAI to secure S3 bucket
2. **Response Headers**: CDK provides type-safe security headers configuration
3. **WAF Integration**: CDK allows easy WAF ACL attachment
4. **Automated Deployment**: CDK includes `BucketDeployment` for CI/CD
5. **Custom Error Pages**: CDK supports SPA routing configuration

---

## Best Practices Summary

### 1. Resource Organization
```typescript
// Group related resources in constructs
export class ApplicationStack extends BaseStack {
  private readonly database: AuroraServerlessV2;
  private readonly auth: CognitoAuth;
  private readonly storage: SecureS3Bucket;
  private readonly frontend: StaticWebsite;
}
```

### 2. Cross-Stack References
```typescript
// Use Service Registry pattern
ServiceRegistry.putDatabaseSecretArn(this, stage, database.secret.secretArn);
const secretArn = ServiceRegistry.getDatabaseSecretArn(this, stage);
```

### 3. Environment-Specific Configuration
```typescript
// Use stage configuration
const config = StageConfiguration.get(stage);
const bucket = new SecureS3Bucket(this, 'Bucket', {
  ...config.storage,
  stage,
});
```

### 4. Security Best Practices
```typescript
// Always use least privilege
lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['s3:GetObject'],
  resources: [`${bucket.bucketArn}/*`],
  conditions: {
    StringEquals: {
      's3:ExistingObjectTag/approved': 'true',
    },
  },
}));
```

### 5. Monitoring and Alarms
```typescript
// Add alarms for critical resources
new cloudwatch.Alarm(this, 'HighErrorRate', {
  metric: lambdaFunction.metricErrors(),
  threshold: 10,
  evaluationPeriods: 2,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});
```

---

## Production Security Considerations

### 1. Secret Management

**JWT Secret Handling**
```typescript
// ❌ Anti-pattern: Exposing secret ARN in environment
environment: {
  JWT_SECRET_ARN: jwtSecret.secretArn  // ARN visible in logs!
}

// ✅ Best practice: Grant access pattern
// In stack:
jwtSecret.grantRead(lambdaFunction);

// In environment:
environment: {
  JWT_SECRET_NAME: jwtSecret.secretName  // Non-sensitive identifier
}
```

### 2. Binary Content Handling

**API Gateway File Upload/Download**
```typescript
// Create specialized binary endpoints
ApiEndpointFactory.createAuthenticatedBinaryEndpoint(this, 'FileEndpoint', {
  resource: filesResource,
  method: 'POST',
  handler: fileHandler,
  userPool: this.userPool,
  authorizer: this.authorizer,
  // Critical for binary content
  contentHandling: apigateway.ContentHandling.CONVERT_TO_BINARY
});
```

### 3. Cross-Stack Dependencies

**Layer Version Management**
```typescript
// Store in SSM Parameter Store (not CloudFormation exports)
new ssm.StringParameter(this, 'LayerArnParam', {
  parameterName: `/${PROJECT_PREFIX}/${stage}/layers/my-layer-arn`,
  stringValue: layer.layerVersionArn
});

// Retrieve in consuming stack
const layerArn = ssm.StringParameter.valueForStringParameter(
  this,
  `/${PROJECT_PREFIX}/${stage}/layers/my-layer-arn`
);
```

### 4. Configuration Validation

**Fail Fast Pattern**
```typescript
export class AuthStack extends BaseStack {
  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);
    
    // Validate critical configuration early
    this.validateConfiguration();
  }
  
  private validateConfiguration(): void {
    if (this.allowedCallbackUrls.length === 0) {
      throw new Error(
        'allowedCallbackUrls must not be empty - authentication will fail'
      );
    }
    
    if (this.stage === 'prod' && !this.emailSender) {
      throw new Error(
        'emailSender required in production for proper email delivery'
      );
    }
  }
}
```

### 5. IAM Permission Boundaries

**Proper Identity Pool Conditions**
```typescript
// Correct Identity Pool IAM conditions
new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['s3:GetObject'],
  resources: ['*'],
  conditions: {
    StringEquals: {
      'cognito-identity.amazonaws.com:aud': identityPool.ref
    },
    'ForAnyValue:StringLike': {
      'cognito-identity.amazonaws.com:amr': '*:ADMIN'
    }
  }
});
```

### 6. Stack Naming Consistency

**Deployment Suffix Pattern**
```typescript
// Ensure all stacks use consistent naming
import { CDK_DEPLOYMENT_SUFFIX } from '@config/constants';

new ApiComputeStack(app, `MCR-ApiCompute-${stage}${CDK_DEPLOYMENT_SUFFIX}`, {
  // ... props
});
```

### 7. Environment Variable Security

**LambdaEnvironmentFactory Pattern**
```typescript
export class LambdaEnvironmentFactory {
  static createApiLambdaEnvironment(config: {
    jwtSecretName: string,  // Name only, not ARN
    databaseSecretArn: string,  // OK - needed for connection
    applicationEndpoint?: string
  }): Record<string, string> {
    return {
      // Non-sensitive values
      APPLICATION_ENDPOINT: config.applicationEndpoint,
      JWT_SECRET_NAME: config.jwtSecretName,
      
      // Sensitive values accessed via SDK
      DATABASE_SECRET_ARN: config.databaseSecretArn,
      
      // SSM parameters resolved at deploy time
      API_OTEL_COLLECTOR_URL: ssm.StringParameter.valueForStringParameter(
        this, '/configuration/api_app_otel_collector_url'
      )
    };
  }
}
```

This documentation provides a complete understanding of how the CDK architecture is wired together, from the abstract BaseStack through the factory patterns to concrete implementations, with clear migration paths from serverless configurations for all major AWS services used in the application, along with critical production security considerations.
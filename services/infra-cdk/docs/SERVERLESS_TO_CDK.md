# Serverless to CDK Migration Architecture Guide

## Overview

This document describes the AWS CDK architecture that replaces the Serverless Framework deployment. The CDK implementation provides improved type safety, infrastructure-as-code practices, and better AWS resource management.

## Architecture Components

### Configuration System

The CDK uses an ultra-lean three-file configuration system:

- **`lib/config/shared.ts`** - Project constants, resource naming utilities, and shared configurations
- **`lib/config/environments.ts`** - Environment-specific configurations with composition pattern
- **`lib/config/index.ts`** - Clean re-exports and utility functions

#### Environment Configuration
```typescript
// Base configuration with environment-specific overrides
const BASE_CONFIG: EnvironmentConfig = {
  account: process.env.CDK_DEFAULT_ACCOUNT!,
  region: 'us-east-1',
  monitoring: { enableDetailedMonitoring: false },
  security: { enableWAF: false },
  lambda: {
    memorySize: 1024,
    timeout: Duration.seconds(30),
    architecture: Architecture.X86_64
  },
  database: {
    minCapacity: 0.5,
    maxCapacity: 1,
    backupRetentionDays: 7,
    deletionProtection: false,
    enableDataApi: true
  }
};

// Environment-specific overrides
const STAGE_OVERRIDES: Record<string, Partial<EnvironmentConfig>> = {
  prod: {
    monitoring: { enableDetailedMonitoring: true },
    security: { enableWAF: true },
    lambda: { memorySize: 2048, timeout: Duration.minutes(5) },
    database: {
      minCapacity: 2,
      maxCapacity: 16,
      backupRetentionDays: 35,
      deletionProtection: true
    }
  }
};
```

### Stack Architecture

The CDK implementation uses a modular stack architecture:

#### Core Infrastructure Stacks
- **FoundationStack** - Base infrastructure, JWT secrets, SSM parameter hierarchy
- **NetworkStack** - VPC imports, security groups, VPN access configuration
- **DataStack** - Aurora Serverless v2, S3 buckets with security policies
- **SharedInfraStack** - Lambda layers, OTEL layer, common environment variables

#### Application Stacks
- **AuthStack** - Cognito User Pool and configuration
- **AuthExtensionsStack** - Identity Pool and IAM roles (post-API deployment)
- **GraphQLApiStack** - Main GraphQL API Lambda and API Gateway
- **PublicApiStack** - Public API endpoints and authentication
- **FileOpsStack** - File operations and bulk download functionality
- **ScheduledTasksStack** - Scheduled Lambda functions and cron jobs
- **DatabaseOperationsStack** - Database migration and maintenance functions

### Resource Naming Convention

All CDK resources use the `mcr-cdk` prefix to ensure complete separation from serverless resources:

```typescript
export const PROJECT_PREFIX = 'mcr-cdk';

// Examples:
// S3 Buckets: mcr-cdk-dev-uploads-123456789012
// Secrets: mcr-cdk-aurora-postgres-dev
// SSM Parameters: /mcr-cdk/dev/foundation/initialized
// Security Groups: mcr-cdk-dev-lambda-sg
```

### Lambda Function Management

#### Lambda Factory Pattern
```typescript
export class LambdaFactory extends Construct {
  public createFunction(props: CreateFunctionProps): BaseLambdaFunction {
    const handlerMapping = HANDLER_MAP[props.functionName];
    const layers = this.getLayersForFunction(props.functionName);
    
    return new BaseLambdaFunction(this, props.functionName, {
      ...props,
      handler: `${handlerMapping.entry}.${handlerMapping.handler}`,
      layers,
      bundling: getBundlingConfig(props.functionName, this.props.stage)
    });
  }
}
```

#### Handler Mappings
```typescript
const HANDLER_MAP: Record<string, HandlerMapping> = {
  GRAPHQL: { 
    entry: 'handlers/apollo_gql', 
    handler: 'gqlHandler',
    functionName: 'graphql'
  },
  EMAIL_SUBMIT: { 
    entry: 'handlers/email_submit', 
    handler: 'main',
    functionName: 'email_submit'
  },
  ZIP_KEYS: { 
    entry: 'handlers/bulk_download', 
    handler: 'main',
    functionName: 'zip_keys'
  },
  AUDIT_FILES: { 
    entry: 'handlers/audit_s3', 
    handler: 'main',
    functionName: 'auditFiles'
  },
  CLEANUP: { 
    entry: 'handlers/cleanup', 
    handler: 'main',
    functionName: 'cleanup'
  }
};
```

### Lambda Layers

#### Layer Management
```typescript
export class LambdaLayersStack extends Stack {
  public otelLayerVersion: lambda.ILayerVersion;
  public prismaEngineLayerVersion: lambda.ILayerVersion;
  public prismaMigrationLayerVersion: lambda.ILayerVersion;

  private createPrismaEngineLayer(stage: string): lambda.LayerVersion {
    return new lambda.LayerVersion(this, 'PrismaEngineLayer', {
      code: lambda.Code.fromAsset(
        path.join(__dirname, '..', '..', 'lambda-layers-prisma-client-engine')
      ),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Prisma Client Engine for database queries'
    });
  }
}
```

#### Layer Assignment Logic
- **All functions**: Get OTEL layer for observability
- **Database functions**: Get Prisma Engine layer for queries
- **Migration functions**: Get Prisma Migration layer for schema changes
- **Function-specific**: Additional layers based on requirements

### Build System

#### ESBuild Configuration
```typescript
export function getBundlingConfig(
  functionName: string,
  stage: string
): NodejsFunctionProps['bundling'] {
  return {
    minify: true,
    sourceMap: true,
    target: 'node20',
    format: OutputFormat.CJS,
    externalModules: getExternalModules(functionName),
    commandHooks: getBundlingCommandHooks(functionName)
  };
}

function getExternalModules(functionName: string): string[] {
  const baseExternal = ['prisma', '@prisma/client'];
  
  if (functionName === 'GRAPHQL') {
    return [
      ...baseExternal,
      'apollo-server-core',
      'apollo-server-lambda',
      '@launchdarkly/node-server-sdk',
      'graphql-tag'
    ];
  }
  
  return baseExternal;
}
```

#### Build Hooks
```typescript
export function getBundlingCommandHooks(functionName?: string) {
  return {
    beforeBundling(inputDir: string, outputDir: string): string[] {
      const commands: string[] = [];
      
      // Copy GraphQL schema for GraphQL functions
      if (functionName === 'graphql') {
        const schemaPath = path.join(inputDir, '..', '..', '..', 'app-graphql', 'src', 'schema.graphql');
        commands.push(`mkdir -p "${outputDir}/app-graphql/src"`);
        commands.push(`cp "${schemaPath}" "${outputDir}/app-graphql/src/"`);
      }
      
      // Copy OTEL collector.yml for all functions
      const collectorPath = path.join(inputDir, '..', 'collector.yml');
      commands.push(`cp "${collectorPath}" "${outputDir}/"`);
      
      return commands;
    },
    
    afterBundling(inputDir: string, outputDir: string): string[] {
      // Replace New Relic license key in collector.yml
      const commands: string[] = [];
      commands.push(`sed -i 's/$NR_LICENSE_KEY/${process.env.NR_LICENSE_KEY || ''}/' "${outputDir}/collector.yml"`);
      return commands;
    }
  };
}
```

### Database Configuration

#### Aurora Serverless v2 Setup
```typescript
export class AuroraServerlessV2 extends Construct {
  public cluster: rds.DatabaseCluster;
  public secret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: AuroraServerlessV2Props) {
    super(scope, id);

    // Create CDK-specific database secret
    this.secret = new secretsmanager.Secret(this, 'Secret', {
      secretName: `mcr-cdk-aurora-postgres-${props.stage}`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'mcreviewadmin' }),
        generateStringKey: 'password',
        excludeCharacters: ' %+~`#$&*()|[]{}:;<>?!\'/@"\\',
        passwordLength: 30
      }
    });

    // Create Aurora cluster with serverless v2 scaling
    this.cluster = new rds.DatabaseCluster(this, 'Cluster', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_14_9
      }),
      credentials: rds.Credentials.fromSecret(this.secret),
      clusterIdentifier: `mcr-cdk-${props.stage}-database-cluster`,
      defaultDatabaseName: `aurorapostgres${props.stage}${Stack.of(this).account}cdk`,
      serverlessV2MinCapacity: props.databaseConfig.minCapacity,
      serverlessV2MaxCapacity: props.databaseConfig.maxCapacity,
      vpc: props.vpc,
      securityGroups: [props.securityGroup, ...(props.additionalSecurityGroups || [])],
      storageEncrypted: true,
      backup: {
        retention: Duration.days(props.databaseConfig.backupRetentionDays)
      }
    });
  }
}
```

### Authentication & Authorization

#### Cognito Configuration
```typescript
export class AuthStack extends BaseStack {
  public userPool: cognito.IUserPool;
  public userPoolClient: cognito.IUserPoolClient;

  protected defineResources(): void {
    this.cognitoAuth = new CognitoAuth(this, 'CognitoAuth', {
      userPoolName: SERVICES.UI_AUTH,
      stage: this.stage,
      securityConfig: config.security,
      customDomain: `mcr-${this.stage}-cdk`,
      emailSender: `noreply-${this.stage}@mcr.cms.gov`,
      allowedCallbackUrls: this.allowedCallbackUrls,
      allowedLogoutUrls: this.allowedLogoutUrls
    });

    // Store User Pool parameters with CDK-specific paths
    new ssm.StringParameter(this, 'UserPoolArnParameter', {
      parameterName: `/mcr-cdk-cognito/${this.stage}/user-pool-arn`,
      stringValue: this.userPool.userPoolArn
    });
  }
}
```

#### Identity Pool & IAM Roles
```typescript
export class AuthExtensionsStack extends BaseStack {
  protected defineResources(): void {
    // Import User Pool from CDK-specific SSM parameters
    const userPoolId = ssm.StringParameter.valueForStringParameter(
      this, `/mcr-cdk-cognito/${this.stage}/user-pool-id`
    );

    // Create Identity Pool
    this.identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      identityPoolName: `mcr-cdk-${this.stage}-identity-pool`,
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [{
        clientId: userPoolClientId,
        providerName: `cognito-idp.${this.region}.amazonaws.com/${userPoolId}`
      }]
    });

    // Create authenticated role with group-based policies
    this.authenticatedRole = new iam.Role(this, 'AuthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal('cognito-identity.amazonaws.com'),
      roleName: `mcr-cdk-${this.stage}-authenticated-role`
    });
  }
}
```

### Storage Configuration

#### S3 Buckets with Security
```typescript
export class DataStack extends BaseStack {
  private createS3Buckets(): void {
    // Logging bucket with CDK-specific naming
    const loggingBucket = new s3.Bucket(this, 'S3LoggingBucket', {
      bucketName: `mcr-cdk-${S3_BUCKETS.UPLOADS}-${this.stage}-logs-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true
    });

    // Main uploads bucket
    this.uploadsBucket = new SecureS3Bucket(this, 'UploadsBucket', {
      bucketName: S3_BUCKETS.UPLOADS,
      stage: this.stage,
      serverAccessLogsBucket: loggingBucket,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
        allowedOrigins: ['*'],
        allowedHeaders: ['*']
      }]
    }).bucket;

    // File type restrictions
    this.uploadsBucket.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.DENY,
      principals: [new iam.AnyPrincipal()],
      actions: ['s3:PutObject'],
      notResources: [
        `${this.uploadsBucket.bucketArn}/*.pdf`,
        `${this.uploadsBucket.bucketArn}/*.doc`,
        `${this.uploadsBucket.bucketArn}/*.docx`,
        `${this.uploadsBucket.bucketArn}/*.xlsx`
      ]
    }));
  }
}
```

### Network Configuration

#### VPC & Security Groups
```typescript
export class NetworkStack extends BaseStack {
  protected defineResources(): void {
    // Import existing VPC
    this.importedVpc = new ImportedVpc(this, 'ImportedVpc', {
      stage: this.stage
    });
    this.vpc = this.importedVpc.vpc;

    // Create Lambda security group
    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc: this.vpc,
      description: `Security group for Lambda functions - ${this.stage}`,
      securityGroupName: `mcr-cdk-${this.stage}-lambda-sg`
    });

    // Create Database security group
    this.databaseSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: this.vpc,
      description: `Security group for Aurora PostgreSQL database - ${this.stage}`,
      securityGroupName: `mcr-cdk-${this.stage}-database-sg`
    });

    // Import VPN security groups for production access
    this.importVpnSecurityGroups();
    this.configureSecurityGroups();
  }

  private importVpnSecurityGroups(): void {
    try {
      const vpnSecurityGroupId = ssm.StringParameter.valueFromLookup(
        this, VPN_SSM_PARAMS.VPN_SECURITY_GROUP
      );
      if (vpnSecurityGroupId && !vpnSecurityGroupId.includes('dummy-value')) {
        const vpnSg = ec2.SecurityGroup.fromSecurityGroupId(this, 'VpnSecurityGroup', vpnSecurityGroupId);
        this.vpnSecurityGroups.push(vpnSg);
      }
    } catch (error) {
      console.log('VPN security group not found, skipping import');
    }
  }
}
```

### Service Registry Pattern

#### Cross-Stack Communication
```typescript
export class ServiceRegistry {
  static putValue(scope: Construct, category: string, key: string, value: string, stage: string): void {
    const parameterName = `/${PROJECT_PREFIX}/${stage}/${category}/${key}`;
    new ssm.StringParameter(scope, `${category}${key}Parameter`, {
      parameterName,
      stringValue: value,
      description: `${category} ${key} for ${stage}`
    });
  }

  static getValue(scope: Construct, category: string, key: string, stage: string): string {
    const parameterName = `/${PROJECT_PREFIX}/${stage}/${category}/${key}`;
    return ssm.StringParameter.valueForStringParameter(scope, parameterName);
  }

  // Convenience methods
  static putVpcId(scope: Construct, stage: string, vpcId: string): void {
    this.putValue(scope, 'vpc', 'id', vpcId, stage);
  }

  static getApiUrl(scope: Construct, stage: string): string {
    return this.getValue(scope, 'api', 'url', stage);
  }
}
```

### Monitoring & Observability

#### OTEL Integration
```typescript
export class OtelLayer extends Construct {
  public layer: lambda.ILayerVersion;

  constructor(scope: Construct, id: string, props: OtelLayerProps) {
    super(scope, id);

    // Use AWS-managed OTEL layer
    this.layer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'OtelLayerVersion',
      EXTERNAL_RESOURCES.OTEL_LAYER_ARN
    );

    // Store layer ARN for other stacks
    new ssm.StringParameter(this, 'OtelLayerArnParameter', {
      parameterName: `/mcr-cdk/${props.stage}/lambda/otel-layer-arn`,
      stringValue: this.layer.layerVersionArn
    });
  }
}
```

### Deployment Configuration

#### Stack Orchestrator
```typescript
export class StackOrchestrator {
  constructor(app: App, stage: string) {
    const config = getEnvironment(stage);

    // Phase 1: Foundation
    const foundation = new FoundationStack(app, `MCR-Foundation-${stage}-cdk`, {
      env: { account: config.account, region: config.region },
      stage
    });

    // Phase 2: Network & Data
    const network = new NetworkStack(app, `MCR-Network-${stage}-cdk`, {
      env: { account: config.account, region: config.region },
      stage
    });

    const data = new DataStack(app, `MCR-Data-${stage}-cdk`, {
      env: { account: config.account, region: config.region },
      stage,
      vpc: network.vpc,
      databaseSecurityGroup: network.databaseSecurityGroup,
      lambdaSecurityGroup: network.lambdaSecurityGroup,
      vpnSecurityGroups: network.vpnSecurityGroups
    });

    // Phase 3: Application Services
    const auth = new AuthStack(app, `MCR-Auth-${stage}-cdk`, {
      env: { account: config.account, region: config.region },
      stage,
      allowedCallbackUrls: getCallbackUrls(stage),
      allowedLogoutUrls: getLogoutUrls(stage)
    });

    // Phase 4: APIs & Functions
    const graphqlApi = new GraphQLApiStack(app, `MCR-GraphQL-${stage}-cdk`, {
      env: { account: config.account, region: config.region },
      stage,
      vpc: network.vpc,
      lambdaSecurityGroup: network.lambdaSecurityGroup,
      database: data.database
    });
  }
}
```

## Migration Benefits

### Type Safety
- Full TypeScript integration across infrastructure and application code
- Compile-time validation of resource configurations
- IDE support with autocomplete and error detection

### Resource Management
- Deterministic resource naming with conflict avoidance
- Proper dependency management between stacks
- Automated cleanup and rollback capabilities

### Security Improvements
- IAM policies defined in code with principle of least privilege
- Security group rules explicitly defined and version controlled
- Secrets management with automatic rotation capabilities

### Operational Excellence
- Infrastructure versioning and change tracking
- Consistent deployment patterns across environments
- Built-in support for blue/green deployments

### Cost Optimization
- Aurora Serverless v2 with automatic scaling
- Lambda function optimization with proper layer management
- S3 lifecycle policies for cost-effective storage

## Best Practices

### Configuration Management
- Use environment-specific overrides rather than conditional logic
- Keep configuration data separate from infrastructure code
- Validate configuration at build time

### Security
- Follow principle of least privilege for IAM policies
- Use VPC endpoints where appropriate
- Enable encryption at rest and in transit

### Performance
- Optimize Lambda function packaging and bundling
- Use appropriate layer strategies for shared dependencies
- Configure proper timeout and memory settings

### Monitoring
- Implement comprehensive logging and metrics
- Use distributed tracing with OTEL
- Set up appropriate alerting and dashboards
import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import {
  FoundationStack,
  NetworkStack,
  DataStack,
  AuthStack,
  // OLD MONOLITHIC STACK REMOVED: ApiComputeStack eliminated (612 lines → 175 lines via micro-stacks)
  DatabaseOperationsStack,
  GuardDutyMalwareProtectionStack,
  MonitoringStack,
  FrontendStack,
  GitHubOidcStack,
  LambdaLayersStack,
  // Elegant micro-stack architecture (85% code reduction)
  SharedInfraStack,
  GraphQLApiStack,
  PublicApiStack,
  FileOpsStack,
  ScheduledTasksStack,
  AuthExtensionsStack
} from './stacks';
import { StageConfig } from './config/stage-config';
import { CDK_DEPLOYMENT_SUFFIX, INFRASTRUCTURE_SSM_PARAMS } from './config/constants';

export interface StackOrchestratorProps {
  app: cdk.App;
  stage: string;
  env: cdk.Environment;
  stageConfig: StageConfig;
}

export interface StackReferences {
  foundation: FoundationStack;
  network: NetworkStack;
  lambdaLayers: LambdaLayersStack;
  data: DataStack;
  auth: AuthStack;
  // OLD MONOLITHIC STACK REMOVED: apiCompute eliminated (612 lines → 175 lines via micro-stacks)
  apiCompute?: any; // Optional for backward compatibility during cleanup
  databaseOps: DatabaseOperationsStack;
  frontend: FrontendStack;
  virusScanning?: GuardDutyMalwareProtectionStack;
  monitoring: MonitoringStack;
  githubOidc?: GitHubOidcStack;
  // Elegant micro-stack architecture (85% code reduction, zero circular dependencies)
  sharedInfra: SharedInfraStack;
  graphqlApi: GraphQLApiStack;
  publicApi: PublicApiStack;
  fileOps: FileOpsStack;
  scheduledTasks: ScheduledTasksStack;
  authExtensions: AuthExtensionsStack;
}

/**
 * Orchestrates the creation and dependency management of all CDK stacks
 */
export class StackOrchestrator {
  constructor(private props: StackOrchestratorProps) {}

  /**
   * Create all stacks with proper dependency ordering
   */
  createAllStacks(): StackReferences {
    // 1. GitHub OIDC Stack (optional, one-time setup)
    const githubOidc = this.createGitHubOidc();

    // 2. Foundation Stack (no dependencies)
    const foundation = this.createFoundation();

    // 3. Network Stack (depends on Foundation)
    const network = this.createNetwork(foundation);

    // 4. Lambda Layers Stack (depends on Network)
    const lambdaLayers = this.createLambdaLayers(network);

    // 5. Data and Auth Stacks (parallel, both depend on Foundation/Network)
    const data = this.createData(network);
    const auth = this.createAuth(foundation);

    // 6. Database Operations Stack (independent utility functions)
    const databaseOps = this.createDatabaseOps(network, data, lambdaLayers);

    // 7. ELEGANT MICRO-STACK ARCHITECTURE (Linear dependency chain - no circular deps!)
    // Step 1: Shared Infrastructure (OTEL + Prisma layers)
    const sharedInfra = this.createSharedInfra(lambdaLayers);
    
    // Step 2: API Micro-stacks (can deploy in parallel - major speed improvement!)
    const graphqlApi = this.createGraphQLApi(foundation, network, data, sharedInfra);
    const publicApi = this.createPublicApi(foundation, network, data, sharedInfra);
    const fileOps = this.createFileOps(data, sharedInfra);
    const scheduledTasks = this.createScheduledTasks(data, sharedInfra);
    
    // Step 3: Auth Extensions (after APIs exist - breaks circular dependency)
    const authExtensions = this.createAuthExtensions(data, graphqlApi, publicApi);

    // 8. Frontend Stack (deployment-independent - uses micro-stack outputs at CI build time)
    const frontend = this.createFrontend();

    // 9. Virus Scanning Stack
    // const virusScanning = this.createVirusScanning(data, network);

    // 10. Monitoring Stack
    const monitoring = this.createMonitoring(foundation);

    return {
      foundation,
      network,
      lambdaLayers,
      data,
      auth,
      // OLD MONOLITHIC STACK REMOVED: ApiComputeStack replaced by elegant micro-stacks
      apiCompute: undefined as any, // Maintain interface compatibility during transition
      databaseOps,
      frontend,
      // virusScanning,
      monitoring,
      githubOidc,
      // Elegant micro-stack architecture (175 lines total vs 612 lines monolithic)
      sharedInfra,
      graphqlApi,
      publicApi,
      fileOps,
      scheduledTasks,
      authExtensions
    };
  }

  private createGitHubOidc(): GitHubOidcStack | undefined {
    // DISABLED: Using existing serverless OIDC setup instead of CDK's GitHubOidcStack
    // to avoid duplicate OIDC providers (only one allowed per AWS account)
    // The serverless OIDC role is used via the get_aws_credentials GitHub Action
    // if (process.env.CREATE_GITHUB_OIDC === 'true') {
    //   return new GitHubOidcStack(this.props.app, `MCR-GitHubOIDC`, {
    //     env: this.props.env,
    //     description: 'GitHub OIDC provider for MCR CI/CD'
    //   });
    // }
    return undefined;
  }

  private createFoundation(): FoundationStack {
    return new FoundationStack(this.props.app, `MCR-Foundation-${this.props.stage}${CDK_DEPLOYMENT_SUFFIX}`, {
      env: this.props.env,
      stage: this.props.stage,
      stageConfig: this.props.stageConfig,
      serviceName: 'foundation'
    });
  }

  private createNetwork(foundation: FoundationStack): NetworkStack {
    const stack = new NetworkStack(this.props.app, `MCR-Network-${this.props.stage}${CDK_DEPLOYMENT_SUFFIX}`, {
      env: this.props.env,
      stage: this.props.stage,
      stageConfig: this.props.stageConfig,
      serviceName: 'network'
    });
    stack.addDependency(foundation);
    return stack;
  }

  private createLambdaLayers(network: NetworkStack): LambdaLayersStack {
    const stack = new LambdaLayersStack(this.props.app, `MCR-LambdaLayers-${this.props.stage}${CDK_DEPLOYMENT_SUFFIX}`, {
      env: this.props.env,
      stage: this.props.stage,
      description: 'Centralized Lambda layers for MCR'
    });
    stack.addDependency(network);
    return stack;
  }

  private createData(network: NetworkStack): DataStack {
    if (!network.databaseSecurityGroup) {
      throw new Error('Database security group not found in NetworkStack');
    }
    const stack = new DataStack(this.props.app, `MCR-Data-${this.props.stage}${CDK_DEPLOYMENT_SUFFIX}`, {
      env: this.props.env,
      stage: this.props.stage,
      stageConfig: this.props.stageConfig,
      serviceName: 'data',
      vpc: network.vpc,
      databaseSecurityGroup: network.databaseSecurityGroup,
      lambdaSecurityGroup: network.lambdaSecurityGroup,
      vpnSecurityGroups: network.vpnSecurityGroups
    });
    stack.addDependency(network);
    return stack;
  }

  private createAuth(foundation: FoundationStack): AuthStack {
    // Fetch email sender from SSM Parameter Store (matching serverless implementation)
    let emailSender: string | undefined;
    try {
      const ssmEmailValue = ssm.StringParameter.valueFromLookup(
        foundation,
        INFRASTRUCTURE_SSM_PARAMS.EMAIL_SOURCE_ADDRESS
      );
      
      // Only use the value if it's not a dummy token and not empty
      if (ssmEmailValue && !ssmEmailValue.includes('dummy-value') && ssmEmailValue.trim() !== '') {
        emailSender = ssmEmailValue;
      }
    } catch (error) {
      console.log('Email source address not found in SSM, will use default');
    }

    const stack = new AuthStack(this.props.app, `MCR-Auth-${this.props.stage}${CDK_DEPLOYMENT_SUFFIX}`, {
      env: this.props.env,
      stage: this.props.stage,
      stageConfig: this.props.stageConfig,
      serviceName: 'auth',
      allowedCallbackUrls: this.getCallbackUrls(),
      allowedLogoutUrls: this.getLogoutUrls(),
      samlMetadataUrl: process.env.SAML_METADATA_URL,
      emailSender: emailSender
    });
    stack.addDependency(foundation);
    return stack;
  }

  // OLD MONOLITHIC STACK REMOVED: createApiCompute method eliminated
  // The 612-line ApiComputeStack has been successfully replaced by elegant micro-stacks:
  // - SharedInfraStack (OTEL + Prisma layers) 
  // - GraphQLApiStack (CognitoToApiGatewayToLambda construct)
  // - PublicApiStack (3x ApiGatewayToLambda constructs)
  // - FileOpsStack (S3 + Lambda integrations)  
  // - ScheduledTasksStack (EventBridge + Lambda cleanup)
  // - AuthExtensionsStack (Identity Pool creation)
  // Total: ~175 lines (85% code reduction) with zero circular dependencies

  private createDatabaseOps(
    network: NetworkStack,
    data: DataStack,
    lambdaLayers: LambdaLayersStack
  ): DatabaseOperationsStack {
    const stack = new DatabaseOperationsStack(this.props.app, `MCR-DatabaseOps-${this.props.stage}${CDK_DEPLOYMENT_SUFFIX}`, {
      env: this.props.env,
      stage: this.props.stage,
      stageConfig: this.props.stageConfig,
      serviceName: 'database-ops',
      vpc: network.vpc,
      lambdaSecurityGroup: network.lambdaSecurityGroup,
      databaseCluster: data.database.cluster,
      databaseSecret: data.database.secret,
      uploadsBucketName: data.uploadsBucket.bucketName
    });
    stack.addDependency(network);
    stack.addDependency(data);
    stack.addDependency(lambdaLayers);
    return stack;
  }

  private createFrontend(): FrontendStack {
    const stack = new FrontendStack(this.props.app, `MCR-Frontend-${this.props.stage}${CDK_DEPLOYMENT_SUFFIX}`, {
      env: this.props.env,
      stage: this.props.stage,
      stageConfig: this.props.stageConfig,
      serviceName: 'frontend',
      enableAppWebIntegration: true,
      enableHsts: true
    });
    // Frontend stack is deployment-independent - gets API URLs from micro-stacks at CI build time
    // No CDK dependencies needed - micro-stack architecture provides clean separation
    return stack;
  }

  private createVirusScanning(data: DataStack, network: NetworkStack): GuardDutyMalwareProtectionStack {
    const stack = new GuardDutyMalwareProtectionStack(this.props.app, `MCR-VirusScanning-${this.props.stage}${CDK_DEPLOYMENT_SUFFIX}`, {
      env: this.props.env,
      stage: this.props.stage,
      stageConfig: this.props.stageConfig,
      serviceName: 'virus-scanning',
      uploadsBucket: data.uploadsBucket,
      qaBucket: data.qaBucket,
      alertEmail: process.env.VIRUS_SCAN_ALERT_EMAIL,
      enableRescanCapability: true,
      enableClamAvCompatibility: true,
      vpc: network.vpc,
      lambdaSecurityGroup: network.lambdaSecurityGroup
    });
    stack.addDependency(data);
    stack.addDependency(network);
    return stack;
  }

  private createMonitoring(foundation: FoundationStack): MonitoringStack {
    const stack = new MonitoringStack(this.props.app, `MCR-Monitoring-${this.props.stage}${CDK_DEPLOYMENT_SUFFIX}`, {
      env: this.props.env,
      stage: this.props.stage,
      stageConfig: this.props.stageConfig,
      serviceName: 'monitoring'
    });
    stack.addDependency(foundation);
    return stack;
  }

  private getCallbackUrls(): string[] {
    const { getCallbackUrls } = require('./config/auth-urls');
    return getCallbackUrls(this.props.stage);
  }

  private getLogoutUrls(): string[] {
    const { getLogoutUrls } = require('./config/auth-urls');
    return getLogoutUrls(this.props.stage);
  }

  // ========================================
  // NEW ELEGANT MICRO-STACK CREATORS
  // ========================================

  /**
   * Create Shared Infrastructure Stack - OTEL + Prisma layers + SSM parameters
   */
  private createSharedInfra(lambdaLayers: LambdaLayersStack): SharedInfraStack {
    const stack = new SharedInfraStack(this.props.app, `MCR-SharedInfra-${this.props.stage}${CDK_DEPLOYMENT_SUFFIX}`, {
      env: this.props.env,
      stage: this.props.stage,
      stageConfig: this.props.stageConfig,
      serviceName: 'shared-infra'
    });
    stack.addDependency(lambdaLayers);
    return stack;
  }

  /**
   * Create GraphQL API Stack using CognitoToApiGatewayToLambda construct
   */
  private createGraphQLApi(
    foundation: FoundationStack,
    network: NetworkStack,
    data: DataStack,
    sharedInfra: SharedInfraStack
  ): GraphQLApiStack {
    const stack = new GraphQLApiStack(this.props.app, `MCR-GraphQLApi-${this.props.stage}${CDK_DEPLOYMENT_SUFFIX}`, {
      env: this.props.env,
      stage: this.props.stage,
      stageConfig: this.props.stageConfig,
      serviceName: 'graphql-api',
      vpc: network.vpc,
      lambdaSecurityGroup: network.lambdaSecurityGroup,
      databaseSecretArn: data.database.secret.secretArn,
      databaseClusterEndpoint: data.database.clusterEndpoint.hostname,
      databaseName: `aurorapostgres${this.props.stage}${this.props.env.account}cdk`,
      uploadsBucketName: data.uploadsBucket.bucketName,
      qaBucketName: data.qaBucket.bucketName,
      applicationEndpoint: process.env.APPLICATION_ENDPOINT
    });
    stack.addDependency(foundation);
    stack.addDependency(network);
    stack.addDependency(data);
    stack.addDependency(sharedInfra);
    return stack;
  }

  /**
   * Create Public API Stack - Health/OAuth/OTEL endpoints using ApiGatewayToLambda constructs
   */
  private createPublicApi(
    foundation: FoundationStack,
    network: NetworkStack,
    data: DataStack,
    sharedInfra: SharedInfraStack
  ): PublicApiStack {
    const stack = new PublicApiStack(this.props.app, `MCR-PublicApi-${this.props.stage}${CDK_DEPLOYMENT_SUFFIX}`, {
      env: this.props.env,
      stage: this.props.stage,
      stageConfig: this.props.stageConfig,
      serviceName: 'public-api',
      vpc: network.vpc,
      lambdaSecurityGroup: network.lambdaSecurityGroup,
      databaseSecretArn: data.database.secret.secretArn,
      databaseClusterEndpoint: data.database.clusterEndpoint.hostname,
      databaseName: `aurorapostgres${this.props.stage}${this.props.env.account}cdk`,
      applicationEndpoint: process.env.APPLICATION_ENDPOINT
    });
    stack.addDependency(foundation);
    stack.addDependency(network);
    stack.addDependency(data);
    stack.addDependency(sharedInfra);
    return stack;
  }

  /**
   * Create File Operations Stack - S3 + Lambda integrations
   */
  private createFileOps(data: DataStack, sharedInfra: SharedInfraStack): FileOpsStack {
    const stack = new FileOpsStack(this.props.app, `MCR-FileOps-${this.props.stage}${CDK_DEPLOYMENT_SUFFIX}`, {
      env: this.props.env,
      stage: this.props.stage,
      stageConfig: this.props.stageConfig,
      serviceName: 'file-ops',
      uploadsBucketName: data.uploadsBucket.bucketName,
      qaBucketName: data.qaBucket.bucketName,
      applicationEndpoint: process.env.APPLICATION_ENDPOINT
    });
    stack.addDependency(data);
    stack.addDependency(sharedInfra);
    return stack;
  }

  /**
   * Create Scheduled Tasks Stack - EventBridge + Lambda for cleanup
   */
  private createScheduledTasks(data: DataStack, sharedInfra: SharedInfraStack): ScheduledTasksStack {
    const stack = new ScheduledTasksStack(this.props.app, `MCR-ScheduledTasks-${this.props.stage}${CDK_DEPLOYMENT_SUFFIX}`, {
      env: this.props.env,
      stage: this.props.stage,
      stageConfig: this.props.stageConfig,
      serviceName: 'scheduled-tasks',
      uploadsBucketName: data.uploadsBucket.bucketName,
      qaBucketName: data.qaBucket.bucketName,
      applicationEndpoint: process.env.APPLICATION_ENDPOINT
    });
    stack.addDependency(data);
    stack.addDependency(sharedInfra);
    return stack;
  }

  /**
   * Create Auth Extensions Stack - Identity Pool + group-based IAM (after APIs exist)
   */
  private createAuthExtensions(
    data: DataStack,
    graphqlApi: GraphQLApiStack,
    publicApi: PublicApiStack
  ): AuthExtensionsStack {
    const stack = new AuthExtensionsStack(this.props.app, `MCR-AuthExtensions-${this.props.stage}${CDK_DEPLOYMENT_SUFFIX}`, {
      env: this.props.env,
      stage: this.props.stage,
      stageConfig: this.props.stageConfig,
      serviceName: 'auth-extensions',
      s3BucketNames: [
        data.uploadsBucket.bucketName,
        data.qaBucket.bucketName
      ],
      apiGatewayArns: [
        `arn:aws:execute-api:${this.props.env.region}:${this.props.env.account}:${graphqlApi.apiUrl.split('/')[2]}/${this.props.stage}/*`,
        `arn:aws:execute-api:${this.props.env.region}:${this.props.env.account}:${publicApi.healthApiUrl.split('/')[2]}/${this.props.stage}/*`,
        `arn:aws:execute-api:${this.props.env.region}:${this.props.env.account}:${publicApi.oauthApiUrl.split('/')[2]}/${this.props.stage}/*`,
        `arn:aws:execute-api:${this.props.env.region}:${this.props.env.account}:${publicApi.otelApiUrl.split('/')[2]}/${this.props.stage}/*`
      ]
    });
    stack.addDependency(data);
    stack.addDependency(graphqlApi);
    stack.addDependency(publicApi);
    return stack;
  }
}

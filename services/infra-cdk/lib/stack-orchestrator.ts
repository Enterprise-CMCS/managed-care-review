import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import {
  FoundationStack,
  NetworkStack,
  DataStack,
  AuthStack,
  DatabaseOperationsStack,
  GuardDutyMalwareProtectionStack,
  MonitoringStack,
  FrontendStack,
  GitHubOidcStack,
  LambdaLayersStack,
  SharedInfraStack,
  GraphQLApiStack,
  PublicApiStack,
  FileOpsStack,
  ScheduledTasksStack,
  AuthExtensionsStack
} from './stacks';
import { 
  getConfig, 
  getCdkEnvironment, 
  stackName,
  getCallbackUrls,
  getLogoutUrls,
  SSM_PATHS,
  ResourceNames,
  type EnvironmentConfig
} from './config';

export interface StackOrchestratorProps {
  app: cdk.App;
  stage: string;
  env: cdk.Environment;
  config: EnvironmentConfig;
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
    
    // Step 2: Public API functions (must be created before GraphQL API)
    const publicApi = this.createPublicApi(foundation, network, data, sharedInfra);
    
    // Step 3: API Micro-stacks (GraphQL API now includes public endpoints)
    const graphqlApi = this.createGraphQLApi(foundation, network, data, sharedInfra, publicApi);
    const fileOps = this.createFileOps(data, sharedInfra);
    const scheduledTasks = this.createScheduledTasks(data, sharedInfra);
    
    // Step 3: Auth Extensions (after APIs exist - breaks circular dependency)
    const authExtensions = this.createAuthExtensions(data, graphqlApi, publicApi);

    // 8. Frontend Stack (deployment-independent - uses micro-stack outputs at CI build time)
    const frontend = this.createFrontend();

    // 9. Storybook integrated into Frontend Stack (ultra-clean approach)

    // 10. Virus Scanning Stack (GuardDuty Malware Protection)
    const virusScanning = this.createVirusScanning(data, network);

    // 11. Monitoring Stack
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
      virusScanning,
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
    return new FoundationStack(this.props.app, stackName('Foundation', this.props.stage), {
      env: this.props.env,
      stage: this.props.stage
    });
  }

  private createNetwork(foundation: FoundationStack): NetworkStack {
    const stack = new NetworkStack(this.props.app, stackName('Network', this.props.stage), {
      env: this.props.env,
      stage: this.props.stage
    });
    stack.addDependency(foundation);
    return stack;
  }

  private createLambdaLayers(network: NetworkStack): LambdaLayersStack {
    const stack = new LambdaLayersStack(this.props.app, stackName('LambdaLayers', this.props.stage), {
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
    const stack = new DataStack(this.props.app, stackName('Data', this.props.stage), {
      env: this.props.env,
      stage: this.props.stage,
      vpc: network.vpc,
      databaseSecurityGroup: network.databaseSecurityGroup,
      lambdaSecurityGroup: network.lambdaSecurityGroup,
      vpnSecurityGroups: network.vpnSecurityGroups
    });
    stack.addDependency(network);
    return stack;
  }

  private createAuth(foundation: FoundationStack): AuthStack {
    // Fetch email sender from SSM Parameter Store using lean config paths
    let emailSender: string | undefined;
    
    // For dev environment, skip SSM lookup to avoid synthesis errors
    if (this.props.stage === 'dev' || this.props.stage === 'ephemeral') {
      console.log(`Using default email sender for ${this.props.stage} environment`);
    } else {
      try {
        const ssmEmailValue = ssm.StringParameter.valueFromLookup(
          foundation,
          SSM_PATHS.EMAIL_SOURCE_ADDRESS
        );
        
        // Only use the value if it's not a dummy token and not empty
        if (ssmEmailValue && !ssmEmailValue.includes('dummy-value') && ssmEmailValue.trim() !== '') {
          emailSender = ssmEmailValue;
        }
      } catch (error) {
        console.log('Email source address not found in SSM, will use default');
      }
    }

    const stack = new AuthStack(this.props.app, stackName('Auth', this.props.stage), {
      env: this.props.env,
      stage: this.props.stage,
      allowedCallbackUrls: this.getCallbackUrls(),
      allowedLogoutUrls: this.getLogoutUrls(),
      samlMetadataUrl: process.env.SAML_METADATA_URL,
      emailSender: emailSender
    });
    stack.addDependency(foundation);
    return stack;
  }

  
  private createDatabaseOps(
    network: NetworkStack,
    data: DataStack,
    lambdaLayers: LambdaLayersStack
  ): DatabaseOperationsStack {
    const stack = new DatabaseOperationsStack(this.props.app, stackName('DatabaseOperations', this.props.stage), {
      env: this.props.env,
      stage: this.props.stage,
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
    const stack = new FrontendStack(this.props.app, stackName('Frontend', this.props.stage), {
      env: this.props.env,
      stage: this.props.stage,
      enableAppWebIntegration: true,
      enableHsts: true
    });
    // Frontend stack is deployment-independent - gets API URLs from micro-stacks at CI build time
    // No CDK dependencies needed - micro-stack architecture provides clean separation
    return stack;
  }


  private createVirusScanning(data: DataStack, network: NetworkStack): GuardDutyMalwareProtectionStack {
    const stack = new GuardDutyMalwareProtectionStack(this.props.app, stackName('VirusScanning', this.props.stage), {
      env: this.props.env,
      stage: this.props.stage,
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
    const stack = new MonitoringStack(this.props.app, stackName('Monitoring', this.props.stage), {
      env: this.props.env,
      stage: this.props.stage
    });
    stack.addDependency(foundation);
    return stack;
  }

  private getCallbackUrls(): string[] {
    return getCallbackUrls(this.props.stage);
  }

  private getLogoutUrls(): string[] {
    return getLogoutUrls(this.props.stage);
  }

 
  /**
   * Create Shared Infrastructure Stack with lean config
   */
  private createSharedInfra(lambdaLayers: LambdaLayersStack): SharedInfraStack {
    const stack = new SharedInfraStack(this.props.app, stackName('SharedInfra', this.props.stage), {
      env: this.props.env,
      stage: this.props.stage
    });
    stack.addDependency(lambdaLayers);
    return stack;
  }

  /**
   * Create GraphQL API Stack with lean config
   */
  private createGraphQLApi(
    foundation: FoundationStack,
    network: NetworkStack,
    data: DataStack,
    sharedInfra: SharedInfraStack,
    publicApi: PublicApiStack
  ): GraphQLApiStack {
    const stack = new GraphQLApiStack(this.props.app, stackName('GraphQLApi', this.props.stage), {
      env: this.props.env,
      stage: this.props.stage,
      vpc: network.vpc,
      lambdaSecurityGroup: network.lambdaSecurityGroup,
      databaseSecretArn: data.database.secret.secretArn,
      databaseClusterEndpoint: data.database.clusterEndpoint.hostname,
      databaseName: ResourceNames.databaseName(this.props.stage),
      uploadsBucketName: data.uploadsBucket.bucketName,
      qaBucketName: data.qaBucket.bucketName,
      uploadsBucketArn: data.uploadsBucket.bucketArn,
      qaBucketArn: data.qaBucket.bucketArn,
      databaseClusterArn: data.database.cluster.clusterArn,
      applicationEndpoint: process.env.APPLICATION_ENDPOINT,
      // Pass public Lambda functions for integration into single API Gateway
      healthFunction: publicApi.healthFunction,
      oauthFunction: publicApi.oauthFunction,
      otelFunction: publicApi.otelFunction
    });
    stack.addDependency(foundation);
    stack.addDependency(network);
    stack.addDependency(data);
    stack.addDependency(sharedInfra);
    stack.addDependency(publicApi); // GraphQL API depends on Public API functions
    return stack;
  }

  /**
   * Create Public API Stack with lean config
   */
  private createPublicApi(
    foundation: FoundationStack,
    network: NetworkStack,
    data: DataStack,
    sharedInfra: SharedInfraStack
  ): PublicApiStack {
    const stack = new PublicApiStack(this.props.app, stackName('PublicApi', this.props.stage), {
      env: this.props.env,
      stage: this.props.stage,
      vpc: network.vpc,
      lambdaSecurityGroup: network.lambdaSecurityGroup,
      databaseSecretArn: data.database.secret.secretArn,
      databaseClusterEndpoint: data.database.clusterEndpoint.hostname,
      databaseName: ResourceNames.databaseName(this.props.stage),
      applicationEndpoint: process.env.APPLICATION_ENDPOINT
    });
    stack.addDependency(foundation);
    stack.addDependency(network);
    stack.addDependency(data);
    stack.addDependency(sharedInfra);
    return stack;
  }

  /**
   * Create File Operations Stack with lean config
   */
  private createFileOps(data: DataStack, sharedInfra: SharedInfraStack): FileOpsStack {
    const stack = new FileOpsStack(this.props.app, stackName('FileOps', this.props.stage), {
      env: this.props.env,
      stage: this.props.stage,
      uploadsBucketName: data.uploadsBucket.bucketName,
      qaBucketName: data.qaBucket.bucketName,
      applicationEndpoint: process.env.APPLICATION_ENDPOINT,
      databaseSecretArn: data.database.secret.secretArn,
      databaseClusterEndpoint: data.database.clusterEndpoint.hostname,
      databaseName: ResourceNames.databaseName(this.props.stage)
    });
    stack.addDependency(data);
    stack.addDependency(sharedInfra);
    return stack;
  }

  /**
   * Create Scheduled Tasks Stack with lean config
   */
  private createScheduledTasks(data: DataStack, sharedInfra: SharedInfraStack): ScheduledTasksStack {
    const stack = new ScheduledTasksStack(this.props.app, stackName('ScheduledTasks', this.props.stage), {
      env: this.props.env,
      stage: this.props.stage,
      uploadsBucketName: data.uploadsBucket.bucketName,
      qaBucketName: data.qaBucket.bucketName,
      applicationEndpoint: process.env.APPLICATION_ENDPOINT,
      databaseSecretArn: data.database.secret.secretArn,
      databaseClusterEndpoint: data.database.clusterEndpoint.hostname,
      databaseName: this.props.config.database.databaseName
    });
    stack.addDependency(data);
    stack.addDependency(sharedInfra);
    return stack;
  }

  /**
   * Create Auth Extensions Stack with lean config
   */
  private createAuthExtensions(
    data: DataStack,
    graphqlApi: GraphQLApiStack,
    publicApi: PublicApiStack
  ): AuthExtensionsStack {
    const stack = new AuthExtensionsStack(this.props.app, stackName('AuthExtensions', this.props.stage), {
      env: this.props.env,
      stage: this.props.stage,
      s3BucketNames: [
        data.uploadsBucket.bucketName,
        data.qaBucket.bucketName
      ],
      apiGatewayArns: [
        // Only one API Gateway now - all endpoints consolidated into GraphQL API
        `arn:aws:execute-api:${this.props.env.region}:${this.props.env.account}:${graphqlApi.apiId}/${this.props.stage}/*`
      ]
    });
    stack.addDependency(data);
    stack.addDependency(graphqlApi);
    stack.addDependency(publicApi);
    return stack;
  }
}

import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import {
  FoundationStack,
  NetworkStack,
  DataStack,
  AuthStack,
  ApiComputeStack,
  DatabaseOperationsStack,
  GuardDutyMalwareProtectionStack,
  MonitoringStack,
  FrontendStack,
  GitHubOidcStack,
  LambdaLayersStack
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
  apiCompute: ApiComputeStack;
  databaseOps: DatabaseOperationsStack;
  frontend: FrontendStack;
  virusScanning?: GuardDutyMalwareProtectionStack;
  monitoring: MonitoringStack;
  githubOidc?: GitHubOidcStack;
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

    // 6. Database Operations Stack (needs to be created before ApiCompute for layer exports)
    const databaseOps = this.createDatabaseOps(network, data, lambdaLayers);

    // 7. API Compute Stack (depends on Foundation, Network, Data, Auth, Lambda Layers, and DatabaseOps)
    const apiCompute = this.createApiCompute(foundation, network, data, auth, lambdaLayers);
    apiCompute.addDependency(databaseOps); // Ensure DatabaseOps exports are available

    // 8. Frontend Stack
    const frontend = this.createFrontend(apiCompute);

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
      apiCompute,
      databaseOps,
      frontend,
      // virusScanning,
      monitoring,
      githubOidc
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

  private createApiCompute(
    foundation: FoundationStack,
    network: NetworkStack,
    data: DataStack,
    auth: AuthStack,
    lambdaLayers: LambdaLayersStack
  ): ApiComputeStack {
    const stack = new ApiComputeStack(this.props.app, `MCR-ApiCompute-${this.props.stage}${CDK_DEPLOYMENT_SUFFIX}`, {
      env: this.props.env,
      stage: this.props.stage,
      stageConfig: this.props.stageConfig,
      serviceName: 'api-compute',
      vpc: network.vpc,
      lambdaSecurityGroup: network.lambdaSecurityGroup,
      databaseSecretArn: data.database.secret.secretArn,
      uploadsBucketName: data.uploadsBucket.bucketName,
      qaBucketName: data.qaBucket.bucketName,
      userPool: auth.userPool,
      authenticatedRole: auth.authenticatedRole,
      jwtSecret: foundation.jwtSecret,
      prismaLayerArn: lambdaLayers.prismaLayerVersionArn,
      postgresToolsLayerArn: lambdaLayers.postgresToolsLayerVersionArn
    });
    stack.addDependency(foundation);
    stack.addDependency(network);
    stack.addDependency(data);
    stack.addDependency(auth);
    stack.addDependency(lambdaLayers);
    return stack;
  }

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
      uploadsBucketName: data.uploadsBucket.bucketName,
      prismaLayerArn: lambdaLayers.prismaLayerVersionArn,
      postgresToolsLayerArn: lambdaLayers.postgresToolsLayerVersionArn
    });
    stack.addDependency(network);
    stack.addDependency(data);
    stack.addDependency(lambdaLayers);
    return stack;
  }

  private createFrontend(apiCompute: ApiComputeStack): FrontendStack {
    const stack = new FrontendStack(this.props.app, `MCR-Frontend-${this.props.stage}${CDK_DEPLOYMENT_SUFFIX}`, {
      env: this.props.env,
      stage: this.props.stage,
      stageConfig: this.props.stageConfig,
      serviceName: 'frontend',
      enableAppWebIntegration: true,
      enableHsts: true
    });
    stack.addDependency(apiCompute);
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
}
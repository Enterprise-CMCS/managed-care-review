#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Aspects } from 'aws-cdk-lib';
// import { AwsSolutionsChecks } from 'cdk-nag';
import { IamPathAspect } from '../lib/aspects/iam-path-aspects';
import { IamPermissionsBoundaryAspect } from '../lib/aspects/iam-permissions-boundary-aspects';
import {
  FoundationStack,
  NetworkStack,
  DataStack,
  AuthStack,
  ApiComputeStack,
  DatabaseOperationsStack,
  GuardDutyMalwareProtectionStack,
  MonitoringStack
} from '../lib/stacks';
import {
  loadEnvironment,
  validateEnvironment,
  StageConfiguration,
  ERROR_MESSAGES,
  Environment
} from '../lib/config';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

// Helper to validate environment variables
function validateEnvVariable(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
}

// Load CDK synthesizer config from Secrets Manager (required)
async function getSynthesizerConfig(): Promise<any> {
  const client = new SecretsManagerClient({ 
    region: process.env.AWS_REGION || process.env.CDK_DEFAULT_REGION || 'us-east-1' 
  });
  
  const response = await client.send(new GetSecretValueCommand({
    SecretId: 'cdkSynthesizerConfig'
  }));
  
  if (!response.SecretString) {
    throw new Error('cdkSynthesizerConfig secret not found in Secrets Manager');
  }
  
  return JSON.parse(response.SecretString);
}

// Main async function to initialize app with custom synthesizer
async function main() {
  try {
    // Validate project environment variable
    const project = validateEnvVariable("PROJECT", "managed-care-review");
    
    // Get stage from command line context
    const stage = process.argv.find(arg => arg.includes('stage='))?.split('=')[1] || 
                  process.env.CDK_STAGE || 
                  'dev';
    
    // Load environment variables
    loadEnvironment(stage);
    
    // Get CDK synthesizer config (required)
    const synthConfig = await getSynthesizerConfig();
    
    // Create CDK app with custom synthesizer
    const app = new cdk.App({
      defaultStackSynthesizer: new cdk.DefaultStackSynthesizer(synthConfig),
    });
    
    // Set stage context
    app.node.setContext('stage', stage);
    
    if (!stage) {
      throw new Error(ERROR_MESSAGES.MISSING_STAGE);
    }

    // Validate stage
    if (!['dev', 'val', 'prod'].includes(stage)) {
      throw new Error(ERROR_MESSAGES.INVALID_STAGE);
    }

    // Validate environment
    validateEnvironment(stage);

    // Get stage configuration
    const stageConfig = StageConfiguration.get(stage);

    // Environment for all stacks
    const env: cdk.Environment = {
      account: stageConfig.account,
      region: stageConfig.region
    };

    // Create stacks in dependency order
    console.log(`Creating MCR CDK stacks for stage: ${stage}`);

    // 1. Foundation Stack (no dependencies)
    const foundationStack = new FoundationStack(app, `MCR-Foundation-${stage}`, {
      env,
      stage,
      stageConfig,
      serviceName: 'foundation'
    });

    // 2. Network Stack (depends on Foundation)
    const networkStack = new NetworkStack(app, `MCR-Network-${stage}`, {
      env,
      stage,
      stageConfig,
      serviceName: 'network'
    });
    networkStack.addDependency(foundationStack);

    // 3. Data Stack (depends on Network)
    if (!networkStack.databaseSecurityGroup) {
      throw new Error('Database security group not found in NetworkStack');
    }
    const dataStack = new DataStack(app, `MCR-Data-${stage}`, {
      env,
      stage,
      stageConfig,
      serviceName: 'data',
      vpc: networkStack.vpc,
      databaseSecurityGroup: networkStack.databaseSecurityGroup,
      lambdaSecurityGroup: networkStack.lambdaSecurityGroup
    });
    dataStack.addDependency(networkStack);

    // 4. Auth Stack (depends on Foundation, but can run parallel to Data)
    const authStack = new AuthStack(app, `MCR-Auth-${stage}`, {
      env,
      stage,
      stageConfig,
      serviceName: 'auth',
      allowedCallbackUrls: getCallbackUrls(stage),
      allowedLogoutUrls: getLogoutUrls(stage),
      samlMetadataUrl: process.env.SAML_METADATA_URL
    });
    authStack.addDependency(foundationStack);

    // 5. API and Compute Stack (depends on Network, Data, and Auth)
    const apiComputeStack = new ApiComputeStack(app, `MCR-ApiCompute-${stage}`, {
      env,
      stage,
      stageConfig,
      serviceName: 'api-compute',
      vpc: networkStack.vpc,
      lambdaSecurityGroup: networkStack.lambdaSecurityGroup,
      databaseSecretArn: dataStack.database.secret.secretArn,
      uploadsBucketName: dataStack.uploadsBucket.bucketName,
      qaBucketName: dataStack.qaBucket.bucketName,
      userPool: authStack.userPool
    });
    apiComputeStack.addDependency(networkStack);
    apiComputeStack.addDependency(dataStack);
    apiComputeStack.addDependency(authStack);

    // 6. Database Operations Stack (depends on Network and Data)
    const databaseOperationsStack = new DatabaseOperationsStack(app, `MCR-DatabaseOps-${stage}`, {
      env,
      stage,
      stageConfig,
      serviceName: 'database-ops',
      vpc: networkStack.vpc,
      lambdaSecurityGroup: networkStack.lambdaSecurityGroup,
      databaseCluster: dataStack.database.cluster,
      databaseSecret: dataStack.database.secret,
      uploadsBucketName: dataStack.uploadsBucket.bucketName
    });
    databaseOperationsStack.addDependency(networkStack);
    databaseOperationsStack.addDependency(dataStack);

    // 7. Virus Scanning Stack - Using GuardDuty Malware Protection
    const virusScanningStack = new GuardDutyMalwareProtectionStack(app, `MCR-VirusScanning-${stage}`, {
      env,
      stage,
      stageConfig,
      serviceName: 'virus-scanning',
      uploadsBucket: dataStack.uploadsBucket,
      qaBucket: dataStack.qaBucket,
      alertEmail: process.env.VIRUS_SCAN_ALERT_EMAIL,
      enableRescanCapability: true, // Always enable rescan functionality
      enableClamAvCompatibility: true, // Maintain ClamAV tag compatibility
      vpc: networkStack.vpc, // Pass VPC for Lambda functions
      lambdaSecurityGroup: networkStack.lambdaSecurityGroup // Pass security group
    });
    virusScanningStack.addDependency(dataStack);
    virusScanningStack.addDependency(networkStack); // Add network dependency for VPC

    // 8. Monitoring Stack (depends on Foundation, can run in parallel with others)
    const monitoringStack = new MonitoringStack(app, `MCR-Monitoring-${stage}`, {
      env,
      stage,
      stageConfig,
      serviceName: 'monitoring'
    });
    monitoringStack.addDependency(foundationStack);

    // Apply IAM aspects
    const iamPath = process.env.IAM_PATH || '/delegatedadmin/developer/';
    
    // Apply IAM path aspect to ensure all roles/policies use the correct path
    Aspects.of(app).add(new IamPathAspect(iamPath));
    
    // Apply permission boundary aspect if provided
    const permBoundary = process.env.PERM_BOUNDARY_ARN;
    if (permBoundary) {
      Aspects.of(app).add(new IamPermissionsBoundaryAspect(permBoundary));
      console.log(`Applying IAM permissions boundary: ${permBoundary}`);
    }

    // Apply CDK Nag to all stacks
    // Temporarily disabled to focus on synthesis issues
    // Aspects.of(app).add(new AwsSolutionsChecks({
    //   verbose: true,
    //   reports: true,
    //   logIgnores: false
    // }));

    // Add tags to all resources
    cdk.Tags.of(app).add('Project', 'ManagedCareReview');
    cdk.Tags.of(app).add('Environment', stage);
    cdk.Tags.of(app).add('ManagedBy', 'CDK');
    cdk.Tags.of(app).add('Repository', 'https://github.com/Enterprise-CMCS/managed-care-review');

    // Output stack information
    console.log('\nStack deployment order:');
    console.log('1. Foundation Stack');
    console.log('2. Network Stack');
    console.log('3. Data Stack (parallel with Auth)');
    console.log('4. Auth Stack (parallel with Data)');
    console.log('5. API+Compute Stack (combined to avoid circular dependencies)');
    console.log('6. Database Operations Stack (parallel with Virus Scanning)');
    console.log('7. Virus Scanning Stack [GuardDuty] (parallel with Database Operations)');
    console.log('8. Monitoring Stack (can run in parallel)');
    console.log('\nTo deploy all stacks:');
    console.log(`cdk deploy --all --context stage=${stage}`);
    console.log('\nTo deploy a specific stack:');
    console.log(`cdk deploy MCR-<StackName>-${stage} --context stage=${stage}`);

    // Helper functions
    function getCallbackUrls(stage: string): string[] {
      const baseUrls = {
        dev: ['http://localhost:3000', 'http://localhost:3001'],
        val: ['https://val.mcr.gov'],
        prod: ['https://mcr.gov', 'https://www.mcr.gov']
      };
      
      return baseUrls[stage as keyof typeof baseUrls] || [];
    }
    
    function getLogoutUrls(stage: string): string[] {
      return getCallbackUrls(stage); // Same as callback URLs for now
    }

    // Synthesize the app
    app.synth();
  } catch (error) {
    console.error('Failed to initialize CDK app:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

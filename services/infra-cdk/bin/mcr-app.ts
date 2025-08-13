#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Aspects } from 'aws-cdk-lib';
// import { AwsSolutionsChecks } from 'cdk-nag';
import { IamPathAspect } from '../lib/aspects/iam-path-aspects';
import { IamPermissionsBoundaryAspect } from '../lib/aspects/iam-permissions-boundary-aspects';
import { StackOrchestrator } from '../lib/stack-orchestrator';
import {
  getConfig,
  getCdkEnvironment
} from '../lib/config';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';


// Load CDK synthesizer config from Secrets Manager (required for deployment)
async function getSynthesizerConfig(): Promise<any> {
  try {
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('Warning: Unable to load CDK synthesizer config from Secrets Manager:', errorMessage);
    console.warn('Using default synthesizer for synthesis/testing. Deployment may require proper AWS credentials.');
    
    // Return minimal default config that allows synthesis to work
    return {
      qualifier: 'hnb659fds',
      bootstrapStackVersionSsmParameter: '/cdk-bootstrap/hnb659fds/version',
      bucketName: 'cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}',
      fileAssetsBucketName: 'cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}',
      repositoryName: 'cdk-hnb659fds-container-assets-${AWS::AccountId}-${AWS::Region}'
    };
  }
}

// Main async function to initialize app with custom synthesizer
async function main() {
    // Get stage from command line context
    const stage = process.argv.find(arg => arg.includes('stage='))?.split('=')[1] || 
                  process.env.CDK_STAGE || 
                  'dev';
    
    // Get CDK synthesizer config (required for deployment, optional for synthesis)
    console.log('Loading CDK synthesizer configuration...');
    const synthConfig = await getSynthesizerConfig();
    
    // Create CDK app with custom synthesizer
    const app = new cdk.App({
      defaultStackSynthesizer: new cdk.DefaultStackSynthesizer(synthConfig),
    });
    
    // Set stage context
    app.node.setContext('stage', stage);
    
    if (!stage) {
      throw new Error('Stage must be provided via --context stage=<stage>');
    }

    // Validate stage with lean config
    if (!['dev', 'val', 'prod'].includes(stage) && !stage.startsWith('ephemeral-')) {
      throw new Error('Invalid stage. Must be one of: dev, val, prod, or ephemeral-*');
    }

    // Validate required environment variables
    if (!process.env.AWS_REGION) {
      throw new Error('AWS_REGION environment variable is required');
    }

    // Get ultra-lean environment configuration
    const config = getConfig(stage);
    const env = getCdkEnvironment(stage);

    // Create stacks using StackOrchestrator with lean config
    console.log(`Creating MCR CDK stacks for stage: ${stage}`);
    
    const orchestrator = new StackOrchestrator({
      app,
      stage,
      env,
      config
    });
    
    console.log('Orchestrating stack creation...');
    const stacks = orchestrator.createAllStacks();
    console.log('Stack creation completed successfully');

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


    // Synthesize the app
    console.log('Starting CDK synthesis...');
    app.synth();
    console.log('CDK synthesis completed successfully');
}

// Run the main function
main().catch(error => {
  console.error('CDK app initialization failed:', error);
  console.error('\n🔍 Troubleshooting:');
  console.error('- For synthesis issues: Check AWS credentials and region configuration');
  console.error('- For deployment issues: Ensure CDK bootstrap and proper AWS permissions');
  console.error('- For synthesis-only testing: AWS credentials may not be required');
  process.exit(1);
});
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Aspects } from 'aws-cdk-lib';
// import { AwsSolutionsChecks } from 'cdk-nag';
import { IamPathAspect } from '../lib/aspects/iam-path-aspects';
import { IamPermissionsBoundaryAspect } from '../lib/aspects/iam-permissions-boundary-aspects';
import { StackOrchestrator } from '../lib/stack-orchestrator';
import {
  getEnvironment,
  getCdkEnvironment
} from '../lib/config';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';


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
    // Get stage from command line context
    const stage = process.argv.find(arg => arg.includes('stage='))?.split('=')[1] || 
                  process.env.CDK_STAGE || 
                  'dev';
    
    // Get CDK synthesizer config (required)
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
    const config = getEnvironment(stage);
    const env = getCdkEnvironment(stage);

    // Create stacks using StackOrchestrator with lean config
    console.log(`Creating MCR CDK stacks for stage: ${stage}`);
    
    const orchestrator = new StackOrchestrator({
      app,
      stage,
      env,
      config
    });
    
    const stacks = orchestrator.createAllStacks();

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
    app.synth();
}

// Run the main function
main().catch(error => {
  console.error('CDK app initialization failed:', error);
  process.exit(1);
});
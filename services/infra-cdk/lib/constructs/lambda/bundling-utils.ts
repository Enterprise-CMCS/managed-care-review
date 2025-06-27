import { NodejsFunctionProps, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime, Architecture } from 'aws-cdk-lib/aws-lambda';
import { getEsbuildConfig, getBundlingCommandHooks, graphqlLoaderPlugin } from './esbuild-config';
import * as path from 'path';

/**
 * Get bundling configuration for a Lambda function
 */
export function getBundlingConfig(
  functionName: string,
  stage: string,
  architecture: Architecture = Architecture.X86_64
): NodejsFunctionProps['bundling'] {
  const esbuildConfig = getEsbuildConfig(stage);
  const projectRoot = path.join(__dirname, '..', '..', '..', '..', '..');
  
  // Merge command hooks from esbuild-config with additional workspace handling
  const baseCommandHooks = getBundlingCommandHooks(functionName);
  const commandHooks = {
    beforeInstall: (inputDir: string, outputDir: string): string[] => [
      // Copy pnpm-workspace.yaml to make pnpm aware of the real workspace
      `cp ${projectRoot}/pnpm-workspace.yaml ${outputDir}/pnpm-workspace.yaml`,
      ...(baseCommandHooks.beforeInstall ? baseCommandHooks.beforeInstall() : [])
    ],
    beforeBundling: baseCommandHooks.beforeBundling,
    afterBundling: baseCommandHooks.afterBundling,
  };
  
  return {
    minify: stage === 'prod',
    sourceMap: true,
    sourcesContent: false,
    target: 'node20',
    format: OutputFormat.CJS,
    mainFields: ['module', 'main'],
    // External modules - workspace packages will be bundled, not externalized
    externalModules: [
      '@aws-sdk/*',
      'aws-sdk',
      '@opentelemetry/*',
      'prisma',
      '@prisma/client',
      'canvas',
      'utf-8-validate',
      'bufferutil',
    ],
    esbuildArgs: {
      '--bundle': true,
      '--platform': 'node',
      '--keep-names': 'true',
      '--tree-shaking': 'true',
    },
    commandHooks,
    // Include only AWS SDK modules (workspace packages will be bundled)
    nodeModules: [
      '@aws-sdk/client-s3',
      '@aws-sdk/client-ses',
      '@aws-sdk/client-cognito-identity-provider',
      '@aws-sdk/client-secrets-manager',
      '@aws-sdk/client-ssm',
      '@aws-sdk/client-rds',
    ],
    // Environment variables for bundling
    environment: {
      NODE_ENV: stage === 'prod' ? 'production' : 'development',
      // Pass New Relic license key for collector.yml replacement
      ...(process.env.NR_LICENSE_KEY && { NR_LICENSE_KEY: process.env.NR_LICENSE_KEY }),
    },
    // Loader configuration - handled by esbuild
    loader: {
      '.graphql': 'text',
      '.gql': 'text',
      '.node': 'file',
    },
    // Use absolute path for Lambda-specific tsconfig
    tsconfig: path.join(projectRoot, 'services', 'infra-cdk', 'tsconfig.lambda.json'),
    // Force local bundling
    forceDockerBundling: false,
  };
}

/**
 * Check if a function needs Prisma layer
 */
export function needsPrismaLayer(functionName: string): boolean {
  const prismaFunctions = [
    'GRAPHQL',
    'CURRENT_USER',
    'GET_USERS',
    'UPDATE_USER_ROLE',
    'INDEX_RATES',
    'DELETE_RATE',
    'INDEX_STATE_SUBMISSION',
    'CREATE_QUESTION_RESPONSE',
    'SEND_REVIEW_ACTION_EMAILS',
    'SEND_EMAILS_FOR_CMS_RATE_REVIEWS',
    'EMAIL_SUBMIT',
    'OAUTH_TOKEN',
    'MIGRATE',
    'CLEANUP',
  ];
  
  return prismaFunctions.includes(functionName);
}

/**
 * Get runtime configuration based on architecture
 */
export function getLambdaRuntime(architecture: Architecture): Runtime {
  // Node.js 20.x is the latest LTS supported by Lambda
  return Runtime.NODEJS_20_X;
}
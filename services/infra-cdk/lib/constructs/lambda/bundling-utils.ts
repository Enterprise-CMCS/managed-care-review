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
    minify: true,
    sourceMap: true,
    sourcesContent: false,
    target: 'node20',
    format: OutputFormat.CJS,
    mainFields: ['module', 'main'],
    // External modules - scientific analysis shows these are the heaviest dependencies  
    externalModules: [
      // Prisma is provided by layers (matches esbuild.config.js exclude exactly)
      'prisma',
      '@prisma/client',
      
      // Heavy Apollo Server dependencies (identified from bundle analysis)
      'apollo-server-core',
      'apollo-server-lambda', 
      'apollo-server-types',
      
      // Heavy LaunchDarkly SDK (identified from bundle analysis)
      '@launchdarkly/node-server-sdk',
      
      // GraphQL utilities (identified from bundle analysis)
      'graphql-tag',
    ],
    esbuildArgs: {
      '--bundle': true,
      '--platform': 'node',
      '--keep-names': 'true',
      '--tree-shaking': 'true',
      '--drop:debugger': true,
      ...(stage === 'prod' && { '--drop:console': true })
    },
    commandHooks,
    // Don't include any node_modules - let CDK handle dependencies via externalModules
    // AWS SDK v3 is provided by Lambda runtime, no need to bundle it
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
 * Enum for Prisma layer types
 */
export enum PrismaLayerType {
  ENGINE = 'engine',
  MIGRATION = 'migration',
  NONE = 'none'
}

/**
 * Get which Prisma layer a function needs based on Serverless configuration
 * This exactly matches the layer usage in serverless.yml
 */
export function getPrismaLayerType(functionName: string): PrismaLayerType {
  // Functions that use PrismaClientEngine layer (from serverless.yml)
  const engineFunctions = [
    'OAUTH_TOKEN',
    'GRAPHQL',
    'AUDIT_FILES',
    'MIGRATE_DOCUMENT_ZIPS',
  ];
  
  // Functions that use PrismaClientMigration layer (from serverless.yml)
  const migrationFunctions = [
    'MIGRATE',
  ];
  
  if (engineFunctions.includes(functionName)) {
    return PrismaLayerType.ENGINE;
  }
  
  if (migrationFunctions.includes(functionName)) {
    return PrismaLayerType.MIGRATION;
  }
  
  return PrismaLayerType.NONE;
}

/**
 * Check if a function needs any Prisma layer (backwards compatibility)
 */
export function needsPrismaLayer(functionName: string): boolean {
  return getPrismaLayerType(functionName) !== PrismaLayerType.NONE;
}

/**
 * Get runtime configuration based on architecture
 */
export function getLambdaRuntime(architecture: Architecture): Runtime {
  // Node.js 20.x is the latest LTS supported by Lambda
  return Runtime.NODEJS_20_X;
}
import { BuildOptions, Plugin } from 'esbuild';
import * as path from 'path';
import * as fs from 'fs';

/**
 * GraphQL loader plugin for esbuild (sync version for CDK)
 */
export const graphqlLoaderPlugin: Plugin = {
  name: 'graphql-sync',
  setup(build) {
    build.onLoad({ filter: /\.(gql|graphql)$/ }, (args) => {
      const text = fs.readFileSync(args.path, 'utf8');
      return {
        contents: `export default \`${text}\`;`,
        loader: 'js',
      };
    });
  },
};

/**
 * Get ESBuild configuration for Lambda bundling
 * Matches the serverless-esbuild configuration
 */
export function getEsbuildConfig(stage: string): BuildOptions {
  return {
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs', // Use CommonJS to match serverless
    sourcemap: true,
    sourcesContent: false,
    external: [
      '@aws-sdk/*',
      'aws-sdk',
      '@opentelemetry/*',
      'prisma',
      '@prisma/client',
      // Native modules
      'canvas',
      'utf-8-validate',
      'bufferutil',
    ],
    mainFields: ['module', 'main'],
    metafile: true,
    minify: stage === 'prod',
    keepNames: true,
    plugins: [graphqlLoaderPlugin],
    loader: {
      '.node': 'file',
    },
    logLevel: 'warning',
  };
}

/**
 * Get command hooks for file copying during bundling
 */
export function getBundlingCommandHooks(functionName: string) {
  return {
    beforeBundling(inputDir: string, outputDir: string): string[] {
      const commands: string[] = [];
      
      // The preflight script ensures packages are built before CDK operations
      // No need to duplicate that logic here
      
      // For GRAPHQL function, copy the schema file
      if (functionName === 'GRAPHQL') {
        // The schema is in app-graphql service
        const schemaPath = path.join(inputDir, '..', '..', '..', 'app-graphql', 'src', 'schema.graphql');
        commands.push(
          `if [ -f "${schemaPath}" ]; then`,
          `  mkdir -p "${outputDir}/app-graphql/src"`,
          `  cp "${schemaPath}" "${outputDir}/app-graphql/src/"`,
          `fi`
        );
      }
      
      // For email functions, copy eta templates
      if (['EMAIL_SUBMIT', 'SEND_TEMPLATE_EMAIL', 'SEND_REVIEW_ACTION_EMAILS', 'SEND_EMAILS_FOR_CMS_RATE_REVIEWS'].includes(functionName)) {
        // Path from handler directory to emailer templates
        const templatesPath = path.join(inputDir, '..', 'emailer', 'etaTemplates');
        commands.push(
          `if [ -d "${templatesPath}" ]; then`,
          `  mkdir -p "${outputDir}/etaTemplates"`,
          `  cp -r "${templatesPath}"/* "${outputDir}/etaTemplates/"`,
          `fi`
        );
      }
      
      // For OTEL function, copy collector.yml
      if (functionName === 'OTEL') {
        const collectorPath = path.join(inputDir, '..', '..', 'collector.yml');
        commands.push(
          `if [ -f "${collectorPath}" ]; then`,
          `  cp "${collectorPath}" "${outputDir}/"`,
          `fi`
        );
      }
      
      return commands.length > 0 ? [commands.join(' && ')] : [];
    },
    
    afterBundling(inputDir: string, outputDir: string): string[] {
      const commands: string[] = [];
      
      // For OTEL function, replace license key in collector.yml
      if (functionName === 'OTEL') {
        commands.push(
          `if [ -f "${outputDir}/collector.yml" ] && [ -n "$NR_LICENSE_KEY" ]; then`,
          `  sed -i.bak "s/\\$NR_LICENSE_KEY/$NR_LICENSE_KEY/g" "${outputDir}/collector.yml"`,
          `  rm "${outputDir}/collector.yml.bak"`,
          `fi`
        );
      }
      
      return commands.length > 0 ? [commands.join(' && ')] : [];
    },
    
    beforeInstall(): string[] {
      return [];
    }
  };
}
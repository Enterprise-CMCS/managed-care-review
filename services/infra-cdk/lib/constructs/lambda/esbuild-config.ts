import { BuildOptions, Plugin } from 'esbuild';
import * as path from 'path';
import * as fs from 'fs';
const {
    generateGraphQLString,
    generateContentsFromGraphqlString,
} = require('@luckycatfactory/esbuild-graphql-loader');
const fse = require('fs-extra');

/**
 * GraphQL loader plugin for esbuild - matches serverless exactly
 * Uses same @luckycatfactory/esbuild-graphql-loader as serverless
 */
export const graphqlLoaderPlugin: Plugin = {
  name: 'graphql-loader',
  setup(build) {
    build.onLoad({ filter: /\.graphql$|\.gql$/ }, (args) =>
      generateGraphQLString(args.path).then(
        (graphqlString: string) => ({
          contents: generateContentsFromGraphqlString(graphqlString),
        })
      )
    );
  },
};

/**
 * Copy eta templates plugin - matches serverless exactly
 * Copies etaTemplates to src/handlers/etaTemplates/ structure
 */
export const copyEtaTemplatesPlugin: Plugin = {
  name: 'copy-eta-templates',
  setup(build) {
    build.onStart(async () => {
      try {
        await fse.ensureDir('.esbuild/.build/src/handlers/etaTemplates/');
      } catch (err) {
        console.error('Error making directory: ', err);
      }
    });

    build.onEnd(async () => {
      try {
        await fse.copy(
          './src/emailer/etaTemplates',
          '.esbuild/.build/src/handlers/etaTemplates/',
          { overwrite: true }
        );
        console.log('Eta templates copied successfully');
      } catch (err) {
        console.error('Error copying eta templates:', err);
      }
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
      // Match serverless esbuild.config.js exclude exactly
      'prisma',
      '@prisma/client',
      // AWS SDK and OTEL are provided by runtime/layers but don't need explicit exclusion
      // Let Lambda runtime and layers handle them naturally
    ],
    mainFields: ['module', 'main'],
    metafile: true,
    minify: stage === 'prod',
    keepNames: true,
    plugins: [graphqlLoaderPlugin, copyEtaTemplatesPlugin],
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
      
      // For email functions, copy eta templates - match serverless directory structure exactly
      if (['EMAIL_SUBMIT', 'SEND_TEMPLATE_EMAIL', 'SEND_REVIEW_ACTION_EMAILS', 'SEND_EMAILS_FOR_CMS_RATE_REVIEWS'].includes(functionName)) {
        // Path from handler directory to emailer templates
        const templatesPath = path.join(inputDir, '..', 'emailer', 'etaTemplates');
        commands.push(
          `if [ -d "${templatesPath}" ]; then`,
          // Match serverless structure: .esbuild/.build/src/handlers/etaTemplates/
          `  mkdir -p "${outputDir}/src/handlers/etaTemplates"`,
          `  cp -r "${templatesPath}"/* "${outputDir}/src/handlers/etaTemplates/"`,
          `fi`
        );
      }
      
      // Copy collector.yml for ALL functions that will have OTEL layer
      // This matches serverless behavior where collector.yml is bundled with all OTEL-enabled functions
      // Use CDK function names (not serverless names) to match LAMBDA_FUNCTIONS constant
      const functionsWithOtel = [
        'emailSubmit', 'oauthToken', 'health', 'thirdPartyApiAuthorizer', 'otel', 
        'graphql', 'migrate', 'migrateDocumentZips', 'zipKeys', 'cleanup', 'auditFiles'
      ];
      
      if (functionsWithOtel.includes(functionName)) {
        // Use app-api collector.yml as single source of truth (like serverless)
        const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
        const collectorPath = path.join(projectRoot, 'services', 'app-api', 'collector.yml');
        
        try {
          const collectorContent = fs.readFileSync(collectorPath, 'utf8');
          fs.writeFileSync(path.join(outputDir, 'collector.yml'), collectorContent);
        } catch {
          // Silent failure like serverless
        }
      }
      
      return commands.length > 0 ? [commands.join(' && ')] : [];
    },
    
    afterBundling(inputDir: string, outputDir: string): string[] {
      const commands: string[] = [];
      
      // Replace license key in collector.yml for ALL functions that have OTEL layer
      // This matches serverless behavior where NR_LICENSE_KEY is substituted during build
      // Use CDK function names (not serverless names) to match LAMBDA_FUNCTIONS constant
      const functionsWithOtel = [
        'emailSubmit', 'oauthToken', 'health', 'thirdPartyApiAuthorizer', 'otel', 
        'graphql', 'migrate', 'migrateDocumentZips', 'zipKeys', 'cleanup', 'auditFiles'
      ];
      
      if (functionsWithOtel.includes(functionName)) {
        // Replace license key in collector.yml (like serverless)
        try {
          const collectorFilePath = path.join(outputDir, 'collector.yml');
          let contents = fs.readFileSync(collectorFilePath, 'utf8');
          contents = contents.replace('$NR_LICENSE_KEY', process.env.NR_LICENSE_KEY || '');
          fs.writeFileSync(collectorFilePath, contents);
        } catch {
          // Silent failure like serverless
        }
      }
      
      return commands.length > 0 ? [commands.join(' && ')] : [];
    },
    
    beforeInstall(): string[] {
      return [];
    }
  };
}
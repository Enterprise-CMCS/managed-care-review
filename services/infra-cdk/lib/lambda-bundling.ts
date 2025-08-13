import { BundlingOptions } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

/**
 * Ultra-clean CDK-native bundling - No Docker, No Layers!
 * Each function bundles exactly what it needs
 */

// Functions that need Prisma - will bundle it directly
const PRISMA_FUNCTIONS = [
  'apollo_gql',           // GraphQL API
  'oauth_token',          // OAuth handler  
  'auditFiles',           // S3 audit with DB
  'migrate_document_zips',// Document migration
  'postgres_migrate',     // Database migrations
  'db_manager',           // Database management
  'db_export',            // Database export
  'db_import'             // Database import
];

/**
 * Get bundling configuration - 
 */
export function getBundlingConfig(
  functionName: string, 
  stage: string, 
  architecture: Architecture = Architecture.X86_64
): BundlingOptions {
  const basePath = path.join(__dirname, '..', '..', '..');
  
  // Determine if function needs Prisma
  const needsPrisma = PRISMA_FUNCTIONS.includes(functionName);
  
  return {
    // Mark Prisma as external for functions that need it (don't bundle, copy entire module)
    externalModules: needsPrisma 
      ? ['@prisma/client', '.prisma', '@aws-sdk/*'] 
      : ['prisma', '@prisma/client', '@aws-sdk/*'],
    minify: stage === 'prod',
    sourceMap: true,
    target: 'node20',
    mainFields: ['main', 'module'],
    loader: { 
      '.graphql': 'text', 
      '.gql': 'text', 
      '.eta': 'text',
      '.sql': 'text',
      '.prisma': 'file'
    },
    commandHooks: {
      beforeBundling: (inputDir: string, outputDir: string) => {
        const commands = [
          // MANDATORY: Copy collector.yml for OTEL (all functions)
          `cp ${basePath}/services/app-api/collector.yml ${outputDir}/ || (echo "ERROR: collector.yml is REQUIRED for OTEL" && exit 1)`,
          
          // Replace NR_LICENSE_KEY placeholder with actual value from SSM
          `if [ -f ${outputDir}/collector.yml ]; then ` +
          `  NR_KEY=$(aws ssm get-parameter --name /configuration/nr_license_key --with-decryption --query 'Parameter.Value' --output text 2>/dev/null || echo ""); ` +
          `  if [ ! -z "$NR_KEY" ]; then ` +
          `    sed -i.bak 's/\\$NR_LICENSE_KEY/'\"$NR_KEY\"'/g' ${outputDir}/collector.yml && rm ${outputDir}/collector.yml.bak && ` +
          `    echo "Successfully replaced NR_LICENSE_KEY in collector.yml"; ` +
          `  else ` +
          `    echo "Warning: Could not fetch NR_LICENSE_KEY from SSM - collector.yml will not work"; ` +
          `  fi; ` +
          `fi`
        ];
        
        // Copy eta templates if they exist
        commands.push(`mkdir -p ${outputDir}/src/handlers/etaTemplates && cp -r ${basePath}/services/app-api/src/emailer/etaTemplates/* ${outputDir}/src/handlers/etaTemplates/ 2>/dev/null || true`);
        
        // GraphQL-specific: schema file
        if (functionName === 'apollo_gql') {
          commands.push(`mkdir -p ${outputDir}/app-graphql/src && cp ${basePath}/services/app-graphql/src/schema.graphql ${outputDir}/app-graphql/src/ || echo "GraphQL schema not found"`);
        }
        
        // For functions that need Prisma, ensure it's generated
        if (needsPrisma) {
          commands.push(`cd ${basePath}/services/app-api && npx prisma generate --schema=./prisma/schema.prisma 2>/dev/null || echo "Prisma generation skipped - using existing"`);
        }
        
        return commands;
      },
      beforeInstall: () => [],
      afterBundling: (inputDir: string, outputDir: string) => {
        // Copy entire Prisma modules for functions that need them
        if (needsPrisma) {
          const pnpmPrismaPath = `${basePath}/node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules`;
          return [
            // Create node_modules directory
            `mkdir -p ${outputDir}/node_modules`,
            
            // Copy entire @prisma and .prisma modules from pnpm store
            `cp -r ${pnpmPrismaPath}/@prisma ${outputDir}/node_modules/ || echo "Warning: @prisma copy failed"`,
            `cp -r ${pnpmPrismaPath}/.prisma ${outputDir}/node_modules/ || echo "Warning: .prisma copy failed"`,
            
            // Verify the query engine is in place
            `ls -la ${outputDir}/node_modules/.prisma/client/*.node 2>/dev/null || echo "Verifying query engine copy"`,
            
            // For postgres_migrate, also copy the Prisma CLI binary and schema
            ...(functionName === 'postgres_migrate' ? [
              `mkdir -p ${outputDir}/opt/nodejs/node_modules`,
              `mkdir -p ${outputDir}/opt/nodejs/prisma`,
              `cp -r ${basePath}/node_modules/.pnpm/prisma@5.22.0/node_modules/prisma ${outputDir}/opt/nodejs/node_modules/ || echo "Warning: Prisma CLI copy failed"`,
              `cp ${basePath}/services/app-api/prisma/schema.prisma ${outputDir}/opt/nodejs/prisma/ || echo "Warning: Prisma schema copy failed"`,
              `echo "Prisma CLI binary and schema copied for migrations"`
            ] : []),
            
            `echo "Prisma modules copied to Lambda package"`
          ];
        }
        return [];
      }
    }
  };
}

// Clean exports for backward compatibility
export const graphqlBundling = (stage: string) => getBundlingConfig('apollo_gql', stage);
export const authBundling = (stage: string) => getBundlingConfig('third_party_API_authorizer', stage);
export const migrationBundling = (stage: string) => getBundlingConfig('postgres_migrate', stage);
export const defaultBundling = (stage: string) => getBundlingConfig('default', stage);
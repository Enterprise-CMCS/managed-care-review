import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { Stack } from 'aws-cdk-lib';

export interface PrismaLayerProps {
  /**
   * Layer name
   */
  layerName?: string;
  
  /**
   * Description for the layer
   */
  description?: string;
  
  /**
   * Compatible runtimes
   */
  compatibleRuntimes?: lambda.Runtime[];
}

/**
 * Prisma Layer construct that includes Prisma binaries
 * This helps keep Lambda bundle sizes small by sharing the Prisma engine
 */
export class PrismaLayer extends Construct {
  public readonly layerVersion: lambda.LayerVersion;
  
  constructor(scope: Construct, id: string, props?: PrismaLayerProps) {
    super(scope, id);
    
    const stage = Stack.of(this).node.tryGetContext('stage') || 'dev';
    
    // Create the layer
    this.layerVersion = new lambda.LayerVersion(this, 'PrismaEngineLayer', {
      layerVersionName: props?.layerName || `managed-care-review-prisma-${stage}`,
      description: props?.description || 'Shared Prisma engine binaries',
      compatibleRuntimes: props?.compatibleRuntimes || [
        lambda.Runtime.NODEJS_20_X,
      ],
      code: lambda.Code.fromAsset(path.join(__dirname, 'layers', 'prisma'), {
        bundling: {
          /* Docker image still required by the API, but will never be used */
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          
          local: {
            tryBundle(outputDir: string): boolean {
              const fs = require('fs-extra');
              const path = require('path');
              const { execSync } = require('child_process');
              
              try {
                /* 1️⃣ Create isolated build folder */
                const tempDir = path.join(outputDir, '..', 'prisma-build');
                fs.emptyDirSync(tempDir);
                
                /* 2️⃣ Minimal package.json prevents "npm init" bug */
                fs.writeJsonSync(path.join(tempDir, 'package.json'), {
                  name: 'prisma-layer-build-temp',
                  version: '1.0.0',
                  private: true
                });
                
                /* 3️⃣ Choose package manager consistently */
                const pm = fs.existsSync('/opt/homebrew/bin/pnpm') || // M-series Macs
                          fs.existsSync('/usr/local/bin/pnpm') ||
                          fs.existsSync('/usr/bin/pnpm')
                          ? 'pnpm' : 'npm';
                
                console.log(`📦 Using ${pm} for Prisma layer build`);
                
                /* 4️⃣ Install deterministic versions */
                const installCmd = pm === 'pnpm' 
                  ? `${pm} install --ignore-workspace prisma@5.17.0 @prisma/client@5.17.0`
                  : `${pm} install prisma@5.17.0 @prisma/client@5.17.0`;
                
                execSync(installCmd, {
                  cwd: tempDir,
                  stdio: 'inherit'
                });
                
                /* 5️⃣ Copy schema and generate client */
                const schemaPath = path.join(__dirname, 'layers', 'prisma', 'schema.prisma');
                if (fs.existsSync(schemaPath)) {
                  fs.copySync(schemaPath, path.join(tempDir, 'schema.prisma'));
                  execSync(`${pm} exec prisma generate`, {
                    cwd: tempDir,
                    stdio: 'inherit'
                  });
                }
                
                /* 5️⃣ Prune non-arm64 engines */
                // With pnpm, the actual packages are in .pnpm directory
                const pnpmDir = path.join(tempDir, 'node_modules', '.pnpm');
                if (fs.existsSync(pnpmDir)) {
                  // Find and prune engines in pnpm structure
                  execSync(
                    `find ${pnpmDir} -path "*/@prisma/engines/*" -type f ! -name "*linux-arm64*" -delete 2>/dev/null || true`,
                    { stdio: 'ignore' }
                  );
                  execSync(
                    `find ${pnpmDir} -path "*/.prisma/client/*" -type f ! -name "*linux-arm64*" -delete 2>/dev/null || true`,
                    { stdio: 'ignore' }
                  );
                }
                
                // Also check direct node_modules in case npm was used
                const enginesDir = path.join(tempDir, 'node_modules', '@prisma', 'engines');
                if (fs.existsSync(enginesDir)) {
                  execSync(
                    `find ${enginesDir} -type f ! -name "*linux-arm64*" -delete 2>/dev/null || true`,
                    { stdio: 'ignore' }
                  );
                }
                
                const prismaClientDir = path.join(tempDir, 'node_modules', '.prisma', 'client');
                if (fs.existsSync(prismaClientDir)) {
                  execSync(
                    `find ${prismaClientDir} -type f ! -name "*linux-arm64*" -delete 2>/dev/null || true`,
                    { stdio: 'ignore' }
                  );
                }
                
                /* 6️⃣ Copy into /asset-output/nodejs for the layer ZIP */
                fs.mkdirpSync(path.join(outputDir, 'nodejs'));
                fs.moveSync(
                  path.join(tempDir, 'node_modules'),
                  path.join(outputDir, 'nodejs', 'node_modules')
                );
                
                /* 7️⃣ Clean up build directory */
                fs.removeSync(tempDir);
                
                /* 8️⃣ Remove unnecessary files to reduce size */
                execSync(`find ${outputDir} -name "*.ts" -delete`, { stdio: 'ignore' });
                execSync(`find ${outputDir} -name "*.md" -delete`, { stdio: 'ignore' });
                execSync(`find ${outputDir} -name "test" -type d -exec rm -rf {} + 2>/dev/null || true`, { stdio: 'ignore' });
                execSync(`find ${outputDir} -name ".github" -type d -exec rm -rf {} + 2>/dev/null || true`, { stdio: 'ignore' });
                
                console.log('✅ Prisma layer built successfully (Docker-free)');
                return true; // Tell CDK "skip Docker"
                
              } catch (error: any) {
                console.error('❌ Prisma layer build failed:', error?.message || error);
                throw error; // Fail fast with clear error
              }
            }
          }
        },
      }),
    });
  }
  
  /**
   * Get environment variables needed for functions using this layer
   */
  public getEnvironment(): Record<string, string> {
    return {
      // Tell Prisma where to find the query engine
      PRISMA_QUERY_ENGINE_LIBRARY: '/opt/nodejs/node_modules/.prisma/client/libquery_engine-linux-arm64-openssl-3.0.x.so.node',
      // Enable source maps for better debugging
      NODE_OPTIONS: '--enable-source-maps',
    };
  }
}
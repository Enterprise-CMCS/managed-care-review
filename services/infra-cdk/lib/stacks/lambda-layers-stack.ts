import { Stack, StackProps, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { createHash } from 'crypto';
import * as fs from 'fs';
import { PrismaLayer } from '../constructs/lambda/prisma-layer';

export interface LambdaLayersStackProps extends StackProps {
  stage: string;
}

/**
 * Stack for managing Lambda layers with versioning
 * This centralizes layer management and allows for clean cross-stack references
 */
export class LambdaLayersStack extends Stack {
  public readonly prismaLayerVersionArn: string;
  public readonly prismaLayerVersion: lambda.LayerVersion;
  public readonly postgresToolsLayerVersionArn: string;
  public readonly postgresToolsLayerVersion: lambda.LayerVersion;

  constructor(scope: Construct, id: string, props: LambdaLayersStackProps) {
    super(scope, id, props);

    // Create Prisma layer with automatic versioning
    this.prismaLayerVersion = this.createPrismaLayer(props.stage);
    this.prismaLayerVersionArn = this.prismaLayerVersion.layerVersionArn;

    // Create PostgreSQL tools layer
    this.postgresToolsLayerVersion = this.createPostgresToolsLayer(props.stage);
    this.postgresToolsLayerVersionArn = this.postgresToolsLayerVersion.layerVersionArn;

    // Export ARNs for cross-stack reference
    new CfnOutput(this, 'PrismaLayerArn', {
      value: this.prismaLayerVersionArn,
      exportName: `${props.stage}-PrismaLayerArn`,
      description: 'ARN of the Prisma client layer'
    });

    new CfnOutput(this, 'PostgresToolsLayerArn', {
      value: this.postgresToolsLayerVersionArn,
      exportName: `${props.stage}-PostgresToolsLayerArn`,
      description: 'ARN of the PostgreSQL tools layer'
    });

    // Output layer metadata
    new CfnOutput(this, 'LayerMetadata', {
      value: JSON.stringify({
        prismaVersion: '5.17.0',
        runtime: 'nodejs20.x',
        architecture: 'x86_64',
        timestamp: new Date().toISOString()
      }),
      description: 'Layer build metadata'
    });
  }

  /**
   * Create Prisma layer using the PrismaLayer construct with local bundling
   */
  private createPrismaLayer(stage: string): lambda.LayerVersion {
    // Use the PrismaLayer construct which has local bundling implemented
    const prismaLayer = new PrismaLayer(this, 'PrismaLayer', {
      layerName: `mcr-prisma-${stage}`,
      description: `Prisma client layer - Built ${new Date().toISOString()}`,
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X]
    });
    
    return prismaLayer.layerVersion;
  }

  /**
   * Create PostgreSQL tools layer
   */
  private createPostgresToolsLayer(stage: string): lambda.LayerVersion {
    const layerHash = this.calculateLayerHash('postgres-tools');
    
    // Check if the postgres tools build script exists
    const buildScriptPath = path.join(__dirname, '../../lambda-layers-postgres-tools/build.sh');
    const layerPath = path.join(__dirname, '../../lambda-layers-postgres-tools');
    
    // If build script exists, use it; otherwise create a basic layer
    if (fs.existsSync(buildScriptPath)) {
      return new lambda.LayerVersion(this, 'PostgresToolsLayer', {
        layerVersionName: `mcr-postgres-tools-${stage}-${layerHash}`,
        description: `PostgreSQL tools layer - Built ${new Date().toISOString()}`,
        compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
        compatibleArchitectures: [lambda.Architecture.X86_64], // Match serverless - x86_64 only
        removalPolicy: RemovalPolicy.RETAIN,
        code: lambda.Code.fromAsset(layerPath),
      });
    }
    
    // Fallback: Create minimal postgres tools layer with local bundling
    return new lambda.LayerVersion(this, 'PostgresToolsLayer', {
      layerVersionName: `mcr-postgres-tools-${stage}-${layerHash}`,
      description: `PostgreSQL tools layer - Built ${new Date().toISOString()}`,
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      compatibleArchitectures: [lambda.Architecture.X86_64], // Match serverless - x86_64 only
      removalPolicy: RemovalPolicy.RETAIN,
      code: lambda.Code.fromAsset(path.join(__dirname, '../constructs/lambda/layers'), {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          local: {
            tryBundle(outputDir: string): boolean {
              const { execSync } = require('child_process');
              const fs = require('fs-extra');
              const path = require('path');
              
              try {
                // Create layer structure
                fs.ensureDirSync(path.join(outputDir, 'nodejs/node_modules'));
                
                // Create package.json
                const packageJson = {
                  name: 'postgres-tools-layer',
                  version: '1.0.0',
                  description: 'PostgreSQL client tools for Lambda',
                  dependencies: {
                    'pg': '^8.11.3',
                    'pg-format': '^1.0.4'
                  }
                };
                
                fs.writeJsonSync(path.join(outputDir, 'nodejs/package.json'), packageJson);
                
                // Install dependencies
                execSync('npm install --production', {
                  cwd: path.join(outputDir, 'nodejs'),
                  stdio: 'inherit'
                });
                
                // Create metadata
                fs.writeJsonSync(path.join(outputDir, 'layer-metadata.json'), {
                  postgres_version: 'node-pg-8.11.3',
                  tools: ['pg client library']
                });
                
                console.log('PostgreSQL tools layer built successfully with local bundling');
                return true;
              } catch (error) {
                console.error('Failed to build PostgreSQL tools layer locally:', error);
                return false;
              }
            }
          },
          // Docker command as fallback only
          command: [
            'bash', '-c', [
              'echo "Docker bundling should not be used - local bundling failed"',
              'exit 1'
            ].join(' && ')
          ],
        },
      }),
    });
  }

  /**
   * Calculate a hash for layer versioning based on dependencies
   */
  private calculateLayerHash(layerType: string): string {
    const content = `${layerType}-${new Date().toISOString().split('T')[0]}`;
    return createHash('md5').update(content).digest('hex').substring(0, 8);
  }

  /**
   * Get environment variables for functions using Prisma layer
   */
  public static getPrismaLayerEnvironment(): Record<string, string> {
    return {
      PRISMA_QUERY_ENGINE_LIBRARY: '/opt/nodejs/node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node',
      NODE_OPTIONS: '--enable-source-maps',
    };
  }

  /**
   * Get environment variables for functions using PostgreSQL tools
   */
  public static getPostgresToolsEnvironment(): Record<string, string> {
    return {
      PATH: '/opt/bin:/usr/local/bin:/usr/bin:/bin',
      LD_LIBRARY_PATH: '/opt/lib:$LD_LIBRARY_PATH',
    };
  }
}
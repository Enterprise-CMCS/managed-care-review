import { Stack, StackProps, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { createHash } from 'crypto';
import * as fs from 'fs';
import { ServiceRegistry } from '../constructs/base/service-registry';

export interface LambdaLayersStackProps extends StackProps {
  stage: string;
}

/**
 * Stack for managing Lambda layers with versioning
 * This centralizes layer management and allows for clean cross-stack references
 */
export class LambdaLayersStack extends Stack {
  public readonly prismaEngineLayerVersionArn: string;
  public readonly prismaEngineLayerVersion: lambda.LayerVersion;
  public readonly prismaMigrationLayerVersionArn: string;
  public readonly prismaMigrationLayerVersion: lambda.LayerVersion;
  public readonly postgresToolsLayerVersionArn: string;
  public readonly postgresToolsLayerVersion: lambda.LayerVersion;

  constructor(scope: Construct, id: string, props: LambdaLayersStackProps) {
    super(scope, id, props);

    // Create Prisma Engine layer with automatic versioning
    this.prismaEngineLayerVersion = this.createPrismaEngineLayer(props.stage);
    this.prismaEngineLayerVersionArn = this.prismaEngineLayerVersion.layerVersionArn;
    
    // Create Prisma Migration layer with automatic versioning
    this.prismaMigrationLayerVersion = this.createPrismaMigrationLayer(props.stage);
    this.prismaMigrationLayerVersionArn = this.prismaMigrationLayerVersion.layerVersionArn;

    // Create PostgreSQL tools layer
    this.postgresToolsLayerVersion = this.createPostgresToolsLayer(props.stage);
    this.postgresToolsLayerVersionArn = this.postgresToolsLayerVersion.layerVersionArn;

    // Store layer ARNs in SSM Parameter Store for cross-stack reference
    // This avoids CloudFormation export locks and enables flexible access
    ServiceRegistry.putLayerArn(this, props.stage, 'prisma-engine', this.prismaEngineLayerVersionArn);
    ServiceRegistry.putLayerArn(this, props.stage, 'prisma-migration', this.prismaMigrationLayerVersionArn);
    ServiceRegistry.putLayerArn(this, props.stage, 'postgres-tools', this.postgresToolsLayerVersionArn);

    // Export ARNs for cross-stack reference
    // NOTE: Commented out to avoid CloudFormation export lock issues
    // When using StackOrchestrator with direct prop passing, these exports are redundant
    // The GitHub Actions workflow uses CDK context parameters instead of exports
    
    // new CfnOutput(this, 'PrismaEngineLayerArn', {
    //   value: this.prismaEngineLayerVersionArn,
    //   exportName: `${props.stage}-PrismaEngineLayerArn`,
    //   description: 'ARN of the Prisma engine layer'
    // });
    
    // new CfnOutput(this, 'PrismaMigrationLayerArn', {
    //   value: this.prismaMigrationLayerVersionArn,
    //   exportName: `${props.stage}-PrismaMigrationLayerArn`,
    //   description: 'ARN of the Prisma migration layer'
    // });

    // new CfnOutput(this, 'PostgresToolsLayerArn', {
    //   value: this.postgresToolsLayerVersionArn,
    //   exportName: `${props.stage}-PostgresToolsLayerArn`,
    //   description: 'ARN of the PostgreSQL tools layer'
    // });

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
   * Create Prisma Engine layer with Lambda binaries
   */
  private createPrismaEngineLayer(stage: string): lambda.LayerVersion {
    const layerHash = this.calculateLayerHash('prisma-engine', stage);
    
    return new lambda.LayerVersion(this, 'PrismaEngineLayer', {
      layerVersionName: `mcr-prisma-engine-${stage}-${layerHash}`,
      description: `Prisma engine layer - Built ${new Date().toISOString()}`,
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      compatibleArchitectures: [lambda.Architecture.X86_64], // Match serverless - x86_64 only
      removalPolicy: RemovalPolicy.RETAIN,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-layers-prisma-client-engine')),
    });
  }
  
  /**
   * Create Prisma Migration layer with migration tools
   */
  private createPrismaMigrationLayer(stage: string): lambda.LayerVersion {
    const layerHash = this.calculateLayerHash('prisma-migration', stage);
    
    return new lambda.LayerVersion(this, 'PrismaMigrationLayer', {
      layerVersionName: `mcr-prisma-migration-${stage}-${layerHash}`,
      description: `Prisma migration layer - Built ${new Date().toISOString()}`,
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      compatibleArchitectures: [lambda.Architecture.X86_64], // Match serverless - x86_64 only
      removalPolicy: RemovalPolicy.RETAIN,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda-layers-prisma-client-migration')),
    });
  }

  /**
   * Create PostgreSQL tools layer
   */
  private createPostgresToolsLayer(stage: string): lambda.LayerVersion {
    const layerHash = this.calculateLayerHash('postgres-tools', stage);
    
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
   * Calculate a hash for layer versioning based on content
   * Hash changes only when functional layer content changes, not file timestamps
   */
  private calculateLayerHash(layerType: string, stage: string): string {
    const hashInputs: string[] = [
      layerType,
      '5.17.0',      // Prisma version
      'nodejs20.x',   // Runtime
      'x86_64'       // Architecture
    ];
    
    // Include build script CONTENT (not modification time)
    const buildScriptPath = path.join(__dirname, `../../${this.getLayerBuildPath(layerType)}/build.sh`);
    try {
      if (fs.existsSync(buildScriptPath)) {
        const scriptContent = fs.readFileSync(buildScriptPath, 'utf8');
        hashInputs.push(scriptContent);
        
        // Debug logging in dev mode
        if (stage === 'dev') {
          console.log(`Layer ${layerType}: Including build script content (${scriptContent.length} chars)`);
        }
      }
    } catch (error) {
      console.warn(`Layer hash: Could not read build script ${buildScriptPath}, skipping content hash`);
    }
    
    // For Prisma layers: include schema content (affects generated client)
    if (layerType.includes('prisma')) {
      const schemaPath = path.join(__dirname, '../../../app-api/prisma/schema.prisma');
      try {
        if (fs.existsSync(schemaPath)) {
          const schemaContent = fs.readFileSync(schemaPath, 'utf8');
          hashInputs.push(schemaContent);
          
          // Debug logging in dev mode  
          if (stage === 'dev') {
            console.log(`Layer ${layerType}: Including Prisma schema content (${schemaContent.length} chars)`);
          }
        }
      } catch (error) {
        console.warn(`Layer hash: Could not read Prisma schema ${schemaPath}, skipping schema hash`);
      }
    }
    
    // Create deterministic, content-only hash
    const combined = hashInputs.join('|');
    return createHash('md5').update(combined).digest('hex').substring(0, 8);
  }
  
  /**
   * Get the build path for a layer type
   */
  private getLayerBuildPath(layerType: string): string {
    const pathMap: Record<string, string> = {
      'prisma-engine': 'lambda-layers-prisma-client-engine',
      'prisma-migration': 'lambda-layers-prisma-client-migration',
      'postgres-tools': 'lambda-layers-postgres-tools'
    };
    return pathMap[layerType] || layerType;
  }

  /**
   * Get environment variables for functions using Prisma engine layer
   */
  public static getPrismaEngineLayerEnvironment(): Record<string, string> {
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
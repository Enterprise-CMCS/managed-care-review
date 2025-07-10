import { Stack, StackProps, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { createHash } from 'crypto';
import * as fs from 'fs';

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
        architecture: 'arm64',
        timestamp: new Date().toISOString()
      }),
      description: 'Layer build metadata'
    });
  }

  /**
   * Create Prisma layer with optimized bundling
   */
  private createPrismaLayer(stage: string): lambda.LayerVersion {
    const layerHash = this.calculateLayerHash('prisma');
    
    return new lambda.LayerVersion(this, 'PrismaLayer', {
      layerVersionName: `mcr-prisma-${stage}-${layerHash}`,
      description: `Prisma client layer v5.17.0 - Built ${new Date().toISOString()}`,
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      compatibleArchitectures: [lambda.Architecture.ARM_64],
      removalPolicy: RemovalPolicy.RETAIN,
      code: lambda.Code.fromAsset(path.join(__dirname, '../constructs/lambda/layers/prisma'), {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          command: [
            'bash', '-c', [
              // Install exact versions
              'npm install --no-save @prisma/client@5.17.0 prisma@5.17.0',
              
              // Set binary targets for ARM64
              'export PRISMA_CLI_BINARY_TARGETS=linux-arm64-openssl-3.0.x',
              
              // Generate Prisma client
              'npx prisma generate',
              
              // Remove all non-ARM64 binaries to minimize size
              'find node_modules/.prisma/client -type f ! -name "*linux-arm64*" -delete',
              'find node_modules/@prisma/engines -type f ! -name "*linux-arm64*" -delete',
              
              // Remove unnecessary files
              'find node_modules -name "*.ts" -delete',
              'find node_modules -name "*.map" -delete',
              'find node_modules -name "*.md" -delete',
              'find node_modules -name "test" -type d -exec rm -rf {} + 2>/dev/null || true',
              'find node_modules -name "tests" -type d -exec rm -rf {} + 2>/dev/null || true',
              'find node_modules -name "docs" -type d -exec rm -rf {} + 2>/dev/null || true',
              'find node_modules -name ".github" -type d -exec rm -rf {} + 2>/dev/null || true',
              
              // Copy to layer structure
              'mkdir -p /asset-output/nodejs',
              'cp -r node_modules /asset-output/nodejs/',
              
              // Create layer metadata
              'echo \'{"version":"5.17.0","runtime":"nodejs20.x","arch":"arm64"}\' > /asset-output/nodejs/layer-metadata.json',
              
              // Calculate final size
              'echo "Layer size: $(du -sh /asset-output | cut -f1)"'
            ].join(' && ')
          ],
          environment: {
            NPM_CONFIG_CACHE: '/tmp/npm-cache',
            PRISMA_CLI_BINARY_TARGETS: 'linux-arm64-openssl-3.0.x'
          },
        },
      }),
    });
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
        compatibleArchitectures: [lambda.Architecture.ARM_64],
        removalPolicy: RemovalPolicy.RETAIN,
        code: lambda.Code.fromAsset(layerPath),
      });
    }
    
    // Fallback: Create minimal postgres tools layer
    return new lambda.LayerVersion(this, 'PostgresToolsLayer', {
      layerVersionName: `mcr-postgres-tools-${stage}-${layerHash}`,
      description: `PostgreSQL tools layer - Built ${new Date().toISOString()}`,
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      compatibleArchitectures: [lambda.Architecture.ARM_64],
      removalPolicy: RemovalPolicy.RETAIN,
      code: lambda.Code.fromAsset(path.join(__dirname, '../constructs/lambda/layers'), {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          command: [
            'bash', '-c', [
              // Install postgres client libraries
              'yum install -y postgresql15 postgresql15-libs',
              
              // Create layer structure
              'mkdir -p /asset-output/bin',
              'cp /usr/bin/pg_dump /asset-output/bin/',
              'cp /usr/bin/pg_restore /asset-output/bin/',
              'cp /usr/bin/psql /asset-output/bin/',
              
              // Copy required libraries
              'mkdir -p /asset-output/lib',
              'cp -P /usr/lib64/libpq* /asset-output/lib/',
              'cp -P /usr/lib64/libssl* /asset-output/lib/',
              'cp -P /usr/lib64/libcrypto* /asset-output/lib/',
              
              // Make binaries executable
              'chmod +x /asset-output/bin/*',
              
              // Create metadata
              'echo \'{"postgres_version":"15","tools":["pg_dump","pg_restore","psql"]}\' > /asset-output/layer-metadata.json'
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
      PRISMA_QUERY_ENGINE_LIBRARY: '/opt/nodejs/node_modules/.prisma/client/libquery_engine-linux-arm64-openssl-3.0.x.so.node',
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
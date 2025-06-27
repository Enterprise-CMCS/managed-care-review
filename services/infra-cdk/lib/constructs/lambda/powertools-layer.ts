import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import { AssetHashType, BundlingOutput } from 'aws-cdk-lib';
import * as path from 'path';
import { ServiceRegistry } from '@constructs/base';

export interface PowertoolsLayerProps {
  stage: string;
  architecture?: Architecture;
  powerToolsVersion?: string;
}

/**
 * Lambda Layer containing AWS Lambda Powertools for TypeScript
 */
export class PowertoolsLayer extends Construct {
  public readonly layer: lambda.LayerVersion;

  constructor(scope: Construct, id: string, props: PowertoolsLayerProps) {
    super(scope, id);

    const architecture = props.architecture || Architecture.ARM_64;
    const powerToolsVersion = props.powerToolsVersion || '^2.2.0';

    // Create the layer
    this.layer = new lambda.LayerVersion(this, 'PowertoolsLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, 'powertools-layer'), {
        assetHashType: AssetHashType.OUTPUT,
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          command: [
            'bash', '-c', [
              'mkdir -p /asset-output/nodejs',
              'cd /asset-output/nodejs',
              // Create package.json for the layer
              `echo '${JSON.stringify({
                name: 'powertools-layer',
                version: '1.0.0',
                dependencies: {
                  '@aws-lambda-powertools/logger': powerToolsVersion,
                  '@aws-lambda-powertools/metrics': powerToolsVersion,
                  '@aws-lambda-powertools/tracer': powerToolsVersion,
                  '@aws-lambda-powertools/commons': powerToolsVersion
                }
              }, null, 2)}' > package.json`,
              // Install dependencies
              'npm install --production',
              // Clean up
              'rm -rf package.json package-lock.json',
              // Verify installation
              'ls -la'
            ].join(' && ')
          ],
          outputType: BundlingOutput.AUTO_DISCOVER,
          environment: {
            npm_config_cache: '/tmp/.npm'
          }
        }
      }),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      compatibleArchitectures: [architecture],
      description: `Lambda Powertools for TypeScript - ${props.stage}`,
      layerVersionName: `mcr-${props.stage}-powertools`
    });

    // Store layer ARN in Parameter Store for other stacks to use
    ServiceRegistry.putLayerArn(this, props.stage, 'powertools', this.layer.layerVersionArn);
  }

  /**
   * Get the layer from Parameter Store (for use in other stacks)
   */
  static fromParameterStore(scope: Construct, id: string, stage: string): lambda.ILayerVersion {
    const arn = ServiceRegistry.getLayerArn(scope, stage, 'powertools');
    return lambda.LayerVersion.fromLayerVersionArn(scope, id, arn);
  }
}

import { Stack, StackProps } from 'aws-cdk-lib';
import { stackName, ResourceNames, SSM_PATHS } from '../config';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ssm from 'aws-cdk-lib/aws-ssm';

/**
 * Shared infrastructure stack - simplified
 * Note: Consider removing this stack entirely if only importing layers
 * Other stacks can read from SSM directly
 */
export class SharedInfraStack extends Stack {
  public otelLayer: lambda.ILayerVersion;

  constructor(scope: Construct, id: string, props: StackProps & { stage: string }) {
    super(scope, id, {
      ...props,
      stackName: stackName('SharedInfra', props.stage),
      description: 'Shared infrastructure components'
    });

    // Import layers from SSM (created by LambdaLayersStack)
    const otelLayerArn = ssm.StringParameter.valueForStringParameter(
      this,
      ResourceNames.ssmPath(SSM_PATHS.OTEL_LAYER, props.stage)
    );
    this.otelLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'OtelLayer',
      otelLayerArn
    );
  }
}

import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { ServiceRegistry } from '@constructs/base';
import { OTEL_LAYER_ARN } from '@config/constants';

export interface OtelLayerProps {
  stage: string;
}

/**
 * Lambda Layer containing AWS OpenTelemetry collector and libraries
 * Uses x86_64 architecture only (matches serverless configuration)
 */
export class OtelLayer extends Construct {
  public readonly layer: lambda.ILayerVersion;

  constructor(scope: Construct, id: string, props: OtelLayerProps) {
    super(scope, id);

    // Use the AWS-managed OpenTelemetry layer (x86_64 only)
    // This layer includes the OTEL collector and instrumentation libraries
    this.layer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'AwsOtelLayer',
      OTEL_LAYER_ARN
    );

    // Store layer ARN in Parameter Store for other stacks to use
    ServiceRegistry.putLayerArn(this, props.stage, 'otel', OTEL_LAYER_ARN);
  }

  /**
   * Get the layer from Parameter Store (for use in other stacks)
   */
  static fromParameterStore(scope: Construct, id: string, stage: string): lambda.ILayerVersion {
    const arn = ServiceRegistry.getLayerArn(scope, stage, 'otel');
    return lambda.LayerVersion.fromLayerVersionArn(scope, id, arn);
  }
}
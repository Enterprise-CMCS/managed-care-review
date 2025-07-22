import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Architecture } from 'aws-cdk-lib/aws-lambda';
import { ServiceRegistry } from '@constructs/base';
import { getOtelLayerArn } from '@config/constants';

export interface OtelLayerProps {
  stage: string;
  architecture?: Architecture;
}

/**
 * Lambda Layer containing AWS OpenTelemetry collector and libraries
 */
export class OtelLayer extends Construct {
  public readonly layer: lambda.ILayerVersion;

  constructor(scope: Construct, id: string, props: OtelLayerProps) {
    super(scope, id);

    const architecture = props.architecture || Architecture.X86_64; // Match serverless - x86_64 only

    // Use the AWS-managed OpenTelemetry layer
    // This layer includes the OTEL collector and instrumentation libraries
    const layerArn = this.getAwsOtelLayerArn(props.stage, architecture);

    this.layer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'AwsOtelLayer',
      layerArn
    );

    // Store layer ARN in Parameter Store for other stacks to use
    ServiceRegistry.putLayerArn(this, props.stage, 'otel', layerArn);
  }

  /**
   * Get the AWS-managed OpenTelemetry layer ARN for the specified architecture
   */
  private getAwsOtelLayerArn(stage: string, architecture: Architecture): string {
    // AWS-managed OpenTelemetry layer ARNs
    // These are the official AWS layers that include the OTEL collector
    const archType = architecture === Architecture.ARM_64 ? 'arm64' : 'x86_64';
    return getOtelLayerArn(archType);
  }

  /**
   * Get the layer from Parameter Store (for use in other stacks)
   */
  static fromParameterStore(scope: Construct, id: string, stage: string): lambda.ILayerVersion {
    const arn = ServiceRegistry.getLayerArn(scope, stage, 'otel');
    return lambda.LayerVersion.fromLayerVersionArn(scope, id, arn);
  }
}
import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import * as path from 'path';

export interface LambdaLayersStackProps extends StackProps {
  stage: string;
}

/**
 * Ultra-clean Lambda Layers Stack - No Docker Required!
 * Only provides AWS managed OTEL layer
 * Prisma is bundled directly into functions that need it
 */
export class LambdaLayersStack extends Stack {
  public readonly otelLayer: lambda.ILayerVersion;

  constructor(scope: Construct, id: string, props: LambdaLayersStackProps) {
    super(scope, id, props);

    const { stage } = props;

    // AWS Managed OpenTelemetry Layer - No build required!
    this.otelLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'OtelLayer',
      'arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4'
    );

    // Store OTEL layer ARN in SSM for cross-stack reference
    new ssm.StringParameter(this, 'OtelLayerArnParameter', {
      parameterName: `/mcr-cdk-${stage}/layers/otel/arn`,
      stringValue: this.otelLayer.layerVersionArn,
      description: 'OTEL Layer ARN'
    });
  }
}
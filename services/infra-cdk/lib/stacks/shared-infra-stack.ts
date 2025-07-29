import { BaseStack, BaseStackProps, ServiceRegistry } from '@constructs/base';
import { OtelLayer } from '@constructs/lambda';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { CfnOutput } from 'aws-cdk-lib';
import { SSM_PATHS, ResourceNames } from '../config';

/**
 * Shared infrastructure stack - provides common components for other stacks
 * Eliminates the need for complex factory patterns
 */
export class SharedInfraStack extends BaseStack {
  public otelLayer: lambda.ILayerVersion;
  public prismaEngineLayer: lambda.ILayerVersion;
  public prismaMigrationLayer: lambda.ILayerVersion;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, {
      ...props,
      description: 'Shared infrastructure components - OTEL layer, Prisma layers, common environment'
    });

    this.defineResources();
  }

  protected defineResources(): void {
    // Create OTEL layer
    const otelConstruct = new OtelLayer(this, 'Otel', {
      stage: this.stage
    });
    this.otelLayer = otelConstruct.layer;

    // Import Prisma layers from SSM (created by LambdaLayersStack)
    const prismaEngineLayerArn = ServiceRegistry.getLayerArn(this, this.stage, 'prisma-engine');
    this.prismaEngineLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'ImportedPrismaEngineLayer',
      prismaEngineLayerArn
    );

    const prismaMigrationLayerArn = ServiceRegistry.getLayerArn(this, this.stage, 'prisma-migration');
    this.prismaMigrationLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'ImportedPrismaMigrationLayer',
      prismaMigrationLayerArn
    );

    // Store common environment variables in SSM for other stacks
    this.storeCommonEnvironment();

    // Create outputs
    this.createOutputs();
  }

  /**
   * Store common environment variables in SSM Parameter Store using lean config paths (conflict-free)
   */
  private storeCommonEnvironment(): void {
    // Store OTEL layer ARN for other stacks to reference
    new ssm.StringParameter(this, 'OtelLayerArnParameter', {
      parameterName: ResourceNames.ssmPath(SSM_PATHS.OTEL_LAYER, this.stage),
      stringValue: this.otelLayer.layerVersionArn,
      description: 'OTEL Layer ARN for Lambda functions'
    });

    // Store Prisma layer ARNs for other stacks to reference
    new ssm.StringParameter(this, 'PrismaEngineLayerArnParameter', {
      parameterName: ResourceNames.ssmPath(SSM_PATHS.PRISMA_ENGINE_LAYER, this.stage),
      stringValue: this.prismaEngineLayer.layerVersionArn,
      description: 'Prisma Engine Layer ARN for Lambda functions'
    });

    new ssm.StringParameter(this, 'PrismaMigrationLayerArnParameter', {
      parameterName: ResourceNames.ssmPath(SSM_PATHS.PRISMA_MIGRATION_LAYER, this.stage),
      stringValue: this.prismaMigrationLayer.layerVersionArn,
      description: 'Prisma Migration Layer ARN for Lambda functions'
    });
  }

  /**
   * Create stack outputs
   */
  private createOutputs(): void {
    new CfnOutput(this, 'OtelLayerArn', {
      value: this.otelLayer.layerVersionArn,
      description: 'OTEL Layer ARN'
    });

    new CfnOutput(this, 'PrismaEngineLayerArn', {
      value: this.prismaEngineLayer.layerVersionArn,
      description: 'Prisma Engine Layer ARN'
    });

    new CfnOutput(this, 'PrismaMigrationLayerArn', {
      value: this.prismaMigrationLayer.layerVersionArn,
      description: 'Prisma Migration Layer ARN'
    });
  }
}
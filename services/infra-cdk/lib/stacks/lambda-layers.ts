import { BaseStack, type BaseStackProps } from '../constructs/base'
import type { Construct } from 'constructs'
import {
    LayerVersion,
    Runtime,
    Architecture,
    Code,
} from 'aws-cdk-lib/aws-lambda'
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib'
import { join } from 'path'

// AWS OTEL Lambda Layer ARN - update version here when needed
export const AWS_OTEL_LAYER_ARN =
    'arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:4'

export interface LambdaLayersProps extends BaseStackProps {
    // No additional props needed - layers are built from local directories
}

/**
 * Lambda Layers stack - Creates and exports layer ARNs for cross-stack reference
 * Uses pre-built layer artifacts from GitHub CI build process
 * Follows same CloudFormation export pattern as other CDK stacks
 */
export class LambdaLayers extends BaseStack {
    public readonly prismaMigrationLayer: LayerVersion
    public readonly prismaEngineLayer: LayerVersion

    constructor(scope: Construct, id: string, props: LambdaLayersProps) {
        super(scope, id, {
            ...props,
            description:
                'Lambda Layers for Managed Care Review - Prisma migration and engine layers',
        })

        // Create layers from pre-built artifacts
        this.prismaMigrationLayer = this.createPrismaMigrationLayer()
        this.prismaEngineLayer = this.createPrismaEngineLayer()

        // Create CloudFormation exports (matches other CDK stacks pattern)
        this.createOutputs()
    }

    /**
     * Create Prisma Migration layer from CI-built artifacts
     * Contains Prisma CLI, migration tools, schema files, and data migrations
     */
    private createPrismaMigrationLayer(): LayerVersion {
        return new LayerVersion(this, 'PrismaMigrationLayer', {
            layerVersionName: `mcr-prisma-migration-${this.stage}-layer`,
            description: 'Prisma migration layer with CLI and migration tools',
            compatibleRuntimes: [Runtime.NODEJS_20_X],
            compatibleArchitectures: [Architecture.X86_64],
            removalPolicy: RemovalPolicy.RETAIN,
            code: Code.fromAsset(
                join(
                    __dirname,
                    '..',
                    '..',
                    'lambda-layers-prisma-client-migration'
                )
            ),
        })
    }

    /**
     * Create Prisma Engine layer from CI-built artifacts
     * Contains Prisma client and query engines for runtime operations
     */
    private createPrismaEngineLayer(): LayerVersion {
        return new LayerVersion(this, 'PrismaEngineLayer', {
            layerVersionName: `mcr-prisma-engine-${this.stage}-layer`,
            description: 'Prisma engine layer with query engines',
            compatibleRuntimes: [Runtime.NODEJS_20_X],
            compatibleArchitectures: [Architecture.X86_64],
            removalPolicy: RemovalPolicy.RETAIN,
            code: Code.fromAsset(
                join(
                    __dirname,
                    '..',
                    '..',
                    'lambda-layers-prisma-client-engine'
                )
            ),
        })
    }

    /**
     * Create CloudFormation exports matching other CDK stacks pattern
     */
    private createOutputs(): void {
        new CfnOutput(this, 'PrismaMigrationLayerArn', {
            value: this.prismaMigrationLayer.layerVersionArn,
            exportName: this.exportName('PrismaMigrationLayerArn'),
            description: 'Prisma migration layer ARN',
        })

        new CfnOutput(this, 'PrismaEngineLayerArn', {
            value: this.prismaEngineLayer.layerVersionArn,
            exportName: this.exportName('PrismaEngineLayerArn'),
            description: 'Prisma engine layer ARN',
        })
    }
}

import {
    type NodejsFunctionProps,
    OutputFormat,
} from 'aws-cdk-lib/aws-lambda-nodejs'

/**
 * Get minimal CDK bundling configuration for app-api functions
 * Uses CDK defaults with just the essentials
 * CDK handles .graphql and .ts files automatically
 */
export function getAppApiLambdaConfig(
    functionName: string,
    stage: string
): NodejsFunctionProps['bundling'] {
    return {
        externalModules: [
            'prisma',
            '@prisma/client', // These come from Lambda layers
        ],
        minify: stage === 'prod',
        sourceMap: true,
        target: 'node20',
        format: OutputFormat.CJS,

        // Keep bundling local to avoid Docker overhead
        forceDockerBundling: false,
    }
}

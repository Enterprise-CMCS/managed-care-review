import { BaseStack, type BaseStackProps } from '../constructs/base/base-stack'
import { type Construct } from 'constructs'
import { type IBucket } from 'aws-cdk-lib/aws-s3'
import { type IDistribution } from 'aws-cdk-lib/aws-cloudfront'
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment'

export interface FrontendAppStackProps extends BaseStackProps {
    /**
     * Main app S3 bucket (from frontend-infra stack)
     */
    mainAppBucket: IBucket

    /**
     * Main app CloudFront distribution (from frontend-infra stack)
     */
    mainAppDistribution: IDistribution

    /**
     * Storybook S3 bucket (from frontend-infra stack)
     */
    storybookBucket: IBucket

    /**
     * Storybook CloudFront distribution (from frontend-infra stack)
     */
    storybookDistribution: IDistribution
}

/**
 * Frontend app stack - deploys built React app and Storybook to S3 buckets
 * Depends on frontend-infra stack for infrastructure resources
 */
export class FrontendAppStack extends BaseStack {
    constructor(scope: Construct, id: string, props: FrontendAppStackProps) {
        super(scope, id, {
            ...props,
            description:
                'Frontend app deployment - deploys React app and Storybook to S3 with CloudFront invalidation',
        })

        // Deploy main React app (matches app-web serverless s3Sync to ui bucket)
        new BucketDeployment(this, 'MainAppDeployment', {
            sources: [Source.asset('../app-web/build')],
            destinationBucket: props.mainAppBucket,
            distribution: props.mainAppDistribution,
            distributionPaths: ['/*'],
        })

        // Deploy storybook (matches app-web serverless s3Sync to storybook bucket)
        new BucketDeployment(this, 'StorybookDeployment', {
            sources: [Source.asset('../app-web/storybook-static')],
            destinationBucket: props.storybookBucket,
            distribution: props.storybookDistribution,
            distributionPaths: ['/*'],
        })
    }
}

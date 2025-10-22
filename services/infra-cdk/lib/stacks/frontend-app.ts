import { BaseStack, type BaseStackProps } from '../constructs/base/base-stack'
import { type Construct } from 'constructs'
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment'
import { Bucket } from 'aws-cdk-lib/aws-s3'
import { Distribution } from 'aws-cdk-lib/aws-cloudfront'
import { Fn } from 'aws-cdk-lib'

/**
 * Frontend app stack - deploys built React app and Storybook to S3 buckets
 * Depends on frontend-infra stack for infrastructure resources
 */
export class FrontendAppStack extends BaseStack {
    constructor(scope: Construct, id: string, props: BaseStackProps) {
        super(scope, id, {
            ...props,
            description:
                'Frontend app deployment - deploys React app and Storybook to S3 with CloudFront invalidation',
        })

        // Import infrastructure resources from frontend-infra stack using CloudFormation exports
        const frontendInfraStackName = `frontend-infra-${props.stage}-cdk`

        // Import main app bucket
        const mainAppBucket = Bucket.fromBucketName(
            this,
            'ImportedMainAppBucket',
            Fn.importValue(`${frontendInfraStackName}-S3BucketName`)
        )

        // Import storybook bucket
        const storybookBucket = Bucket.fromBucketName(
            this,
            'ImportedStorybookBucket',
            Fn.importValue(`${frontendInfraStackName}-StorybookS3BucketName`)
        )

        // Import main app distribution
        const mainAppDistribution = Distribution.fromDistributionAttributes(
            this,
            'ImportedMainAppDistribution',
            {
                distributionId: Fn.importValue(
                    `${frontendInfraStackName}-CloudFrontDistributionId`
                ),
                domainName: Fn.importValue(
                    `${frontendInfraStackName}-CloudFrontEndpointUrl`
                ).replace('https://', ''),
            }
        )

        // Import storybook distribution
        const storybookDistribution = Distribution.fromDistributionAttributes(
            this,
            'ImportedStorybookDistribution',
            {
                distributionId: Fn.importValue(
                    `${frontendInfraStackName}-StorybookCloudFrontDistributionId`
                ),
                domainName: Fn.importValue(
                    `${frontendInfraStackName}-StorybookCloudFrontEndpointUrl`
                ).replace('https://', ''),
            }
        )

        // Deploy main React app (matches app-web serverless s3Sync to ui bucket)
        new BucketDeployment(this, 'MainAppDeployment', {
            sources: [Source.asset('../app-web/build')],
            destinationBucket: mainAppBucket,
            distribution: mainAppDistribution,
            distributionPaths: ['/*'],
        })

        // Deploy storybook (matches app-web serverless s3Sync to storybook bucket)
        new BucketDeployment(this, 'StorybookDeployment', {
            sources: [Source.asset('../app-web/storybook-static')],
            destinationBucket: storybookBucket,
            distribution: storybookDistribution,
            distributionPaths: ['/*'],
        })
    }
}

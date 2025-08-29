#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'
import { AppConfigLoader } from '../lib/config/app'
import { SynthesizerConfigLoader } from '../lib/config/synthesizer'
import { Aspects } from 'aws-cdk-lib'
import { IamPathAspect } from '../lib/aspects/iam-path-aspects'
import { IamPermissionsBoundaryAspect } from '../lib/aspects/iam-permissions-boundary-aspects'
import { getEnvironment, getCdkEnvironment, ResourceNames } from '../lib/config'
import { FrontendAppStack } from '../lib/stacks/frontend-app'
import { Bucket } from 'aws-cdk-lib/aws-s3'
import { Distribution } from 'aws-cdk-lib/aws-cloudfront'

async function main(): Promise<void> {
    try {
        // Load configuration (matches postgres.ts pattern)
        const appConfig = AppConfigLoader.load()
        const synthesizerLoader = new SynthesizerConfigLoader(
            appConfig.awsRegion
        )
        const synthConfig = await synthesizerLoader.load()

        // Create CDK app
        const app = new cdk.App({
            defaultStackSynthesizer: new cdk.DefaultStackSynthesizer(
                synthConfig
            ),
        })

        // Set stage context
        app.node.setContext('stage', appConfig.stage)

        // Get environment config
        const config = getEnvironment(appConfig.stage)
        const env = getCdkEnvironment(appConfig.stage)

        // Import infrastructure resources from frontend-infra stack
        const mainAppBucket = Bucket.fromBucketName(
            app,
            'ImportedMainAppBucket',
            `mcr-cdk-${appConfig.stage}-ui-bucket`
        )

        const storybookBucket = Bucket.fromBucketName(
            app,
            'ImportedStorybookBucket',
            `mcr-cdk-${appConfig.stage}-storybook-bucket`
        )

        const mainAppDistribution = Distribution.fromDistributionAttributes(
            app,
            'ImportedMainAppDistribution',
            {
                distributionId: cdk.Fn.importValue(
                    `MCR-frontend-infra-${appConfig.stage}-cdk-CloudFrontDistributionId`
                ),
                domainName: cdk.Fn.importValue(
                    `MCR-frontend-infra-${appConfig.stage}-cdk-CloudFrontEndpointUrl`
                ).replace('https://', ''),
            }
        )

        const storybookDistribution = Distribution.fromDistributionAttributes(
            app,
            'ImportedStorybookDistribution',
            {
                distributionId: cdk.Fn.importValue(
                    `MCR-frontend-infra-${appConfig.stage}-cdk-StorybookCloudFrontDistributionId`
                ),
                domainName: cdk.Fn.importValue(
                    `MCR-frontend-infra-${appConfig.stage}-cdk-StorybookCloudFrontEndpointUrl`
                ).replace('https://', ''),
            }
        )

        // Create Frontend App stack (deploys React app and Storybook)
        new FrontendAppStack(
            app,
            ResourceNames.stackName('frontend-app', appConfig.stage),
            {
                env,
                stage: appConfig.stage,
                stageConfig: config,
                serviceName: 'frontend-app',
                // Pass imported infrastructure resources
                mainAppBucket,
                mainAppDistribution,
                storybookBucket,
                storybookDistribution,
            }
        )

        // Apply IAM aspects
        Aspects.of(app).add(new IamPathAspect(appConfig.iamPath))
        if (appConfig.permissionsBoundaryArn) {
            Aspects.of(app).add(
                new IamPermissionsBoundaryAspect(
                    appConfig.permissionsBoundaryArn
                )
            )
        }

        // Add resource tags (matches network.ts pattern)
        cdk.Tags.of(app).add('Project', 'mc-review')
        cdk.Tags.of(app).add('Environment', appConfig.stage)
        cdk.Tags.of(app).add('ManagedBy', 'CDK')
        cdk.Tags.of(app).add(
            'Repository',
            'https://github.com/Enterprise-CMCS/managed-care-review'
        )

        app.synth()

        console.info(
            `CDK synthesis completed for Frontend App stack: ${appConfig.stage}`
        )
    } catch (error) {
        console.error('Frontend App stack initialization failed:', error)
        console.error('\nTroubleshooting:')
        console.error('- Check AWS credentials and region configuration')
        console.error('- Ensure CDK bootstrap and proper AWS permissions')
        console.error('- Verify frontend-infra stack is deployed first')
        process.exit(1)
    }
}

void main()

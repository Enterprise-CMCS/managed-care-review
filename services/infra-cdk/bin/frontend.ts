#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'
import { AppConfigLoader } from '../lib/config/app'
import { SynthesizerConfigLoader } from '../lib/config/synthesizer'
import { Aspects } from 'aws-cdk-lib'
import { IamPathAspect } from '../lib/aspects/iam-path-aspects'
import { IamPermissionsBoundaryAspect } from '../lib/aspects/iam-permissions-boundary-aspects'
import { getEnvironment, getCdkEnvironment, ResourceNames } from '../lib/config'
import { FrontendInfraStack } from '../lib/stacks/frontend-infra'
import { FrontendAppStack } from '../lib/stacks/frontend-app'

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

        // Create Frontend Infrastructure stack (S3 + CloudFront + WAF)
        const frontendInfra = new FrontendInfraStack(
            app,
            ResourceNames.stackName('frontend-infra', appConfig.stage),
            {
                env,
                stage: appConfig.stage,
                stageConfig: config,
                serviceName: 'frontend-infra',
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
                // Pass infrastructure resources from frontend-infra stack
                mainAppBucket: frontendInfra.bucket,
                mainAppDistribution: frontendInfra.distribution,
                storybookBucket: frontendInfra.storybookBucket,
                storybookDistribution: frontendInfra.storybookDistribution,
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
            `CDK synthesis completed for Frontend stacks: ${appConfig.stage}`
        )
    } catch (error) {
        console.error('Frontend stack initialization failed:', error)
        console.error('\nTroubleshooting:')
        console.error('- Check AWS credentials and region configuration')
        console.error('- Ensure CDK bootstrap and proper AWS permissions')
        process.exit(1)
    }
}

void main()

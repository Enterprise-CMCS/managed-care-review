#!/usr/bin/env node
import { AppConfigLoader } from '../lib/config/app'
import { getEnvironment, getCdkEnvironment, ResourceNames } from '../lib/config'
import { FrontendInfraStack } from '../lib/stacks/frontend-infra'
import { App, DefaultStackSynthesizer, Tags } from 'aws-cdk-lib'

// Simplified version - using default synthesizer with mcreview qualifier
function main(): void {
    try {
        // Load configuration
        const appConfig = AppConfigLoader.load()

        // Create CDK app with mcreview qualifier
        const app = new App({
            defaultStackSynthesizer: new DefaultStackSynthesizer({
                qualifier: 'mcreview',
            }),
        })

        // Set stage context
        app.node.setContext('stage', appConfig.stage)

        // Get environment config
        const config = getEnvironment(appConfig.stage)
        const env = getCdkEnvironment(appConfig.stage)

        // Create Frontend Infrastructure stack (S3 + CloudFront + WAF)
        new FrontendInfraStack(
            app,
            ResourceNames.stackName('frontend-infra', appConfig.stage),
            {
                env,
                stage: appConfig.stage,
                stageConfig: config,
                serviceName: 'frontend-infra',
            }
        )

        // Keep permissions boundary if still required by CMS

        // Add resource tags
        Tags.of(app).add('Project', 'mc-review')
        Tags.of(app).add('Environment', appConfig.stage)
        Tags.of(app).add('ManagedBy', 'CDK')
        Tags.of(app).add(
            'Repository',
            'https://github.com/Enterprise-CMCS/managed-care-review'
        )

        app.synth()

        console.info(
            `CDK synthesis completed for Frontend Infrastructure stack: ${appConfig.stage}`
        )
    } catch (error) {
        console.error('Frontend stack initialization failed:', error)
        console.error('\nTroubleshooting:')
        console.error('- Check AWS credentials and region configuration')
        console.error('- Ensure CDK bootstrap and proper AWS permissions')
        process.exit(1)
    }
}

main()

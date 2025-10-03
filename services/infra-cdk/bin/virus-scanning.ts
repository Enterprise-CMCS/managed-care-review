#!/usr/bin/env node
import 'source-map-support/register'
import { AppConfigLoader } from '../lib/config/app'
import { VirusScanning } from '../lib/stacks/virus-scanning'
import { getEnvironment, getCdkEnvironment, ResourceNames } from '../lib/config'
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

        // Create Virus Scanning stack (depends on uploads stack)
        new VirusScanning(
            app,
            ResourceNames.stackName('virus-scanning', appConfig.stage),
            {
                env,
                stage: appConfig.stage,
                stageConfig: config,
                serviceName: 'virus-scanning',
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
            `CDK synthesis completed for VirusScanning (GuardDuty) stack: ${appConfig.stage}`
        )
    } catch (error) {
        console.error('Virus Scanning stack initialization failed:', error)
        process.exit(1)
    }
}

main()

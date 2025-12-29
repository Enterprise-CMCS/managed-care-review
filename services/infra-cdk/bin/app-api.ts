#!/usr/bin/env node
import 'source-map-support/register'
import { App, Tags, DefaultStackSynthesizer } from 'aws-cdk-lib'
import { AppConfigLoader } from '../lib/config/app'
import { getEnvironment, getCdkEnvironment } from '../lib/config/environments'
import { ResourceNames } from '../lib/config/shared'
import { AppApiStack } from '../lib/stacks/app-api'
import { Network } from '../lib/stacks/network'

// Simplified version - using default synthesizer with mcreview qualifier
function main(): void {
    try {
        const appConfig = AppConfigLoader.load()

        // Use default synthesizer with mcreview qualifier
        const app = new App({
            defaultStackSynthesizer: new DefaultStackSynthesizer({
                qualifier: 'mcreview',
            }),
        })

        app.node.setContext('stage', appConfig.stage)

        const config = getEnvironment(appConfig.stage)
        const env = getCdkEnvironment(appConfig.stage)

        // Create Network stack (needed for VPC and SG references)
        const network = new Network(
            app,
            ResourceNames.stackName('network', appConfig.stage),
            {
                env,
                stage: appConfig.stage,
                stageConfig: config,
                serviceName: 'network',
            }
        )

        // Create App API stack
        const appApi = new AppApiStack(
            app,
            ResourceNames.stackName('app-api', appConfig.stage),
            {
                env,
                stage: appConfig.stage,
                stageConfig: config,
                serviceName: 'app-api',
                vpc: network.vpc,
                lambdaSecurityGroup: network.lambdaSecurityGroup,
                applicationSecurityGroup: network.applicationSecurityGroup,
            }
        )

        // Set dependency
        appApi.addDependency(network)

        Tags.of(app).add('Project', 'mc-review')
        Tags.of(app).add('Environment', appConfig.stage)
        Tags.of(app).add('ManagedBy', 'CDK')
        Tags.of(app).add(
            'Repository',
            'https://github.com/Enterprise-CMCS/managed-care-review'
        )

        app.synth()

        console.info(
            `CDK synthesis completed for AppApi stack: ${appConfig.stage}`
        )
    } catch (error) {
        console.error('App API stack initialization failed:', error)
        process.exit(1)
    }
}

main()

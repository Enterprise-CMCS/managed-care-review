#!/usr/bin/env node
import { AppConfigLoader } from '../lib/config/app'
import { getEnvironment, getCdkEnvironment, ResourceNames } from '../lib/config'
import { CognitoStack } from '../lib/stacks/cognito'
import { App, DefaultStackSynthesizer, Tags } from 'aws-cdk-lib'

// Simplified version - using default synthesizer with mcreview qualifier
function main(): void {
    try {
        const appConfig = AppConfigLoader.load()

        const app = new App({
            defaultStackSynthesizer: new DefaultStackSynthesizer({
                qualifier: 'mcreview',
            }),
        })

        app.node.setContext('stage', appConfig.stage)

        const config = getEnvironment(appConfig.stage)
        const env = getCdkEnvironment(appConfig.stage)

        new CognitoStack(
            app,
            ResourceNames.stackName('cognito', appConfig.stage),
            {
                env,
                stage: appConfig.stage,
                stageConfig: config,
                serviceName: 'cognito',
            }
        )

        Tags.of(app).add('Project', 'mc-review')
        Tags.of(app).add('Environment', appConfig.stage)
        Tags.of(app).add('ManagedBy', 'CDK')
        Tags.of(app).add(
            'Repository',
            'https://github.com/Enterprise-CMCS/managed-care-review'
        )

        app.synth()

        console.info(
            `CDK synthesis completed for Cognito stack: ${appConfig.stage}`
        )
    } catch (error) {
        console.error('Cognito stack initialization failed:', error)
        process.exit(1)
    }
}

main()

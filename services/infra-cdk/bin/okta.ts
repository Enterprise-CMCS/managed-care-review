#!/usr/bin/env node
import { App, DefaultStackSynthesizer, Tags } from 'aws-cdk-lib'
import { AppConfigLoader } from '../lib/config/app'
import { getEnvironment, getCdkEnvironment } from '../lib/config/environments'
import { ResourceNames } from '../lib/config/shared'
import { OktaStack } from '../lib/stacks/okta'

function main(): void {
    try {
        const appConfig = AppConfigLoader.load()
        const app = new App({
            defaultStackSynthesizer: new DefaultStackSynthesizer({
                qualifier: 'mcreview',
            }),
        })

        app.node.setContext('stage', appConfig.stage)

        new OktaStack(app, ResourceNames.stackName('okta', appConfig.stage), {
            env: getCdkEnvironment(appConfig.stage),
            stage: appConfig.stage,
            stageConfig: getEnvironment(appConfig.stage),
            serviceName: 'okta',
        })

        Tags.of(app).add('Project', 'mc-review')
        Tags.of(app).add('Environment', appConfig.stage)
        Tags.of(app).add('ManagedBy', 'CDK')
        Tags.of(app).add(
            'Repository',
            'https://github.com/Enterprise-CMCS/managed-care-review'
        )

        app.synth()
        console.info(
            `CDK synthesis completed for Okta stack: ${appConfig.stage}`
        )
    } catch (error) {
        console.error('Okta stack initialization failed:', error)
        process.exit(1)
    }
}

main()

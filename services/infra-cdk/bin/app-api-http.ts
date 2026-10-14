#!/usr/bin/env node
import 'source-map-support/register'
import { App, Tags, DefaultStackSynthesizer } from 'aws-cdk-lib'
import { AppConfigLoader } from '../lib/config/app'
import { getEnvironment, getCdkEnvironment } from '../lib/config/environments'
import { ResourceNames } from '../lib/config/shared'
import { AppApiHttpStack } from '../lib/stacks/app-api-http'

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

        new AppApiHttpStack(
            app,
            ResourceNames.stackName('app-api-http', appConfig.stage),
            {
                env,
                stage: appConfig.stage,
                stageConfig: config,
                serviceName: 'app-api-http',
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
            `CDK synthesis completed for AppApiHttp stack: ${appConfig.stage}`
        )
    } catch (error) {
        console.error('App HTTP API stack initialization failed:', error)
        process.exit(1)
    }
}

main()

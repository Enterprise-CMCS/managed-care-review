#!/usr/bin/env node
import 'source-map-support/register'
import { App, DefaultStackSynthesizer, Tags } from 'aws-cdk-lib'
import { AppConfigLoader } from '../lib/config/app'
import { getCdkEnvironment, getEnvironment } from '../lib/config/environments'
import { ResourceNames } from '../lib/config/shared'
import { ApiGatewayAccountStack } from '../lib/stacks/api-gateway-account'

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

        new ApiGatewayAccountStack(
            app,
            ResourceNames.stackName('api-gateway-account', appConfig.stage),
            {
                env,
                stage: appConfig.stage,
                stageConfig: config,
                serviceName: 'api-gateway-account',
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
            `CDK synthesis completed for API Gateway account stack: ${appConfig.stage}`
        )
    } catch (error) {
        console.error('API Gateway account stack initialization failed:', error)
        process.exit(1)
    }
}

main()

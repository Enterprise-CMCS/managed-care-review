#!/usr/bin/env node
import 'source-map-support/register'
import { App, Tags, Aspects } from 'aws-cdk-lib'
import { AppConfigLoader } from '../lib/config/app'
import { IamPermissionsBoundaryAspect } from '../lib/aspects/iam-permissions-boundary-aspects'
import { getEnvironment, getCdkEnvironment, ResourceNames } from '../lib/config'
import { AppApiStack } from '../lib/stacks/app-api'

// Simplified version - testing if we can use CDK defaults instead of custom synthesizer
function main(): void {
    try {
        const appConfig = AppConfigLoader.load()

        // Use CDK defaults - no custom synthesizer
        const app = new App()

        app.node.setContext('stage', appConfig.stage)

        const config = getEnvironment(appConfig.stage)
        const env = getCdkEnvironment(appConfig.stage)

        new AppApiStack(
            app,
            ResourceNames.stackName('app-api', appConfig.stage),
            {
                env,
                stage: appConfig.stage,
                stageConfig: config,
                serviceName: 'app-api',
            }
        )

        // Keep permissions boundary if still required by CMS
        if (appConfig.permissionsBoundaryArn) {
            Aspects.of(app).add(
                new IamPermissionsBoundaryAspect(
                    appConfig.permissionsBoundaryArn
                )
            )
        }

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

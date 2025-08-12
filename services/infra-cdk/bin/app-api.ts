#!/usr/bin/env node
import 'source-map-support/register'
import { App, Tags } from 'aws-cdk-lib'
import { AppApiStack } from '../lib/stacks/app-api'
import { ResourceNames } from '../lib/config'

async function main(): Promise<void> {
    // Load app configuration
    const appConfig = await import('../lib/config/app')
    const config = await import('../lib/config')

    const app = new App()

    // Add global tags
    Tags.of(app).add('Project', 'ManagedCareReview')
    Tags.of(app).add('Environment', appConfig.default.stage)
    Tags.of(app).add('ManagedBy', 'CDK')

    // Standard environment configuration for all stacks
    const env = {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    }

    // Create App API stack
    new AppApiStack(
        app,
        ResourceNames.stackName('AppApi', appConfig.default.stage),
        {
            env,
            stage: appConfig.default.stage,
            stageConfig: config.default,
            serviceName: 'app-api',
        }
    )
}

main().catch((error: Error) => {
    console.error('App API stack initialization failed:', error)
    process.exit(1)
})

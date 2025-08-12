#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { AppConfigLoader } from '../lib/config/app'
import { SynthesizerConfigLoader } from '../lib/config/synthesizer'
import { Aspects } from 'aws-cdk-lib'
import { IamPathAspect } from '../lib/aspects/iam-path-aspects'
import { IamPermissionsBoundaryAspect } from '../lib/aspects/iam-permissions-boundary-aspects'
import { getEnvironment, getCdkEnvironment, ResourceNames } from '../lib/config'
import { AppApiStack } from '../lib/stacks/app-api'

async function main(): Promise<void> {
    try {
        const appConfig = AppConfigLoader.load()
        const synthesizerLoader = new SynthesizerConfigLoader(
            appConfig.awsRegion
        )
        const synthConfig = await synthesizerLoader.load()

        const app = new cdk.App({
            defaultStackSynthesizer: new cdk.DefaultStackSynthesizer(
                synthConfig
            ),
        })

        app.node.setContext('stage', appConfig.stage)

        const config = getEnvironment(appConfig.stage)
        const env = getCdkEnvironment(appConfig.stage)

        new AppApiStack(
            app,
            ResourceNames.stackName('AppApi', appConfig.stage),
            {
                env,
                stage: appConfig.stage,
                stageConfig: config,
                serviceName: 'app-api',
            }
        )

        Aspects.of(app).add(new IamPathAspect(appConfig.iamPath))
        if (appConfig.permissionsBoundaryArn) {
            Aspects.of(app).add(
                new IamPermissionsBoundaryAspect(
                    appConfig.permissionsBoundaryArn
                )
            )
        }

        cdk.Tags.of(app).add('Project', 'mc-review')
        cdk.Tags.of(app).add('Environment', appConfig.stage)
        cdk.Tags.of(app).add('ManagedBy', 'CDK')
        cdk.Tags.of(app).add(
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

void main()
